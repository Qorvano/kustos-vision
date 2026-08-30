"""The segment index: what was recorded, when, and how much space it takes.

Every question the rest of the integration asks about recordings goes through
here rather than through the file system: the timeline needs a range query,
retention needs a global ordering by age, and the storage sensors need sums.
Walking tens of thousands of files for each of those is not viable, so the
facts live in SQLite.

Two deliberate choices:

* **Times are UTC seconds.** File names carry local time because a human reads
  them, but every comparison, sort and retention decision happens on the UTC
  value stored here. See ``paths`` for why the two differ.
* **Paths are relative to the recording root.** The storage target can move
  (a share is remounted elsewhere, the user picks a different disk) without
  invalidating the index.

The module is synchronous on purpose. Home Assistant callers run it through an
executor; keeping it free of async makes it testable as plain Python.
"""

from __future__ import annotations

import sqlite3
from collections.abc import Iterable, Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, date, datetime, tzinfo
from pathlib import Path

from .paths import (
    iter_segments,
    local_start_to_utc,
    parse_day_dir,
    parse_segment_name,
    thumbnail_for,
)

SCHEMA_VERSION = 1

_SCHEMA = """
CREATE TABLE IF NOT EXISTS segments (
    rel_path      TEXT PRIMARY KEY,
    camera_slug   TEXT NOT NULL,
    stream_key    TEXT NOT NULL,
    start_utc     INTEGER NOT NULL,
    duration_s    REAL NOT NULL,
    size_bytes    INTEGER NOT NULL,
    has_thumbnail INTEGER NOT NULL DEFAULT 0
);
-- Retention walks every camera in one global age order.
CREATE INDEX IF NOT EXISTS idx_segments_start ON segments (start_utc);
-- The timeline asks for one camera within one time range.
CREATE INDEX IF NOT EXISTS idx_segments_camera_start
    ON segments (camera_slug, start_utc);
"""


@dataclass(frozen=True, slots=True)
class Segment:
    """One recorded segment, as the index knows it."""

    rel_path: str
    camera_slug: str
    stream_key: str
    start_utc: int
    duration_s: float
    size_bytes: int
    has_thumbnail: bool

    @property
    def end_utc(self) -> float:
        """Wall-clock end of the segment."""
        return self.start_utc + self.duration_s

    def start(self) -> datetime:
        """Start as an aware UTC datetime."""
        return datetime.fromtimestamp(self.start_utc, tz=UTC)

    def absolute(self, base: Path) -> Path:
        """Resolve against a recording root."""
        return base / self.rel_path


@dataclass(frozen=True, slots=True)
class Block:
    """A run of segments with no gap between them, as the timeline draws it."""

    camera_slug: str
    stream_key: str
    start_utc: float
    end_utc: float
    segments: int

    @property
    def duration_s(self) -> float:
        return self.end_utc - self.start_utc


def _row_to_segment(row: sqlite3.Row) -> Segment:
    return Segment(
        rel_path=row["rel_path"],
        camera_slug=row["camera_slug"],
        stream_key=row["stream_key"],
        start_utc=row["start_utc"],
        duration_s=row["duration_s"],
        size_bytes=row["size_bytes"],
        has_thumbnail=bool(row["has_thumbnail"]),
    )


