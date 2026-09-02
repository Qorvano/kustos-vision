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
    slug="beispiel",
    name="Beispiel",
    streams=(StreamConfig("hd", "camera.vg"),),
)

PROFILE = VisionProfile(
    camera_slug="beispiel",
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
    assert "Beispiel" in build_prompt(CAMERA, PROFILE)


def test_the_prompt_carries_the_users_context() -> None:
    """Context is for what the model cannot see: which way the camera points,
    what belongs in the picture."""
    profile = VisionProfile(
        camera_slug="beispiel",
        backend=PROFILE.backend,
        observations=PROFILE.observations,
        context="Die Kamera zeigt den Gehweg vor dem Haus.",
    )
    assert "Gehweg" in build_prompt(CAMERA, profile)


def test_the_context_is_framed_as_a_baseline_not_a_crib_sheet() -> None:
    """Regression: a "describe what you see" question came back as an almost
    verbatim copy of the context. The framing has to say that the permanent
    scene is the baseline, never the answer."""
    profile = VisionProfile(
        camera_slug="beispiel",
        backend=PROFILE.backend,
        observations=PROFILE.observations,
        context="Gartenmoebel und Fahrrad gehoeren dauerhaft dorthin.",
    )
    prompt = build_prompt(CAMERA, profile).lower()
    assert "baseline" in prompt
    assert "never answer by repeating" in prompt


def test_without_context_there_is_no_baseline_talk() -> None:
    """The baseline framing only makes sense when there is a baseline."""
    assert "baseline" not in build_prompt(CAMERA, PROFILE).lower()


def test_the_prompt_forbids_guessing() -> None:
    """A model that infers what is likely turns a sensor into fiction."""
    prompt = build_prompt(CAMERA, PROFILE).lower()
    assert "guess" in prompt
    assert "this frame alone" in prompt


def test_the_prompt_warns_about_infrared_frames() -> None:
    """Regression: colour questions were answered true on monochrome infrared
    footage. The framing has to say that a night frame carries no colour."""
    prompt = build_prompt(CAMERA, PROFILE).lower()
    assert "infrared" in prompt
    assert "monochrome" in prompt


def test_the_prompt_no_longer_demands_an_absence_marker() -> None:
    """Regression: "answer with the value that means absent" made a small
    model answer a German text question with the invented word "keines".
    The per-type instructions in the field descriptions replace it."""
    assert "value that means absent" not in build_prompt(CAMERA, PROFILE)


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

    empty = VisionProfile(camera_slug="beispiel", backend=PROFILE.backend)
    with pytest.raises(VisionError, match="asks nothing"):
        await async_analyse(hass, CAMERA, empty, "camera.vg")


# ----------------------------------------------------------------------
# The message a request carries
# ----------------------------------------------------------------------


async def test_the_frame_travels_first_and_references_after(
    hass: HomeAssistant,
) -> None:
    """The order is the graceful-degradation guarantee: a runner that
    truncates or a model that only honours the first image loses references,
    never the evidence - and the closing text re-anchors the questions on the
    current frame after the model's attention drifted to later pictures."""
    import json as jsonlib
    from unittest.mock import patch

    from custom_components.kustos_vision.core.capture import (
        CapturedFrame,
        FrameSource,
    )
    from custom_components.kustos_vision.vision import (
        ReferencePicture,
        VisionRequest,
    )
    from custom_components.kustos_vision.vision import openai_compat
    from homeassistant.util import dt as dt_util

    captured: dict = {}

    class FakeResponse:
        status = 200

        async def text(self) -> str:
            return jsonlib.dumps(
                {"choices": [{"message": {"content": "{\"paket\": true}"}}]}
            )

    class FakeSession:
        async def post(self, url, json=None, headers=None, timeout=None):
            captured["payload"] = json
            return FakeResponse()

    request = VisionRequest(
        frame=CapturedFrame(
            content=b"frame-bytes",
            content_type="image/jpeg",
            taken_at=dt_util.utcnow(),
            source=FrameSource.STREAM,
        ),
        references=(
            ReferencePicture(
                content=b"reference-bytes",
                content_type="image/png",
                preamble="Reference picture 1. Der Hinterhof.",
            ),
        ),
    )
    with patch(
        "custom_components.kustos_vision.vision.openai_compat."
        "async_get_clientsession",
        return_value=FakeSession(),
    ):
        raw, _ = await openai_compat.async_run(
            hass, CAMERA, PROFILE, "camera.vg", request=request
        )
    assert raw == {"paket": True}

    content = captured["payload"]["messages"][0]["content"]
    kinds = [part["type"] for part in content]
    assert kinds == [
        "text",       # framing prompt
        "text",       # the fields to answer
        "text",       # "this is the current camera frame"
        "image_url",  # the frame
        "text",       # the reference's preamble
        "image_url",  # the reference
        "text",       # the re-anchor
    ]
    assert content[3]["image_url"]["url"].startswith("data:image/jpeg")
    assert content[5]["image_url"]["url"].startswith("data:image/png")
    assert "current camera frame" in content[-1]["text"]


async def test_without_references_the_message_is_prompt_fields_and_image(
    hass: HomeAssistant,
) -> None:
    """The minimal request: the framing, the fields to answer, the frame."""
    import json as jsonlib
    from unittest.mock import AsyncMock, patch

    from custom_components.kustos_vision.vision import openai_compat

    captured: dict = {}

    class FakeResponse:
        status = 200

        async def text(self) -> str:
            return jsonlib.dumps(
                {"choices": [{"message": {"content": "{}"}}]}
            )

    class FakeSession:
        async def post(self, url, json=None, headers=None, timeout=None):
            captured["payload"] = json
            return FakeResponse()

    with (
        patch(
            "custom_components.kustos_vision.vision.openai_compat."
            "async_get_clientsession",
            return_value=FakeSession(),
        ),
        patch(
            "custom_components.kustos_vision.vision.openai_compat._snapshot",
            AsyncMock(return_value=(b"still", "image/jpeg")),
        ),
    ):
        await openai_compat.async_run(hass, CAMERA, PROFILE, "camera.vg")

    content = captured["payload"]["messages"][0]["content"]
    kinds = [p["type"] for p in content]
    assert kinds == ["text", "text", "image_url"]

    # Regression: llama.cpp turns the schema into a grammar and never shows
    # its text to the model, so a model behind it answered from the field
    # NAMES alone ("ereignis_hinterhof" -> "none") - the question and its
    # guidance sat unread in the schema description. The question has to
    # reach the model in the prompt itself.
    fields_text = content[1]["text"]
    assert "Liegt ein Paket da?" in fields_text
    assert "paket" in fields_text


# ----------------------------------------------------------------------
# AI Task attachments
# ----------------------------------------------------------------------


def _request_with_frame_and_reference():
    from pathlib import Path

    from custom_components.kustos_vision.core.capture import (
        CapturedFrame,
        FrameSource,
    )
    from custom_components.kustos_vision.vision import (
        ReferencePicture,
        VisionRequest,
    )
    from homeassistant.util import dt as dt_util

    return VisionRequest(
        frame=CapturedFrame(
            content=b"frame",
            content_type="image/jpeg",
            taken_at=dt_util.utcnow(),
            source=FrameSource.STREAM,
            path=Path("/config/kustos_vision/frames/beispiel/frame_03.jpg"),
        ),
        references=(
            ReferencePicture(
                content=b"ref",
                content_type="image/png",
                preamble="Reference picture 1. Der Hinterhof.",
                asset_id="a" * 32,
            ),
        ),
    )


def test_ai_task_attaches_the_kept_frame_and_the_references() -> None:
    """Parity with the OpenAI path: the trigger-time frame first, references
    after, and - since attachments cannot interleave text - the instructions
    say what each numbered attachment is."""
    from custom_components.kustos_vision.vision.ai_task import (
        _attachments_and_instructions,
    )

    attachments, instructions = _attachments_and_instructions(
        CAMERA, PROFILE, "camera.vg", _request_with_frame_and_reference()
    )
    assert attachments[0]["media_content_id"] == (
        "media-source://kustos_vision/frame/beispiel/frame_03.jpg"
    )
    assert attachments[1]["media_content_id"] == (
        "media-source://kustos_vision/reference/" + "a" * 32
    )
    assert "Attachment 1 is the current camera frame" in instructions
    assert "Attachment 2: Reference picture 1." in instructions


def test_ai_task_falls_back_to_the_camera_attachment_without_a_frame() -> None:
    from custom_components.kustos_vision.vision.ai_task import (
        _attachments_and_instructions,
    )

    attachments, _ = _attachments_and_instructions(
        CAMERA, PROFILE, "camera.vg", None
    )
    assert attachments == [
        {
            "media_content_id": "media-source://camera/camera.vg",
            "media_content_type": "image/jpeg",
        }
    ]


async def test_a_person_only_analysis_passes_the_asks_nothing_guard(
    hass: HomeAssistant,
) -> None:
    """The guard counts fields, not stored questions: people to recognise
    are fields too, synthesised at request time."""
    import json as jsonlib
    from unittest.mock import patch

    from custom_components.kustos_vision.core.capture import (
        CapturedFrame,
        FrameSource,
    )
    from custom_components.kustos_vision.core.persons import PersonProfile
    from custom_components.kustos_vision.vision import (
        VisionRequest,
        async_analyse,
    )
    from custom_components.kustos_vision.vision import openai_compat  # noqa: F401
    from homeassistant.util import dt as dt_util

    class FakeResponse:
        status = 200

        async def text(self) -> str:
            return jsonlib.dumps(
                {"choices": [{"message": {"content": "{\"_person_dustin\": true}"}}]}
            )

    class FakeSession:
        async def post(self, url, json=None, headers=None, timeout=None):
            return FakeResponse()

    empty = VisionProfile(camera_slug="beispiel", backend=PROFILE.backend)
    request = VisionRequest(
        frame=CapturedFrame(
            content=b"frame",
            content_type="image/jpeg",
            taken_at=dt_util.utcnow(),
            source=FrameSource.STREAM,
        ),
        persons=(PersonProfile(id="dustin", name="Dustin"),),
    )
    with patch(
        "custom_components.kustos_vision.vision.openai_compat."
        "async_get_clientsession",
        return_value=FakeSession(),
    ):
        result = await async_analyse(hass, CAMERA, empty, "camera.vg", request=request)
    assert result.persons == {"dustin": True}
    assert result.values == {}


# ----------------------------------------------------------------------
# Endpoint discovery and probing
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
def test_every_form_of_the_url_reaches_the_model_listing(given: str) -> None:
    from custom_components.kustos_vision.vision.openai_compat import (
        models_endpoint,
    )

    assert models_endpoint(given) == "http://mini.local:8080/v1/models"


async def test_the_model_listing_is_read_from_the_openai_shape(
    hass: HomeAssistant,
) -> None:
    """GET /v1/models with data[].id - verified live against llama-swap."""
    from unittest.mock import patch

    from custom_components.kustos_vision.vision.openai_compat import (
        async_list_models,
    )

    class FakeResponse:
        status = 200

        async def text(self) -> str:
            return json.dumps(
                {
                    "object": "list",
                    "data": [
                        {"id": "qwen-vision", "object": "model"},
                        {"id": "gemma4-vision", "object": "model"},
                    ],
                }
            )

    class FakeSession:
        async def get(self, url, headers=None, timeout=None):
            assert url.endswith("/v1/models")
            return FakeResponse()

    with patch(
        "custom_components.kustos_vision.vision.openai_compat."
        "async_get_clientsession",
        return_value=FakeSession(),
    ):
        models = await async_list_models(hass, "http://mini.local:8080")
    assert models == ["gemma4-vision", "qwen-vision"]


async def test_a_listing_that_is_not_a_model_list_is_an_error(
    hass: HomeAssistant,
) -> None:
    from unittest.mock import patch

    from custom_components.kustos_vision.vision.openai_compat import (
        async_list_models,
    )

    class FakeResponse:
        status = 200

        async def text(self) -> str:
            return json.dumps({"unexpected": True})

    class FakeSession:
        async def get(self, url, headers=None, timeout=None):
            return FakeResponse()

    with patch(
        "custom_components.kustos_vision.vision.openai_compat."
        "async_get_clientsession",
        return_value=FakeSession(),
    ):
        with pytest.raises(VisionError, match="model list"):
            await async_list_models(hass, "http://mini.local:8080")


async def test_the_probe_reports_the_answer_time_or_the_refusal(
    hass: HomeAssistant,
) -> None:
    from unittest.mock import patch

    from custom_components.kustos_vision.vision.openai_compat import (
        async_probe_model,
    )

    class OkResponse:
        status = 200

        async def text(self) -> str:
            return json.dumps({"choices": [{"message": {"content": "OK"}}]})

    class RefusingResponse:
        status = 404

        async def text(self) -> str:
            return "model not found"

    class FakeSession:
        def __init__(self, response) -> None:
            self.response = response

        async def post(self, url, json=None, headers=None, timeout=None):
            assert json["max_tokens"] > 0
            return self.response

    with patch(
        "custom_components.kustos_vision.vision.openai_compat."
        "async_get_clientsession",
        return_value=FakeSession(OkResponse()),
    ):
        duration = await async_probe_model(hass, "http://x", "gemma4-vision")
    assert duration >= 0

    with patch(
        "custom_components.kustos_vision.vision.openai_compat."
        "async_get_clientsession",
        return_value=FakeSession(RefusingResponse()),
    ):
        with pytest.raises(VisionError, match="HTTP 404"):
            await async_probe_model(hass, "http://x", "tippfehler")
