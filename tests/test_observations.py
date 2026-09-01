"""Tests for the observation model and the two schemas it produces."""

from __future__ import annotations

import pytest
from kustos_vision.core.observations import (
    ANSWER_GUIDANCE,
    Observation,
    ObservationError,
    ObservationType,
    coerce_answer,
    coerce_answers,
    field_description,
    to_ai_task_structure,
    to_json_schema,
)


def obs(**overrides) -> Observation:
    values = {
        "key": "paket_vor_der_tuer",
        "type": ObservationType.BOOLEAN,
        "question": "Liegt ein Paket vor der Haustür?",
    }
    values.update(overrides)
    return Observation(**values)


# ----------------------------------------------------------------------
# Validation
# ----------------------------------------------------------------------


@pytest.mark.parametrize("key", ["a", "paket", "anzahl_personen", "x1"])
def test_usable_keys_are_accepted(key: str) -> None:
    assert obs(key=key).key == key


@pytest.mark.parametrize(
    "key", ["", "1paket", "Paket", "mit-strich", "mit punkt", "_leading"]
)
def test_keys_that_cannot_be_an_entity_id_are_refused(key: str) -> None:
    with pytest.raises(ObservationError, match="entity id"):
        obs(key=key)


def test_an_observation_needs_a_question() -> None:
    """The question is the entire prompt for that field."""
    with pytest.raises(ObservationError, match="question"):
        obs(question="   ")


def test_a_choice_needs_at_least_two_options() -> None:
    with pytest.raises(ObservationError, match="two options"):
        obs(type=ObservationType.SELECT, options=("nur eine",))


def test_a_choice_may_not_repeat_an_option() -> None:
    with pytest.raises(ObservationError, match="duplicate"):
        obs(type=ObservationType.SELECT, options=("a", "b", "a"))


def test_a_count_needs_a_real_range() -> None:
    with pytest.raises(ObservationError, match="empty number range"):
        obs(type=ObservationType.NUMBER, minimum=5, maximum=5)


def test_observations_round_trip() -> None:
    for observation in (
        obs(),
        obs(key="wer", type=ObservationType.TEXT, question="Wer steht da?"),
        obs(key="anzahl", type=ObservationType.NUMBER, question="Wie viele?", maximum=20),
        obs(
            key="art",
            type=ObservationType.SELECT,
            question="Was ist zu sehen?",
            options=("leer", "Person", "Fahrzeug"),
        ),
        obs(device_class="occupancy"),
    ):
        assert Observation.from_dict(observation.as_dict()) == observation


def test_an_unknown_type_is_refused() -> None:
    with pytest.raises(ObservationError, match="unknown observation type"):
        Observation.from_dict({"key": "x", "type": "vibes", "question": "?"})


# ----------------------------------------------------------------------
# Schemas
# ----------------------------------------------------------------------


def test_the_ai_task_structure_carries_the_question_as_the_description() -> None:
    """The description is what the model reads next to the field it fills in.
    It opens with the user's question, verbatim and in their language; the
    typed answer guidance follows it."""
    structure = to_ai_task_structure([obs()])
    field = structure["paket_vor_der_tuer"]
    assert field["description"].startswith("Liegt ein Paket vor der Haustür?")
    assert field["required"] is True
    assert field["selector"] == {"boolean": {}}


def test_every_type_maps_to_a_selector() -> None:
    structure = to_ai_task_structure(
        [
            obs(key="a", type=ObservationType.BOOLEAN),
            obs(key="b", type=ObservationType.TEXT),
            obs(key="c", type=ObservationType.NUMBER, minimum=0, maximum=9),
            obs(key="d", type=ObservationType.SELECT, options=("x", "y")),
        ]
    )
    assert structure["a"]["selector"] == {"boolean": {}}
    assert structure["b"]["selector"] == {"text": {}}
    assert structure["c"]["selector"]["number"]["max"] == 9
    assert structure["d"]["selector"]["select"]["options"] == ["x", "y"]


def test_the_json_schema_leaves_no_room() -> None:
    """Structured output is only guaranteed for a schema with nothing open;
    a partially specified one degrades into a suggestion."""
    schema = to_json_schema([obs(key="a"), obs(key="b")])
    assert schema["additionalProperties"] is False
    assert set(schema["required"]) == {"a", "b"}


def test_the_json_schema_bounds_a_count() -> None:
    schema = to_json_schema(
        [obs(key="n", type=ObservationType.NUMBER, minimum=0, maximum=12)]
    )
    field = schema["properties"]["n"]
    assert field["type"] == "integer"
    assert field["minimum"] == 0
    assert field["maximum"] == 12