class SegmentIndex:
    """SQLite-backed index over the recording tree."""

    def __init__(self, db_path: Path) -> None:
        self._db_path = db_path

    def initialise(self) -> None:
        """Create the schema, or migrate an older one into place."""
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript(_SCHEMA)
            current = conn.execute("PRAGMA user_version").fetchone()[0]
            if current == 0:
                conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
            elif current != SCHEMA_VERSION:
                raise RuntimeError(
                    f"segment index schema {current} is not supported "
                    f"(expected {SCHEMA_VERSION})"
                )

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        # WAL keeps a reader (the timeline) from blocking the writer (the
        # scanner), which otherwise shows up as a stalled panel.
        conn.execute("PRAGMA journal_mode = WAL")
        try:
            with conn:
                yield conn
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Writing
    # ------------------------------------------------------------------

    def upsert(self, segments: Iterable[Segment]) -> int:
        """Insert or refresh segments. Returns the number of rows written.

        Refreshing matters for the segment that is currently being written:
        its size and duration grow until ffmpeg moves on to the next one.
        """
        rows = [
            (
                s.rel_path,
                s.camera_slug,
                s.stream_key,
                s.start_utc,
                s.duration_s,
                s.size_bytes,
                int(s.has_thumbnail),
            )
            for s in segments
        ]
        if not rows:
            return 0
        with self._connect() as conn:
            conn.executemany(
                """
                INSERT INTO segments
                    (rel_path, camera_slug, stream_key, start_utc,
                     duration_s, size_bytes, has_thumbnail)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(rel_path) DO UPDATE SET
                    duration_s = excluded.duration_s,
                    size_bytes = excluded.size_bytes,
                    has_thumbnail = excluded.has_thumbnail
                """,
                rows,
            )
        return len(rows)

    def forget(self, rel_paths: Iterable[str]) -> int:
        """Drop segments from the index. Returns the number of rows removed."""
        paths = [(p,) for p in rel_paths]
        if not paths:
            return 0
        with self._connect() as conn:
            cursor = conn.executemany("DELETE FROM segments WHERE rel_path = ?", paths)
            return cursor.rowcount if cursor.rowcount > 0 else len(paths)

    def clear(self) -> None:
        """Empty the index, for a rebuild from the file system."""
        with self._connect() as conn:
            conn.execute("DELETE FROM segments")

    # ------------------------------------------------------------------
    # Reading
    # ------------------------------------------------------------------

    def knows(self, rel_path: str) -> bool:
        """Whether the index holds this exact segment.

        A primary-key lookup, because the file endpoints ask it once per
        request: loading every path to answer it would turn every seek in the
        timeline into a full table scan.
        """
        with self._connect() as conn:
            row = conn.execute(
                "SELECT 1 FROM segments WHERE rel_path = ? LIMIT 1", (rel_path,)
            ).fetchone()
        return row is not None

    def all_paths(self) -> set[str]:
        """Every relative path the index knows."""
        with self._connect() as conn:
            return {row[0] for row in conn.execute("SELECT rel_path FROM segments")}

    def count(self) -> int:
        with self._connect() as conn:
            return conn.execute("SELECT COUNT(*) FROM segments").fetchone()[0]

    def total_bytes(self) -> int:
        with self._connect() as conn:
            return conn.execute(
                "SELECT COALESCE(SUM(size_bytes), 0) FROM segments"
            ).fetchone()[0]

    def bytes_by_camera(self) -> dict[str, int]:
        with self._connect() as conn:
            return {
                row["camera_slug"]: row["total"]
                for row in conn.execute(
                    "SELECT camera_slug, SUM(size_bytes) AS total "
                    "FROM segments GROUP BY camera_slug"
                )
            }

    def oldest_start(self, camera_slug: str | None = None) -> int | None:
        """Start of the oldest segment, i.e. how far back coverage reaches."""
        sql = "SELECT MIN(start_utc) FROM segments"
        params: tuple[str, ...] = ()
        if camera_slug is not None:
            sql += " WHERE camera_slug = ?"
            params = (camera_slug,)
        with self._connect() as conn:
            return conn.execute(sql, params).fetchone()[0]

    def in_range(
        self,
        start_utc: float,
        end_utc: float,
        camera_slug: str | None = None,
        stream_key: str | None = None,
    ) -> list[Segment]:
        """Segments overlapping a time window, oldest first.

        A segment counts as overlapping when it starts before the window ends
        and ends after the window begins, so the segment straddling the left
        edge is included rather than silently dropped.
        """
        sql = [
            "SELECT * FROM segments WHERE start_utc < ? "
            "AND (start_utc + duration_s) > ?"
        ]
        params: list[object] = [end_utc, start_utc]
        if camera_slug is not None:
            sql.append("AND camera_slug = ?")
            params.append(camera_slug)
        if stream_key is not None:
            sql.append("AND stream_key = ?")
            params.append(stream_key)
        sql.append("ORDER BY start_utc")
        with self._connect() as conn:
            return [_row_to_segment(r) for r in conn.execute(" ".join(sql), params)]

    def oldest_first(self, limit: int | None = None) -> list[Segment]:
        """Every segment in global age order, which is what size-based
        retention deletes along."""
        sql = "SELECT * FROM segments ORDER BY start_utc"
        if limit is not None:
            sql += f" LIMIT {int(limit)}"
        with self._connect() as conn:
            return [_row_to_segment(r) for r in conn.execute(sql)]

    def older_than(self, cutoff_utc: float, camera_slug: str) -> list[Segment]:
        """Segments of one camera that start before a cutoff, oldest first."""
        with self._connect() as conn:
            return [
                _row_to_segment(r)
                for r in conn.execute(
                    "SELECT * FROM segments WHERE camera_slug = ? AND start_utc < ? "
                    "ORDER BY start_utc",
                    (camera_slug, cutoff_utc),
                )
            ]

    def cameras(self) -> list[str]:
        with self._connect() as conn:
            return [
                row[0]
                for row in conn.execute(
                    "SELECT DISTINCT camera_slug FROM segments ORDER BY camera_slug"
                )
            ]

    def days_with_recordings(self, camera_slug: str, local_tz: tzinfo) -> list[date]:
        """Local days that hold at least one segment, for the timeline's day
        picker. Derived from the stored UTC values, not from directory names,
        so a day is listed exactly when it actually has content."""
        with self._connect() as conn:
            starts = [
                row[0]
                for row in conn.execute(
                    "SELECT start_utc FROM segments WHERE camera_slug = ? "
                    "ORDER BY start_utc",
                    (camera_slug,),
                )
            ]
        seen: dict[date, None] = {}
        for start in starts:
            day = datetime.fromtimestamp(start, tz=UTC).astimezone(local_tz).date()
            seen.setdefault(day, None)
        return list(seen)


