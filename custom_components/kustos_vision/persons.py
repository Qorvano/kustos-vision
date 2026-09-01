"""Who is currently present, and the timer that ends it.

Owned by the coordinator rather than by the vision runner, because presence
is a property of the person and any camera may be the one that sees them.

The state lives here and nowhere else, deliberately NOT restored across a
restart: an off-delay is a timer, and a timer cannot survive a restart, so a
restored "on" would be an "on" that nothing is left to turn off. After a
restart the integration genuinely does not know whether anybody is there,
and "not seen since the restart" is the honest and the safe answer.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_call_later
from homeassistant.util import dt as dt_util

from .core.config import CamwatchConfig

_LOGGER = logging.getLogger(__name__)


@dataclass
class PersonPresence:
    """What is known about one person right now."""

    present: bool = False
    last_seen: datetime | None = None
    last_camera: str | None = None
    unsub: Callable[[], None] | None = None


class PersonPresenceTracker:
    """Turns sightings into presence, and absence into a timer.

    A model NOT seeing someone in one frame is never evidence they left -
    they turned round, bent down, stood behind the car. Only the configured
    Abklingzeit after the last sighting switches a person to absent.
    """

    def __init__(self, hass: HomeAssistant, coordinator) -> None:
        self._hass = hass
        self._coordinator = coordinator
        self._states: dict[str, PersonPresence] = {}

    def state_for(self, person_id: str) -> PersonPresence:
        return self._states.setdefault(person_id, PersonPresence())

    @callback
    def async_seen(self, person_id: str, camera_slug: str) -> None:
        """One camera's analysis matched this person just now."""
        state = self.state_for(person_id)
        state.present = True
        state.last_seen = dt_util.utcnow()
        state.last_camera = camera_slug
        self._arm(person_id, self._absence_seconds())
        self._coordinator.async_update_listeners()

    @callback
    def async_apply(self, config: CamwatchConfig) -> None:
        """Follow a configuration change.

        Deleted people take their state and timer with them. A changed
        Abklingzeit re-arms every running timer against the new value,
        measured from the existing last_seen, so lowering it takes effect at
        once instead of on the next sighting.
        """
        ids = {person.id for person in config.persons.people}
        for person_id in [p for p in self._states if p not in ids]:
            state = self._states.pop(person_id)
            if state.unsub is not None:
                state.unsub()

        for person_id, state in self._states.items():
            if not state.present or state.last_seen is None:
                continue
            elapsed = (dt_util.utcnow() - state.last_seen).total_seconds()
            remaining = config.persons.absence_seconds - elapsed
            if remaining <= 0:
                self._expire(person_id)
            else:
                self._arm(person_id, remaining)

    @callback
    def async_stop(self) -> None:
        for state in self._states.values():
            if state.unsub is not None:
                state.unsub()
                state.unsub = None

    def _absence_seconds(self) -> float:
        return float(self._coordinator.config.persons.absence_seconds)

    @callback
    def _arm(self, person_id: str, delay: float) -> None:
        state = self.state_for(person_id)
        if state.unsub is not None:
            state.unsub()

        @callback
        def _expired(_now: datetime) -> None:
            state.unsub = None
            self._expire(person_id)

        state.unsub = async_call_later(self._hass, delay, _expired)

    @callback
    def _expire(self, person_id: str) -> None:
        state = self.state_for(person_id)
        if state.unsub is not None:
            state.unsub()
            state.unsub = None
        if state.present:
            state.present = False
            self._coordinator.async_update_listeners()
