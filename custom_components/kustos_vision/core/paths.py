"""Layout of the recording tree, and the mapping between file names and time.

The on-disk layout is deliberately plain so that it stays readable in any
file manager, independent of this integration:

    <base>/<camera_slug>/<YYYY-MM-DD>/<HH-MM-SS>_<stream_key>.mp4
    <base>/<camera_slug>/<YYYY-MM-DD>/<HH-MM-SS>_<stream_key>.jpg

File names carry **local** time because a human reads them; ffmpeg's
``-strftime`` writes them in the process timezone and we cannot change that
without giving up the readable name. The index stores **UTC**. Everything
that compares, sorts or retains segments works on the UTC value, never on
the name.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Iterator
from datetime import UTC, date, datetime, timedelta, tzinfo
from pathlib import Path
from typing import NamedTuple

SEGMENT_SUFFIX = ".mp4"
THUMBNAIL_SUFFIX = ".jpg"

# strftime patterns handed to ffmpeg. The day is a directory so that a single
# day can be listed, archived or deleted without touching the rest.
DAY_PATTERN = "%Y-%m-%d"
TIME_PATTERN = "%H-%M-%S"

_DAY_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
_SEGMENT_RE = re.compile(r"^(\d{2})-(\d{2})-(\d{2})_(.+)\.mp4$")

# A slug becomes a directory name, so it must not be able to escape the
# recording root. This is the character set Home Assistant's own slugify
# produces, restated here to keep this module free of HA imports.
_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_]*$")


class SegmentName(NamedTuple):
    """The parts a segment file name carries."""

    hour: int
    minute: int
    second: int
    stream_key: str


def is_valid_slug(slug: str) -> bool:
    """Return True when the slug is safe to use as a directory name."""
    return bool(_SLUG_RE.match(slug))


def validate_slug(slug: str) -> str:
    """Return the slug, or raise ValueError when it is not safe."""
    if not is_valid_slug(slug):
        raise ValueError(f"unsafe slug for a directory name: {slug!r}")
    return slug


def camera_dir(base: Path, camera_slug: str) -> Path:
    """Return the directory holding every recording of one camera."""
    return base / validate_slug(camera_slug)


def day_dir(base: Path, camera_slug: str, day: date) -> Path:
    """Return the directory holding one camera's recordings for one day."""
    return camera_dir(base, camera_slug) / day.strftime(DAY_PATTERN)


def segment_output_pattern(base: Path, camera_slug: str, stream_key: str) -> str:
    """Return the ``-strftime`` target ffmpeg writes its segments to.

    ffmpeg expands the strftime placeholders itself and, with
    ``-strftime_mkdir``, creates the day directory on the way.
    """
    validate_slug(camera_slug)
    validate_slug(stream_key)
    name = f"{TIME_PATTERN}_{stream_key}{SEGMENT_SUFFIX}"
    return str(base / camera_slug / DAY_PATTERN / name)


def thumbnail_for(segment: Path) -> Path:
    """Return the thumbnail path belonging to a segment."""
    return segment.with_suffix(THUMBNAIL_SUFFIX)


def parse_day_dir(name: str) -> date | None:
    """Return the date a day directory stands for, or None if it is not one."""
    match = _DAY_RE.match(name)
    if not match:
        return None
    try:
        return date(int(match[1]), int(match[2]), int(match[3]))
    except ValueError:
        return None


def parse_segment_name(name: str) -> SegmentName | None:
    """Return the parts of a segment file name, or None if it is not one."""
    match = _SEGMENT_RE.match(name)
    if not match:
        return None
    hour, minute, second = int(match[1]), int(match[2]), int(match[3])
    if hour > 23 or minute > 59 or second > 59:
        return None
    return SegmentName(hour, minute, second, match[4])