def blocks_from_segments(
    segments: list[Segment], max_gap_s: float
) -> list[Block]:
    """Collapse consecutive segments into gap-free blocks for the timeline.

    ``max_gap_s`` is the tolerance for what still counts as continuous. It
    exists because a cut can only land on a keyframe, so consecutive segments
    touch within a fraction of a second rather than exactly. Anything larger is
    a real gap (camera reboot, network loss, Home Assistant restart) and is
    drawn as one, because that is information the user needs.
    """
    if max_gap_s < 0:
        raise ValueError("max_gap_s must not be negative")
    blocks: list[Block] = []
    for segment in segments:
        previous = blocks[-1] if blocks else None
        continues = (
            previous is not None
            and previous.camera_slug == segment.camera_slug
            and previous.stream_key == segment.stream_key
            and segment.start_utc - previous.end_utc <= max_gap_s
        )
        if continues and previous is not None:
            blocks[-1] = Block(
                previous.camera_slug,
                previous.stream_key,
                previous.start_utc,
                max(previous.end_utc, segment.end_utc),
                previous.segments + 1,
            )
        else:
            blocks.append(
                Block(
                    segment.camera_slug,
                    segment.stream_key,
                    float(segment.start_utc),
                    segment.end_utc,
                    1,
                )
            )
    return blocks


def scan_segment(path: Path, base: Path, local_tz: tzinfo) -> Segment | None:
    """Describe one segment file, or None when it is not one.

    The duration is taken as ``mtime - start`` rather than probed: that is the
    wall-clock span the segment actually covers, which is what the timeline
    places on the day, and it costs no subprocess. The segment ffmpeg is
    currently writing reports a short duration until the next scan corrects it.
    """
    parsed = parse_segment_name(path.name)
    if parsed is None:
        return None
    day = parse_day_dir(path.parent.name)
    if day is None:
        return None
    try:
        stat = path.stat()
    except OSError:
        return None

    mtime_utc = datetime.fromtimestamp(stat.st_mtime, tz=UTC)
    start = local_start_to_utc(day, parsed, local_tz, reference_utc=mtime_utc)
    duration = max(0.0, stat.st_mtime - start.timestamp())

    return Segment(
        rel_path=str(path.relative_to(base)),
        camera_slug=path.parent.parent.name,
        stream_key=parsed.stream_key,
        start_utc=int(start.timestamp()),
        duration_s=duration,
        size_bytes=stat.st_size,
        has_thumbnail=thumbnail_for(path).is_file(),
    )


def scan_tree(base: Path, local_tz: tzinfo, camera_slug: str | None = None) -> list[Segment]:
    """Describe every segment below the recording root."""
    found = []
    for path in iter_segments(base, camera_slug):
        segment = scan_segment(path, base, local_tz)
        if segment is not None:
            found.append(segment)
    return found


@dataclass(frozen=True, slots=True)
class ScanResult:
    """What one incremental scan of the recording tree found."""

    changed: tuple[Segment, ...]
    """Segments to write to the index: new ones, plus the ones asked to be
    refreshed because they are still growing."""

    vanished: tuple[str, ...]
    """Relative paths the index still holds but the file system no longer has,
    because a user deleted files by hand or a share was remounted."""


def scan_incremental(
    base: Path,
    local_tz: tzinfo,
    known: set[str],
    refresh: set[str] = frozenset(),
) -> ScanResult:
    """Scan the tree without stat()ing files whose facts cannot have changed.

    A full scan stats every file, which on a network share with tens of
    thousands of segments is the most expensive thing the integration does, and
    it would run on every maintenance pass. Listing directory entries is cheap;
    stat() is not. So only two kinds of file are actually stat()ed: ones the
    index has never seen, and ones named in ``refresh`` because they are still
    being written and their size and duration are still growing.
    """
    seen: set[str] = set()
    changed: list[Segment] = []

    for path in iter_segments(base):
        try:
            rel_path = str(path.relative_to(base))
        except ValueError:
            continue
        seen.add(rel_path)
        if rel_path in known and rel_path not in refresh:
            continue
        segment = scan_segment(path, base, local_tz)
        if segment is not None:
            changed.append(segment)

    return ScanResult(changed=tuple(changed), vanished=tuple(sorted(known - seen)))