# ----------------------------------------------------------------------
# Answer guidance per type
# ----------------------------------------------------------------------


@pytest.mark.parametrize("kind", list(ObservationType))
def test_every_observation_type_has_guidance(kind: ObservationType) -> None:
    """A new type cannot be half-supported: the guidance table is exhaustive
    over the enum, by the same rule the two serialisers follow."""
    assert ANSWER_GUIDANCE[kind].strip()


def test_a_text_field_is_told_to_answer_in_a_sentence() -> None:
    """Regression: a description question was answered with "keines".

    The old framing told every field to "answer with the value that means
    absent"; a text field has no such value, so the model invented one, in the
    language of the question. The word appears nowhere in this code. The text
    guidance must demand a sentence and forbid the absence marker.
    """
    guidance = ANSWER_GUIDANCE[ObservationType.TEXT].lower()
    assert "sentence" in guidance
    assert "never empty" in guidance


def test_a_boolean_field_carries_the_monochrome_caveat() -> None:
    """Regression: "Ist eine gelbe Mülltonne zu sehen?" answered true on a
    monochrome infrared frame, and stayed true when the colour in the question
    was changed to one that exists nowhere on the property."""
    guidance = ANSWER_GUIDANCE[ObservationType.BOOLEAN].lower()
    assert "monochrome" in guidance or "infrared" in guidance
    assert "false" in guidance


def test_both_serialisers_describe_a_field_identically() -> None:
    """The parity rule of this module, applied to the description."""
    for kind in ObservationType:
        observation = obs(
            key="feld",
            type=kind,
            question="Was ist zu sehen?",
            options=("a", "b") if kind is ObservationType.SELECT else (),
        )
        from_schema = to_json_schema([observation])["properties"]["feld"][
            "description"
        ]
        from_structure = to_ai_task_structure([observation])["feld"]["description"]
        assert from_schema == from_structure == field_description(observation)


def test_the_question_reaches_the_model_in_the_users_language() -> None:
    """The description opens with the user's question, verbatim: the guidance
    is appended after it, never woven into it."""
    observation = obs(question="Liegt ein Paket vor der Haustür?")
    assert field_description(observation).startswith(
        "Liegt ein Paket vor der Haustür?\n\n"
    )


def test_the_json_schema_constrains_a_choice() -> None:
    schema = to_json_schema(
        [obs(key="art", type=ObservationType.SELECT, options=("leer", "Person"))]
    )
    assert schema["properties"]["art"]["enum"] == ["leer", "Person"]


# ----------------------------------------------------------------------
# Reading the answer
# ----------------------------------------------------------------------


@pytest.mark.parametrize(
    ("given", "expected"),
    [
        (True, True),
        (False, False),
        ("true", True),
        ("True", True),
        ("ja", True),
        ("yes", True),
        ("1", True),
        ("false", False),
        ("nein", False),
        ("no", False),
        (1, True),
        (0, False),
    ],
)
def test_a_yes_or_no_is_read_in_the_forms_models_use(given, expected: bool) -> None:
    """Models answer with a string where a boolean was asked for often enough
    that correcting it is worth more than being strict."""
    assert coerce_answer(obs(), given) is expected


@pytest.mark.parametrize("given", ["vielleicht", None, [], {}])
def test_an_unrecognisable_yes_or_no_is_refused(given) -> None:
    """A sensor holding a guess is worse than one holding nothing."""
    with pytest.raises(ObservationError):
        coerce_answer(obs(), given)


@pytest.mark.parametrize(
    ("given", "expected"), [(3, 3), (3.4, 3), (3.6, 4), ("5", 5), ("5.2", 5)]
)
def test_a_count_is_read_as_a_whole_number(given, expected: int) -> None:
    observation = obs(key="n", type=ObservationType.NUMBER, maximum=100)
    assert coerce_answer(observation, given) == expected


def test_a_count_is_kept_inside_its_range() -> None:
    """Bounding it stops one absurd answer from turning a count into nonsense."""
    observation = obs(key="n", type=ObservationType.NUMBER, minimum=0, maximum=10)
    assert coerce_answer(observation, 999) == 10
    assert coerce_answer(observation, -5) == 0


def test_a_count_that_is_not_a_number_is_refused() -> None:
    observation = obs(key="n", type=ObservationType.NUMBER)
    with pytest.raises(ObservationError, match="not a number"):
        coerce_answer(observation, "viele")


