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
from .core.mp4 import has_audio_track, playable_length, video_size
from .core.recorder import build_concat_args

_LOGGER = logging.getLogger(__name__)

# Chunk size for streaming ffmpeg's output onward. Large enough that the loop
# is not woken thousands of times per second, small enough that a slow client
# does not make the buffer grow without bound.
CHUNK_BYTES = 64 * 1024

# An export that has produced nothing for this long is not going to. Generous,
# because joining a long range off a network share is legitimately slow.
STALL_TIMEOUT_SECONDS = 120.0

# --- The stamped export -----------------------------------------------------
#
# Burning a clock into the picture requires decoding and re-encoding, which is
# why it happens here, once, on demand, and never during recording: recording
# stays a remux at a few percent of one core, while a stamped day is a real
# transcode that takes the Pi on the order of the footage's own length.

# Shipped with the integration because drawtext needs a font file and the
# ffmpeg next to Home Assistant makes no promises about installed fonts.
# DejaVu Sans Mono, freely redistributable; the licence sits beside it.
STAMP_FONT = Path(__file__).parent / "fonts" / "DejaVuSansMono.ttf"

# The fastest x264 preset. The Pi 5 has no hardware encoder at all, so every
# slower preset multiplies hours onto a day's export; ultrafast pays for that
# speed with bitrate, which an evidence file can afford.
STAMP_PRESET = "ultrafast"

# x264's default quality point: visually transparent for surveillance footage
# while keeping the bitrate bounded.
STAMP_CRF = "23"

# The clock's height as a share of the picture height, roughly the size the
# cameras' own OSD uses; 1620 lines make a 67-pixel clock, 360 lines a 15er.
STAMP_HEIGHT_SHARE = 24

# Matches what the recorder itself encodes when a camera sends something other
# than AAC, see core.recorder.
STAMP_AUDIO = ("-c:a", "aac", "-b:a", "64k")


