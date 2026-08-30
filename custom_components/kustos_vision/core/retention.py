"""Deciding what to delete when recordings outgrow their limits.

Two limits exist, each switchable on its own, and both may be active at once:

1. **Age, per camera.** Anything older than N days for that camera goes. This
   is the limit a user thinks in ("I want two weeks of the front garden").
2. **Total size, across all cameras.** While everything together exceeds the
   budget, the globally oldest segment goes, no matter which camera wrote it.
   This is the limit a disk thinks in.

The order matters: age runs first, then size is measured against what age left
behind. Doing it the other way round would delete segments twice over and free
more than the user asked for.

This module only decides. It performs no I/O, so the whole policy is testable
against a plain list of segments.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import timedelta

from .index import Segment


@dataclass(frozen=True, slots=True)
class RetentionPolicy:
    """The configured limits. Absent entries mean "no limit"."""

    max_age_days: Mapping[str, int] = field(default_factory=dict)
    """Per camera slug. A camera missing here is never aged out."""

    max_total_bytes: int | None = None
    """Across all cameras. None disables the size limit entirely."""

    def __post_init__(self) -> None:
        for slug, days in self.max_age_days.items():
            if days <= 0:
                raise ValueError(
                    f"max_age_days for {slug!r} must be positive; "
                    "remove the entry to disable the limit"
                )
        if self.max_total_bytes is not None and self.max_total_bytes <= 0:
            raise ValueError(
                "max_total_bytes must be positive; use None to disable the limit"
            )

    @property
    def is_active(self) -> bool:
        return bool(self.max_age_days) or self.max_total_bytes is not None


@dataclass(frozen=True, slots=True)
class RetentionPlan:
    """What a retention run would delete, and what it could not free."""

    by_age: tuple[Segment, ...] = ()
    by_size: tuple[Segment, ...] = ()
    shortfall_bytes: int = 0
    """How far over the size budget the result still is.

    Non-zero means the budget cannot be met without deleting segments that are
    protected, which in practice means the budget is smaller than what the
    cameras write between two retention runs. The user needs to see this rather
    than have the integration silently ignore the setting.
    """

    @property
    def doomed(self) -> tuple[Segment, ...]:
        """Everything to delete, oldest first."""
        return tuple(sorted(self.by_age + self.by_size, key=lambda s: s.start_utc))

    @property
    def freed_bytes(self) -> int:
        return sum(s.size_bytes for s in self.doomed)

    def __bool__(self) -> bool:
        return bool(self.by_age or self.by_size)


def newest_per_stream(segments: Sequence[Segment]) -> set[str]:
    """Return the newest segment of every camera and stream.

    These are the files ffmpeg is writing into right now, identified by
    topology rather than by a time threshold: whatever the newest segment of a
    stream is, that is where the next packet lands. Deleting it would make
    ffmpeg write into a file that no longer exists.
    """
    newest: dict[tuple[str, str], Segment] = {}
    for segment in segments:
        key = (segment.camera_slug, segment.stream_key)
        current = newest.get(key)
        if current is None or segment.start_utc > current.start_utc:
            newest[key] = segment
    return {s.rel_path for s in newest.values()}


def plan_retention(
    segments: Sequence[Segment],
    policy: RetentionPolicy,
    now_utc: float,
    also_protect: frozenset[str] = frozenset(),
) -> RetentionPlan:
    """Decide which segments a retention run should delete.

    ``segments`` is every indexed segment, in any order. ``now_utc`` is the
    current time as a UTC timestamp. ``also_protect`` names further relative
    paths that must survive, on top of the in-progress segments this function
    identifies itself.

    Ages are measured in exact 24-hour days, not local calendar days. That
    makes "keep 7 days" mean the same amount of footage in every week of the
    year, including the two in which the local clock changes.
    """
    if not policy.is_active:
        return RetentionPlan()

    protected = newest_per_stream(segments) | set(also_protect)
    ordered = sorted(segments, key=lambda s: s.start_utc)

    by_age: list[Segment] = []
    doomed_paths: set[str] = set()
    for slug, days in policy.max_age_days.items():
        cutoff = now_utc - timedelta(days=days).total_seconds()
        for segment in ordered:
            if (
                segment.camera_slug == slug
                and segment.start_utc < cutoff
                and segment.rel_path not in protected
            ):
                by_age.append(segment)
                doomed_paths.add(segment.rel_path)

    if policy.max_total_bytes is None:
        return RetentionPlan(by_age=tuple(sorted(by_age, key=lambda s: s.start_utc)))

    remaining = [s for s in ordered if s.rel_path not in doomed_paths]
    total = sum(s.size_bytes for s in remaining)

    by_size: list[Segment] = []
    for segment in remaining:
        if total <= policy.max_total_bytes:
            break
        if segment.rel_path in protected:
            continue
        by_size.append(segment)
        total -= segment.size_bytes

    shortfall = max(0, total - policy.max_total_bytes)
    return RetentionPlan(
        by_age=tuple(sorted(by_age, key=lambda s: s.start_utc)),
        by_size=tuple(by_size),
        shortfall_bytes=shortfall,
    )
