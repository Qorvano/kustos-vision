"""Analysing a camera, and the limits that decide when it may happen.

The limits get as much attention as the analysis itself: an unrestrained
profile is the failure mode the whole design guards against, because a motion
sensor in wind fires constantly and a hosted model charges per picture.
"""

from __future__ import annotations

from datetime import timedelta
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.kustos_vision.const import (
    CONF_BASE_PATH,
    DOMAIN,
    STORAGE_KEY_CONFIG,
    STORAGE_VERSION_CONFIG,
)
from custom_components.kustos_vision.vision import VisionResult

TRIGGER = "binary_sensor.vorgarten_motion"
CONDITION = "input_boolean.scharf"


def profile(**overrides) -> dict:
    base = {
        "camera_slug": "vorgarten",
        "backend": {
            "kind": "openai",
            "url": "http://model.invalid:8080/v1",
            "model": "vision",
        },
        "observations": [
            {
                "key": "paket",
                "type": "boolean",
                "question": "Liegt ein Paket vor der Tür?",
            },
            {
                "key": "wer",
                "type": "text",
                "question": "Wer ist zu sehen?",
            },
        ],
        "triggers": [TRIGGER],
        "cooldown_seconds": 60,
        "daily_budget": 10,
        "enabled": True,
    }
    base.update(overrides)
    return base


def stored(base: Path, vision=None) -> dict:
    return {
        "version": STORAGE_VERSION_CONFIG,
        "minor_version": 1,
        "key": STORAGE_KEY_CONFIG,
        "data": {
            "version": 1,
            "storage": {"base_path": str(base), "segment_seconds": 60},
            "cameras": [
                {
                    "slug": "vorgarten",
                    "name": "Vorgarten",
                    "streams": [
                        {"key": "hd", "entity_id": "camera.vg", "record": False}
                    ],
                    "capabilities": {},
                    "retention_days": None,
                    "enabled": True,
                    "area_id": None,
                }
            ],
            "views": [],
            "vision": vision if vision is not None else [profile()],
        },
    }


@pytest.fixture
def analysed() -> list[dict]:
    """Every analysis the backend was asked to perform."""
    return []


@pytest.fixture
def vision_env(analysed: list[dict]):
    """Answer analyses without talking to a model."""

    async def _analyse(hass, camera, prof, entity_id):
        analysed.append({"camera": camera.slug, "entity_id": entity_id})
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
            "custom_components.kustos_vision.vision_runner.async_analyse",
            AsyncMock(side_effect=_analyse),
        ),
    ):
        yield


@pytest.fixture
async def setup_vision(hass: HomeAssistant, hass_storage: dict, tmp_path: Path, vision_env):
    async def _setup(vision=None):
        base = tmp_path / "recordings"
        hass_storage[STORAGE_KEY_CONFIG] = stored(base, vision)
        entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
        entry.add_to_hass(hass)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        return entry

    return _setup


async def fire(hass: HomeAssistant, state: str = "on") -> None:
    hass.states.async_set(TRIGGER, state)
    await hass.async_block_till_done()


# ----------------------------------------------------------------------
# Triggering
# ----------------------------------------------------------------------


