"""Fetching one current frame from a camera, by the best means available.

The pure parts - ffmpeg arguments, ring arithmetic, the CapturedFrame shape -
live in ``core.capture``; this module is the part that talks to Home
Assistant and spawns processes, mirroring the recorder's split.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import tempfile
from asyncio.subprocess import create_subprocess_exec
from pathlib import Path

from homeassistant.components.camera import async_get_image, async_get_stream_source
from homeassistant.components.ffmpeg import get_ffmpeg_manager
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .core.capture import (
    FRAME_CAPTURE_TIMEOUT_SECONDS,
    FRAME_LONG_EDGE,
    CapturedFrame,
    FrameSource,
    build_frame_args,
)
from .vision import VisionError

_LOGGER = logging.getLogger(__name__)


async def async_capture_frame(
    hass: HomeAssistant, entity_id: str, target: Path | None = None
) -> CapturedFrame:
    """One frame of what the camera sees now.

    Three steps, in this order and for this reason:

    1. The camera's own stream, decoded here. The only source guaranteed to
       be *now*: a camera integration may serve a still it fetched minutes
       ago, or a keyframe the stream worker happened to still be holding. An
       analysis answered from such a picture is not wrong about the model, it
       is wrong about time, and nothing downstream can tell the difference.
    2. The entity's still. Correct when a camera offers no stream URL at all,
       and the only option when ffmpeg cannot run. Asked for with ``width``
       only and NOT with ``height``: Home Assistant scales the keyframe with
       an exact reformat when both are given, which would stretch a 16:9
       frame square. With width alone it does nothing, which is why the
       scaling that matters lives in step 1.
    3. Neither, as a VisionError, so the run is recorded as failed rather
       than answered from a picture nobody can identify afterwards.

    When ``target`` is given the frame is also kept there (the history's ring
    slot); without it the picture only exists in memory.
    """
    frame = await _async_from_stream(hass, entity_id, target)
    if frame is not None:
        return frame

    try:
        image = await async_get_image(hass, entity_id, width=FRAME_LONG_EDGE)
    except Exception as err:
        raise VisionError(
            f"no current frame from {entity_id}: the stream could not be "
            f"decoded and the snapshot failed: {err}"
        ) from err

    content = image.content
    if target is not None:
        await hass.async_add_executor_job(_write, target, content)
    return CapturedFrame(
        content=content,
        content_type=image.content_type or "image/jpeg",
        taken_at=dt_util.utcnow(),
        source=FrameSource.ENTITY_STILL,
        path=target,
    )


async def _async_from_stream(
    hass: HomeAssistant, entity_id: str, target: Path | None
) -> CapturedFrame | None:
    """Decode one frame from the camera's stream, or None to fall back."""
    try:
        source = await async_get_stream_source(hass, entity_id)
    except Exception as err:
        _LOGGER.debug(
            "kustos_vision: no stream source for %s: %s", entity_id, err
        )
        return None
    if not source:
        return None

    if target is None:
        # A capture nobody wants kept still needs a file: image2 writes one.
        handle = await hass.async_add_executor_job(_temp_jpeg)
        try:
            frame = await _async_run_ffmpeg(hass, source, handle, keep=None)
        finally:
            with contextlib.suppress(OSError):
                await hass.async_add_executor_job(handle.unlink)
        return frame

    await hass.async_add_executor_job(_ensure_parent, target)
    return await _async_run_ffmpeg(hass, source, target, keep=target)


async def _async_run_ffmpeg(
    hass: HomeAssistant, source: str, output: Path, keep: Path | None
) -> CapturedFrame | None:
    """Spawn ffmpeg for one frame; None means the fallback should try."""
    binary = get_ffmpeg_manager(hass).binary
    args = build_frame_args(source, output)
    taken_at = dt_util.utcnow()
    try:
        process = await create_subprocess_exec(
            binary,
            *args,
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
    except OSError as err:
        _LOGGER.warning(
            "kustos_vision: could not start ffmpeg for a frame: %s", err
        )
        return None

    try:
        code = await asyncio.wait_for(
            process.wait(), FRAME_CAPTURE_TIMEOUT_SECONDS
        )
    except TimeoutError:
        _LOGGER.warning(
            "kustos_vision: the frame capture from %s timed out", source
        )
        with contextlib.suppress(ProcessLookupError):
            process.kill()
        with contextlib.suppress(Exception):
            await process.wait()
        return None

    if code != 0:
        _LOGGER.debug(
            "kustos_vision: ffmpeg exited %s capturing a frame", code
        )
        return None

    content = await hass.async_add_executor_job(_read_or_none, output)
    if not content:
        return None
    return CapturedFrame(
        content=content,
        content_type="image/jpeg",
        taken_at=taken_at,
        source=FrameSource.STREAM,
        path=keep,
    )


def _temp_jpeg() -> Path:
    handle = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    handle.close()
    return Path(handle.name)


def _ensure_parent(target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)


def _write(target: Path, content: bytes) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)


def _read_or_none(path: Path) -> bytes | None:
    try:
        return path.read_bytes()
    except OSError:
        return None
