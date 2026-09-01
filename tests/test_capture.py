"""Tests for the frame-capture arguments and the frame ring.

The reason this module exists at all: the trigger promises "now", and a
camera entity does not - integrations may serve stills that are minutes old.
The arguments here decode one frame from the camera's own stream instead.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from kustos_vision.core.capture import (
    FRAME_LONG_EDGE,
    build_frame_args,
    frame_name,
    frame_slot,
    frames_dir,
    is_frame_name,
)
from kustos_vision.core.recorder import RTSP_READ_TIMEOUT_US

TARGET = Path("/tmp/frame.jpg")


# ----------------------------------------------------------------------
# ffmpeg arguments
# ----------------------------------------------------------------------


def test_an_rtsp_source_is_forced_onto_tcp_with_a_read_timeout() -> None:
    """UDP drops packets silently, and a half-open connection has to become an
    exit rather than a wait - the recorder's reasoning, applied here."""
    args = build_frame_args("rtsp://cam.local/stream1", TARGET)
    assert args[args.index("-rtsp_transport") + 1] == "tcp"
    assert args[args.index("-timeout") + 1] == RTSP_READ_TIMEOUT_US


def test_a_non_rtsp_source_gets_no_rtsp_options() -> None:
    """ffmpeg rejects -rtsp_transport on a demuxer that is not RTSP, so the
    option must not leak onto an HTTP or file source."""
    args = build_frame_args("http://cam.local/snapshot.mjpeg", TARGET)
    assert "-rtsp_transport" not in args


def test_exactly_one_video_frame_and_no_audio() -> None:
    args = build_frame_args("rtsp://cam.local/s", TARGET)
    assert args[args.index("-frames:v") + 1] == "1"
    assert "-an" in args


def test_the_scale_never_enlarges() -> None:
    """Regression guard: min() on BOTH edges. Upscaling a small stream would
    invent detail the model then answers from."""
    args = build_frame_args("rtsp://cam.local/s", TARGET)
    filter_expr = args[args.index("-vf") + 1]
    assert f"min({FRAME_LONG_EDGE},iw)" in filter_expr
    assert f"min({FRAME_LONG_EDGE},ih)" in filter_expr
    assert "force_original_aspect_ratio=decrease" in filter_expr


def test_a_nonsense_long_edge_is_refused() -> None:
    with pytest.raises(ValueError):
        build_frame_args("rtsp://cam.local/s", TARGET, long_edge=0)


# ----------------------------------------------------------------------
# The ring
# ----------------------------------------------------------------------


def test_the_ring_names_are_stable_and_recognised() -> None:
    assert frame_name(0) == "frame_00.jpg"
    assert is_frame_name("frame_00.jpg")
    assert is_frame_name("frame_19.jpg")


def test_names_outside_the_ring_shape_are_rejected() -> None:
    """The name check IS the serving endpoint's authorisation, so anything
    that is not exactly a ring slot has to fail it."""
    for name in ("frame_0.jpg", "frame_100.jpg", "../frame_00.jpg",
                 "frame_00.png", "frame_aa.jpg", "index.db"):
        assert not is_frame_name(name)


def test_twenty_runs_fill_twenty_distinct_slots() -> None:
    slots = {frame_slot(counter, 20) for counter in range(20)}
    assert len(slots) == 20


def test_the_twenty_first_run_reuses_the_oldest_slot() -> None:
    """By the time a slot comes round again, the history entry that pointed at
    it has been dropped - the ring and the history cannot get out of step."""
    assert frame_slot(20, 20) == frame_slot(0, 20)
    assert frame_slot(20, 20) != frame_slot(1, 20)


def test_the_frames_dir_refuses_an_escaping_slug() -> None:
    with pytest.raises(ValueError):
        frames_dir(Path("/config/kustos_vision"), "../etc")


def test_the_frames_dir_stays_below_the_state_dir() -> None:
    base = Path("/config/kustos_vision")
    assert frames_dir(base, "vorgarten") == base / "frames" / "vorgarten"
