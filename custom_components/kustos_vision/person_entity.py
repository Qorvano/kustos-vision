"""The presence entity of one configured person.

On the hub device, not on any camera: presence is a property of the person,
and whichever camera happens to see them is an attribute, not an identity.
"""

from __future__ import annotations

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import callback
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .coordinator import CamwatchCoordinator
from .entity import CamwatchInstanceEntity


class PersonPresenceBinarySensor(CamwatchInstanceEntity, BinarySensorEntity):
    """Whether one configured person has been seen recently."""

    _attr_device_class = BinarySensorDeviceClass.OCCUPANCY

    def __init__(self, coordinator: CamwatchCoordinator, person_id: str) -> None:
        # The id, not the name, is the identity: renaming the person keeps
        # the entity and its history.
        super().__init__(coordinator, f"person_{person_id}")
        self.person_id = person_id

    @property
    def _person(self):
        return self.coordinator.config.persons.person(self.person_id)

    @property
    def name(self) -> str:
        person = self._person
        return person.name if person else self.person_id

    @property
    def available(self) -> bool:
        """A person deleted on the persons card keeps their history but
        reports nothing - the observation entities' policy, applied here."""
        return super().available and self._person is not None

    @property
    def is_on(self) -> bool:
        # False before any sighting, on purpose: after a restart the
        # integration genuinely does not know, and "not seen since the
        # restart" is the honest answer.
        return self.coordinator.persons.state_for(self.person_id).present

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        state = self.coordinator.persons.state_for(self.person_id)
        person = self._person
        return {
            "last_seen": state.last_seen.isoformat() if state.last_seen else None,
            "last_camera": state.last_camera,
            "absence_seconds": self.coordinator.config.persons.absence_seconds,
            "reference_photos": len(person.references) if person else 0,
        }


@callback
def async_setup_persons(
    entry: ConfigEntry,
    coordinator: CamwatchCoordinator,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Add person entities now, and again whenever a person is created.

    Entities are never removed: a person deleted and re-created under the
    same id keeps their history, exactly like observations.
    """
    known: set[str] = set()

    @callback
    def _sync() -> None:
        new = [
            person.id
            for person in coordinator.config.persons.people
            if person.id not in known
        ]
        if not new:
            return
        known.update(new)
        async_add_entities(
            [PersonPresenceBinarySensor(coordinator, person_id) for person_id in new]
        )

    _sync()
    entry.async_on_unload(coordinator.async_add_listener(_sync))
