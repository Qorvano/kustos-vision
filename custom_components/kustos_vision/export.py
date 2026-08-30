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
import tempfile
from asyncio import create_subprocess_exec
from collections.abc import AsyncIterator
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
    with tempfile.TemporaryDirectory(prefix="kustos-vision-export-") as tmp:
        list_file = Path(tmp) / "segments.txt"
        await hass.async_add_executor_job(
            write_concat_list, segments, base, list_file
        )

        # "pipe:1" instead of a path: the output is consumed as it appears.
        # Fragmented MP4 is required for that, because a plain MP4 would need
        # to seek back and write its index at the end, which a pipe cannot do.
        args = build_concat_args(list_file, Path("pipe:1"))
        args[args.index("-movflags") + 1] = "+frag_keyframe+empty_moov+default_base_moof"

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
