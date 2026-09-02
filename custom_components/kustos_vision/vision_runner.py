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
import shutil
from collections.abc import Callable
from dataclasses import dataclass, field, replace
from datetime import date, datetime
from pathlib import Path
from typing import Any

from homeassistant.const import STATE_ON
from homeassistant.core import Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.util import dt as dt_util

from .capture import async_capture_frame, async_draw_marks
from .const import DATA_STAMP_AVAILABLE, LOCAL_STATE_DIR
from .core.marks import marked_name
from .core.capture import (
    FRAME_DIR_NAME,
    CapturedFrame,
    frame_name,
    frame_slot,
    frames_dir,
)
from .core.config import CamwatchConfig, VisionBackendKind, VisionProfile
from .core.persons import PersonProfile, plan_person_pictures
from .core.references import (
    MAX_PICTURES_PER_REQUEST,
    find_asset,
    plan_baseline,
    plan_pictures,
)
from .vision import (
    ReferencePicture,
    VisionError,
    VisionRequest,
    VisionResult,
    async_analyse,
)

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
    frame_counter: int = 0
    """How many frames this camera's ring has been given, ever. The slot a
    frame lands in is this modulo the ring size; in-memory on purpose, so a
    restart (which also empties the history) simply starts over at slot 0."""

    def count_for(self, today: date) -> int:
        """Analyses used today, resetting when the local day rolls over."""
        return self.analyses_today if self.budget_day == today else 0


def _resolve_backend(profile: VisionProfile, config: CamwatchConfig) -> VisionProfile:
    """Fill in a referenced endpoint's connection details.

    At request time on purpose: editing the endpoint then takes effect for
    every camera at once, which is the whole point of entering it once. The
    direct URL of profiles from before endpoints existed passes through
    untouched.
    """
    backend = profile.backend
    if backend.kind is not VisionBackendKind.OPENAI or not backend.endpoint_id:
        return profile
    endpoint = config.endpoint(backend.endpoint_id)
    if endpoint is None:
        raise VisionError(
            f"the endpoint {backend.endpoint_id!r} configured for "
            f"{profile.camera_slug!r} no longer exists"
        )
    return replace(
        profile,
        backend=replace(
            backend, url=endpoint.url, api_key=endpoint.api_key or None
        ),
    )


def _asks_anything(profile: VisionProfile, config: CamwatchConfig) -> bool:
    """Whether an analysis of this profile would have any field at all.

    Before persons existed, "no questions" was the whole definition of a
    pointless profile. A profile without questions is meaningful now when it
    recognises the configured people - the person fields are synthesised at
    request time, so they never show up in active_observations.
    """
    if profile.active_observations:
        return True
    return profile.detect_persons and any(
        person.enabled for person in config.persons.people
    )


def _unlink_quietly(path: Path) -> None:
    path.unlink(missing_ok=True)


