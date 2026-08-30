"""Shared plumbing for kustos_vision entities.

Cameras are created and removed in the panel, not in a config flow, so every
platform has to be able to grow entities after setup. ``async_setup_cameras``
holds that pattern once instead of three times.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import CameraState, CamwatchCoordinator


class CamwatchEntity(CoordinatorEntity[CamwatchCoordinator]):
    """Base for every kustos_vision entity."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: CamwatchCoordinator, key: str) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"{coordinator.entry.entry_id}_{key}"


class CamwatchInstanceEntity(CamwatchEntity):
    """An entity describing the installation as a whole."""

    def __init__(self, coordinator: CamwatchCoordinator, key: str) -> None:
        super().__init__(coordinator, key)
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, coordinator.entry.entry_id)},
            name="Kustos Vision",
            manufacturer="Kustos Vision",
            entry_type="service",
        )


class CamwatchCameraEntity(CamwatchEntity):
    """An entity belonging to one camera."""

    def __init__(
        self, coordinator: CamwatchCoordinator, camera_slug: str, key: str
    ) -> None:
        super().__init__(coordinator, f"{camera_slug}_{key}")
        self.camera_slug = camera_slug
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, f"{coordinator.entry.entry_id}_{camera_slug}")},
            via_device=(DOMAIN, coordinator.entry.entry_id),
            name=self._camera_name,
            manufacturer="Kustos Vision",
            model="Recorded camera",
        )

    @property
    def _camera_name(self) -> str:
        camera = self.coordinator.config.camera(self.camera_slug)
        return camera.name if camera else self.camera_slug

    @property
    def camera_state(self) -> CameraState | None:
        if self.coordinator.data is None:
            return None
        return self.coordinator.data.cameras.get(self.camera_slug)

    @property
    def available(self) -> bool:
        """A camera removed in the panel has no state to report."""
        return super().available and self.camera_state is not None


@callback
def async_setup_cameras(
    entry: ConfigEntry,
    coordinator: CamwatchCoordinator,
    async_add_entities: AddConfigEntryEntitiesCallback,
    build: Callable[[str], Iterable[CamwatchCameraEntity]],
) -> None:
    """Add per-camera entities now, and again whenever a camera is added.

    Cameras appear and disappear while Home Assistant is running, because the
    panel is where they are managed. Entities for a camera that is removed stay
    behind as unavailable rather than being deleted, so that a camera recreated
    under the same slug keeps its history.

    The listener is tied to the config entry: a coordinator listener that
    outlives an unload keeps the whole update cycle running against an
    integration that is no longer set up.
    """
    known: set[str] = set()

    @callback
    def _sync() -> None:
        new = [c.slug for c in coordinator.config.cameras if c.slug not in known]
        if not new:
            return
        known.update(new)
        entities: list[CamwatchCameraEntity] = []
        for slug in new:
            entities.extend(build(slug))
        async_add_entities(entities)

    _sync()
    entry.async_on_unload(coordinator.async_add_listener(_sync))
