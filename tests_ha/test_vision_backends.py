"""The two ways an answer can be obtained, and the shapes it arrives in."""

from __future__ import annotations

import json

import pytest
from homeassistant.core import HomeAssistant

from custom_components.kustos_vision.core.config import (
    CameraConfig,
    StreamConfig,
    VisionBackend,
    VisionBackendKind,
    VisionProfile,
)
from custom_components.kustos_vision.core.observations import Observation, ObservationType
from custom_components.kustos_vision.vision import VisionError, build_prompt
from custom_components.kustos_vision.vision.openai_compat import _endpoint, _extract

CAMERA = CameraConfig(
    slug="vorgarten",
    name="Vorgarten",
    streams=(StreamConfig("hd", "camera.vg"),),
)

PROFILE = VisionProfile(
    camera_slug="vorgarten",
    backend=VisionBackend(
        kind=VisionBackendKind.OPENAI, url="http://x/v1", model="vision"
    ),
    observations=(
        Observation("paket", ObservationType.BOOLEAN, "Liegt ein Paket da?"),
    ),
)


# ----------------------------------------------------------------------
# The prompt
# ----------------------------------------------------------------------


def test_the_prompt_names_the_camera() -> None:
    assert "Vorgarten" in build_prompt(CAMERA, PROFILE)


def test_the_prompt_carries_the_users_context() -> None:
    """Context is for what the model cannot see: which way the camera points,
    what belongs in the picture."""
    profile = VisionProfile(
        camera_slug="vorgarten",
        backend=PROFILE.backend,
        observations=PROFILE.observations,
        context="Die Kamera zeigt den Gehweg vor dem Haus.",
    )
    assert "Gehweg" in build_prompt(CAMERA, profile)


def test_the_prompt_forbids_guessing() -> None:
    """A model that infers what is likely turns a sensor into fiction."""
    prompt = build_prompt(CAMERA, PROFILE).lower()
    assert "guess" in prompt
    assert "this frame alone" in prompt


def test_the_prompt_does_not_repeat_the_questions() -> None:
    """They travel as field descriptions, next to the answer the model has to
    produce; repeating them here would only be a second place to disagree."""
    assert "Liegt ein Paket da?" not in build_prompt(CAMERA, PROFILE)


# ----------------------------------------------------------------------
# The endpoint URL
# ----------------------------------------------------------------------


@pytest.mark.parametrize(
    "given",
    [
        "http://mini.local:8080",
        "http://mini.local:8080/",
        "http://mini.local:8080/v1",
        "http://mini.local:8080/v1/",
        "http://mini.local:8080/v1/chat/completions",
    ],
)
def test_every_form_of_the_url_reaches_the_same_endpoint(given: str) -> None:
    """Users paste whichever form their runner printed; accepting all of them
    avoids a support question whose answer is a slash."""
    assert _endpoint(given) == "http://mini.local:8080/v1/chat/completions"


# ----------------------------------------------------------------------
# Reading the answer
# ----------------------------------------------------------------------


def envelope(content) -> str:
    return json.dumps({"choices": [{"message": {"content": content}}]})


def test_a_plain_json_answer_is_read() -> None:
    assert _extract(envelope('{"paket": true}')) == {"paket": True}


def test_an_answer_that_is_already_an_object_is_read() -> None:
    """Some runners return the parsed object rather than a string."""
    assert _extract(envelope({"paket": False})) == {"paket": False}


def test_a_fenced_block_is_unwrapped() -> None:
    """A runner without structured output still answers, just in markdown."""
    assert _extract(envelope('```json\n{"paket": true}\n```')) == {"paket": True}


def test_a_fenced_block_without_a_language_tag_is_unwrapped() -> None:
    assert _extract(envelope('```\n{"paket": true}\n```')) == {"paket": True}


def test_json_wrapped_in_a_sentence_is_recovered() -> None:
    """Telling the user their model is broken when it merely chatted would be
    wrong; the answer is right there."""
    answer = 'Hier ist das Ergebnis: {"paket": true} Ich hoffe das hilft.'
    assert _extract(envelope(answer)) == {"paket": True}


def test_an_answer_with_no_json_at_all_is_an_error() -> None:
    with pytest.raises(VisionError, match="no JSON"):
        _extract(envelope("Ich kann das Bild nicht sehen."))


def test_a_body_that_is_not_json_is_an_error() -> None:
    with pytest.raises(VisionError, match="not JSON"):
        _extract("<html>502 Bad Gateway</html>")


def test_an_unexpected_shape_is_an_error() -> None:
    with pytest.raises(VisionError, match="unexpected answer shape"):
        _extract(json.dumps({"error": "no such model"}))


def test_a_non_text_answer_is_an_error() -> None:
    with pytest.raises(VisionError, match="answered with"):
        _extract(envelope(42))


# ----------------------------------------------------------------------
# Backend configuration
# ----------------------------------------------------------------------


def test_an_ai_task_backend_needs_an_ai_task_entity() -> None:
    from custom_components.kustos_vision.core.config import ConfigError

    with pytest.raises(ConfigError, match="AI Task entity"):
        VisionBackend(kind=VisionBackendKind.AI_TASK, entity_id="sensor.nope")


def test_an_openai_backend_needs_a_url_and_a_model() -> None:
    from custom_components.kustos_vision.core.config import ConfigError

    with pytest.raises(ConfigError, match="URL"):
        VisionBackend(kind=VisionBackendKind.OPENAI, model="x")
    with pytest.raises(ConfigError, match="model"):
        VisionBackend(kind=VisionBackendKind.OPENAI, url="http://x")


def test_the_api_key_is_only_stored_when_there_is_one() -> None:
    backend = VisionBackend(
        kind=VisionBackendKind.OPENAI, url="http://x", model="m"
    )
    assert "api_key" not in backend.as_dict()


def test_backends_round_trip() -> None:
    for backend in (
        VisionBackend(kind=VisionBackendKind.AI_TASK, entity_id="ai_task.x"),
        VisionBackend(
            kind=VisionBackendKind.OPENAI,
            url="http://x/v1",
            model="m",
            api_key="secret",
            timeout_seconds=30,
        ),
    ):
        assert VisionBackend.from_dict(backend.as_dict()) == backend


async def test_analysing_without_questions_is_refused(hass: HomeAssistant) -> None:
    """An empty profile would send a picture and get nothing back."""
    from custom_components.kustos_vision.vision import async_analyse

    empty = VisionProfile(camera_slug="vorgarten", backend=PROFILE.backend)
    with pytest.raises(VisionError, match="asks nothing"):
        await async_analyse(hass, CAMERA, empty, "camera.vg")
