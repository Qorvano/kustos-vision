"""The Assist tool that looks through a camera right now.

The observation sensors hold the answer from the last trigger; a voice
assistant asked what is going on in the garden needs a picture of this
moment, which is what the tool provides.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.components import llm as llm_component
from homeassistant.core import Context, HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import llm
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.kustos_vision.const import (
    CONF_BASE_PATH,
    DOMAIN,
    STORAGE_KEY_CONFIG,
    STORAGE_VERSION_CONFIG,
)
from custom_components.kustos_vision.core.capture import CapturedFrame, FrameSource
from custom_components.kustos_vision.llm import TOOL_NAME
from custom_components.kustos_vision.vision import VisionResult

FRAME_BYTES = b"\xff\xd8\xff-jpeg-bytes"


def profile(**overrides) -> dict:
    base = {
        "camera_slug": "beispiel",
        "backend": {"kind": "openai", "url": "http://model.invalid:8080/v1", "model": "vision"},
        "observations": [
            {"key": "paket", "type": "boolean", "question": "Liegt ein Paket vor der Tür?"},
            {"key": "wer", "type": "text", "question": "Wer ist zu sehen?"},
        ],
        "triggers": [],
        "cooldown_seconds": 60,
        "daily_budget": 10,
        "enabled": True,
    }
    base.update(overrides)
    return base


def stored(base: Path, vision: list[dict], area_id: str | None) -> dict:
    return {
        "version": STORAGE_VERSION_CONFIG,
        "minor_version": 1,
        "key": STORAGE_KEY_CONFIG,
        "data": {
            "version": 1,
            "storage": {"base_path": str(base), "segment_seconds": 60},
            "cameras": [
                {
                    "slug": "beispiel",
                    "name": "Beispiel",
                    "streams": [{"key": "hd", "entity_id": "camera.vg", "record": False}],
                    "capabilities": {},
                    "retention_days": None,
                    "enabled": True,
                    "area_id": area_id,
                }
            ],
            "views": [],
            "vision": vision,
        },
    }


async def fake_capture(hass_, entity_id, target=None) -> CapturedFrame:
    if target is not None:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(FRAME_BYTES)
    return CapturedFrame(
        content=FRAME_BYTES,
        content_type="image/jpeg",
        taken_at=dt_util.utcnow(),
        source=FrameSource.STREAM,
        path=target,
    )


@pytest.fixture
def analysed() -> list[dict]:
    return []


@pytest.fixture
def vision_env(analysed: list[dict]):
    async def _analyse(hass, camera, prof, entity_id, request=None):
        analysed.append({"camera": camera.slug, "request": request})
        if request is not None and request.questions:
            answer = {request.questions[0].key: "Ja, vor der Tür liegt ein Paket."}
            return VisionResult(values=answer, raw=answer, duration_s=0.1)
        return VisionResult(
            values={"paket": True, "wer": "Postbote"},
            raw={"paket": True, "wer": "Postbote"},
            duration_s=0.1,
        )

    with (
        patch(
            "custom_components.kustos_vision.recorder.async_get_stream_source",
            AsyncMock(return_value=None),
        ),
        patch(
            "custom_components.kustos_vision.maintenance.get_ffmpeg_manager",
            MagicMock(return_value=MagicMock(binary="/usr/bin/ffmpeg")),
        ),
        patch(
            "custom_components.kustos_vision.vision_runner.async_capture_frame",
            AsyncMock(side_effect=fake_capture),
        ),
        patch(
            "custom_components.kustos_vision.vision_runner.async_analyse",
            AsyncMock(side_effect=_analyse),
        ),
    ):
        yield


@pytest.fixture
async def setup(hass: HomeAssistant, hass_storage: dict, tmp_path: Path, vision_env):
    async def _setup(vision: list[dict] | None = None, area_id: str | None = None):
        assert await async_setup_component(hass, "llm", {})
        base = tmp_path / "recordings"
        hass_storage[STORAGE_KEY_CONFIG] = stored(
            base, [profile()] if vision is None else vision, area_id
        )
        entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
        entry.add_to_hass(hass)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        return entry

    return _setup


def context(device_id: str | None = None) -> llm.LLMContext:
    return llm.LLMContext(
        platform="test_platform",
        context=Context(),
        language="*",
        assistant="conversation",
        device_id=device_id,
    )


async def tool(hass: HomeAssistant, llm_context: llm.LLMContext) -> llm.Tool | None:
    result = await llm_component.async_get_tools(hass, llm_context, "assist")
    return next((t for t in result.tools if t.name == TOOL_NAME), None)


QUESTION = "Liegt ein Paket vor der Tür?"


async def call(hass: HomeAssistant, args: dict, device_id: str | None = None) -> dict:
    llm_context = context(device_id)
    found = await tool(hass, llm_context)
    assert found is not None
    return await found.async_call(
        hass, llm.ToolInput(TOOL_NAME, {"question": QUESTION, **args}), llm_context
    )


def test_the_tool_name_carries_the_domain() -> None:
    """Home Assistant requires integration tools to be domain-prefixed."""
    assert TOOL_NAME.startswith(f"{DOMAIN}__")


async def test_the_tool_is_offered_with_the_cameras_and_their_areas(
    hass: HomeAssistant, setup
) -> None:
    ar.async_get(hass).async_create("Garten")
    await setup(area_id="garten")
    result = await llm_component.async_get_tools(hass, context(), "assist")
    assert any(t.name == TOOL_NAME for t in result.tools)
    assert result.prompt is not None
    assert "Beispiel (Garten)" in result.prompt


async def test_no_tool_without_a_vision_profile(hass: HomeAssistant, setup) -> None:
    """The profile is where the model to ask is configured."""
    await setup(vision=[])
    assert await tool(hass, context()) is None


async def test_no_tool_for_another_api(hass: HomeAssistant, setup) -> None:
    await setup()
    result = await llm_component.async_get_tools(hass, context(), "other")
    assert not any(t.name == TOOL_NAME for t in result.tools)


async def test_a_look_by_area_asks_the_persons_question_and_returns_its_answer(
    hass: HomeAssistant, setup, analysed: list
) -> None:
    """The person's own question goes to the model as the only field, with
    the fresh frame and nothing else: no profile questions, no person fields,
    no reference pictures, no marks."""
    ar.async_get(hass).async_create("Garten")
    await setup(area_id="garten")
    result = await call(hass, {"area": "Garten"})

    assert result["success"] is True
    assert result["result"] == {
        "camera": "Beispiel",
        "area": "Garten",
        "question": QUESTION,
        "answer": "Ja, vor der Tür liegt ein Paket.",
        "duration_s": 0.1,
    }
    assert len(analysed) == 1
    request = analysed[0]["request"]
    assert [q.question for q in request.questions] == [QUESTION]
    assert request.persons == ()
    assert request.references == ()
    assert request.mark_objects is False
    assert request.frame is not None


async def test_a_look_leaves_the_sensors_alone(
    hass: HomeAssistant, setup, analysed: list
) -> None:
    """The sensors report the profile's questions; an answer to somebody's
    question of the moment is not theirs to carry."""
    await setup()
    await call(hass, {"camera": "Beispiel"})
    await hass.async_block_till_done()
    assert hass.states.get("binary_sensor.beispiel_paket").state == "unavailable"


async def test_a_look_by_camera_name_is_case_insensitive(
    hass: HomeAssistant, setup, analysed: list
) -> None:
    await setup()
    result = await call(hass, {"camera": "beispiel"})
    assert result["success"] is True
    assert len(analysed) == 1


async def test_the_satellites_area_is_used_when_nothing_is_named(
    hass: HomeAssistant, setup, analysed: list
) -> None:
    """The person asking from the garden means the garden."""
    area = ar.async_get(hass).async_create("Garten")
    entry = await setup(area_id="garten")
    satellite = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id, identifiers={("test", "satellite")}
    )
    dr.async_get(hass).async_update_device(satellite.id, area_id=area.id)

    result = await call(hass, {}, device_id=satellite.id)
    assert result["success"] is True
    assert len(analysed) == 1


async def test_the_devices_area_counts_when_the_camera_has_none_configured(
    hass: HomeAssistant, setup, analysed: list
) -> None:
    """Putting the Kustos Vision device into a room in Home Assistant is enough."""
    area = ar.async_get(hass).async_create("Garten")
    entry = await setup(area_id=None)
    device = dr.async_get(hass).async_get_device(
        identifiers={(DOMAIN, f"{entry.entry_id}_beispiel")}
    )
    assert device is not None
    dr.async_get(hass).async_update_device(device.id, area_id=area.id)

    result = await call(hass, {"area": "Garten"})
    assert result["success"] is True
    assert len(analysed) == 1


async def test_an_unknown_area_or_camera_names_the_alternatives(
    hass: HomeAssistant, setup, analysed: list
) -> None:
    ar.async_get(hass).async_create("Garten")
    await setup(area_id="garten")

    result = await call(hass, {"area": "Keller"})
    assert result["success"] is False
    assert "does not exist" in result["error"]

    result = await call(hass, {"camera": "Gibtsnicht"})
    assert result["success"] is False
    assert "Beispiel (Garten)" in result["error"]

    result = await call(hass, {})
    assert result["success"] is False
    assert "Beispiel (Garten)" in result["error"]
    assert analysed == []


async def test_a_used_up_budget_is_reported_not_raised(
    hass: HomeAssistant, setup, analysed: list
) -> None:
    await setup(vision=[profile(daily_budget=1)])
    first = await call(hass, {"camera": "Beispiel"})
    second = await call(hass, {"camera": "Beispiel"})
    assert first["success"] is True
    assert second["success"] is False
    assert "budget" in second["error"]
    assert len(analysed) == 1
