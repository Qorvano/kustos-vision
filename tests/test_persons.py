"""Tests for the person model and the synthetic fields it produces."""

from __future__ import annotations

import re

import pytest
from kustos_vision.core.observations import (
    Observation,
    ObservationError,
    ObservationType,
    coerce_answers,
    to_json_schema,
)
from kustos_vision.core.persons import (
    MAX_PHOTOS_PER_PERSON,
    PERSON_FIELD_PREFIX,
    PersonProfile,
    PersonsConfig,
    person_field,
    person_id_from_field,
    person_observations,
    plan_person_pictures,
)
from kustos_vision.core.references import ReferenceImage


def person(**overrides) -> PersonProfile:
    values = {"id": "dustin", "name": "Dustin"}
    values.update(overrides)
    return PersonProfile(**values)


# ----------------------------------------------------------------------
# The prefix cannot collide
# ----------------------------------------------------------------------


def test_a_person_field_cannot_collide_with_a_users_key() -> None:
    """Proved against the actual key rule, not assumed: every user key must
    start with a lowercase letter, so a key with the person prefix is
    impossible to type - which is why the prefix needs no reservation."""
    key = person_field(person())
    assert key.startswith(PERSON_FIELD_PREFIX)
    key_rule = re.compile(r"^[a-z][a-z0-9_]*$")  # mirrors observations._KEY_RE
    assert not key_rule.match(key)
    with pytest.raises(ObservationError, match="entity id"):
        Observation(key=key, type=ObservationType.BOOLEAN, question="?")


def test_the_field_round_trips_to_the_person_id() -> None:
    assert person_id_from_field(person_field(person())) == "dustin"


# ----------------------------------------------------------------------
# The synthetic fields
# ----------------------------------------------------------------------


def test_a_disabled_person_produces_no_field() -> None:
    fields = person_observations([person(), person(id="gast", name="Gast", enabled=False)])
    assert [f.key for f in fields] == ["_person_dustin"]


def test_the_question_names_the_person_and_demands_a_clear_match() -> None:
    field = person_observations([person()])[0]
    assert "Dustin" in field.question
    assert "answer false" in field.question


def test_person_fields_merge_into_the_schema_beside_the_users_questions() -> None:
    """The merge is plain concatenation, and both kinds end up required."""
    user = Observation(
        key="paket", type=ObservationType.BOOLEAN, question="Liegt ein Paket da?"
    )
    merged = [user, *person_observations([person()])]
    schema = to_json_schema(merged)
    assert set(schema["required"]) == {"paket", "_person_dustin"}
    assert schema["properties"]["_person_dustin"]["type"] == "boolean"


def test_person_answers_coerce_like_any_boolean() -> None:
    merged = [*person_observations([person()])]
    values, problems = coerce_answers(merged, {"_person_dustin": "true"})
    assert values == {"_person_dustin": True}
    assert problems == {}


# ----------------------------------------------------------------------
# Photos
# ----------------------------------------------------------------------


def test_a_person_carries_at_most_the_documented_photos() -> None:
    refs = tuple(
        ReferenceImage(asset_id=str(i) * 32) for i in range(MAX_PHOTOS_PER_PERSON + 1)
    )
    with pytest.raises(ValueError, match="photos"):
        person(references=refs)


def test_person_pictures_disclaim_being_the_frame() -> None:
    planned = plan_person_pictures(
        [person(references=(ReferenceImage(asset_id="a" * 32),))]
    )
    assert len(planned) == 1
    assert "Dustin" in planned[0].preamble
    assert "NOT the current camera frame" in planned[0].preamble


def test_a_disabled_persons_photos_stay_home() -> None:
    planned = plan_person_pictures(
        [person(enabled=False, references=(ReferenceImage(asset_id="a" * 32),))]
    )
    assert planned == ()


# ----------------------------------------------------------------------
# Round trips
# ----------------------------------------------------------------------


def test_a_person_round_trips() -> None:
    original = person(
        references=(ReferenceImage(asset_id="a" * 32, caption="frontal"),),
        enabled=False,
    )
    assert PersonProfile.from_dict(original.as_dict()) == original


def test_persons_config_defaults_and_round_trips() -> None:
    assert PersonsConfig.from_dict({}) == PersonsConfig()
    original = PersonsConfig(people=(person(),), absence_seconds=120)
    assert PersonsConfig.from_dict(original.as_dict()) == original
