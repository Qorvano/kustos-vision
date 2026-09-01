"""People the model is asked to recognise, and the fields that ask it.

Person fields are merged into the schema at request time and are never stored
as observations: they derive from the person list, and a stored copy would be
a second place for the two to disagree - and would create an entity per
camera per person, when presence is a property of the person.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

from .observations import ObservationType
from .references import PlannedPicture, ReferenceImage

# The user picked ten minutes: it bridges someone turning round, bending
# down or standing behind the car across several trigger cooldowns (default
# 60 s), while still reporting a departure reasonably soon. Configurable on
# the persons card.
DEFAULT_PERSON_ABSENCE_SECONDS = 600

# Same tile-budget reasoning as the observation references: one frontal, one
# at an angle is what a small model can actually use, and an overflowing
# request fails wholesale.
MAX_PHOTOS_PER_PERSON = 2

# The underscore is what makes a collision impossible rather than unlikely:
# an observation key must match ^[a-z][a-z0-9_]*$, so no key a user can type
# can ever begin with one.
PERSON_FIELD_PREFIX = "_person_"


@dataclass(frozen=True, slots=True)
class PersonProfile:
    """Someone the model is asked to recognise."""

    id: str
    """A slug; part of the presence entity's unique id, so it never changes.
    Renaming the person is free, re-identifying them is not."""

    name: str
    references: tuple[ReferenceImage, ...] = ()
    enabled: bool = True

    def __post_init__(self) -> None:
        if len(self.references) > MAX_PHOTOS_PER_PERSON:
            raise ValueError(
                f"person {self.id!r} carries more than "
                f"{MAX_PHOTOS_PER_PERSON} photos"
            )

    def as_dict(self) -> dict[str, Any]:
        stored: dict[str, Any] = {"id": self.id, "name": self.name}
        if self.references:
            stored["references"] = [r.as_dict() for r in self.references]
        if not self.enabled:
            stored["enabled"] = False
        return stored

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> PersonProfile:
        return cls(
            id=str(data["id"]),
            name=str(data["name"]),
            references=tuple(
                ReferenceImage.from_dict(r) for r in data.get("references", [])
            ),
            enabled=bool(data.get("enabled", True)),
        )


@dataclass(frozen=True, slots=True)
class PersonsConfig:
    """The people, and the one setting that governs all of them.

    The off-delay lives here rather than on each person: it describes how
    this installation's cameras cover the property, not anything about an
    individual, and per-person copies would only be a way for them to
    disagree.
    """

    people: tuple[PersonProfile, ...] = ()
    absence_seconds: int = DEFAULT_PERSON_ABSENCE_SECONDS

    def person(self, person_id: str) -> PersonProfile | None:
        return next((p for p in self.people if p.id == person_id), None)

    def as_dict(self) -> dict[str, Any]:
        return {
            "people": [p.as_dict() for p in self.people],
            "absence_seconds": self.absence_seconds,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> PersonsConfig:
        return cls(
            people=tuple(
                PersonProfile.from_dict(p) for p in data.get("people", [])
            ),
            absence_seconds=int(
                data.get("absence_seconds", DEFAULT_PERSON_ABSENCE_SECONDS)
            ),
        )


def person_field(person: PersonProfile) -> str:
    return f"{PERSON_FIELD_PREFIX}{person.id}"


def person_id_from_field(key: str) -> str:
    return key.removeprefix(PERSON_FIELD_PREFIX)


def is_person_field(key: str) -> bool:
    return key.startswith(PERSON_FIELD_PREFIX)


@dataclass(frozen=True, slots=True)
class PersonField:
    """A synthetic field, shaped like an Observation where the serialisers
    and the answer coercion look.

    Not an Observation on purpose: Observation validates its key against the
    entity-id regex, and that regex refusing a leading underscore is exactly
    what makes the person prefix collision-free against every key a user can
    type. A person field never becomes an entity, so the validation it fails
    does not apply to it.
    """

    key: str
    type: ObservationType
    question: str
    references: tuple[ReferenceImage, ...] = ()
    options: tuple[str, ...] = ()
    minimum: int = 0
    maximum: int = 1
    enabled: bool = True
    name: str | None = None
    device_class: str | None = None


def person_observations(
    people: Sequence[PersonProfile],
) -> tuple[PersonField, ...]:
    """The boolean fields that ask whether each person is in the frame.

    Written in English like the rest of the generated framing: this is not a
    question the user wrote, it is the instruction around their person's name.
    """
    return tuple(
        PersonField(
            key=person_field(person),
            type=ObservationType.BOOLEAN,
            question=(
                f"Is {person.name} the person visible in the current camera "
                f"frame? Compare with the reference pictures labelled "
                f"'{person.name}'. Answer true only when the match is clear; "
                f"when somebody is visible but cannot be matched to "
                f"{person.name}, answer false."
            ),
        )
        for person in people
        if person.enabled
    )


def plan_person_pictures(
    people: Sequence[PersonProfile],
) -> tuple[PlannedPicture, ...]:
    """The reference photos of the enabled people, with their wording."""
    planned: list[PlannedPicture] = []
    for person in people:
        if not person.enabled:
            continue
        for reference in person.references:
            caption = f" {reference.caption}" if reference.caption else ""
            planned.append(
                PlannedPicture(
                    asset_id=reference.sent_asset_id,
                    preamble=(
                        f"Reference picture of {person.name}.{caption} This "
                        f"is NOT the current camera frame; use it only to "
                        f"decide whether {person.name} is the person in the "
                        f"current frame."
                    ),
                )
            )
    return tuple(planned)
