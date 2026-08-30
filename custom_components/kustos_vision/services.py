"""The service that runs an analysis on demand.

Useful twice over: it is how a question is tried out while it is being written,
and it is how an automation asks for an analysis at a moment kustos_vision's own
triggers would not have caught, such as on a doorbell press.
"""

from __future__ import annotations

import logging

import voluptuous as vol
from homeassistant.core import (
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
    callback,
)
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv

from .const import DOMAIN
from .vision import VisionError

_LOGGER = logging.getLogger(__name__)

SERVICE_ANALYZE = "analyze"

ANALYZE_SCHEMA = vol.Schema(
    {
        vol.Required("camera"): cv.string,
        vol.Optional("force", default=True): cv.boolean,
    }
)


@callback
def async_register_services(hass: HomeAssistant) -> None:
    """Register the domain services, once per Home Assistant run."""

    async def _analyze(call: ServiceCall) -> ServiceResponse:
        entries = hass.config_entries.async_loaded_entries(DOMAIN)
        if not entries:
            raise ServiceValidationError("kustos_vision is not set up")
        coordinator = entries[0].runtime_data

        slug = call.data["camera"]
        if coordinator.config.camera(slug) is None:
            known = ", ".join(c.slug for c in coordinator.config.cameras) or "none"
            raise ServiceValidationError(
                f"no camera {slug!r} in kustos_vision (known: {known})"
            )
        if coordinator.config.vision_for(slug) is None:
            raise ServiceValidationError(
                f"camera {slug!r} has no vision profile to run"
            )

        try:
            result = await coordinator.vision.async_analyse(
                slug, reason="service", force=call.data["force"]
            )
        except VisionError as err:
            raise ServiceValidationError(str(err)) from err

        if result is None:
            # A limit stopped it, or one was already running. Reporting that as
            # an empty answer rather than an error keeps an automation that
            # calls this on every doorbell press from filling the log.
            return {"ran": False, "values": {}, "problems": {}}
        return {
            "ran": True,
            "values": result.values,
            "problems": result.problems,
            "duration": round(result.duration_s, 2),
        }

    hass.services.async_register(
        DOMAIN,
        SERVICE_ANALYZE,
        _analyze,
        schema=ANALYZE_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
