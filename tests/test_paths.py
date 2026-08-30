"""Tests for the recording tree layout and the name/time mapping."""

from __future__ import annotations

from datetime import UTC, date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest
from kustos_vision.core import paths

BERLIN = ZoneInfo("Europe/Berlin")


@pytest.mark.parametrize(
    "slug",
    ["kamera", "kamera_1", "a", "beispiel_hd", "x0"],
)
def test_valid_slugs_are_accepted(slug: str) -> None:
    assert paths.is_valid_slug(slug)
    assert paths.validate_slug(slug) == slug


@pytest.mark.parametrize(
    "slug",
    [
        "",
        "..",
        "../etc",
        "a/b",
        "a\\b",
        "Kamera",  # uppercase is not what slugify produces
        "1-2",  # a dash would collide with the day pattern
        "_leading",
        "with space",
        "with.dot",
        "/absolute",
    ],
)
def test_unsafe_slugs_are_rejected(slug: str) -> None:
    """A slug becomes a directory name, so path escapes must not survive."""
    assert not paths.is_valid_slug(slug)
    with pytest.raises(ValueError):
        paths.validate_slug(slug)


def test_segment_output_pattern_is_the_documented_layout() -> None:
    pattern = paths.segment_output_pattern(Path("/media/kustos_vision"), "beispiel", "hd")
    assert pattern == "/media/kustos_vision/beispiel/%Y-%m-%d/%H-%M-%S_hd.mp4"


def test_segment_output_pattern_rejects_an_unsafe_stream_key() -> None:
    with pytest.raises(ValueError):
        paths.segment_output_pattern(Path("/media"), "cam", "../escape")


def test_thumbnail_sits_next_to_its_segment() -> None:
    segment = Path("/media/kustos_vision/cam/2026-01-20/14-30-00_hd.mp4")
    assert paths.thumbnail_for(segment) == Path(
        "/media/kustos_vision/cam/2026-01-20/14-30-00_hd.jpg"
    )


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("14-30-00_hd.mp4", paths.SegmentName(14, 30, 0, "hd")),
        ("00-00-00_sd.mp4", paths.SegmentName(0, 0, 0, "sd")),
        ("23-59-59_stream_2.mp4", paths.SegmentName(23, 59, 59, "stream_2")),
    ],
)
def test_segment_names_are_parsed(name: str, expected: paths.SegmentName) -> None:
    assert paths.parse_segment_name(name) == expected


@pytest.mark.parametrize(
    "name",
    [
        "14-30-00.mp4",  # no stream key
        "14-30_hd.mp4",  # incomplete time
        "24-00-00_hd.mp4",  # hour out of range
        "14-60-00_hd.mp4",  # minute out of range
        "14-30-60_hd.mp4",  # second out of range
        "14-30-00_hd.jpg",  # a thumbnail, not a segment
        "notes.txt",
        "14-30-00_hd.mp4.tmp",
    ],
)
def test_non_segment_names_are_rejected(name: str) -> None:
    assert paths.parse_segment_name(name) is None


@pytest.mark.parametrize(
    ("name", "expected"),
    [("2026-01-20", date(2026, 1, 20)), ("2026-01-01", date(2026, 1, 1))],
)
def test_day_dirs_are_parsed(name: str, expected: date) -> None:
    assert paths.parse_day_dir(name) == expected


@pytest.mark.parametrize("name", ["2026-13-01", "2026-02-30", "26-08-30", "backup"])
def test_non_day_dirs_are_rejected(name: str) -> None:
    assert paths.parse_day_dir(name) is None


def test_unambiguous_local_time_maps_to_utc() -> None:
    start = paths.local_start_to_utc(
        date(2026, 1, 20), paths.SegmentName(14, 30, 0, "hd"), BERLIN
    )
    assert start == datetime(2026, 1, 20, 12, 30, tzinfo=UTC)


def test_ambiguous_autumn_hour_defaults_to_the_earlier_reading() -> None:
    """On 2026-10-25 the local clock repeats 02:00 to 02:59 in Berlin."""
    start = paths.local_start_to_utc(
        date(2026, 10, 25), paths.SegmentName(2, 30, 0, "hd"), BERLIN
    )
    assert start == datetime(2026, 10, 25, 0, 30, tzinfo=UTC)


def test_ambiguous_autumn_hour_uses_the_reference_to_pick_the_later_reading() -> None:
    """A segment cannot start after it was last written, so a late mtime
    identifies the second pass through the repeated hour."""
    start = paths.local_start_to_utc(
        date(2026, 10, 25),
        paths.SegmentName(2, 30, 0, "hd"),
        BERLIN,
        reference_utc=datetime(2026, 10, 25, 1, 35, tzinfo=UTC),
    )
    assert start == datetime(2026, 10, 25, 1, 30, tzinfo=UTC)


def test_ambiguous_autumn_hour_keeps_the_earlier_reading_for_an_early_reference() -> None:
    start = paths.local_start_to_utc(
        date(2026, 10, 25),
        paths.SegmentName(2, 30, 0, "hd"),
        BERLIN,
        reference_utc=datetime(2026, 10, 25, 0, 35, tzinfo=UTC),
    )
    assert start == datetime(2026, 10, 25, 0, 30, tzinfo=UTC)


