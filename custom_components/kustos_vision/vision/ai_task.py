"""Analysis through Home Assistant's own AI Task API.

The frame the runner captured attaches through this integration's own media
source (attachments resolve via media_source and need a local path). Only
when no frame was kept does the old ``media-source://camera/<entity>``
special case stand in, with the staleness that brings.
"""

from __future__ import annotations

import logging
import time
from typing import Any

import voluptuous as vol
from homeassistant.core import HomeAssistant

from ..const import DOMAIN
from ..core.config import CameraConfig, VisionProfile
from ..core.observations import to_ai_task_structure
from . import VisionError, VisionRequest, analysis_fields, build_prompt

_LOGGER = logging.getLogger(__name__)

TASK_NAME = "kustos_vision vision"


def _structure(asked: list) -> vol.Schema:
    """Turn the asked fields into the schema the answer is validated against.

    Built the same way the ai_task service builds it from YAML, so a model that
    answers with something else fails here rather than writing nonsense into a
    sensor.
    """
    from homeassistant.const import CONF_DESCRIPTION, CONF_SELECTOR
    from homeassistant.helpers import selector

    fields = {}
    for key, spec in to_ai_task_structure(asked).items():
        fields[vol.Required(key, description=spec[CONF_DESCRIPTION])] = (
            selector.selector(spec[CONF_SELECTOR])
        )
    return vol.Schema(fields, extra=vol.PREVENT_EXTRA)


def _attachments_and_instructions(
    camera: CameraConfig,
    profile: VisionProfile,
    camera_entity_id: str,
    request: VisionRequest | None,
) -> tuple[list[dict[str, str]], str]:
    """The attachments in their order, and the instructions naming them.

    The AI Task API cannot interleave text between attachments the way a
    chat message can, so what each attachment IS travels in the
    instructions, numbered in attachment order: the frame first, every
    reference after, mirroring the OpenAI path's graceful-degradation order.

    The frame attaches through this integration's own media source when the
    runner kept one; otherwise the old camera attachment stands in - a still
    the camera integration may have cached minutes ago, which is exactly
    what the capture exists to avoid, so the fallback is logged.
    """
    attachments: list[dict[str, str]] = []
    lines: list[str] = []

    frame = request.frame if request is not None else None
    if frame is not None and frame.path is not None:
        slug = frame.path.parent.name
        attachments.append(
            {
                "media_content_id": (
                    f"media-source://{DOMAIN}/frame/{slug}/{frame.path.name}"
                ),
                "media_content_type": frame.content_type,
            }
        )
    else:
        _LOGGER.debug(
            "kustos_vision: no kept frame for %s; the AI Task attachment "
            "falls back to the camera's own still",
            camera.slug,
        )
        attachments.append(
            {
                "media_content_id": f"media-source://camera/{camera_entity_id}",
                "media_content_type": "image/jpeg",
            }
        )
    lines.append(
        "Attachment 1 is the current camera frame; every field is about it "
        "and about nothing else."
    )

    for reference in request.references if request is not None else ():
        if not reference.asset_id:
            continue
        attachments.append(
            {
                "media_content_id": (
                    f"media-source://{DOMAIN}/reference/{reference.asset_id}"
                ),
                "media_content_type": reference.content_type,
            }
        )
        lines.append(f"Attachment {len(attachments)}: {reference.preamble}")

    instructions = build_prompt(camera, profile)
    if len(attachments) > 1:
        instructions += "\n\n" + "\n".join(lines)
    return attachments, instructions


async def async_run(
    hass: HomeAssistant,
    camera: CameraConfig,
    profile: VisionProfile,
    camera_entity_id: str,
    request: VisionRequest | None = None,
) -> tuple[Any, float]:
    """Ask the configured AI Task entity, returning its answer and how long."""
    # Imported here, not at module level: the ai_task component pulls the
    # whole conversation stack with it, and this module's pure part (the
    # attachment builder) has to stay importable without that.
    from homeassistant.components import ai_task

    started = time.monotonic()
    attachments, instructions = _attachments_and_instructions(
        camera, profile, camera_entity_id, request
    )
    try:
        result = await ai_task.async_generate_data(
            hass,
            task_name=TASK_NAME,
            entity_id=profile.backend.entity_id,
            instructions=instructions,
            structure=_structure(analysis_fields(profile, request)),
            attachments=attachments,
        )
    except Exception as err:
        raise VisionError(str(err)) from err
    return result.data, time.monotonic() - started
