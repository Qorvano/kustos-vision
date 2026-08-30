"""Tests for the retention policy.

Both limits the user asked for are covered here: a per-camera age limit, and a
total-size budget across all cameras after which the oldest recordings are
overwritten.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from kustos_vision.core.index import Segment
from kustos_vision.core.retention import (
    RetentionPolicy,
    newest_per_stream,
    plan_retention,
)

NOW = datetime(2026, 8, 30, 12, 0, tzinfo=UTC).timestamp()
DAY = 24 * 60 * 60


def seg(
    age_days: float,
    *,
    camera: str = "vorgarten",
    stream: str = "hd",
    size: int = 1000,
) -> Segment:
    start = int(NOW - age_days * DAY)
    return Segment(
        rel_path=f"{camera}/{stream}/{start}.mp4",
        camera_slug=camera,
        stream_key=stream,
        start_utc=start,
        duration_s=300.0,
        size_bytes=size,
        has_thumbnail=False,
    )


def paths(segments) -> set[str]:
    return {s.rel_path for s in segments}


# ----------------------------------------------------------------------
# Policy validation
# ----------------------------------------------------------------------


def test_an_empty_policy_is_inactive() -> None:
    assert RetentionPolicy().is_active is False


def test_a_policy_with_either_limit_is_active() -> None:
    assert RetentionPolicy(max_age_days={"cam": 7}).is_active
    assert RetentionPolicy(max_total_bytes=1).is_active


@pytest.mark.parametrize("days", [0, -1])
def test_a_nonpositive_age_limit_is_refused(days: int) -> None:
    """Zero would mean "delete everything immediately", which is never what a
    user means; disabling the limit is done by removing the entry."""
    with pytest.raises(ValueError, match="max_age_days"):
        RetentionPolicy(max_age_days={"cam": days})


@pytest.mark.parametrize("budget", [0, -1])
def test_a_nonpositive_size_budget_is_refused(budget: int) -> None:
    with pytest.raises(ValueError, match="max_total_bytes"):
        RetentionPolicy(max_total_bytes=budget)


def test_an_inactive_policy_deletes_nothing() -> None:
    plan = plan_retention([seg(100), seg(200)], RetentionPolicy(), NOW)
    assert not plan
    assert plan.doomed == ()


# ----------------------------------------------------------------------
# Age limit, per camera
# ----------------------------------------------------------------------


def test_age_limit_deletes_only_what_is_older() -> None:
    old, young = seg(8), seg(6)
    keep_running = seg(0)
    plan = plan_retention(
        [old, young, keep_running], RetentionPolicy(max_age_days={"vorgarten": 7}), NOW
    )
    assert paths(plan.by_age) == {old.rel_path}


def test_age_limit_applies_per_camera() -> None:
    """A camera without a configured limit is never aged out, even when the
    other camera's limit has long passed."""
    front = seg(30, camera="vorgarten")
    back = seg(30, camera="garten")
    plan = plan_retention(
        [front, back, seg(0, camera="vorgarten"), seg(0, camera="garten")],
        RetentionPolicy(max_age_days={"vorgarten": 7}),
        NOW,
    )
    assert paths(plan.by_age) == {front.rel_path}


def test_age_limits_may_differ_per_camera() -> None:
    front = seg(10, camera="vorgarten")
    back = seg(10, camera="garten")
    plan = plan_retention(
        [front, back, seg(0, camera="vorgarten"), seg(0, camera="garten")],
        RetentionPolicy(max_age_days={"vorgarten": 7, "garten": 14}),
        NOW,
    )
    assert paths(plan.by_age) == {front.rel_path}


def test_age_is_measured_in_exact_days() -> None:
    """Exact 24-hour days, so "keep 7 days" means the same amount of footage
    in the two weeks the local clock changes as in every other week."""
    just_inside = seg(6.99)
    just_outside = seg(7.01)
    plan = plan_retention(
        [just_inside, just_outside, seg(0)],
        RetentionPolicy(max_age_days={"vorgarten": 7}),
        NOW,
    )
    assert paths(plan.by_age) == {just_outside.rel_path}


# ----------------------------------------------------------------------
# Size budget, across all cameras
# ----------------------------------------------------------------------


def test_size_budget_deletes_the_globally_oldest_first() -> None:
    """The budget is a property of the disk, so it does not care which camera
    wrote the oldest segment."""
    oldest = seg(5, camera="garten", size=100)
    middle = seg(3, camera="vorgarten", size=100)
    newest_front = seg(0, camera="vorgarten", size=100)
    newest_back = seg(0, camera="garten", size=100)

    plan = plan_retention(
        [oldest, middle, newest_front, newest_back],
        RetentionPolicy(max_total_bytes=300),
        NOW,
    )
    assert paths(plan.by_size) == {oldest.rel_path}


def test_size_budget_deletes_until_it_fits() -> None:
    segments = [seg(days, size=100) for days in (5, 4, 3, 2)] + [seg(0, size=100)]
    plan = plan_retention(segments, RetentionPolicy(max_total_bytes=250), NOW)
    assert len(plan.by_size) == 3
    assert plan.shortfall_bytes == 0


