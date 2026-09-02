"""The frame of a camera's latest analysis, as an image entity.

Exists for automations: a push notification about "Dustin wurde im Hinterhof
erkannt" is worth little without the picture it was decided from. The entity
always carries the newest analysed frame, so a notification can attach it via
the entity's picture URL.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from homeassistant.components.image import ImageEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.util import dt as dt_util

from . import CamwatchEntry
from .const import LOCAL_STATE_DIR
from .coordinator import CamwatchCoordinator
from .core.capture import frames_dir
from .entity import CamwatchCameraEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: CamwatchEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    coordinator = entry.runtime_data
    known: set[str] = set()

    @callback
    def _sync() -> None:
        new = [
            profile.camera_slug
            for profile in coordinator.config.vision
            if profile.frame_sensor and profile.camera_slug not in known
        ]
        if not new:
            return
        known.update(new)
        async_add_entities(
            [AnalysedFrameImage(hass, coordinator, slug) for slug in new]
        )

    _sync()
    entry.async_on_unload(coordinator.async_add_listener(_sync))


class AnalysedFrameImage(CamwatchCameraEntity, ImageEntity):
    """The exact picture the newest analysis was answered from.

    Created when the switch is turned on and, like the observation entities,
    never removed: switching it off makes it unavailable and back on
    resurrects it with its history.
    """

    _attr_content_type = "image/jpeg"
    _attr_translation_key = "analysed_frame"

    def __init__(
        self, hass: HomeAssistant, coordinator: CamwatchCoordinator, camera_slug: str
    ) -> None:
        CamwatchCameraEntity.__init__(self, coordinator, camera_slug, "analysed_frame")
        ImageEntity.__init__(self, hass)
        self._attr_image_last_updated = self._latest_at()

    def _latest(self) -> tuple[str, datetime] | None:
        """Ring name and time of the newest run that kept a frame."""
        state = self.coordinator.vision.state_for(self.camera_slug)
        for run in state.history:
            if not run.get("frame"):
                continue
            at = dt_util.parse_datetime(run["at"])
            if at is None:
                continue
            return run["frame"], at
        return None

    def _latest_at(self) -> datetime | None:
        latest = self._latest()
        return latest[1] if latest else None

    @callback
    def _handle_coordinator_update(self) -> None:
        at = self._latest_at()
        if at != self._attr_image_last_updated:
            self._attr_image_last_updated = at
            # The base class caches the served bytes and the picture URL's
            # token; both belong to the previous frame now.
            self._cached_image = None
            self.async_update_token()
        super()._handle_coordinator_update()

    async def async_image(self) -> bytes | None:
        latest = self._latest()
        if latest is None:
            return None
        path = (
            frames_dir(
                Path(self.hass.config.path(LOCAL_STATE_DIR)), self.camera_slug
            )
            / latest[0]
        )
        return await self.hass.async_add_executor_job(_read_or_none, path)

    @property
    def available(self) -> bool:
        profile = self.coordinator.config.vision_for(self.camera_slug)
        return (
            super().available and profile is not None and profile.frame_sensor
        )


def _read_or_none(path: Path) -> bytes | None:
    try:
        return path.read_bytes()
    except OSError:
        return None
