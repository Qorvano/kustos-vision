"""Pausing a camera's recording without reconfiguring it."""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchDeviceClass, SwitchEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import CamwatchEntry
from .coordinator import CamwatchCoordinator
from .entity import CamwatchCameraEntity, async_setup_cameras


async def async_setup_entry(
    hass: HomeAssistant,
    entry: CamwatchEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    coordinator = entry.runtime_data
    async_setup_cameras(
        entry,
        coordinator,
        async_add_entities,
        lambda slug: [RecordingSwitch(coordinator, slug)],
    )


class RecordingSwitch(CamwatchCameraEntity, SwitchEntity):
    """Turns recording of one camera off and on again.

    Separate from the camera's ``enabled`` setting on purpose: this is the
    temporary one, meant for automations (stop recording while everyone is
    home) and for a quick manual pause. It leaves the configuration untouched,
    so nothing has to be set up again afterwards.
    """

    _attr_device_class = SwitchDeviceClass.SWITCH
    _attr_translation_key = "recording"

    def __init__(self, coordinator: CamwatchCoordinator, camera_slug: str) -> None:
        super().__init__(coordinator, camera_slug, "record_switch")

    @property
    def available(self) -> bool:
        """Tied to the camera existing, not to a completed update cycle.

        The pause state is the integration's own, so the switch is usable as
        soon as the camera is configured.
        """
        return self.coordinator.config.camera(self.camera_slug) is not None

    @property
    def is_on(self) -> bool:
        """Read straight from the recorder rather than from coordinator data.

        The pause state is something this integration decides, not something it
        polls, and coordinator refreshes are debounced by several seconds. Going
        through them would leave a switch showing the old position for that long
        after the user flipped it.
        """
        return not self.coordinator.recorder.is_paused(self.camera_slug)

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self.coordinator.async_set_paused(self.camera_slug, False)
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self.coordinator.async_set_paused(self.camera_slug, True)
        self.async_write_ha_state()
