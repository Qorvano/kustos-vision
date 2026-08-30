"""Tests for the segment index."""

from __future__ import annotations

from datetime import UTC, date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest
from kustos_vision.core.index import (
    Segment,
    SegmentIndex,
    blocks_from_segments,
    scan_segment,
    scan_tree,
)

BERLIN = ZoneInfo("Europe/Berlin")
T0 = int(datetime(2026, 6, 15, 12, 0, tzinfo=UTC).timestamp())


def seg(
    offset: int = 0,
    *,
    camera: str = "beispiel",
    stream: str = "hd",
    duration: float = 300.0,
    size: int = 1000,
    thumb: bool = False,
) -> Segment:
    start = T0 + offset
    day = datetime.fromtimestamp(start, tz=UTC).astimezone(BERLIN)
    return Segment(
        rel_path=f"{camera}/{day:%Y-%m-%d}/{day:%H-%M-%S}_{stream}.mp4",
        camera_slug=camera,
        stream_key=stream,
        start_utc=start,
        duration_s=duration,
        size_bytes=size,
        has_thumbnail=thumb,
    )


@pytest.fixture
def index(tmp_path: Path) -> SegmentIndex:
    idx = SegmentIndex(tmp_path / "sub" / "index.db")
    idx.initialise()
    return idx


def test_initialise_creates_the_parent_directory(tmp_path: Path) -> None:
    idx = SegmentIndex(tmp_path / "deep" / "nested" / "index.db")
    idx.initialise()
    assert (tmp_path / "deep" / "nested" / "index.db").is_file()


def test_initialise_is_idempotent(index: SegmentIndex) -> None:
    index.upsert([seg()])
    index.initialise()
    assert index.count() == 1


def test_an_unknown_schema_version_is_refused(tmp_path: Path) -> None:
    """A newer index must not be silently written to by older code."""
    import sqlite3

    db = tmp_path / "index.db"
    SegmentIndex(db).initialise()
    with sqlite3.connect(db) as conn:
        conn.execute("PRAGMA user_version = 99")
    with pytest.raises(RuntimeError, match="schema 99"):
        SegmentIndex(db).initialise()


def test_segments_round_trip(index: SegmentIndex) -> None:
    index.upsert([seg(0), seg(300)])
    assert index.count() == 2
    assert index.total_bytes() == 2000


def test_upsert_refreshes_the_segment_being_written(index: SegmentIndex) -> None:
    """The in-progress segment grows between scans; re-indexing must update it
    rather than insert a duplicate."""
    index.upsert([seg(0, duration=12.0, size=500)])
    index.upsert([seg(0, duration=300.0, size=9000, thumb=True)])

    assert index.count() == 1
    stored = index.oldest_first()[0]
    assert stored.duration_s == 300.0
    assert stored.size_bytes == 9000
    assert stored.has_thumbnail is True


def test_upsert_of_nothing_is_harmless(index: SegmentIndex) -> None:
    assert index.upsert([]) == 0


def test_forget_removes_segments(index: SegmentIndex) -> None:
    a, b = seg(0), seg(300)
    index.upsert([a, b])
    index.forget([a.rel_path])
    assert [s.rel_path for s in index.oldest_first()] == [b.rel_path]


def test_forget_of_nothing_is_harmless(index: SegmentIndex) -> None:
    assert index.forget([]) == 0


def test_clear_empties_the_index(index: SegmentIndex) -> None:
    index.upsert([seg(0), seg(300)])
    index.clear()
    assert index.count() == 0
    assert index.total_bytes() == 0


def test_totals_are_grouped_per_camera(index: SegmentIndex) -> None:
    index.upsert(
        [
            seg(0, camera="beispiel", size=100),
            seg(300, camera="beispiel", size=200),
            seg(0, camera="muster", size=50),
        ]
    )
    assert index.bytes_by_camera() == {"beispiel": 300, "muster": 50}


def test_oldest_start_reports_coverage(index: SegmentIndex) -> None:
    index.upsert([seg(600, camera="beispiel"), seg(0, camera="muster")])
    assert index.oldest_start() == T0
    assert index.oldest_start("beispiel") == T0 + 600


def test_oldest_start_of_an_empty_index_is_none(index: SegmentIndex) -> None:
    assert index.oldest_start() is None


def test_range_query_includes_a_segment_straddling_the_left_edge(
    index: SegmentIndex,
) -> None:
    """A segment that began before the window but runs into it holds the
    footage the user asked for and must not be dropped."""
    index.upsert([seg(0, duration=300.0)])
    found = index.in_range(T0 + 100, T0 + 200)
    assert len(found) == 1


def test_range_query_excludes_segments_that_end_before_the_window(
    index: SegmentIndex,
) -> None:
    index.upsert([seg(0, duration=300.0)])
    assert index.in_range(T0 + 300, T0 + 600) == []