def local_start_to_utc(
    day: date,
    parsed: SegmentName,
    local_tz: tzinfo,
    reference_utc: datetime | None = None,
) -> datetime:
    """Resolve the local wall-clock start of a segment to UTC.

    Once a year the local clock repeats an hour, so a file name is ambiguous:
    the same ``02-30-00`` exists twice, an hour apart. ``reference_utc`` (the
    file's modification time, i.e. when the segment was last written) breaks
    the tie, because a segment can only start at or before it. Without a
    reference the earlier reading is used.

    The opposite case, a local time that never happened because the clock
    jumped forward, cannot appear here: ffmpeg names its files from the same
    local clock, so it never produces a name inside the missing hour.
    """
    naive = datetime(
        day.year, day.month, day.day, parsed.hour, parsed.minute, parsed.second
    )
    earlier = naive.replace(tzinfo=local_tz, fold=0)
    later = naive.replace(tzinfo=local_tz, fold=1)

    if earlier.utcoffset() == later.utcoffset():
        return earlier.astimezone(UTC)

    candidates = sorted(c.astimezone(UTC) for c in (earlier, later))
    if reference_utc is None:
        return candidates[0]
    plausible = [c for c in candidates if c <= reference_utc]
    return plausible[-1] if plausible else candidates[0]


def iter_camera_dirs(base: Path) -> Iterator[Path]:
    """Yield every camera directory below the recording root."""
    if not base.is_dir():
        return
    for entry in sorted(base.iterdir()):
        if entry.is_dir() and is_valid_slug(entry.name):
            yield entry


def iter_segments(base: Path, camera_slug: str | None = None) -> Iterator[Path]:
    """Yield every segment file below the recording root, oldest name first.

    Only files that match the naming scheme are yielded, so foreign files in
    the tree are ignored rather than mistaken for recordings.
    """
    roots = (
        [camera_dir(base, camera_slug)] if camera_slug else list(iter_camera_dirs(base))
    )
    for root in roots:
        if not root.is_dir():
            continue
        for day_entry in sorted(root.iterdir()):
            if not day_entry.is_dir() or parse_day_dir(day_entry.name) is None:
                continue
            for file_entry in sorted(day_entry.iterdir()):
                if file_entry.is_file() and parse_segment_name(file_entry.name):
                    yield file_entry


def upcoming_days(today: date, days_ahead: int = 1) -> list[date]:
    """Return the days a currently running recording can still write into.

    A recording only ever changes its target directory at local midnight, so
    knowing today and the next day is enough to cover every handover, as long
    as this is refreshed at least once per day.
    """
    if days_ahead < 0:
        raise ValueError("days_ahead must not be negative")
    return [today + timedelta(days=offset) for offset in range(days_ahead + 1)]


def ensure_day_dirs(
    base: Path, camera_slug: str, today: date, days_ahead: int = 1
) -> list[Path]:
    """Create the day directories a running recording will write into.

    The segment muxer has no ``strftime_mkdir`` option and aborts the entire
    process when its target directory is missing, so the directories have to
    exist before ffmpeg reaches midnight. Creating them is idempotent and an
    empty directory costs nothing.
    """
    created: list[Path] = []
    for day in upcoming_days(today, days_ahead):
        target = day_dir(base, camera_slug, day)
        target.mkdir(parents=True, exist_ok=True)
        created.append(target)
    return created


def prune_empty_day_dirs(base: Path, keep: Iterable[Path] = ()) -> list[Path]:
    """Remove day directories that hold no files, returning what was removed.

    Retention deletes files, not directories, so without this the tree
    accumulates an empty folder per camera and day. ``keep`` names directories
    that must survive even while empty: the ones a running recording is about
    to write into, which ``ensure_day_dirs`` has just created.
    """
    protected = {Path(p).resolve() for p in keep}
    removed: list[Path] = []
    for camera in iter_camera_dirs(base):
        for entry in sorted(camera.iterdir()):
            if not entry.is_dir() or parse_day_dir(entry.name) is None:
                continue
            if entry.resolve() in protected or any(entry.iterdir()):
                continue
            try:
                entry.rmdir()
            except OSError:
                continue
            removed.append(entry)
    return removed


def prepare_storage(base: Path) -> None:
    """Make sure the recording location exists and can be written to.

    Raises OSError with the real reason when it cannot; the caller decides
    what that means. A network share that failed to mount surfaces here as a
    read-only placeholder, measured live as [Errno 30] on a mount the
    supervisor could not bring up after a crash.
    """
    base.mkdir(parents=True, exist_ok=True)
    probe = base / ".kustos-vision-write-test"
    try:
        probe.write_bytes(b"")
    finally:
        probe.unlink(missing_ok=True)
