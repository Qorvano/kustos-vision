"""How much has been recorded, and how far back it reaches."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.const import UnitOfInformation
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import CamwatchEntry
from .coordinator import CameraState, CamwatchCoordinator, CamwatchData
from .core.observations import Observation, ObservationType
from .entity import CamwatchCameraEntity, CamwatchInstanceEntity, async_setup_cameras
from .vision_entity import ObservationEntity, async_setup_observations, shorten


@dataclass(frozen=True, kw_only=True)
class CameraSensorDescription(SensorEntityDescription):
    """A per-camera sensor and how to read it."""

    value: Callable[[CameraState], int | float | datetime | None]


@dataclass(frozen=True, kw_only=True)
class InstanceSensorDescription(SensorEntityDescription):
    """A whole-installation sensor and how to read it."""

    value: Callable[[CamwatchData], int | float | None]


CAMERA_SENSORS: tuple[CameraSensorDescription, ...] = (
    CameraSensorDescription(
        key="used_storage",
        translation_key="used_storage",
        device_class=SensorDeviceClass.DATA_SIZE,
        native_unit_of_measurement=UnitOfInformation.BYTES,
        suggested_unit_of_measurement=UnitOfInformation.GIGABYTES,
        suggested_display_precision=1,
        state_class=SensorStateClass.MEASUREMENT,
        value=lambda state: state.used_bytes,
    ),
    CameraSensorDescription(
        key="oldest_recording",
        translation_key="oldest_recording",
        device_class=SensorDeviceClass.TIMESTAMP,
        # This is the honest answer to "how far back can I look", which is not
        # the configured retention: it is shorter after a fresh start, and
        # shorter again whenever the size budget bit before the age limit did.
        value=lambda state: state.oldest_start,
    ),
)

INSTANCE_SENSORS: tuple[InstanceSensorDescription, ...] = (
    InstanceSensorDescription(
        key="total_storage",
        translation_key="total_storage",
        device_class=SensorDeviceClass.DATA_SIZE,
        native_unit_of_measurement=UnitOfInformation.BYTES,
        suggested_unit_of_measurement=UnitOfInformation.GIGABYTES,
        suggested_display_precision=1,
        state_class=SensorStateClass.MEASUREMENT,
        value=lambda data: data.total_bytes,
    ),
    InstanceSensorDescription(
        key="free_storage",
        translation_key="free_storage",
        device_class=SensorDeviceClass.DATA_SIZE,
        native_unit_of_measurement=UnitOfInformation.BYTES,
        suggested_unit_of_measurement=UnitOfInformation.GIGABYTES,
        suggested_display_precision=1,
        state_class=SensorStateClass.MEASUREMENT,
        value=lambda data: data.free_bytes,
    ),
    InstanceSensorDescription(
        key="over_budget",
        translation_key="over_budget",
        device_class=SensorDeviceClass.DATA_SIZE,
        native_unit_of_measurement=UnitOfInformation.BYTES,
        suggested_unit_of_measurement=UnitOfInformation.MEGABYTES,
        suggested_display_precision=0,
        state_class=SensorStateClass.MEASUREMENT,
        # Non-zero means the size budget cannot be met without deleting
        # segments that are still being written, which in practice means the
        # budget is smaller than what the cameras produce between two
        # housekeeping runs. Silently ignoring the setting would be worse.
        value=lambda data: data.over_budget_bytes,
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: CamwatchEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    coordinator = entry.runtime_data
    async_add_entities(
        InstanceSensor(coordinator, description) for description in INSTANCE_SENSORS
    )
    async_setup_cameras(
        entry,
        coordinator,
        async_add_entities,
        lambda slug: [
            CameraSensor(coordinator, slug, description)
            for description in CAMERA_SENSORS
        ],
    )
    async_setup_observations(
        entry,
        coordinator,
        async_add_entities,
        lambda slug, observation: (
            []
            if observation.type is ObservationType.BOOLEAN
            else [ObservationSensor(coordinator, slug, observation)]
        ),
    )


class CameraSensor(CamwatchCameraEntity, SensorEntity):
    """One reading about one camera."""

    entity_description: CameraSensorDescription

    def __init__(
        self,
        coordinator: CamwatchCoordinator,
        camera_slug: str,
        description: CameraSensorDescription,
    ) -> None:
        super().__init__(coordinator, camera_slug, description.key)
        self.entity_description = description

    @property
    def native_value(self) -> int | float | datetime | None:
        state = self.camera_state
        return None if state is None else self.entity_description.value(state)


class InstanceSensor(CamwatchInstanceEntity, SensorEntity):
    """One reading about the installation as a whole."""

    entity_description: InstanceSensorDescription

    def __init__(
        self, coordinator: CamwatchCoordinator, description: InstanceSensorDescription
    ) -> None:
        super().__init__(coordinator, description.key)
        self.entity_description = description

    @property
    def native_value(self) -> int | float | None:
        if self.coordinator.data is None:
            return None
        return self.entity_description.value(self.coordinator.data)


class ObservationSensor(ObservationEntity, SensorEntity):
    """A text, count or choice the model answered with."""

    def __init__(
        self,
        coordinator: CamwatchCoordinator,
        camera_slug: str,
        observation: Observation,
    ) -> None:
        super().__init__(coordinator, camera_slug, observation)
        if observation.type is ObservationType.NUMBER:
            self._attr_state_class = SensorStateClass.MEASUREMENT
        if observation.type is ObservationType.SELECT:
            self._attr_device_class = SensorDeviceClass.ENUM
            self._attr_options = list(observation.options)

    @property
    def native_value(self) -> str | int | None:
        answer = self.answer
        if answer is None:
            return None
        if self.observation.type is ObservationType.NUMBER:
            return int(answer)
        # Home Assistant refuses a state longer than 255 characters, so a long
        # answer is shortened here and kept whole in the attributes.
        return shorten(str(answer))

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        attributes = dict(super().extra_state_attributes)
        answer = self.answer
        if (
            self.observation.type is ObservationType.TEXT
            and isinstance(answer, str)
            and len(answer) > len(self.native_value or "")
        ):
            attributes["full_answer"] = answer
        return attributes
