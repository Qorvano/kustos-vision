"""Asking for one analysis of a camera, from an automation or a dashboard."""

from __future__ import annotations

from homeassistant.components.button import ButtonEntity
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from . import CamwatchEntry
from .coordinator import CamwatchCoordinator
from .entity import CamwatchCameraEntity, async_setup_cameras
from .vision import VisionError


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
        lambda slug: [AnalyseNowButton(coordinator, slug)],
    )


class AnalyseNowButton(CamwatchCameraEntity, ButtonEntity):
    """Runs one analysis of the camera, exactly as the panel's button does.

    The ``kustos_vision.analyze`` service already offers this and additionally
    returns the answers. The button exists for the cases where that is not
    needed: it is visible on the camera's device, it can sit on a dashboard,
    and an automation calls it with ``button.press`` without knowing the
    camera's identifier. Like the panel and the service it runs forced, which
    skips the cooldown and the profile's enabled switch but never the daily
    budget. That is what makes a single, deliberate look possible on a camera
    whose own triggers are switched off, without paying for permanent
    detection.
    """

    _attr_translation_key = "analyse_now"

    def __init__(self, coordinator: CamwatchCoordinator, camera_slug: str) -> None:
        super().__init__(coordinator, camera_slug, "analyse_now")

    @property
    def available(self) -> bool:
        """Tied to the configuration, not to a completed update cycle.

        Without a vision profile there is nothing a press could run, and
        showing the button anyway would invite presses that do nothing.
        """
        config = self.coordinator.config
        return (
            config.camera(self.camera_slug) is not None
            and config.vision_for(self.camera_slug) is not None
        )

    async def async_press(self) -> None:
        # A limit stopping the run (budget used up, an analysis already going)
        # is not an error here, for the same reason as in the service: an
        # automation pressing this on every doorbell ring must not fill the
        # log. The runner already logs an exhausted budget itself. A failure
        # of the analysis, on the other hand, has to reach the automation
        # trace, so it is raised.
        try:
            await self.coordinator.vision.async_analyse(
                self.camera_slug, reason="button", force=True
            )
        except VisionError as err:
            raise HomeAssistantError(str(err)) from err