def test_time_around_the_spring_jump_still_resolves() -> None:
    """2026-03-29 jumps 02:00 to 03:00 in Berlin. ffmpeg never names a file
    inside the missing hour, but a resolution must not raise if one shows up."""
    start = paths.local_start_to_utc(
        date(2026, 3, 29), paths.SegmentName(3, 30, 0, "hd"), BERLIN
    )
    assert start == datetime(2026, 3, 29, 1, 30, tzinfo=UTC)


def test_upcoming_days_covers_the_midnight_handover() -> None:
    assert paths.upcoming_days(date(2026, 1, 20)) == [
        date(2026, 1, 20),
        date(2026, 8, 31),
    ]


def test_upcoming_days_crosses_a_month_boundary() -> None:
    assert paths.upcoming_days(date(2026, 8, 31)) == [
        date(2026, 8, 31),
        date(2026, 9, 1),
    ]


def test_upcoming_days_rejects_a_negative_lookahead() -> None:
    with pytest.raises(ValueError):
        paths.upcoming_days(date(2026, 1, 20), days_ahead=-1)


def test_ensure_day_dirs_creates_today_and_tomorrow(tmp_path: Path) -> None:
    """The segment muxer aborts when its target directory is missing, so both
    sides of the midnight handover have to exist up front."""
    created = paths.ensure_day_dirs(tmp_path, "beispiel", date(2026, 1, 20))
    assert [c.name for c in created] == ["2026-01-20", "2026-08-31"]
    assert all(c.is_dir() for c in created)


def test_ensure_day_dirs_is_idempotent(tmp_path: Path) -> None:
    paths.ensure_day_dirs(tmp_path, "beispiel", date(2026, 1, 20))
    again = paths.ensure_day_dirs(tmp_path, "beispiel", date(2026, 1, 20))
    assert all(c.is_dir() for c in again)


def test_iter_segments_skips_foreign_files(tmp_path: Path) -> None:
    day = tmp_path / "beispiel" / "2026-01-20"
    day.mkdir(parents=True)
    (day / "14-30-00_hd.mp4").touch()
    (day / "14-30-00_hd.jpg").touch()  # thumbnail
    (day / "notes.txt").touch()
    (tmp_path / "beispiel" / "backup").mkdir()
    (tmp_path / "beispiel" / "backup" / "14-30-00_hd.mp4").touch()

    found = [p.name for p in paths.iter_segments(tmp_path)]
    assert found == ["14-30-00_hd.mp4"]


def test_iter_segments_can_be_limited_to_one_camera(tmp_path: Path) -> None:
    for cam in ("beispiel", "garten"):
        day = tmp_path / cam / "2026-01-20"
        day.mkdir(parents=True)
        (day / "14-30-00_hd.mp4").touch()

    assert len(list(paths.iter_segments(tmp_path))) == 2
    only = list(paths.iter_segments(tmp_path, "beispiel"))
    assert len(only) == 1
    assert only[0].parent.parent.name == "beispiel"


def test_iter_segments_on_a_missing_root_is_empty(tmp_path: Path) -> None:
    assert list(paths.iter_segments(tmp_path / "nope")) == []


def test_prune_removes_empty_day_dirs(tmp_path: Path) -> None:
    """Retention deletes files, not directories, so without pruning the tree
    accumulates one empty folder per camera and day."""
    cam = tmp_path / "beispiel"
    (cam / "2026-08-28").mkdir(parents=True)
    (cam / "2026-08-29").mkdir()
    (cam / "2026-08-29" / "14-30-00_hd.mp4").touch()

    removed = paths.prune_empty_day_dirs(tmp_path)
    assert [r.name for r in removed] == ["2026-08-28"]
    assert (cam / "2026-08-29").is_dir()


def test_prune_keeps_the_directories_a_recording_needs(tmp_path: Path) -> None:
    """ensure_day_dirs creates today and tomorrow up front; pruning them away
    again would make ffmpeg abort at midnight."""
    created = paths.ensure_day_dirs(tmp_path, "beispiel", date(2026, 1, 20))
    (tmp_path / "beispiel" / "2026-08-01").mkdir()

    removed = paths.prune_empty_day_dirs(tmp_path, keep=created)
    assert [r.name for r in removed] == ["2026-08-01"]
    assert all(c.is_dir() for c in created)


def test_prune_leaves_the_camera_directory_alone(tmp_path: Path) -> None:
    """An empty camera directory still means a configured camera."""
    (tmp_path / "beispiel" / "2026-08-28").mkdir(parents=True)
    paths.prune_empty_day_dirs(tmp_path)
    assert (tmp_path / "beispiel").is_dir()


def test_prune_ignores_foreign_directories(tmp_path: Path) -> None:
    (tmp_path / "beispiel").mkdir()
    (tmp_path / "beispiel" / "backup").mkdir()
    assert paths.prune_empty_day_dirs(tmp_path) == []
    assert (tmp_path / "beispiel" / "backup").is_dir()


def test_prune_on_a_missing_root_is_harmless(tmp_path: Path) -> None:
    assert paths.prune_empty_day_dirs(tmp_path / "nope") == []
