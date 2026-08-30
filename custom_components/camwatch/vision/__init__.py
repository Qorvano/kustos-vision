"""Asking a model what it sees, whichever model the user picked.

Two backends behind one call. Neither is a fallback for the other; they are
different places a model can live:

* **AI Task** hands the work to Home Assistant, which already knows how to talk
  to OpenAI, Anthropic, Google and Ollama, and will know about whatever comes
  next without camwatch changing.
* **OpenAI-compatible** speaks the protocol directly to a URL, which is what a
  local llama.cpp, LM Studio or vLLM offers, and what several hosted services
  offer as well.

Both are needed. Not every installation has an AI Task provider set up, and
some local runners expose a conversation entity without an AI Task one, so
picking either single path would exclude real setups.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from ..core.config import CameraConfig, VisionBackendKind, VisionProfile
from ..core.observations import coerce_answers

_LOGGER = logging.getLogger(__name__)


class VisionError(HomeAssistantError):
    """The analysis could not be carried out."""


@dataclass(frozen=True, slots=True)
class VisionResult:
    """What one analysis produced."""

    values: dict[str, Any] = field(default_factory=dict)
    """Answers that could be used, keyed by observation."""

    problems: dict[str, str] = field(default_factory=dict)
    """Observations the model did not answer usably, and why. Reported rather
    than swallowed: a question that never gets a usable answer needs
    rewording, and that is invisible if the failure is silent."""

    raw: Any = None
    """What the model actually returned, for the history in the panel. This is
    the only way to improve a prompt without guessing."""

    duration_s: float = 0.0


def build_prompt(camera: CameraConfig, profile: VisionProfile) -> str:
    """The instructions that go with the picture.

    The individual questions are not in here: they travel as field
    descriptions in the schema, where the model reads them next to the answer
    it has to produce. This is only the framing.

    Written in English regardless of the user's language, because that is what
    models handle most reliably, while the questions themselves stay in
    whatever language the user wrote them.
    """
    parts = [
        f'This is a still frame from a camera called "{camera.name}".',
    ]
    if profile.context.strip():
        parts.append(profile.context.strip())
    parts.append(
        "Answer each field from what is visible in this frame alone. "
        "Do not infer what is likely, and do not carry over anything from "
        "earlier frames. If something cannot be seen, answer with the value "
        "that means absent rather than guessing."
    )
    return "\n\n".join(parts)


async def async_analyse(
    hass: HomeAssistant,
    camera: CameraConfig,
    profile: VisionProfile,
    camera_entity_id: str,
) -> VisionResult:
    """Run one analysis through whichever backend the profile names."""
    if not profile.observations:
        raise VisionError(f"vision profile for {camera.slug!r} asks nothing")

    if profile.backend.kind is VisionBackendKind.AI_TASK:
        from .ai_task import async_run as run
    else:
        from .openai_compat import async_run as run

    raw, duration = await run(hass, camera, profile, camera_entity_id)

    if not isinstance(raw, dict):
        raise VisionError(
            f"the model answered with {type(raw).__name__}, not a set of fields"
        )

    values, problems = coerce_answers(list(profile.observations), raw)
    if problems:
        _LOGGER.debug(
            "camwatch: %s could not be read from the answer: %s",
            camera.slug,
            problems,
        )
    return VisionResult(values=values, problems=problems, raw=raw, duration_s=duration)
