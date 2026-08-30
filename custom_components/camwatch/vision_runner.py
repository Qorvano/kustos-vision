"""Deciding when to ask the model, and holding on to what it said.

The triggers are the cameras' own motion and person detection, which costs
Home Assistant nothing because the camera did the work. What this adds is the
restraint around them: a motion sensor in wind or rain fires constantly, and
without a floor between analyses that becomes a bill on a hosted model or a
permanently busy one at home.

Three limits, all per camera:

* a cooldown, so a burst of motion is one analysis rather than twenty,
* a daily budget, so a misconfigured trigger cannot run away overnight,
* one analysis at a time, so a slow model cannot queue up behind itself.

None of them is optional. A profile with no restraint is the failure mode this
whole module exists to prevent.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any

from homeassistant.const import STATE_ON, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.util import dt as dt_util

from .core.config import CamwatchConfig, VisionProfile
from .vision import VisionError, VisionResult, async_analyse

_LOGGER = logging.getLogger(__name__)

# How many past analyses to keep per camera for the panel. Enough to see
# whether a question works, few enough to stay in memory without thought.
HISTORY_LENGTH = 20


@dataclass
class VisionState:
    """What is known about one camera's analyses."""

    values: dict[str, Any] = field(default_factory=dict)
    last_run: datetime | None = None
    last_error: str | None = None
    running: bool = False
    analyses_today: int = 0
    budget_day: date | None = None
    history: list[dict[str, Any]] = field(default_factory=list)

    def count_for(self, today: date) -> int:
        """Analyses used today, resetting when the local day rolls over."""
        return self.analyses_today if self.budget_day == today else 0


class SkipReason(str):
    """Why an analysis did not run. A plain string so it can be reported."""