def _read_asset(local_state: Path, asset_id: str) -> tuple[bytes, str] | None:
    """Read one stored reference picture, or None when it is gone."""
    path = find_asset(local_state, asset_id)
    if path is None:
        return None
    try:
        content = path.read_bytes()
    except OSError:
        return None
    return content, "image/png" if path.suffix == ".png" else "image/jpeg"


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

        # A camera whose profile is gone takes its in-memory state and its
        # frame ring with it. This callback is the natural home: it is the one
        # place that sees the whole configuration on every change.
        active = {profile.camera_slug for profile in config.vision}
        for slug in [s for s in self._states if s not in active]:
            del self._states[slug]
            self._locks.pop(slug, None)
        self._hass.async_create_task(self._async_prune_frame_dirs(active))

        watched: dict[str, list[str]] = {}
        for profile in config.vision:
            if not profile.enabled or not _asks_anything(profile, config):
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
                    self._async_analyse_quietly(slug, event.data["entity_id"])
                )

        self._unsubscribe = async_track_state_change_event(
            self._hass, list(watched), _fired
        )

    @callback
    def async_stop(self) -> None:
        if self._unsubscribe is not None:
            self._unsubscribe()
            self._unsubscribe = None

    async def _async_prune_frame_dirs(self, active: set[str]) -> None:
        """Delete the frame rings of cameras that no longer have a profile."""
        root = Path(self._hass.config.path(LOCAL_STATE_DIR)) / FRAME_DIR_NAME

        def _prune() -> None:
            if not root.is_dir():
                return
            for child in root.iterdir():
                if child.is_dir() and child.name not in active:
                    shutil.rmtree(child, ignore_errors=True)

        await self._hass.async_add_executor_job(_prune)

    async def _async_analyse_quietly(self, camera_slug: str, trigger: str) -> None:
        """Run a triggered analysis without letting it escape as a bare task.

        A trigger fires from an event callback, so an exception here has nobody
        to catch it: it would surface as an unhandled task error in the log and
        the user would never learn that their camera stopped being analysed.
        Recording it on the profile is what makes it visible in the panel.
        """
        try:
            await self.async_analyse(camera_slug, reason=trigger)
        except VisionError as err:
            state = self.state_for(camera_slug)
            state.last_error = str(err)
            self._record(state, trigger, None, str(err))
            _LOGGER.warning(
                "kustos_vision: cannot analyse %s: %s", camera_slug, err
            )
            self._coordinator.async_update_listeners()

    # ------------------------------------------------------------------
    # Running
    # ------------------------------------------------------------------

    def _may_run(self, profile: VisionProfile, state: VisionState) -> str | None:
        """Return why an analysis must not run now, or None when it may."""
        if not profile.enabled:
            return "the profile is switched off"
        if not _asks_anything(profile, self._coordinator.config):
            return "the profile asks nothing"

        today = dt_util.now().date()
        if state.count_for(today) >= profile.daily_budget:
            return (
                f"today's budget of {profile.daily_budget} analyses is used up"
            )

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

        ``force`` skips the cooldown but never the daily
        budget: a manual run is meant to be immediate, while the budget is the
        one limit that exists to stop runaway cost.
        """
        config = self._coordinator.config
        camera = config.camera(camera_slug)
        profile = config.vision_for(camera_slug)
        if camera is None or profile is None:
            raise VisionError(f"no vision profile for {camera_slug!r}")
        profile = _resolve_backend(profile, config)

        state = self.state_for(camera_slug)
        lock = self._locks.setdefault(camera_slug, asyncio.Lock())
        if lock.locked():
            _LOGGER.debug("kustos_vision: %s is still being analysed", camera_slug)
            return None

        today = dt_util.now().date()
        if state.count_for(today) >= profile.daily_budget:
            _LOGGER.warning(
                "kustos_vision: %s has used today's budget of %s analyses",
                camera_slug,
                profile.daily_budget,
            )
            return None
        if not force and (skip := self._may_run(profile, state)) is not None:
            _LOGGER.debug("kustos_vision: not analysing %s: %s", camera_slug, skip)
            return None

        entity_id = self._camera_entity(camera_slug)
        if entity_id is None:
            raise VisionError(f"camera {camera_slug!r} has no entity to snapshot")

        async with lock:
            state.running = True
            state.budget_day = today
            state.analyses_today = state.count_for(today) + 1
            self._coordinator.async_update_listeners()
            frame: CapturedFrame | None = None
            # Only enabled people, and only when this camera opted in.
            persons: tuple[PersonProfile, ...] = (
                tuple(p for p in config.persons.people if p.enabled)
                if profile.detect_persons
                else ()
            )
            # WHERE things are is only worth asking when there is a picture
            # entity to draw it into.
            want_marks = profile.frame_sensor and profile.mark_objects
            try:
                # References first - they are static files and must not sit
                # between the frame grab and the request.
                references = await self._async_load_references(profile, persons)
                # The picture is taken here and nowhere earlier. The distance
                # between the grab and the request is what "current" means;
                # everything before this point is bookkeeping that must not
                # sit between the two. Inside the lock costs nothing - a
                # second trigger returns early on lock.locked() and never
                # waits - and it removes the one case where a frame could age
                # while a queued run held it.
                frame = await self._async_capture(camera_slug, state, entity_id)
                result = await async_analyse(
                    self._hass,
                    camera,
                    profile,
                    entity_id,
                    request=VisionRequest(
                        frame=frame,
                        references=references,
                        persons=persons,
                        mark_objects=want_marks,
                        marks_model=profile.marks_model if want_marks else "",
                    ),
                )
            except VisionError as err:
                state.last_error = str(err)
                state.last_run = dt_util.utcnow()
                _LOGGER.warning("kustos_vision: analysing %s failed: %s", camera_slug, err)
                # The frame, if one was taken, stays in the record: for a
                # model failure it is the evidence of what was being asked
                # about when things went wrong.
                self._record(state, reason, None, str(err), frame=frame)
                return None
            finally:
                state.running = False

            state.last_error = None
            state.last_run = dt_util.utcnow()
            state.values.update(result.values)
            marked = await self._async_render_marks(want_marks, frame, result)
            # A True is a sighting; a False is nothing at all - only the
            # tracker's timer ever switches a person to absent.
            for person_id, seen in result.persons.items():
                if seen:
                    self._coordinator.persons.async_seen(person_id, camera_slug)
            self._record(state, reason, result, None, frame=frame, marked=marked)
            self._coordinator.async_update_listeners()
            return result

    async def _async_render_marks(
        self, want_marks: bool, frame: CapturedFrame | None, result: VisionResult
    ) -> str | None:
        """Burn the reported boxes into a marked copy of the ring frame.

        Returns the marked file's name, or None - and then makes sure no
        STALE marked file from an earlier lap of the ring survives in this
        slot, where the image entity could mistake it for current.
        """
        if not want_marks or frame is None or frame.path is None:
            return None
        target = frame.path.with_name(marked_name(frame.path.name))
        if result.marks:
            drawn = await async_draw_marks(
                self._hass,
                frame.path,
                target,
                result.marks,
                with_labels=self._hass.data.get(DATA_STAMP_AVAILABLE, False),
            )
            if drawn:
                return target.name
        await self._hass.async_add_executor_job(_unlink_quietly, target)
        return None

    async def _async_capture(
        self, camera_slug: str, state: VisionState, entity_id: str
    ) -> CapturedFrame:
        """Take the frame for one analysis and file it in the ring."""
        slot = frame_slot(state.frame_counter, HISTORY_LENGTH)
        target = self._frames_dir(camera_slug) / frame_name(slot)
        frame = await async_capture_frame(self._hass, entity_id, target)
        state.frame_counter += 1
        return frame

    def _frames_dir(self, camera_slug: str) -> Path:
        return frames_dir(
            Path(self._hass.config.path(LOCAL_STATE_DIR)), camera_slug
        )

    async def _async_load_references(
        self,
        profile: VisionProfile,
        persons: tuple[PersonProfile, ...] = (),
    ) -> tuple[ReferencePicture, ...]:
        """Load the reference pictures this analysis carries.

        Question references first, person photos after, and the total capped
        so the whole request stays inside a small model's context - an
        overflowing request fails wholesale. A missing file is a warning,
        never a failure: the analysis without its reference still answers
        something, a refused analysis answers nothing at all.
        """
        budget = MAX_PICTURES_PER_REQUEST - 1  # the frame occupies one slot
        planned = (
            # The normal-scene picture first: it frames how everything after
            # it is read, and the budget cuts from the back.
            *plan_baseline(profile.baseline),
            *plan_pictures(list(profile.active_observations)),
            *plan_person_pictures(persons),
        )[:budget]
        if not planned:
            return ()
        local_state = Path(self._hass.config.path(LOCAL_STATE_DIR))
        loaded: list[ReferencePicture] = []
        for picture in planned:
            data = await self._hass.async_add_executor_job(
                _read_asset, local_state, picture.asset_id
            )
            if data is None:
                _LOGGER.warning(
                    "kustos_vision: reference picture %s is missing; "
                    "the analysis runs without it",
                    picture.asset_id,
                )
                continue
            content, content_type = data
            loaded.append(
                ReferencePicture(
                    content=content,
                    content_type=content_type,
                    preamble=picture.preamble,
                    asset_id=picture.asset_id,
                )
            )
        return tuple(loaded)

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
        frame: CapturedFrame | None = None,
        marked: str | None = None,
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
                # The exact picture the model saw, and how honest it is: a
                # "still" frame may be minutes older than the trigger.
                "frame": frame.path.name if frame and frame.path else None,
                "frame_source": str(frame.source) if frame else None,
                # The copy with the reported boxes burned in, when one was
                # drawn - what the image entity serves in preference.
                "marked": marked,
            },
        )
        del state.history[HISTORY_LENGTH:]
