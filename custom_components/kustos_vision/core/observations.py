"""What the user wants to know about a camera picture, and how to ask for it.

An observation is one question with a typed answer: "is a bin at the kerb"
(boolean), "who is at the door" (text), "how many people" (number), "what kind
of thing" (select). One definition produces two things that must never drift
apart: the Home Assistant entity that holds the answer, and the schema the
model is asked to answer in.

Both serialisers live here for that reason. Home Assistant's AI Task API wants
selector definitions; an OpenAI-compatible endpoint wants JSON Schema. Writing
them from one source means a new observation type cannot be half-supported.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Self

# An observation key becomes part of an entity id, so it has to survive that.
_KEY_RE = re.compile(r"^[a-z][a-z0-9_]*$")


class ObservationError(ValueError):
    """An observation is not usable as defined."""


class ObservationType(StrEnum):
    """The shape of the answer, which decides the entity and the schema."""

    BOOLEAN = "boolean"
    """A yes or no, held by a binary_sensor."""

    TEXT = "text"
    """A short free-text answer, held by a sensor."""

    NUMBER = "number"
    """A count, held by a sensor."""

    SELECT = "select"
    """One of a fixed set of answers, held by a sensor."""


@dataclass(frozen=True, slots=True)
class Observation:
    """One question about a camera picture."""

    key: str
    type: ObservationType
    question: str
    """What the model is asked. This is the whole prompt for this field, so it
    should read as a question a stranger could answer from the picture alone."""

    name: str | None = None
    """What the entity is called. Falls back to the key, never to the
    question: the question can be a whole sentence, and Home Assistant builds
    the entity id from the name, so using it produces an unusable identifier
    that also changes whenever the wording is improved."""

    device_class: str | None = None
    """Passed through to the entity, e.g. "motion" or "occupancy"."""

    options: tuple[str, ...] = ()
    """For SELECT: the allowed answers."""

    minimum: int = 0
    maximum: int = 100
    """For NUMBER: the range. Bounding it keeps a model from answering with
    something absurd and turning a count into nonsense."""

    def __post_init__(self) -> None:
        if not _KEY_RE.match(self.key):
            raise ObservationError(
                f"observation key {self.key!r} cannot be part of an entity id"
            )
        if not self.question.strip():
            raise ObservationError(f"observation {self.key!r} needs a question")
        if self.type is ObservationType.SELECT and len(self.options) < 2:
            raise ObservationError(
                f"observation {self.key!r} needs at least two options to choose from"
            )
        if self.type is ObservationType.SELECT and len(set(self.options)) != len(
            self.options
        ):
            raise ObservationError(f"observation {self.key!r} has duplicate options")
        if self.type is ObservationType.NUMBER and self.maximum <= self.minimum:
            raise ObservationError(
                f"observation {self.key!r} has an empty number range"
            )

    @property
    def display_name(self) -> str:
        """A short label for the entity, stable across question rewordings."""
        if self.name:
            return self.name
        readable = self.key.replace("_", " ").strip()
        return readable[:1].upper() + readable[1:]

    def as_dict(self) -> dict[str, Any]:
        stored: dict[str, Any] = {
            "key": self.key,
            "type": str(self.type),
            "question": self.question,
        }
        if self.name:
            stored["name"] = self.name
        if self.device_class:
            stored["device_class"] = self.device_class
        if self.type is ObservationType.SELECT:
            stored["options"] = list(self.options)
        if self.type is ObservationType.NUMBER:
            stored["minimum"] = self.minimum
            stored["maximum"] = self.maximum
        return stored

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Self:
        try:
            kind = ObservationType(data["type"])
        except ValueError as err:
            raise ObservationError(f"unknown observation type {data.get('type')!r}") from err
        return cls(
            key=data["key"],
            type=kind,
            question=data["question"],
            name=data.get("name"),
            device_class=data.get("device_class"),
            options=tuple(data.get("options", [])),
            minimum=int(data.get("minimum", 0)),
            maximum=int(data.get("maximum", 100)),
        )


def _selector_for(observation: Observation) -> dict[str, Any]:
    """The Home Assistant selector describing this answer."""
    match observation.type:
        case ObservationType.BOOLEAN:
            return {"boolean": {}}
        case ObservationType.TEXT:
            return {"text": {}}
        case ObservationType.NUMBER:
            return {
                "number": {
                    "min": observation.minimum,
                    "max": observation.maximum,
                    "mode": "box",
                }
            }
        case ObservationType.SELECT:
            return {"select": {"options": list(observation.options)}}


def to_ai_task_structure(observations: list[Observation]) -> dict[str, Any]:
    """Build the ``structure`` for ``ai_task.generate_data``.

    Home Assistant turns this into a voluptuous schema that the answer is
    validated against, so a model that answers with something else fails loudly
    instead of writing nonsense into a sensor. The question becomes the field
    description, which is what the model actually reads.
    """
    return {
        observation.key: {
            "selector": _selector_for(observation),
            "description": observation.question,
            "required": True,
        }
        for observation in observations
    }


def to_json_schema(observations: list[Observation]) -> dict[str, Any]:
    """Build a JSON Schema for an OpenAI-compatible ``response_format``.

    ``additionalProperties`` is false and every field is required, because
    structured-output implementations only guarantee adherence for a schema
    that leaves no room; a partially specified one degrades into a suggestion.
    """
    properties: dict[str, Any] = {}
    for observation in observations:
        field: dict[str, Any] = {"description": observation.question}
        match observation.type:
            case ObservationType.BOOLEAN:
                field["type"] = "boolean"
            case ObservationType.TEXT:
                field["type"] = "string"
            case ObservationType.NUMBER:
                field["type"] = "integer"
                field["minimum"] = observation.minimum
                field["maximum"] = observation.maximum
            case ObservationType.SELECT:
                field["type"] = "string"
                field["enum"] = list(observation.options)
        properties[observation.key] = field

    return {
        "type": "object",
        "properties": properties,
        "required": [o.key for o in observations],
        "additionalProperties": False,
    }


def coerce_answer(observation: Observation, value: Any) -> Any:
    """Bring one answer into the shape the entity expects, or raise.

    Models return "true" as a string, a float where an integer was asked for,
    or an option in the wrong case. Correcting what is unambiguous is worth
    doing; inventing a value for something unrecognisable is not, because a
    sensor holding a guess is worse than one holding nothing.
    """
    match observation.type:
        case ObservationType.BOOLEAN:
            if isinstance(value, bool):
                return value
            if isinstance(value, str) and value.strip().lower() in {
                "true", "yes", "ja", "1",
            }:
                return True
            if isinstance(value, str) and value.strip().lower() in {
                "false", "no", "nein", "0",
            }:
                return False
            if isinstance(value, int | float):
                return bool(value)
            raise ObservationError(f"{observation.key}: {value!r} is not a yes or no")

        case ObservationType.NUMBER:
            try:
                number = round(float(value))
            except (TypeError, ValueError) as err:
                raise ObservationError(
                    f"{observation.key}: {value!r} is not a number"
                ) from err
            return max(observation.minimum, min(observation.maximum, number))

        case ObservationType.SELECT:
            if not isinstance(value, str):
                raise ObservationError(f"{observation.key}: {value!r} is not an option")
            for option in observation.options:
                if option.lower() == value.strip().lower():
                    return option
            raise ObservationError(
                f"{observation.key}: {value!r} is not one of the allowed options"
            )

        case ObservationType.TEXT:
            if value is None:
                raise ObservationError(f"{observation.key}: no answer")
            return str(value).strip()


def coerce_answers(
    observations: list[Observation], data: dict[str, Any]
) -> tuple[dict[str, Any], dict[str, str]]:
    """Coerce every answer, returning what worked and what did not.

    A model getting one field wrong must not discard the others: partial
    results are still useful, and the failures are reported so the user can see
    which question needs rewording.
    """
    values: dict[str, Any] = {}
    problems: dict[str, str] = {}
    for observation in observations:
        if observation.key not in data:
            problems[observation.key] = "no answer"
            continue
        try:
            values[observation.key] = coerce_answer(observation, data[observation.key])
        except ObservationError as err:
            problems[observation.key] = str(err)
    return values, problems
