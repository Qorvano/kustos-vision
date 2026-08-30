"""Exporting a time range as one file.

The segments are joined with the concat demuxer and stream copy, so an export
costs about as little as the recording did and never re-encodes.

The result is streamed straight to the browser rather than written somewhere
first. That removes a whole class of problem: no export directory filling up,
nothing to clean up afterwards, and no second copy of footage that already
exists.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import shutil
import tempfile
from asyncio import create_subprocess_exec
from collections.abc import AsyncIterator
from functools import partial
from pathlib import Path

from homeassistant.components.ffmpeg import get_ffmpeg_manager
from homeassistant.core import HomeAssistant

from .core.index import Segment
from .core.recorder import build_concat_args

_LOGGER = logging.getLogger(__name__)

# Chunk size for streaming ffmpeg's output onward. Large enough that the loop
# is not woken thousands of times per second, small enough that a slow client
# does not make the buffer grow without bound.
CHUNK_BYTES = 64 * 1024

# An export that has produced nothing for this long is not going to. Generous,
# because joining a long range off a network share is legitimately slow.
STALL_TIMEOUT_SECONDS = 120.0


def pipe_concat_args(list_file: Path) -> list[str]:
    """The ffmpeg arguments for joining segments into a pipe.

    Differs from a file export in two ways, both mandatory. Fragmented MP4,
    because a plain MP4 needs to seek back and write its index at the end,
    which a pipe cannot do. And the container named explicitly: a pipe has
    no file extension, so ffmpeg cannot infer the format and refuses to
    start at all, which reached the browser as a zero-byte download.
    """
    args = build_concat_args(list_file, Path("pipe:1"))
    args[args.index("-movflags") + 1] = "+frag_keyframe+empty_moov+default_base_moof"
    args[args.index("pipe:1") :] = ["-f", "mp4", "pipe:1"]
    return args


def write_concat_list(segments: list[Segment], base: Path, target: Path) -> None:
    """Write the file list the concat demuxer reads.

    Paths are quoted the way the demuxer expects, with single quotes escaped,
    so a directory containing one does not truncate the list.
    """
    lines = []
    for segment in segments:
        absolute = str(segment.absolute(base)).replace("'", r"'\''")
        lines.append(f"file '{absolute}'")
    target.write_text("\n".join(lines) + "\n", encoding="utf-8")


async def stream_export(
    hass: HomeAssistant, segments: list[Segment], base: Path
) -> AsyncIterator[bytes]:
    """Join segments and yield the resulting MP4 as it is produced."""
    if not segments:
        raise ValueError("nothing to export")

    binary = get_ffmpeg_manager(hass).binary
    # Created and removed through the executor: the cleanup walks the
    # directory, and the live log flagged exactly that walk as a blocking
    # call when the context manager ran it in the event loop.
    tmp = await hass.async_add_executor_job(
        partial(tempfile.mkdtemp, prefix="kustos-vision-export-")
    )
    try:
        list_file = Path(tmp) / "segments.txt"
        await hass.async_add_executor_job(
            write_concat_list, segments, base, list_file
        )

        args = pipe_concat_args(list_file)

        process = await create_subprocess_exec(
            binary,
            *args,
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        assert process.stdout is not None

        try:
            while True:
                chunk = await asyncio.wait_for(
                    process.stdout.read(CHUNK_BYTES), STALL_TIMEOUT_SECONDS
                )
                if not chunk:
                    break
                yield chunk
        except TimeoutError:
            _LOGGER.warning("kustos_vision: export stalled, giving up")
        finally:
            if process.returncode is None:
                with contextlib.suppress(ProcessLookupError):
                    process.kill()
            with contextlib.suppress(Exception):
                await process.wait()

        if process.returncode not in (0, None):
            stderr = b""
            if process.stderr is not None:
                with contextlib.suppress(Exception):
                    stderr = await process.stderr.read()
            _LOGGER.warning(
                "kustos_vision: export failed (exit %s): %s",
                process.returncode,
                stderr.decode("utf-8", errors="replace")[-500:],
            )
    finally:
        await hass.async_add_executor_job(
            partial(shutil.rmtree, tmp, ignore_errors=True)
        )
