"""Asking a model what it sees, whichever model the user picked.

Two backends behind one call. Neither is a fallback for the other; they are
different places a model can live:

* **AI Task** hands the work to Home Assistant, which already knows how to talk
  to OpenAI, Anthropic, Google and Ollama, and will know about whatever comes
  next without kustos_vision changing.
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

from ..core.capture import CapturedFrame
from ..core.config import CameraConfig, VisionBackendKind, VisionProfile
from ..core.marks import MARKS_FIELD, Mark, parse_marks
from ..core.observations import Observation, coerce_answers
from ..core.persons import (
    PersonField,
    PersonProfile,
    is_person_field,
    person_id_from_field,
    person_observations,
)

_LOGGER = logging.getLogger(__name__)


class VisionError(HomeAssistantError):
    """The analysis could not be carried out."""


@dataclass(frozen=True, slots=True)
class ReferencePicture:
    """A picture that is not the current frame, and the text introducing it."""

    content: bytes
    content_type: str
    preamble: str
    """Told to the model right before the picture: what it shows, and that it
    is not evidence of anything being there now."""

    asset_id: str = ""
    """The stored asset behind these bytes. The OpenAI path inlines the bytes
    and ignores this; the AI Task path attaches by media-source identifier
    and needs it."""


@dataclass(frozen=True, slots=True)
class VisionRequest:
    """Everything one analysis sends beyond the profile itself.

    Optional as a whole: with no request the call behaves exactly as it did
    before this existed - the backend fetches its own still and asks only the
    user's questions - which is what keeps the change additive.
    """

    frame: CapturedFrame | None = None
    """The frame taken at trigger time. When None, the backend falls back to
    asking the camera entity for a still, with all the staleness that brings."""

    references: tuple[ReferencePicture, ...] = ()
    """Reference pictures, already loaded, in the order they travel - always
    AFTER the frame, so a truncating runner loses references, not evidence."""

    persons: tuple[PersonProfile, ...] = ()
    """The people this analysis asks for. Their boolean fields are merged
    into the schema at request time and split back out of the answer here,
    so the entities never see a person key."""

    mark_objects: bool = False
    """Whether the request also asks WHERE the reported objects are (the
    synthetic _marks field), so the boxes can be drawn into the frame."""


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

    persons: dict[str, bool] = field(default_factory=dict)
    """Person id -> whether the model matched them in this frame."""

    marks: tuple[Mark, ...] = ()
    """Where the model located the objects its answers report."""


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
        parts.append(
            "The owner describes what is permanently in this view: "
            + profile.context.strip()
        )
        # Without this the model treats the context as a crib sheet and
        # recites it: a "describe what you see" question came back as an
        # almost verbatim copy of the context, which reports nothing.
        parts.append(
            "Everything that description declares permanent is the baseline, "
            "not an observation. Never answer by repeating it; answer from "
            "what THIS frame shows beyond or different from that baseline."
        )
    parts.append(
        "Answer each field from what is visible in this frame alone. "
        "Do not infer what is likely, and do not guess; do not carry over "
        "anything from earlier frames. Each field carries its own instruction "
        "for what to answer when something cannot be seen - follow that "
        "instruction rather than inventing a word that stands for nothing."
    )
    parts.append(
        "The camera may have switched to infrared, in which case the picture "
        "is monochrome and carries no colour information at all. A grey "
        "object is not evidence of any colour."
    )
    return "\n\n".join(parts)


async def async_analyse(
    hass: HomeAssistant,
    camera: CameraConfig,
    profile: VisionProfile,
    camera_entity_id: str,
    request: VisionRequest | None = None,
) -> VisionResult:
    """Run one analysis through whichever backend the profile names."""
    # Fields, not observations: a profile without questions still asks
    # something when the request carries people to recognise.
    if not analysis_fields(profile, request):
        raise VisionError(f"vision profile for {camera.slug!r} asks nothing")

    if profile.backend.kind is VisionBackendKind.AI_TASK:
        from .ai_task import async_run as run
    else:
        from .openai_compat import async_run as run

    raw, duration = await run(hass, camera, profile, camera_entity_id, request=request)

    if not isinstance(raw, dict):
        raise VisionError(
            f"the model answered with {type(raw).__name__}, not a set of fields"
        )

    values, problems = coerce_answers(analysis_fields(profile, request), raw)
    marks: tuple[Mark, ...] = (
        parse_marks(raw.get(MARKS_FIELD))
        if request is not None and request.mark_objects
        else ()
    )
    # The person fields are split back out here, once, so neither the
    # backends nor the observation entities ever see a person key.
    persons: dict[str, bool] = {}
    for key in [k for k in values if is_person_field(k)]:
        persons[person_id_from_field(key)] = bool(values.pop(key))
    if problems:
        _LOGGER.debug(
            "kustos_vision: %s could not be read from the answer: %s",
            camera.slug,
            problems,
        )
    return VisionResult(
        values=values,
        problems=problems,
        raw=raw,
        duration_s=duration,
        persons=persons,
        marks=marks,
    )


def analysis_fields(
    profile: VisionProfile, request: VisionRequest | None
) -> list[Observation | PersonField]:
    """Every field one analysis asks: the user's questions plus the synthetic
    person fields. One function, used for the schema AND for reading the
    answer, so the two cannot disagree about what was asked.
    """
    extra = person_observations(request.persons) if request is not None else ()
    return [*profile.active_observations, *extra]