def test_size_budget_leaves_a_fitting_tree_alone() -> None:
    plan = plan_retention(
        [seg(5, size=100), seg(0, size=100)], RetentionPolicy(max_total_bytes=1000), NOW
    )
    assert plan.by_size == ()


def test_size_budget_reports_what_it_could_not_free() -> None:
    """When the budget is smaller than what the protected in-progress segments
    already occupy, the user has to see it rather than have the setting
    silently ignored."""
    plan = plan_retention(
        [seg(0, camera="vorgarten", size=500), seg(0, camera="garten", size=500)],
        RetentionPolicy(max_total_bytes=100),
        NOW,
    )
    assert plan.by_size == ()
    assert plan.shortfall_bytes == 900


# ----------------------------------------------------------------------
# Protection of in-progress segments
# ----------------------------------------------------------------------


def test_the_newest_segment_of_every_stream_is_identified() -> None:
    newest_hd = seg(0, stream="hd")
    newest_sd = seg(0, stream="sd")
    found = newest_per_stream([seg(5, stream="hd"), newest_hd, seg(5, stream="sd"), newest_sd])
    assert found == {newest_hd.rel_path, newest_sd.rel_path}


def test_the_in_progress_segment_survives_the_age_limit() -> None:
    """Deleting it would make ffmpeg write into a file that no longer exists.
    Identified by topology (it is the newest of its stream), not by a
    time threshold."""
    only = seg(400)
    plan = plan_retention([only], RetentionPolicy(max_age_days={"vorgarten": 7}), NOW)
    assert plan.by_age == ()


def test_the_in_progress_segment_survives_the_size_budget() -> None:
    only = seg(400, size=10_000)
    plan = plan_retention([only], RetentionPolicy(max_total_bytes=1), NOW)
    assert plan.by_size == ()
    assert plan.shortfall_bytes == 9999


def test_each_stream_keeps_its_own_newest_segment() -> None:
    """A camera recording both HD and SD has two files open at once."""
    hd_new, sd_new = seg(0, stream="hd"), seg(0, stream="sd")
    plan = plan_retention(
        [seg(30, stream="hd"), hd_new, seg(30, stream="sd"), sd_new],
        RetentionPolicy(max_age_days={"vorgarten": 7}),
        NOW,
    )
    assert not paths(plan.by_age) & {hd_new.rel_path, sd_new.rel_path}
    assert len(plan.by_age) == 2


def test_extra_paths_can_be_protected() -> None:
    keep = seg(30)
    plan = plan_retention(
        [keep, seg(0)],
        RetentionPolicy(max_age_days={"vorgarten": 7}),
        NOW,
        also_protect=frozenset({keep.rel_path}),
    )
    assert plan.by_age == ()


# ----------------------------------------------------------------------
# Both limits together
# ----------------------------------------------------------------------


def test_age_runs_before_size_and_nothing_is_counted_twice() -> None:
    """Measuring size before age would free more than the user asked for,
    because the segments age already removes would be counted again."""
    aged_out = seg(30, size=1000)
    recent = [seg(days, size=100) for days in (3, 2, 1)]
    running = seg(0, size=100)

    plan = plan_retention(
        [aged_out, *recent, running],
        RetentionPolicy(max_age_days={"vorgarten": 7}, max_total_bytes=1000),
        NOW,
    )
    assert paths(plan.by_age) == {aged_out.rel_path}
    # 400 bytes remain after the age pass, which already fits the budget.
    assert plan.by_size == ()
    assert paths(plan.doomed) == {aged_out.rel_path}


def test_size_still_applies_when_age_did_not_free_enough() -> None:
    aged_out = seg(30, size=100)
    recent = [seg(days, size=1000) for days in (3, 2, 1)]
    running = seg(0, size=1000)

    plan = plan_retention(
        [aged_out, *recent, running],
        RetentionPolicy(max_age_days={"vorgarten": 7}, max_total_bytes=2000),
        NOW,
    )
    assert paths(plan.by_age) == {aged_out.rel_path}
    assert len(plan.by_size) == 2
    assert plan.shortfall_bytes == 0


def test_the_plan_reports_what_it_frees() -> None:
    plan = plan_retention(
        [seg(30, size=700), seg(20, size=300), seg(0, size=100)],
        RetentionPolicy(max_age_days={"vorgarten": 7}),
        NOW,
    )
    assert plan.freed_bytes == 1000


def test_doomed_segments_come_back_oldest_first() -> None:
    """Deleting oldest first keeps the tree consistent if a run is interrupted
    halfway through."""
    plan = plan_retention(
        [seg(30, size=100), seg(20, size=100), seg(10, size=100), seg(0, size=100)],
        RetentionPolicy(max_age_days={"vorgarten": 7}, max_total_bytes=150),
        NOW,
    )
    starts = [s.start_utc for s in plan.doomed]
    assert starts == sorted(starts)


def test_planning_over_an_empty_tree_is_harmless() -> None:
    plan = plan_retention(
        [], RetentionPolicy(max_age_days={"vorgarten": 7}, max_total_bytes=100), NOW
    )
    assert not plan
    assert plan.shortfall_bytes == 0