class VisionRunner:
    """Watches the triggers and runs the analyses."""

    def __init__(self, hass: HomeAssistant, coordinator) -> None:
        self._hass = hass
        self._coordinator = coordinator
        self._states: dict[str, VisionState] = {}
        self._locks: dict[str, asyncio.Lock] = {}
        self._unsubscribe: Callable[[], None] | None = None

    @property
    def states(self) -> dict[str, VisionState]:
        return self._states

    def state_for(self, camera_slug: str) -> VisionState:
        return self._states.setdefault(camera_slug, VisionState())

    # ------------------------------------------------------------------
    # Triggers
    # ------------------------------------------------------------------

    @callback
    def async_apply(self, config: CamwatchConfig) -> None:
        """Listen to exactly the triggers the enabled profiles name."""
        if self._unsubscribe is not None:
            self._unsubscribe()
            self._unsubscribe = None

        watched: dict[str, list[str]] = {}
        for profile in config.vision:
            if not profile.enabled or not profile.observations:
                continue
            for entity_id in profile.triggers:
                watched.setdefault(entity_id, []).append(profile.camera_slug)

        if not watched:
            return

        @callback
        def _fired(event: Event[EventStateChangedData]) -> None:
            new = event.data["new_state"]
            old = event.data["old_state"]
            # Only the transition into "on" is an event. Re-firing on every
            # update would turn a sensor that keeps reporting into a loop.
            if new is None or new.state != STATE_ON:
                return
            if old is not None and old.state == STATE_ON:
                return
            for slug in watched.get(event.data["entity_id"], []):
                self._hass.async_create_task(
                    self.async_analyse(slug, reason=event.data["entity_id"])
                )

        self._unsubscribe = async_track_state_change_event(
            self._hass, list(watched), _fired
        )

    @callback
    def async_stop(self) -> None:
        if self._unsubscribe is not None:
            self._unsubscribe()
            self._unsubscribe = None

    # ------------------------------------------------------------------
    # Running
    # ------------------------------------------------------------------

    def _may_run(self, profile: VisionProfile, state: VisionState) -> str | None:
        """Return why an analysis must not run now, or None when it may."""
        if not profile.enabled:
            return "the profile is switched off"
        if not profile.observations:
            return "the profile asks nothing"

        today = dt_util.now().date()
        if state.count_for(today) >= profile.daily_budget:
            return (
                f"today's budget of {profile.daily_budget} analyses is used up"
            )

        if profile.condition_entity:
            condition = self._hass.states.get(profile.condition_entity)
            if condition is None or condition.state in (
                STATE_UNAVAILABLE,
                STATE_UNKNOWN,
            ):
                return f"{profile.condition_entity} has no state"
            if condition.state != STATE_ON:
                return f"{profile.condition_entity} is off"

        if state.last_run is not None and profile.cooldown_seconds:
            elapsed = (dt_util.utcnow() - state.last_run).total_seconds()
            if elapsed < profile.cooldown_seconds:
                remaining = int(profile.cooldown_seconds - elapsed)
                return f"another analysis may run in {remaining} s"
        return None

    async def async_analyse(
        self,
        camera_slug: str,
        reason: str = "manual",
        force: bool = False,
        question: str | None = None,
    ) -> VisionResult | None:
        """Analyse one camera, unless a limit says not to.

        ``force`` skips the cooldown and the condition but never the daily
        budget: a manual run is meant to be immediate, while the budget is the
        one limit that exists to stop runaway cost.
        """
        config = self._coordinator.config
        camera = config.camera(camera_slug)
        profile = config.vision_for(camera_slug)
        if camera is None or profile is None:
            raise VisionError(f"no vision profile for {camera_slug!r}")

        state = self.state_for(camera_slug)
        lock = self._locks.setdefault(camera_slug, asyncio.Lock())
        if lock.locked():
            _LOGGER.debug("camwatch: %s is still being analysed", camera_slug)
            return None

        today = dt_util.now().date()
        if state.count_for(today) >= profile.daily_budget:
            _LOGGER.warning(
                "camwatch: %s has used today's budget of %s analyses",
                camera_slug,
                profile.daily_budget,
            )
            return None
        if not force and (skip := self._may_run(profile, state)) is not None:
            _LOGGER.debug("camwatch: not analysing %s: %s", camera_slug, skip)
            return None

        entity_id = self._camera_entity(camera_slug)
        if entity_id is None:
            raise VisionError(f"camera {camera_slug!r} has no entity to snapshot")

        async with lock:
            state.running = True
            state.budget_day = today
            state.analyses_today = state.count_for(today) + 1
            self._coordinator.async_update_listeners()
            try:
                result = await async_analyse(
                    self._hass, camera, profile, entity_id
                )
            except VisionError as err:
                state.last_error = str(err)
                state.last_run = dt_util.utcnow()
                _LOGGER.warning("camwatch: analysing %s failed: %s", camera_slug, err)
                self._record(state, reason, None, str(err))
                return None
            finally:
                state.running = False

            state.last_error = None
            state.last_run = dt_util.utcnow()
            state.values.update(result.values)
            self._record(state, reason, result, None)
            self._coordinator.async_update_listeners()
            return result

    def _camera_entity(self, camera_slug: str) -> str | None:
        """Which entity to take the snapshot from.

        The highest-quality stream is preferred: the model gets one frame, and
        detail it does not have cannot be recovered by asking again.
        """
        camera = self._coordinator.config.camera(camera_slug)
        if camera is None or not camera.streams:
            return None
        recorded = [s for s in camera.streams if s.record]
        return (recorded[0] if recorded else camera.streams[0]).entity_id

    def _record(
        self,
        state: VisionState,
        reason: str,
        result: VisionResult | None,
        error: str | None,
    ) -> None:
        """Keep the last few analyses, for improving a prompt with evidence."""
        state.history.insert(
            0,
            {
                "at": dt_util.utcnow().isoformat(),
                "trigger": reason,
                "values": dict(result.values) if result else {},
                "problems": dict(result.problems) if result else {},
                "raw": result.raw if result else None,
                "duration": round(result.duration_s, 2) if result else None,
                "error": error,
            },
        )
        del state.history[HISTORY_LENGTH:]