def test_a_choice_is_matched_regardless_of_case() -> None:
    observation = obs(
        key="art", type=ObservationType.SELECT, options=("leer", "Person")
    )
    assert coerce_answer(observation, "person") == "Person"
    assert coerce_answer(observation, "  LEER ") == "leer"


def test_a_choice_outside_the_options_is_refused() -> None:
    observation = obs(
        key="art", type=ObservationType.SELECT, options=("leer", "Person")
    )
    with pytest.raises(ObservationError, match="not one of"):
        coerce_answer(observation, "Hund")


def test_text_is_trimmed() -> None:
    observation = obs(key="wer", type=ObservationType.TEXT)
    assert coerce_answer(observation, "  Postbote  ") == "Postbote"


def test_missing_text_is_refused() -> None:
    with pytest.raises(ObservationError):
        coerce_answer(obs(key="wer", type=ObservationType.TEXT), None)


def test_one_bad_answer_does_not_discard_the_good_ones() -> None:
    """Partial results are still useful, and the failures point at the question
    that needs rewording."""
    observations = [
        obs(key="paket"),
        obs(key="n", type=ObservationType.NUMBER, maximum=10),
        obs(key="wer", type=ObservationType.TEXT),
    ]
    values, problems = coerce_answers(
        observations, {"paket": "ja", "n": "viele", "wer": "Postbote"}
    )
    assert values == {"paket": True, "wer": "Postbote"}
    assert "n" in problems


def test_a_field_the_model_left_out_is_reported() -> None:
    values, problems = coerce_answers([obs(key="paket")], {})
    assert values == {}
    assert problems["paket"] == "no answer"


def test_the_display_name_falls_back_to_the_key_not_the_question() -> None:
    """Home Assistant builds the entity id from the name. A question makes an
    identifier nobody can use in an automation, and it changes whenever the
    wording is improved, which silently renames the entity."""
    observation = obs(key="person_im_muster", question="Ist ein Mensch zu sehen?")
    assert observation.display_name == "Person im muster"


def test_an_explicit_name_wins() -> None:
    observation = obs(key="person_im_muster", name="Person im Muster")
    assert observation.display_name == "Person im Muster"


def test_the_name_survives_a_round_trip() -> None:
    observation = obs(name="Paket an der Tür")
    assert Observation.from_dict(observation.as_dict()) == observation


def test_no_name_is_not_stored() -> None:
    assert "name" not in obs().as_dict()


# ----------------------------------------------------------------------
# Pausing a question
# ----------------------------------------------------------------------


def test_a_question_is_enabled_unless_said_otherwise() -> None:
    assert obs().enabled is True
    parsed = Observation.from_dict(
        {"key": "k", "type": "boolean", "question": "Sichtbar?"}
    )
    assert parsed.enabled is True


def test_a_paused_question_survives_a_round_trip() -> None:
    paused = obs(enabled=False)
    assert Observation.from_dict(paused.as_dict()) == paused


def test_enabled_is_only_stored_when_off() -> None:
    """Every stored profile predates the flag; writing the default into all
    of them would churn every stored config for nothing."""
    assert "enabled" not in obs().as_dict()
    assert obs(enabled=False).as_dict()["enabled"] is False


def test_only_active_observations_travel_to_the_model() -> None:
    from kustos_vision.core.config import VisionProfile

    profile = VisionProfile.from_dict(
        {
            "camera_slug": "beispiel",
            "backend": {
                "kind": "openai",
                "url": "http://model.invalid/v1",
                "model": "m",
            },
            "observations": [
                {"key": "paket", "type": "boolean", "question": "Paket?"},
                {
                    "key": "wer",
                    "type": "text",
                    "question": "Wer?",
                    "enabled": False,
                },
            ],
        }
    )
    assert [o.key for o in profile.active_observations] == ["paket"]
    # The paused question keeps its place in the profile, and with it the
    # entity everything downstream is wired to.
    assert [o.key for o in profile.observations] == ["paket", "wer"]


def test_a_stored_condition_entity_is_ignored() -> None:
    """Regression: the "only while this entity is on" gate was removed, but
    profiles stored before that still carry the key and must keep loading."""
    from kustos_vision.core.config import VisionProfile

    profile = VisionProfile.from_dict(
        {
            "camera_slug": "beispiel",
            "backend": {
                "kind": "openai",
                "url": "http://model.invalid/v1",
                "model": "m",
            },
            "observations": [
                {"key": "paket", "type": "boolean", "question": "Paket?"}
            ],
            "condition_entity": "input_boolean.scharf",
        }
    )
    assert not hasattr(profile, "condition_entity")