def ffmpeg_supports_drawtext(binary: str) -> bool:
    """Whether the shipped ffmpeg can draw text at all.

    Not a given: drawtext needs an ffmpeg built against freetype, and builds
    without it exist in the wild (the development machine's own ffmpeg was
    one). Checked once at setup and surfaced to the panel, because the honest
    place to learn this is a greyed-out checkbox, not a failed download.
    """
    import subprocess

    try:
        result = subprocess.run(
            [binary, "-hide_banner", "-filters"],
            capture_output=True,
            timeout=15,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return False
    return b" drawtext " in result.stdout


def dominant_stream(segments: list[Segment]) -> list[Segment]:
    """The segments of the stream that carries the most footage.

    The stamped export processes exactly one stream: mixing resolutions in a
    transcode would force scaling everything to a common size, and scaling
    evidence footage down is the one thing such an export must not do. Ties
    fall to the alphabetically first key, so the choice is deterministic.
    """
    totals: dict[str, float] = {}
    for segment in segments:
        totals[segment.stream_key] = totals.get(segment.stream_key, 0.0) + segment.duration_s
    best = min(totals, key=lambda key: (-totals[key], key))
    return [s for s in segments if s.stream_key == best]


def stamp_concat_args(
    inputs: list[tuple[Path, float]],
    height: int,
    with_audio: bool,
    font: Path = STAMP_FONT,
) -> list[str]:
    """The ffmpeg arguments that join segments and burn the clock in.

    Every input gets its own drawtext with its own epoch. One shared clock
    base would be wrong from the first recording gap onward, because the
    joined timeline is contiguous while real time jumps across gaps; the
    per-segment epoch is the Pi's NTP-synchronised clock at the moment the
    segment started, which is exactly what an evidence file should show.
    """
    args = ["-nostdin", "-loglevel", "error", "-y"]
    for path, _ in inputs:
        args += ["-i", str(path)]

    fontsize = max(1, round(height / STAMP_HEIGHT_SHARE))
    margin = max(1, fontsize // 2)
    chains = []
    for i, (_, epoch) in enumerate(inputs):
        # %T expands to HH:MM:SS on its own, which avoids putting literal
        # colons into the format string; drawtext would treat those as option
        # separators and need another layer of escaping.
        text = rf"%{{pts\:localtime\:{int(epoch)}\:%d.%m.%Y %T}}"
        chains.append(
            f"[{i}:v]format=yuv420p,setsar=1,"
            f"drawtext=fontfile='{font}':text='{text}':fontsize={fontsize}"
            f":fontcolor=white:borderw=2:bordercolor=black@0.7"
            f":x=w-tw-{margin}:y=h-th-{margin}[v{i}]"
        )
    n = len(inputs)
    if with_audio:
        pairs = "".join(f"[v{i}][{i}:a]" for i in range(n))
        chains.append(f"{pairs}concat=n={n}:v=1:a=1[v][a]")
        mapping = ["-map", "[v]", "-map", "[a]", *STAMP_AUDIO]
    else:
        pairs = "".join(f"[v{i}]" for i in range(n))
        chains.append(f"{pairs}concat=n={n}:v=1:a=0[v]")
        mapping = ["-map", "[v]", "-an"]

    return [
        *args,
        "-filter_complex",
        ";".join(chains),
        *mapping,
        "-c:v",
        "libx264",
        "-preset",
        STAMP_PRESET,
        "-crf",
        STAMP_CRF,
        "-movflags",
        "+frag_keyframe+empty_moov+default_base_moof",
        "-f",
        "mp4",
        "pipe:1",
    ]


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


def prepare_inputs(
    segments: list[Segment], base: Path, tmp: Path
) -> list[tuple[Path, Segment]]:
    """The files the join may safely read, torn tails cut off.

    A segment the recorder was writing when it died ends mid-box, and the
    concat demuxer abandons the WHOLE join at that packet rather than skipping
    it: a day's download used to end at the first crash-made gap and silently
    drop everything recorded after it. Such a file is copied up to its last
    complete fragment into the scratch directory and the copy joined instead.
    Intact files, which is nearly all of them, are used where they are.
    """
    prepared: list[tuple[Path, Segment]] = []
    for segment in segments:
        source = segment.absolute(base)
        try:
            keep = playable_length(source)
        except OSError as err:
            _LOGGER.warning("kustos_vision: cannot read %s for export: %s", source, err)
            continue
        if keep == source.stat().st_size:
            prepared.append((source, segment))
            continue
        if keep == 0:
            _LOGGER.warning(
                "kustos_vision: %s has no complete fragment, export skips it", source
            )
            continue
        trimmed = tmp / f"{len(prepared):04d}_{source.name}"
        with source.open("rb") as src, trimmed.open("wb") as dst:
            dst.write(src.read(keep))
        _LOGGER.debug(
            "kustos_vision: %s ends mid-write, exporting its playable %d of %d bytes",
            source,
            keep,
            source.stat().st_size,
        )
        prepared.append((trimmed, segment))
    return prepared


def write_concat_list(paths: list[Path], target: Path) -> None:
    """Write the file list the concat demuxer reads.

    Paths are quoted the way the demuxer expects, with single quotes escaped,
    so a directory containing one does not truncate the list.
    """
    lines = []
    for path in paths:
        absolute = str(path).replace("'", r"'\''")
        lines.append(f"file '{absolute}'")
    target.write_text("\n".join(lines) + "\n", encoding="utf-8")


async def stream_export(
    hass: HomeAssistant,
    segments: list[Segment],
    base: Path,
    stamp: bool = False,
) -> AsyncIterator[bytes]:
    """Join segments and yield the resulting MP4 as it is produced.

    With ``stamp`` the picture gets the recording clock burnt in, which turns
    the cheap remux into a full transcode; see the constants above for what
    that trade looks like.
    """
    if not segments:
        raise ValueError("nothing to export")
    if stamp:
        segments = dominant_stream(segments)

    binary = get_ffmpeg_manager(hass).binary
    # Created and removed through the executor: the cleanup walks the
    # directory, and the live log flagged exactly that walk as a blocking
    # call when the context manager ran it in the event loop.
    tmp = await hass.async_add_executor_job(
        partial(tempfile.mkdtemp, prefix="kustos-vision-export-")
    )
    try:
        paths = await hass.async_add_executor_job(
            prepare_inputs, segments, base, Path(tmp)
        )
        if not paths:
            _LOGGER.warning("kustos_vision: nothing in the range was exportable")
            return
        if stamp:
            first = paths[0][0]
            size = await hass.async_add_executor_job(video_size, first)
            if size is None:
                _LOGGER.warning(
                    "kustos_vision: %s has no readable track header, "
                    "stamped export falls back to the raw join",
                    first,
                )
            with_audio = size is not None and all(
                await asyncio.gather(
                    *(
                        hass.async_add_executor_job(has_audio_track, path)
                        for path, _ in paths
                    )
                )
            )
            if size is not None:
                args = stamp_concat_args(
                    [(path, segment.start_utc) for path, segment in paths],
                    size[1],
                    with_audio,
                )
            else:
                stamp = False
        if not stamp:
            list_file = Path(tmp) / "segments.txt"
            await hass.async_add_executor_job(
                write_concat_list, [path for path, _ in paths], list_file
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