def test_range_query_excludes_segments_starting_after_the_window(
    index: SegmentIndex,
) -> None:
    index.upsert([seg(600, duration=300.0)])
    assert index.in_range(T0, T0 + 600) == []


def test_range_query_can_filter_by_camera_and_stream(index: SegmentIndex) -> None:
    index.upsert(
        [
            seg(0, camera="beispiel", stream="hd"),
            seg(0, camera="beispiel", stream="sd"),
            seg(0, camera="muster", stream="hd"),
        ]
    )
    assert len(index.in_range(T0, T0 + 300)) == 3
    assert len(index.in_range(T0, T0 + 300, camera_slug="beispiel")) == 2
    assert len(index.in_range(T0, T0 + 300, camera_slug="beispiel", stream_key="hd")) == 1


def test_oldest_first_is_globally_ordered(index: SegmentIndex) -> None:
    index.upsert([seg(600, camera="muster"), seg(0, camera="beispiel"), seg(300)])
    assert [s.start_utc for s in index.oldest_first()] == [T0, T0 + 300, T0 + 600]


def test_older_than_is_limited_to_one_camera(index: SegmentIndex) -> None:
    index.upsert([seg(0, camera="beispiel"), seg(0, camera="muster")])
    found = index.older_than(T0 + 1, "beispiel")
    assert len(found) == 1
    assert found[0].camera_slug == "beispiel"


def test_cameras_are_listed(index: SegmentIndex) -> None:
    index.upsert([seg(0, camera="beispiel"), seg(0, camera="muster")])
    assert index.cameras() == ["beispiel", "muster"]


def test_days_with_recordings_uses_local_days(index: SegmentIndex) -> None:
    """23:30 UTC is already the next day in Berlin, and the day picker has to
    show the day the user would look for."""
    late = int(datetime(2026, 6, 15, 23, 30, tzinfo=UTC).timestamp())
    index.upsert(
        [
            Segment("a.mp4", "beispiel", "hd", late, 300.0, 1, False),
            Segment("b.mp4", "beispiel", "hd", T0, 300.0, 1, False),
        ]
    )
    assert index.days_with_recordings("beispiel", BERLIN) == [
        date(2026, 6, 15),
        date(2026, 6, 16),
    ]


def test_blocks_merge_touching_segments() -> None:
    blocks = blocks_from_segments([seg(0, duration=300.0), seg(300, duration=300.0)], 1.0)
    assert len(blocks) == 1
    assert blocks[0].segments == 2
    assert blocks[0].duration_s == 600.0


def test_blocks_tolerate_a_keyframe_sized_seam() -> None:
    """Cuts land on keyframes, so consecutive segments touch within a fraction
    of a second rather than exactly."""
    blocks = blocks_from_segments([seg(0, duration=299.6), seg(300)], 1.0)
    assert len(blocks) == 1


def test_blocks_split_on_a_real_gap() -> None:
    """A camera reboot or a Home Assistant restart is information the user
    needs to see, not something to smooth over."""
    blocks = blocks_from_segments([seg(0, duration=300.0), seg(3600)], 1.0)
    assert len(blocks) == 2


def test_blocks_never_merge_across_streams() -> None:
    blocks = blocks_from_segments(
        [seg(0, stream="hd", duration=300.0), seg(300, stream="sd")], 1.0
    )
    assert len(blocks) == 2


def test_blocks_of_nothing_are_nothing() -> None:
    assert blocks_from_segments([], 1.0) == []


def test_blocks_reject_a_negative_tolerance() -> None:
    with pytest.raises(ValueError):
        blocks_from_segments([], -1.0)


def test_scan_reads_a_real_file(tmp_path: Path) -> None:
    import os

    day = tmp_path / "beispiel" / "2026-06-15"
    day.mkdir(parents=True)
    path = day / "14-30-00_hd.mp4"
    path.write_bytes(b"x" * 4096)

    start_local = datetime(2026, 6, 15, 14, 30, tzinfo=BERLIN)
    # mtime is when the segment was last written, so it marks the end.
    end = start_local.timestamp() + 300
    os.utime(path, (end, end))

    found = scan_segment(path, tmp_path, BERLIN)
    assert found is not None
    assert found.camera_slug == "beispiel"
    assert found.stream_key == "hd"
    assert found.rel_path == "beispiel/2026-06-15/14-30-00_hd.mp4"
    assert found.size_bytes == 4096
    assert found.duration_s == pytest.approx(300.0)
    assert found.has_thumbnail is False


