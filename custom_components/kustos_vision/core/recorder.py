"""Building the ffmpeg invocations, and the restart policy around them.

This module is pure: it turns configuration into argument lists and decides
when a dead process may be restarted. It never spawns anything, so all of it
is testable without ffmpeg and without Home Assistant.

The recording invocation never decodes video. It demuxes the RTSP packets and
writes them straight into MP4 segments, which is what makes continuous
recording cost a few percent of one core instead of whole cores.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path

from .paths import segment_output_pattern, validate_slug

# Upper bound for the re-encoded audio track. Camera microphones deliver mono
# speech, for which 64 kbit/s AAC is transparent while staying under 2 % of the
# video bitrate. It is a ceiling, not a fixed value: at the 8 kHz most G.711
# cameras send, the AAC encoder clamps itself to roughly 27 kbit/s and says so
# once per start. Measured against ffmpeg 8.0.1; leaving the bitrate unset
# produces the same clamp and the same message, so setting it costs nothing.
AAC_BITRATE = "64k"

# Thumbnails are shown as a hover preview above the timeline, a few hundred
# pixels wide at most. Anything larger would only cost storage and decode
# time without being visible.
THUMBNAIL_WIDTH = 320


class AudioMode(StrEnum):
    """How to treat the audio track of a stream."""

    TRANSCODE = "transcode"
    """Re-encode to AAC. The only setting that works with every camera,
    because PCM/G.711 cannot be copied into an MP4 container."""

    COPY = "copy"
    """Copy the audio track untouched. Valid only when the camera already
    sends AAC; ffmpeg aborts otherwise."""

    NONE = "none"
    """Record video only."""


@dataclass(frozen=True, slots=True)
class StreamSpec:
    """One stream of one camera that is being recorded."""

    camera_slug: str
    stream_key: str
    source_url: str
    segment_seconds: int
    audio: AudioMode = AudioMode.TRANSCODE

    def __post_init__(self) -> None:
        validate_slug(self.camera_slug)
        validate_slug(self.stream_key)
        if self.segment_seconds <= 0:
            raise ValueError("segment_seconds must be positive")
        if not self.source_url:
            raise ValueError("source_url must not be empty")

    @property
    def stream_id(self) -> str:
        """Stable identifier of this stream within the installation."""
        return f"{self.camera_slug}/{self.stream_key}"


def _input_args(source_url: str) -> list[str]:
    """Return the input options for one source URL.

    ``-rtsp_transport`` is only understood by the RTSP demuxer, so it is set
    conditionally: passing it to an HTTP or file input makes ffmpeg reject the
    option instead of ignoring it. TCP is chosen because UDP silently drops
    packets under load, which produces corrupt segments rather than a visible
    error.
    """
    args: list[str] = []
    if source_url.lower().startswith("rtsp://"):
        args += ["-rtsp_transport", "tcp"]
    # Arrival time as the clock, not the stream's own timestamps. The
    # reversal of an earlier finding, both measured: these cameras deliver
    # frames evenly (the live view is smooth) but stamp them uselessly, with
    # 36 percent of intervals under five milliseconds, duplicates the muxer
    # spreads one tick apart, and second-long holes, identically across
    # cameras, streams, day and night. Every player that renders by
    # timestamp stutters through that, and desktop decoders refuse the
    # multi-second frame durations the holes produce. The old "wallclock
    # collapses segmentation" result was the fault of -segment_atclocktime
    # next to it, not of wallclock stamping itself; see build_record_args.
    # genpts went with it, redundant next to stamping both timestamps.
    args += ["-use_wallclock_as_timestamps", "1"]
    args += ["-i", source_url]
    return args


def _audio_args(mode: AudioMode) -> list[str]:
    """Return the audio codec options for one mode."""
    if mode is AudioMode.NONE:
        return ["-an"]
    if mode is AudioMode.COPY:
        return ["-c:a", "copy"]
    return ["-c:a", "aac", "-b:a", AAC_BITRATE]


def build_record_args(spec: StreamSpec, base: Path) -> list[str]:
    """Return the ffmpeg arguments that record one stream, without the binary.

    Notable choices, all of which the rest of the integration depends on:

    ``-c:v copy``
        No decoding. This is the whole reason continuous recording is cheap.

    ``-segment_format_options movflags=...``
        Fragmented MP4. Needed twice over: the timeline player appends the
        segments through MediaSource Extensions, and a fragmented file stays
        playable when the process dies, whereas a plain MP4 without its
        trailing moov atom does not.

    ``-reset_timestamps 1``
        Every segment starts at zero, so a single file plays on its own. The
        player shifts it into place with its own timestamp offset.

    No ``-segment_atclocktime``
        Combined with wallclock timestamps it collapsed recording into one
        endless segment, which an early measurement blamed on the wallclock
        option. Plain ``-segment_time`` cuts correctly alongside wallclock
        stamping, verified against a realtime source. Only round boundary
        times are lost, and nothing depends on them: file names carry the
        true start via strftime.

    The day directory is NOT created here. Unlike the hls and image2 muxers,
    the segment muxer has no ``strftime_mkdir`` option, and it aborts the whole
    process when the target directory is missing. Creating the directories is
    therefore the caller's job; see ``paths.ensure_day_dirs``.
    """
    movflags = "movflags=+frag_keyframe+empty_moov+default_base_moof"
    return [
        "-nostdin",
        "-loglevel",
        "warning",
        *_input_args(spec.source_url),
        "-c:v",
        "copy",
        *_audio_args(spec.audio),
        "-f",
        "segment",
        "-segment_time",
        str(spec.segment_seconds),
        "-segment_format",
        "mp4",
        "-segment_format_options",
        movflags,
        "-reset_timestamps",
        "1",
        "-strftime",
        "1",
        segment_output_pattern(base, spec.camera_slug, spec.stream_key),
    ]


def build_thumbnail_args(
    segment: Path, thumbnail: Path, width: int = THUMBNAIL_WIDTH
) -> list[str]:
    """Return the ffmpeg arguments that pull one preview frame from a segment.

    This is the only place the integration decodes video, and it stops after
    the first frame, so it costs tens of milliseconds per segment.
    """
    if width <= 0:
        raise ValueError("width must be positive")
    return [
        "-nostdin",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(segment),
        "-frames:v",
        "1",
        "-vf",
        f"scale={width}:-2",
        "-f",
        "image2",
        str(thumbnail),
    ]


def build_concat_args(list_file: Path, output: Path) -> list[str]:
    """Return the ffmpeg arguments that join segments into one export file.

    Uses the concat demuxer with stream copy, so an export is as cheap as the
    recording itself and never re-encodes.
    """
    return [
        "-nostdin",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(list_file),
        "-c",
        "copy",
        "-movflags",
        "+faststart",
        str(output),
    ]
