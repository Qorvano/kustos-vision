"""Tests for the ffmpeg invocations.

Several assertions here encode findings measured against ffmpeg 8.0.1 rather
than assumptions; each carries the reason, so a future change that reverts one
of them fails loudly instead of quietly breaking recording.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from kustos_vision.core.recorder import (
    AAC_BITRATE,
    RTSP_READ_TIMEOUT_US,
    AudioMode,
    StreamSpec,
    build_concat_args,
    build_record_args,
    build_thumbnail_args,
)

BASE = Path("/media/kustos_vision")


def spec(**overrides) -> StreamSpec:
    values = {
        "camera_slug": "beispiel",
        "stream_key": "hd",
        "source_url": "rtsp://cam.invalid:554/stream1",
        "segment_seconds": 300,
        "audio": AudioMode.TRANSCODE,
    }
    values.update(overrides)
    return StreamSpec(**values)


def pair_after(args: list[str], flag: str) -> str | None:
    """Return the value following a flag, or None when the flag is absent."""
    return args[args.index(flag) + 1] if flag in args else None


def test_video_is_never_decoded() -> None:
    """Stream copy is the entire reason continuous recording is cheap."""
    args = build_record_args(spec(), BASE)
    assert pair_after(args, "-c:v") == "copy"


def test_frames_are_stamped_by_arrival_time() -> None:
    """The reversal of an earlier finding, both measured. The cameras deliver
    frames evenly (the live view is smooth) but stamp them uselessly: 36
    percent of intervals under five milliseconds, duplicates, second-long
    holes, identical across cameras, streams, day and night. Every
    timestamp-driven player stutters through that, and desktop decoders
    refuse the multi-second frame durations the holes produce. The old
    "wallclock collapses segmentation" result was -segment_atclocktime's
    fault, not wallclock stamping's."""
    args = build_record_args(spec(), BASE)
    assert pair_after(args, "-use_wallclock_as_timestamps") == "1"
    # Redundant next to wallclock stamping, which sets both timestamps.
    assert "-fflags" not in args


def test_strftime_mkdir_is_not_passed() -> None:
    """The segment muxer has no such option, unlike the hls and image2 muxers.
    Passing it makes ffmpeg reject the whole invocation, so the day directories
    are created by paths.ensure_day_dirs instead."""
    assert "-strftime_mkdir" not in build_record_args(spec(), BASE)


def test_segments_are_fragmented_mp4() -> None:
    """Needed twice: the timeline player appends segments through MediaSource
    Extensions, and a fragmented file stays playable when the process dies,
    whereas a plain MP4 whose trailing moov atom never got written does not."""
    args = build_record_args(spec(), BASE)
    options = pair_after(args, "-segment_format_options")
    assert options is not None
    assert "frag_keyframe" in options
    assert "empty_moov" in options
    assert "default_base_moof" in options


def test_segment_length_is_set_without_clock_alignment() -> None:
    """Clock-aligned cutting is what actually broke next to wallclock
    stamping; plain segment_time cuts correctly alongside it, verified
    against a realtime source."""
    args = build_record_args(spec(segment_seconds=60), BASE)
    assert pair_after(args, "-segment_time") == "60"
    assert "-segment_atclocktime" not in args
    assert pair_after(args, "-reset_timestamps") == "1"


def test_output_is_the_strftime_pattern() -> None:
    args = build_record_args(spec(), BASE)
    assert args[-1] == "/media/kustos_vision/beispiel/%Y-%m-%d/%H-%M-%S_hd.mp4"
    assert pair_after(args, "-strftime") == "1"


def test_rtsp_sources_are_forced_over_tcp() -> None:
    """UDP silently drops packets under load, which yields corrupt segments
    rather than a visible error."""
    args = build_record_args(spec(source_url="rtsp://cam/stream1"), BASE)
    assert pair_after(args, "-rtsp_transport") == "tcp"


@pytest.mark.parametrize(
    "url",
    ["http://cam/stream.m3u8", "https://cam/stream", "/dev/video0", "file.mp4"],
)
def test_non_rtsp_sources_get_no_rtsp_option(url: str) -> None:
    """ffmpeg rejects the option outright for demuxers that do not know it,
    so it must not be set unconditionally."""
    assert "-rtsp_transport" not in build_record_args(spec(source_url=url), BASE)


def test_rtsp_detection_ignores_case() -> None:
    args = build_record_args(spec(source_url="RTSP://cam/stream1"), BASE)
    assert pair_after(args, "-rtsp_transport") == "tcp"


def test_transcoded_audio_is_capped_not_fixed() -> None:
    args = build_record_args(spec(audio=AudioMode.TRANSCODE), BASE)
    assert pair_after(args, "-c:a") == "aac"
    assert pair_after(args, "-b:a") == AAC_BITRATE


def test_audio_can_be_copied() -> None:
    args = build_record_args(spec(audio=AudioMode.COPY), BASE)
    assert pair_after(args, "-c:a") == "copy"
    assert "-b:a" not in args


def test_audio_can_be_dropped() -> None:
    args = build_record_args(spec(audio=AudioMode.NONE), BASE)
    assert "-an" in args
    assert "-c:a" not in args


def test_stream_id_identifies_a_stream() -> None:
    assert spec().stream_id == "beispiel/hd"


@pytest.mark.parametrize(
    "overrides",
    [
        {"camera_slug": "../escape"},
        {"stream_key": "a/b"},
        {"segment_seconds": 0},
        {"segment_seconds": -1},
        {"source_url": ""},
    ],
)
def test_invalid_specs_are_rejected(overrides: dict) -> None:
    with pytest.raises(ValueError):
        spec(**overrides)


def test_thumbnail_stops_after_one_frame() -> None:
    """The only place the integration decodes video; it must not run on."""
    args = build_thumbnail_args(Path("/x/seg.mp4"), Path("/x/seg.jpg"))
    assert pair_after(args, "-frames:v") == "1"
    assert pair_after(args, "-vf") == "scale=320:-2"
    assert args[-1] == "/x/seg.jpg"


def test_thumbnail_width_is_adjustable() -> None:
    args = build_thumbnail_args(Path("/x/seg.mp4"), Path("/x/seg.jpg"), width=160)
    assert pair_after(args, "-vf") == "scale=160:-2"


def test_thumbnail_rejects_a_nonpositive_width() -> None:
    with pytest.raises(ValueError):
        build_thumbnail_args(Path("/x/seg.mp4"), Path("/x/seg.jpg"), width=0)


def test_export_never_re_encodes() -> None:
    args = build_concat_args(Path("/tmp/list.txt"), Path("/tmp/out.mp4"))
    assert pair_after(args, "-c") == "copy"
    assert pair_after(args, "-f") == "concat"
    assert pair_after(args, "-safe") == "0"


def test_rtsp_sources_carry_a_read_timeout() -> None:
    """A camera connection can die silently: measured live 2026-08-31, a
    51-minute network freeze left every recording process waiting forever on
    a half-open TCP connection whose camera side had long been reset, and
    recording stayed down for an hour after the network was back. The
    timeout turns that silence into an ffmpeg exit the supervisor restarts.
    Value is microseconds, per ffmpeg -h demuxer=rtsp on 8.0.1."""
    args = build_record_args(spec(), BASE)
    assert pair_after(args, "-timeout") == RTSP_READ_TIMEOUT_US
    # Like -rtsp_transport, the option pair belongs to the RTSP demuxer and
    # must not reach inputs of other protocols.
    http = build_record_args(spec(source_url="http://cam.invalid/x.m3u8"), BASE)
    assert "-timeout" not in http