def test_scan_notices_a_thumbnail(tmp_path: Path) -> None:
    day = tmp_path / "beispiel" / "2026-06-15"
    day.mkdir(parents=True)
    (day / "14-30-00_hd.mp4").write_bytes(b"x")
    (day / "14-30-00_hd.jpg").write_bytes(b"y")

    found = scan_segment(day / "14-30-00_hd.mp4", tmp_path, BERLIN)
    assert found is not None and found.has_thumbnail is True


def test_scan_never_reports_a_negative_duration(tmp_path: Path) -> None:
    """A clock correction can put mtime before the name's timestamp."""
    import os

    day = tmp_path / "beispiel" / "2026-06-15"
    day.mkdir(parents=True)
    path = day / "14-30-00_hd.mp4"
    path.write_bytes(b"x")
    early = datetime(2026, 6, 15, 14, 0, tzinfo=BERLIN).timestamp()
    os.utime(path, (early, early))

    found = scan_segment(path, tmp_path, BERLIN)
    assert found is not None and found.duration_s == 0.0


def test_scan_rejects_a_foreign_file(tmp_path: Path) -> None:
    day = tmp_path / "beispiel" / "2026-06-15"
    day.mkdir(parents=True)
    (day / "notes.txt").write_bytes(b"x")
    assert scan_segment(day / "notes.txt", tmp_path, BERLIN) is None


def test_scan_of_a_vanished_file_is_none(tmp_path: Path) -> None:
    day = tmp_path / "beispiel" / "2026-06-15"
    day.mkdir(parents=True)
    assert scan_segment(day / "14-30-00_hd.mp4", tmp_path, BERLIN) is None


def test_scan_tree_finds_every_camera(tmp_path: Path) -> None:
    for cam in ("beispiel", "muster"):
        day = tmp_path / cam / "2026-06-15"
        day.mkdir(parents=True)
        (day / "14-30-00_hd.mp4").write_bytes(b"x")

    assert len(scan_tree(tmp_path, BERLIN)) == 2
    assert len(scan_tree(tmp_path, BERLIN, "beispiel")) == 1


def _tree(root: Path, *names: str) -> None:
    day = root / "beispiel" / "2026-06-15"
    day.mkdir(parents=True, exist_ok=True)
    for name in names:
        (day / name).write_bytes(b"x")


def test_incremental_scan_reports_new_segments(tmp_path: Path) -> None:
    from kustos_vision.core.index import scan_incremental

    _tree(tmp_path, "14-30-00_hd.mp4", "14-35-00_hd.mp4")
    result = scan_incremental(tmp_path, BERLIN, known=set())
    assert len(result.changed) == 2
    assert result.vanished == ()


def test_incremental_scan_skips_files_it_already_knows(tmp_path: Path) -> None:
    """stat() on a network share is the expensive part, so a file whose facts
    cannot have changed must not be touched at all."""
    from kustos_vision.core.index import scan_incremental

    _tree(tmp_path, "14-30-00_hd.mp4", "14-35-00_hd.mp4")
    known = {"beispiel/2026-06-15/14-30-00_hd.mp4"}
    result = scan_incremental(tmp_path, BERLIN, known=known)
    assert [s.rel_path for s in result.changed] == [
        "beispiel/2026-06-15/14-35-00_hd.mp4"
    ]


def test_incremental_scan_refreshes_the_growing_segment(tmp_path: Path) -> None:
    """The segment ffmpeg is writing into keeps growing, so its size and
    duration have to be re-read even though the index knows the path."""
    from kustos_vision.core.index import scan_incremental

    _tree(tmp_path, "14-30-00_hd.mp4")
    rel = "beispiel/2026-06-15/14-30-00_hd.mp4"
    result = scan_incremental(tmp_path, BERLIN, known={rel}, refresh={rel})
    assert [s.rel_path for s in result.changed] == [rel]


def test_incremental_scan_reports_files_deleted_behind_its_back(tmp_path: Path) -> None:
    from kustos_vision.core.index import scan_incremental

    _tree(tmp_path, "14-30-00_hd.mp4")
    known = {
        "beispiel/2026-06-15/14-30-00_hd.mp4",
        "beispiel/2026-08-29/09-00-00_hd.mp4",
    }
    result = scan_incremental(tmp_path, BERLIN, known=known)
    assert result.vanished == ("beispiel/2026-08-29/09-00-00_hd.mp4",)


def test_knows_answers_for_a_single_path(index: SegmentIndex) -> None:
    """A primary-key lookup, because the file endpoints ask it once per
    request; loading every path would turn each seek into a table scan."""
    a = seg(0)
    index.upsert([a])
    assert index.knows(a.rel_path) is True
    assert index.knows("beispiel/2026-06-15/99-99-99_hd.mp4") is False


def test_knows_on_an_empty_index_is_false(index: SegmentIndex) -> None:
    assert index.knows("anything.mp4") is False