async def test_a_trigger_starts_an_analysis(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    await setup_vision()
    await fire(hass, "off")
    await fire(hass, "on")
    assert len(analysed) == 1


async def test_only_the_transition_into_on_counts(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    """A sensor that keeps reporting "on" would otherwise analyse forever."""
    await setup_vision()
    await fire(hass, "on")
    hass.states.async_set(TRIGGER, "on", {"changed": 1})
    await hass.async_block_till_done()
    assert len(analysed) == 1


async def test_turning_off_does_not_analyse(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    await setup_vision()
    await fire(hass, "on")
    await fire(hass, "off")
    assert len(analysed) == 1


async def test_a_disabled_profile_ignores_its_trigger(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    await setup_vision([profile(enabled=False)])
    await fire(hass, "on")
    assert analysed == []


async def test_a_profile_without_questions_does_not_run(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    await setup_vision([profile(observations=[])])
    await fire(hass, "on")
    assert analysed == []


# ----------------------------------------------------------------------
# The limits
# ----------------------------------------------------------------------


async def test_the_cooldown_collapses_a_burst_into_one_analysis(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    """Motion in wind or rain fires repeatedly; without this each flicker
    would be a picture sent to the model."""
    await setup_vision()
    for _ in range(5):
        await fire(hass, "off")
        await fire(hass, "on")
    assert len(analysed) == 1


async def test_an_analysis_runs_again_once_the_cooldown_has_passed(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    entry = await setup_vision()
    await fire(hass, "on")
    assert len(analysed) == 1

    state = entry.runtime_data.vision.state_for("vorgarten")
    state.last_run = dt_util.utcnow() - timedelta(seconds=120)

    await fire(hass, "off")
    await fire(hass, "on")
    assert len(analysed) == 2


async def test_the_daily_budget_stops_a_runaway_trigger(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    entry = await setup_vision([profile(cooldown_seconds=0, daily_budget=3)])
    for _ in range(10):
        await fire(hass, "off")
        await fire(hass, "on")
    assert len(analysed) == 3
    assert entry.runtime_data.vision.state_for("vorgarten").analyses_today == 3


async def test_the_budget_holds_even_when_forced(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    """The cooldown yields to a deliberate request; the budget does not,
    because it is the limit that exists to stop runaway cost."""
    entry = await setup_vision([profile(daily_budget=1)])
    runner = entry.runtime_data.vision

    assert await runner.async_analyse("vorgarten", force=True) is not None
    assert await runner.async_analyse("vorgarten", force=True) is None
    assert len(analysed) == 1


async def test_the_budget_resets_with_the_local_day(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    entry = await setup_vision([profile(daily_budget=1)])
    runner = entry.runtime_data.vision
    await runner.async_analyse("vorgarten", force=True)

    state = runner.state_for("vorgarten")
    state.budget_day = state.budget_day - timedelta(days=1)

    assert await runner.async_analyse("vorgarten", force=True) is not None
    assert len(analysed) == 2


async def test_a_condition_can_hold_the_analysis_back(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    """This is how "only while the alarm is armed" is expressed without
    writing an automation."""
    await setup_vision([profile(condition_entity=CONDITION)])
    hass.states.async_set(CONDITION, "off")
    await fire(hass, "on")
    assert analysed == []

    hass.states.async_set(CONDITION, "on")
    await fire(hass, "off")
    await fire(hass, "on")
    assert len(analysed) == 1


async def test_a_missing_condition_entity_holds_it_back(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    """An entity that does not exist is not a reason to analyse anyway."""
    await setup_vision([profile(condition_entity="input_boolean.gibt_es_nicht")])
    await fire(hass, "on")
    assert analysed == []


# ----------------------------------------------------------------------
# Entities
# ----------------------------------------------------------------------


async def test_an_observation_becomes_an_entity_of_the_right_kind(
    hass: HomeAssistant, setup_vision
) -> None:
    await setup_vision()
    entity_ids = hass.states.async_entity_ids()
    assert any("paket" in e and e.startswith("binary_sensor.") for e in entity_ids)
    assert any("wer" in e and e.startswith("sensor.") for e in entity_ids)


async def test_an_answer_reaches_its_entity(
    hass: HomeAssistant, setup_vision
) -> None:
    await setup_vision()
    await fire(hass, "on")

    boolean = next(
        e for e in hass.states.async_entity_ids("binary_sensor") if "paket" in e
    )
    text = next(e for e in hass.states.async_entity_ids("sensor") if "wer" in e)
    assert hass.states.get(boolean).state == "on"
    assert hass.states.get(text).state == "Postbote"


async def test_an_entity_is_unavailable_before_the_first_analysis(
    hass: HomeAssistant, setup_vision
) -> None:
    """Reporting "unknown" would look the same as the model answering that
    nothing is there."""
    await setup_vision()
    boolean = next(
        e for e in hass.states.async_entity_ids("binary_sensor") if "paket" in e
    )
    assert hass.states.get(boolean).state == "unavailable"


async def test_a_long_answer_is_shortened_for_the_state(
    hass: HomeAssistant, hass_storage: dict, tmp_path: Path
) -> None:
    """Home Assistant refuses a state over 255 characters outright, so the
    full text has to live in an attribute."""
    long_answer = "x" * 400

    async def _analyse(hass_, camera, prof, entity_id):
        return VisionResult(values={"wer": long_answer}, raw={}, duration_s=0.1)

    base = tmp_path / "recordings"
    hass_storage[STORAGE_KEY_CONFIG] = stored(
        base,
        [
            profile(
                observations=[
                    {"key": "wer", "type": "text", "question": "Wer ist zu sehen?"}
                ]
            )
        ],
    )
    entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
    entry.add_to_hass(hass)

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
            "custom_components.kustos_vision.vision_runner.async_analyse",
            AsyncMock(side_effect=_analyse),
        ),
    ):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        await entry.runtime_data.vision.async_analyse("vorgarten", force=True)
        await hass.async_block_till_done()

        text = next(e for e in hass.states.async_entity_ids("sensor") if "wer" in e)
        state = hass.states.get(text)
        assert len(state.state) <= 255
        assert state.state.endswith("…")
        assert state.attributes["full_answer"] == long_answer

    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()


# ----------------------------------------------------------------------
# The service
# ----------------------------------------------------------------------


async def test_the_service_runs_an_analysis(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    await setup_vision()
    result = await hass.services.async_call(
        DOMAIN, "analyze", {"camera": "vorgarten"}, blocking=True, return_response=True
    )
    assert result["ran"] is True
    assert result["values"]["paket"] is True
    assert len(analysed) == 1


async def test_the_service_ignores_the_cooldown_by_default(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    await setup_vision()
    await fire(hass, "on")
    await hass.services.async_call(
        DOMAIN, "analyze", {"camera": "vorgarten"}, blocking=True, return_response=True
    )
    assert len(analysed) == 2


async def test_the_service_reports_a_limit_rather_than_failing(
    hass: HomeAssistant, setup_vision
) -> None:
    """An automation calling this on every doorbell press should not fill the
    log when a limit stops it."""
    await setup_vision([profile(daily_budget=1)])
    await hass.services.async_call(
        DOMAIN, "analyze", {"camera": "vorgarten"}, blocking=True, return_response=True
    )
    second = await hass.services.async_call(
        DOMAIN, "analyze", {"camera": "vorgarten"}, blocking=True, return_response=True
    )
    assert second["ran"] is False


async def test_the_service_rejects_an_unknown_camera(
    hass: HomeAssistant, setup_vision
) -> None:
    from homeassistant.exceptions import ServiceValidationError

    await setup_vision()
    with pytest.raises(ServiceValidationError, match="no camera"):
        await hass.services.async_call(
            DOMAIN, "analyze", {"camera": "gibtsnicht"}, blocking=True
        )


async def test_the_service_rejects_a_camera_without_a_profile(
    hass: HomeAssistant, setup_vision
) -> None:
    from homeassistant.exceptions import ServiceValidationError

    await setup_vision([])
    with pytest.raises(ServiceValidationError, match="no vision profile"):
        await hass.services.async_call(
            DOMAIN, "analyze", {"camera": "vorgarten"}, blocking=True
        )


async def test_a_trigger_on_a_camera_without_streams_does_not_crash_the_task(
    hass: HomeAssistant, hass_storage: dict, tmp_path: Path, vision_env
) -> None:
    """Regression: the "no entity to snapshot" error was raised outside the
    handler and outside the lock, so a trigger-driven run died as an unhandled
    task. The user saw an asyncio traceback, and the profile never recorded
    that anything had gone wrong."""
    base = tmp_path / "recordings"
    stored_config = stored(base)
    stored_config["data"]["cameras"][0]["streams"] = []
    hass_storage[STORAGE_KEY_CONFIG] = stored_config

    entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    await fire(hass, "on")

    state = entry.runtime_data.vision.state_for("vorgarten")
    assert state.last_error is not None
    assert "snapshot" in state.last_error
    assert state.history and state.history[0]["error"] == state.last_error

    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()


async def test_the_entity_id_comes_from_the_key_not_the_question(
    hass: HomeAssistant, hass_storage: dict, tmp_path: Path, vision_env
) -> None:
    """Regression: the entity name was the question, and Home Assistant builds
    the entity id from the name. A one-sentence question produced an id no
    automation could reasonably reference, and rewording the question renamed
    the entity and lost its history."""
    base = tmp_path / "recordings"
    hass_storage[STORAGE_KEY_CONFIG] = stored(
        base,
        [
            profile(
                observations=[
                    {
                        "key": "person_im_garten",
                        "type": "boolean",
                        "question": (
                            "Ist mindestens ein Mensch im Bild zu sehen, "
                            "der sich auf dem Rasen oder der Terrasse aufhaelt?"
                        ),
                    }
                ]
            )
        ],
    )
    entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    ids = hass.states.async_entity_ids("binary_sensor")
    observation_ids = [e for e in ids if "person_im_garten" in e]
    assert observation_ids, f"no entity built from the key, only: {ids}"
    assert not any("mensch_im_bild" in e for e in ids)

    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()


async def test_an_explicit_name_is_used_for_the_entity(
    hass: HomeAssistant, hass_storage: dict, tmp_path: Path, vision_env
) -> None:
    base = tmp_path / "recordings"
    hass_storage[STORAGE_KEY_CONFIG] = stored(
        base,
        [
            profile(
                observations=[
                    {
                        "key": "p",
                        "name": "Paket vor der Tuer",
                        "type": "boolean",
                        "question": "Liegt ein Paket da?",
                    }
                ]
            )
        ],
    )
    entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert any(
        "paket_vor_der_tuer" in e for e in hass.states.async_entity_ids("binary_sensor")
    )

    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
