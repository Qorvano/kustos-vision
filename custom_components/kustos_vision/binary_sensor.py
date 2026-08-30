"""Whether a camera is actually being recorded right now."""

from __future__ import annotations

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import CamwatchEntry
from .coordinator import CamwatchCoordinator
from .core.observations import Observation, ObservationType
from .entity import CamwatchCameraEntity, async_setup_cameras
from .vision_entity import ObservationEntity, async_setup_observations


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
        lambda slug: [RecordingBinarySensor(coordinator, slug)],
    )
    async_setup_observations(
        entry,
        coordinator,
        async_add_entities,
        lambda slug, observation: (
            [ObservationBinarySensor(coordinator, slug, observation)]
            if observation.type is ObservationType.BOOLEAN
            else []
        ),
    )


class RecordingBinarySensor(CamwatchCameraEntity, BinarySensorEntity):
    """On while at least one stream of the camera is being written.

    This reports what is happening, not what was configured: a camera whose
    stream URL cannot be resolved, or whose ffmpeg keeps dying, shows off even
    though recording is switched on. That difference is the whole point of the
    sensor.
    """

    _attr_device_class = BinarySensorDeviceClass.RUNNING
    _attr_translation_key = "recording"

    def __init__(self, coordinator: CamwatchCoordinator, camera_slug: str) -> None:
        super().__init__(coordinator, camera_slug, "recording")

    @property
    def is_on(self) -> bool | None:
        state = self.camera_state
        return None if state is None else state.recording

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        """The per-stream detail, which is what a failing camera is diagnosed
        from: which stream died, how often it has restarted, and what ffmpeg
        said before it stopped."""
        state = self.camera_state
        if state is None:
            return {}
        return {
            # Says whether "off" means "should not" or "should but cannot",
            # which the state alone cannot express.
            "recording_configured": state.wants_recording,
            "streams": {
                stream.stream_key: {
                    "running": stream.running,
                    "restarts": stream.restarts,
                    "last_error": stream.last_error,
                }
                for stream in state.streams
            },
        }


class ObservationBinarySensor(ObservationEntity, BinarySensorEntity):
    """A yes-or-no answer, such as whether a parcel is at the door."""

    def __init__(
        self,
        coordinator: CamwatchCoordinator,
        camera_slug: str,
        observation: Observation,
    ) -> None:
        super().__init__(coordinator, camera_slug, observation)
        if observation.device_class:
            try:
                self._attr_device_class = BinarySensorDeviceClass(
                    observation.device_class
                )
            except ValueError:
                # A device class the user typed that this Home Assistant does
                # not know is not worth failing setup over; the entity works
                # the same without one.
                self._attr_device_class = None

    @property
    def is_on(self) -> bool | None:
        answer = self.answer
        return None if answer is None else bool(answer)
