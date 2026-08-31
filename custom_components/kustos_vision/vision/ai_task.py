"""Analysis through Home Assistant's own AI Task API.

The picture is not fetched here. ``media-source://camera/<entity>`` is a
special case in the AI Task integration: it takes the snapshot itself, writes
it to a temporary file, attaches it and deletes it afterwards. Doing it by hand
would mean owning a temp file for no gain.
"""

from __future__ import annotations

import time
from typing import Any

import voluptuous as vol
from homeassistant.components import ai_task
from homeassistant.core import HomeAssistant

from ..core.config import CameraConfig, VisionProfile
from ..core.observations import to_ai_task_structure
from . import VisionError, build_prompt

TASK_NAME = "kustos_vision vision"


def _structure(profile: VisionProfile) -> vol.Schema:
    """Turn the observations into the schema the answer is validated against.

    Built the same way the ai_task service builds it from YAML, so a model that
    answers with something else fails here rather than writing nonsense into a
    sensor.
    """
    from homeassistant.const import CONF_DESCRIPTION, CONF_SELECTOR
    from homeassistant.helpers import selector

    fields = {}
    for key, spec in to_ai_task_structure(list(profile.active_observations)).items():
        fields[vol.Required(key, description=spec[CONF_DESCRIPTION])] = (
            selector.selector(spec[CONF_SELECTOR])
        )
    return vol.Schema(fields, extra=vol.PREVENT_EXTRA)


async def async_run(
    hass: HomeAssistant,
    camera: CameraConfig,
    profile: VisionProfile,
    camera_entity_id: str,
) -> tuple[Any, float]:
    """Ask the configured AI Task entity, returning its answer and how long."""
    started = time.monotonic()
    try:
        result = await ai_task.async_generate_data(
            hass,
            task_name=TASK_NAME,
            entity_id=profile.backend.entity_id,
            instructions=build_prompt(camera, profile),
            structure=_structure(profile),
            attachments=[
                {
                    "media_content_id": f"media-source://camera/{camera_entity_id}",
                    "media_content_type": "image/jpeg",
                }
            ],
        )
    except Exception as err:
        raise VisionError(str(err)) from err
    return result.data, time.monotonic() - started
