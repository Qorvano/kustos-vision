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
from custom_components.kustos_vision.core.capture import CapturedFrame, FrameSource
from custom_components.kustos_vision.vision import VisionResult

TRIGGER = "binary_sensor.beispiel_motion"
CONDITION = "input_boolean.scharf"


FRAME_BYTES = b"\xff\xd8\xff-jpeg-bytes"


def fake_frame(path=None) -> CapturedFrame:
    """A captured frame that never touched a camera."""
    return CapturedFrame(
        content=FRAME_BYTES,
        content_type="image/jpeg",
        taken_at=dt_util.utcnow(),
        source=FrameSource.STREAM,
        path=path,
    )


async def fake_capture(hass_, entity_id, target=None) -> CapturedFrame:
    """Stand-in for async_capture_frame, honouring the ring target."""
    if target is not None:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(FRAME_BYTES)
    return fake_frame(path=target)


def profile(**overrides) -> dict:
    base = {
        "camera_slug": "beispiel",
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
                    "slug": "beispiel",
                    "name": "Beispiel",
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

    async def _analyse(hass, camera, prof, entity_id, request=None):
        analysed.append(
            {
                "camera": camera.slug,
                "entity_id": entity_id,
                "request": request,
                "backend": prof.backend,
            }
        )
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

    state = entry.runtime_data.vision.state_for("beispiel")
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
    assert entry.runtime_data.vision.state_for("beispiel").analyses_today == 3


async def test_the_budget_holds_even_when_forced(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    """The cooldown yields to a deliberate request; the budget does not,
    because it is the limit that exists to stop runaway cost."""
    entry = await setup_vision([profile(daily_budget=1)])
    runner = entry.runtime_data.vision

    assert await runner.async_analyse("beispiel", force=True) is not None
    assert await runner.async_analyse("beispiel", force=True) is None
    assert len(analysed) == 1


async def test_the_budget_resets_with_the_local_day(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    entry = await setup_vision([profile(daily_budget=1)])
    runner = entry.runtime_data.vision
    await runner.async_analyse("beispiel", force=True)

    state = runner.state_for("beispiel")
    state.budget_day = state.budget_day - timedelta(days=1)

    assert await runner.async_analyse("beispiel", force=True) is not None
    assert len(analysed) == 2


async def test_a_stored_condition_entity_no_longer_holds_anything_back(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    """Regression: the "only while this entity is on" gate was removed. A
    profile stored before that still carries the key; it must load, and the
    named entity being off must not stop an analysis any more."""
    await setup_vision([profile(condition_entity=CONDITION)])
    hass.states.async_set(CONDITION, "off")
    await fire(hass, "on")
    assert len(analysed) == 1


async def test_a_profile_with_only_paused_questions_never_runs(
    hass: HomeAssistant, setup_vision, analysed: list
) -> None:
    """Pausing every question is pausing the profile: nothing to ask means
    nothing to pay for."""
    await setup_vision(
        [
            profile(
                observations=[
                    {
                        "key": "paket",
                        "type": "boolean",
                        "question": "Liegt ein Paket vor der Tür?",
                        "enabled": False,
                    }
                ]
            )
        ]
    )
    await fire(hass, "on")
    assert analysed == []


async def test_a_paused_question_keeps_its_entity(
    hass: HomeAssistant, setup_vision
) -> None:
    """Pausing beats deleting exactly because the sensor survives, with
    whatever it last answered, and every automation wired to it stays valid."""
    await setup_vision(
        [
            profile(
                observations=[
                    {
                        "key": "paket",
                        "type": "boolean",
                        "question": "Liegt ein Paket vor der Tür?",
                        "enabled": False,
                    },
                    {
                        "key": "wer",
                        "type": "text",
                        "question": "Wer ist zu sehen?",
                    },
                ]
            )
        ]
    )
    entity_ids = hass.states.async_entity_ids()
    assert any("paket" in e and e.startswith("binary_sensor.") for e in entity_ids)


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

    async def _analyse(hass_, camera, prof, entity_id, request=None):
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
            "custom_components.kustos_vision.vision_runner.async_capture_frame",
            AsyncMock(side_effect=fake_capture),
        ),
        patch(
            "custom_components.kustos_vision.vision_runner.async_analyse",
            AsyncMock(side_effect=_analyse),
        ),
    ):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        await entry.runtime_data.vision.async_analyse("beispiel", force=True)
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
        DOMAIN, "analyze", {"camera": "beispiel"}, blocking=True, return_response=True
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
        DOMAIN, "analyze", {"camera": "beispiel"}, blocking=True, return_response=True
    )
    assert len(analysed) == 2


async def test_the_service_reports_a_limit_rather_than_failing(
    hass: HomeAssistant, setup_vision
) -> None:
    """An automation calling this on every doorbell press should not fill the
    log when a limit stops it."""
    await setup_vision([profile(daily_budget=1)])
    await hass.services.async_call(
        DOMAIN, "analyze", {"camera": "beispiel"}, blocking=True, return_response=True
    )
    second = await hass.services.async_call(
        DOMAIN, "analyze", {"camera": "beispiel"}, blocking=True, return_response=True
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
            DOMAIN, "analyze", {"camera": "beispiel"}, blocking=True
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

    state = entry.runtime_data.vision.state_for("beispiel")
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
                        "key": "person_im_muster",
                        "type": "boolean",
                        "question": (
                            "Ist mindestens ein Mensch im Bild zu sehen, "
                            "die sich vor der Kamera aufhaelt?"
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
    observation_ids = [e for e in ids if "person_im_muster" in e]
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


# ----------------------------------------------------------------------
# The trigger-time frame
# ----------------------------------------------------------------------


async def test_the_backend_receives_the_frame_taken_at_trigger_time(
    hass: HomeAssistant, setup_vision, analysed
) -> None:
    """Regression: the model was answered from a still the camera integration
    had cached minutes earlier, while the trigger said "now" - a yellow-bin
    question stayed true on night footage nobody could inspect. The runner now
    captures first, and the backend gets exactly those bytes."""
    await setup_vision()
    await fire(hass)
    assert analysed
    request = analysed[0]["request"]
    assert request is not None and request.frame is not None
    assert request.frame.content == FRAME_BYTES
    assert str(request.frame.source) == "stream"


async def test_the_history_names_the_frame_and_its_source(
    hass: HomeAssistant, setup_vision
) -> None:
    entry = await setup_vision()
    runner = entry.runtime_data.vision
    await runner.async_analyse("beispiel", force=True)
    run = runner.state_for("beispiel").history[0]
    assert run["frame"] == "frame_00.jpg"
    assert run["frame_source"] == "stream"


async def test_consecutive_runs_walk_the_ring(
    hass: HomeAssistant, setup_vision
) -> None:
    """Each run gets its own slot; the history and the files stay in step."""
    entry = await setup_vision()
    runner = entry.runtime_data.vision
    await runner.async_analyse("beispiel", force=True)
    await runner.async_analyse("beispiel", force=True)
    names = [run["frame"] for run in runner.state_for("beispiel").history]
    assert names == ["frame_01.jpg", "frame_00.jpg"]


async def test_capture_falls_back_to_the_entity_still_without_a_stream(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A camera without a stream URL still gets analysed - from its still,
    and the frame is honest about that."""
    from custom_components.kustos_vision.capture import async_capture_frame

    image = MagicMock(content=b"still-bytes", content_type="image/jpeg")
    target = tmp_path / "frames" / "cam" / "frame_00.jpg"
    with (
        patch(
            "custom_components.kustos_vision.capture.async_get_stream_source",
            AsyncMock(return_value=None),
        ),
        patch(
            "custom_components.kustos_vision.capture.async_get_image",
            AsyncMock(return_value=image),
        ),
    ):
        frame = await async_capture_frame(hass, "camera.cam", target)
    assert str(frame.source) == "still"
    assert frame.content == b"still-bytes"
    assert target.read_bytes() == b"still-bytes"


async def test_capture_falls_back_when_ffmpeg_cannot_start(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    from custom_components.kustos_vision.capture import async_capture_frame

    image = MagicMock(content=b"still-bytes", content_type="image/jpeg")
    with (
        patch(
            "custom_components.kustos_vision.capture.async_get_stream_source",
            AsyncMock(return_value="rtsp://cam.invalid/stream"),
        ),
        patch(
            "custom_components.kustos_vision.capture.get_ffmpeg_manager",
            MagicMock(
                return_value=MagicMock(binary=str(tmp_path / "no-such-ffmpeg"))
            ),
        ),
        patch(
            "custom_components.kustos_vision.capture.async_get_image",
            AsyncMock(return_value=image),
        ),
    ):
        frame = await async_capture_frame(
            hass, "camera.cam", tmp_path / "f" / "frame_00.jpg"
        )
    assert str(frame.source) == "still"


async def test_capture_raises_when_nothing_can_produce_a_picture(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """No stream and no still: the run must fail loudly rather than be
    answered from a picture nobody can identify afterwards."""
    from custom_components.kustos_vision.capture import async_capture_frame
    from custom_components.kustos_vision.vision import VisionError

    with (
        patch(
            "custom_components.kustos_vision.capture.async_get_stream_source",
            AsyncMock(return_value=None),
        ),
        patch(
            "custom_components.kustos_vision.capture.async_get_image",
            AsyncMock(side_effect=Exception("kaputt")),
        ),
        pytest.raises(VisionError),
    ):
        await async_capture_frame(hass, "camera.cam", None)


async def test_the_ring_is_sized_to_the_history(
    hass: HomeAssistant,
) -> None:
    """One slot per remembered run. Asserted here instead of a second
    constant, so the two cannot drift apart silently."""
    from custom_components.kustos_vision.core.capture import (
        frame_name,
        frame_slot,
        is_frame_name,
    )
    from custom_components.kustos_vision.vision_runner import HISTORY_LENGTH

    slots = {frame_slot(counter, HISTORY_LENGTH) for counter in range(HISTORY_LENGTH)}
    assert len(slots) == HISTORY_LENGTH
    assert all(is_frame_name(frame_name(slot)) for slot in slots)


async def test_the_frame_view_serves_the_analysed_frame(
    hass: HomeAssistant, hass_client, setup_vision
) -> None:
    await setup_vision()
    frames = Path(hass.config.path("kustos_vision")) / "frames" / "beispiel"
    frames.mkdir(parents=True, exist_ok=True)
    (frames / "frame_00.jpg").write_bytes(b"jpeg-bytes")
    client = await hass_client()
    response = await client.get(f"/api/{DOMAIN}/vision-frame/beispiel/frame_00.jpg")
    assert response.status == 200
    assert await response.read() == b"jpeg-bytes"
    # Ring slots are reused, so a cached copy could be another run's picture;
    # no-cache forces the revalidation that keeps each row honest.
    assert "no-cache" in response.headers["Cache-Control"]


@pytest.mark.parametrize(
    "path",
    [
        "beispiel/frame_0.jpg",
        "beispiel/frame_100.jpg",
        "beispiel/index.db",
        "Beispiel/frame_00.jpg",
        "beispiel/frame_00.png",
    ],
)
async def test_the_frame_view_refuses_what_the_ring_never_wrote(
    hass: HomeAssistant, hass_client, setup_vision, path: str
) -> None:
    """The shape check is the authorisation: only a valid slug plus a ring
    slot name can address a file, so nothing else below the state directory
    is reachable."""
    await setup_vision()
    client = await hass_client()
    response = await client.get(f"/api/{DOMAIN}/vision-frame/{path}")
    assert response.status == 404


# ----------------------------------------------------------------------
# Reference pictures
# ----------------------------------------------------------------------


JPEG_UPLOAD = b"\xff\xd8\xff\xe0-a-tiny-jpeg"


def upload_form(content: bytes, filename: str = "foto.jpg"):
    from aiohttp import FormData

    form = FormData()
    form.add_field("file", content, filename=filename, content_type="image/jpeg")
    return form


async def test_a_reference_upload_is_content_addressed(
    hass: HomeAssistant, hass_client, setup_vision
) -> None:
    """The same photo uploaded twice is one file and one id."""
    await setup_vision()
    client = await hass_client()

    first = await client.post(f"/api/{DOMAIN}/reference", data=upload_form(JPEG_UPLOAD))
    assert first.status == 200
    body = await first.json()
    assert body["content_type"] == "image/jpeg"
    assert body["bytes"] == len(JPEG_UPLOAD)

    second = await client.post(
        f"/api/{DOMAIN}/reference", data=upload_form(JPEG_UPLOAD, "anders.png")
    )
    assert (await second.json())["asset_id"] == body["asset_id"]

    stored = list(
        (Path(hass.config.path("kustos_vision")) / "references").iterdir()
    )
    assert len(stored) == 1


async def test_an_uploaded_reference_is_served_back(
    hass: HomeAssistant, hass_client, setup_vision
) -> None:
    await setup_vision()
    client = await hass_client()
    body = await (
        await client.post(f"/api/{DOMAIN}/reference", data=upload_form(JPEG_UPLOAD))
    ).json()

    served = await client.get(f"/api/{DOMAIN}/reference/{body['asset_id']}")
    assert served.status == 200
    assert await served.read() == JPEG_UPLOAD
    # Content addressing earns immutable: the bytes behind an id never change.
    assert "immutable" in served.headers["Cache-Control"]


async def test_a_renamed_text_file_is_refused(
    hass: HomeAssistant, hass_client, setup_vision
) -> None:
    """The type comes from the bytes, never from the name or the browser's
    claim - both are the uploader's to choose."""
    await setup_vision()
    client = await hass_client()
    response = await client.post(
        f"/api/{DOMAIN}/reference",
        data=upload_form(b"just text pretending", "echt.jpg"),
    )
    assert response.status == 400


async def test_an_unknown_reference_is_not_found(
    hass: HomeAssistant, hass_client, setup_vision
) -> None:
    await setup_vision()
    client = await hass_client()
    for asset_id in ("f" * 32, "../evil", "f" * 31):
        response = await client.get(f"/api/{DOMAIN}/reference/{asset_id}")
        assert response.status == 404


async def test_a_non_admin_cannot_upload(
    hass: HomeAssistant, hass_client, hass_read_only_access_token, setup_vision
) -> None:
    await setup_vision()
    client = await hass_client(hass_read_only_access_token)
    response = await client.post(
        f"/api/{DOMAIN}/reference", data=upload_form(JPEG_UPLOAD)
    )
    assert response.status == 403


async def test_the_runner_loads_references_into_the_request(
    hass: HomeAssistant, hass_client, setup_vision, analysed
) -> None:
    """A question's stored picture reaches the backend loaded, with the
    preamble that disclaims it as evidence."""
    entry = await setup_vision(
        [
            profile(
                observations=[
                    {
                        "key": "tonne",
                        "type": "boolean",
                        "question": "Ist die gelbe Tonne zu sehen?",
                        "references": [{"asset_id": "0" * 32, "caption": "Der Hinterhof."}],
                    }
                ]
            )
        ]
    )
    references = Path(hass.config.path("kustos_vision")) / "references"
    references.mkdir(parents=True, exist_ok=True)
    (references / ("0" * 32 + ".jpg")).write_bytes(JPEG_UPLOAD)

    await entry.runtime_data.vision.async_analyse("beispiel", force=True)
    request = analysed[0]["request"]
    assert len(request.references) == 1
    assert request.references[0].content == JPEG_UPLOAD
    assert "NOT the current camera frame" in request.references[0].preamble


async def test_a_missing_reference_never_fails_the_analysis(
    hass: HomeAssistant, setup_vision, analysed
) -> None:
    """The analysis without its reference still answers something; a refused
    analysis answers nothing at all."""
    entry = await setup_vision(
        [
            profile(
                observations=[
                    {
                        "key": "tonne",
                        "type": "boolean",
                        "question": "Ist die gelbe Tonne zu sehen?",
                        "references": [{"asset_id": "e" * 32}],
                    }
                ]
            )
        ]
    )
    result = await entry.runtime_data.vision.async_analyse("beispiel", force=True)
    assert result is not None
    assert analysed[0]["request"].references == ()


# ----------------------------------------------------------------------
# Persons
# ----------------------------------------------------------------------


def make_person(person_id: str = "dustin", **overrides):
    from custom_components.kustos_vision.core.persons import PersonProfile

    values = {"id": person_id, "name": "Dustin"}
    values.update(overrides)
    return PersonProfile(**values)


async def setup_with_person(setup_vision, detect: bool = True):
    entry = await setup_vision([profile(detect_persons=detect)])
    coordinator = entry.runtime_data
    await coordinator.async_set_config(
        coordinator.config.with_person(make_person())
    )
    return entry


def sighting_stub(seen: bool):
    """A backend stub whose only opinion is whether the person was matched."""

    async def _analyse(hass, camera, prof, entity_id, request=None):
        return VisionResult(
            values={"paket": True},
            raw={},
            duration_s=0.1,
            persons={p.id: seen for p in (request.persons if request else ())},
        )

    return AsyncMock(side_effect=_analyse)


async def test_detect_persons_off_sends_no_person_fields(
    hass: HomeAssistant, setup_vision, analysed
) -> None:
    entry = await setup_with_person(setup_vision, detect=False)
    await entry.runtime_data.vision.async_analyse("beispiel", force=True)
    assert analysed[0]["request"].persons == ()


async def test_detect_persons_passes_only_the_enabled_people(
    hass: HomeAssistant, setup_vision, analysed
) -> None:
    entry = await setup_with_person(setup_vision)
    coordinator = entry.runtime_data
    await coordinator.async_set_config(
        coordinator.config.with_person(
            make_person("gast", name="Gast", enabled=False)
        )
    )
    await coordinator.vision.async_analyse("beispiel", force=True)
    assert [p.id for p in analysed[0]["request"].persons] == ["dustin"]


async def test_a_sighting_turns_the_person_present_and_the_timer_ends_it(
    hass: HomeAssistant, setup_vision
) -> None:
    """The whole presence contract: on within one analysis, off only after
    the Abklingzeit - never because one frame did not show them."""
    from pytest_homeassistant_custom_component.common import (
        async_fire_time_changed,
    )

    entry = await setup_with_person(setup_vision)
    coordinator = entry.runtime_data
    with patch(
        "custom_components.kustos_vision.vision_runner.async_analyse",
        sighting_stub(True),
    ):
        await coordinator.vision.async_analyse("beispiel", force=True)
    assert coordinator.persons.state_for("dustin").present is True
    assert coordinator.persons.state_for("dustin").last_camera == "beispiel"

    # One second past the configured off-delay: absent.
    delay = coordinator.config.persons.absence_seconds
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=delay + 1))
    await hass.async_block_till_done()
    assert coordinator.persons.state_for("dustin").present is False


async def test_not_seeing_someone_never_switches_them_absent(
    hass: HomeAssistant, setup_vision
) -> None:
    """Regression guard: the model not matching a person in one frame is not
    evidence they left - they turned round or stood behind the car."""
    entry = await setup_with_person(setup_vision)
    coordinator = entry.runtime_data
    with patch(
        "custom_components.kustos_vision.vision_runner.async_analyse",
        sighting_stub(True),
    ):
        await coordinator.vision.async_analyse("beispiel", force=True)
    with patch(
        "custom_components.kustos_vision.vision_runner.async_analyse",
        sighting_stub(False),
    ):
        await coordinator.vision.async_analyse("beispiel", force=True)
    assert coordinator.persons.state_for("dustin").present is True


async def test_a_new_sighting_rearms_the_timer_instead_of_stacking(
    hass: HomeAssistant, setup_vision, freezer
) -> None:
    from pytest_homeassistant_custom_component.common import (
        async_fire_time_changed,
    )

    entry = await setup_with_person(setup_vision)
    coordinator = entry.runtime_data
    delay = coordinator.config.persons.absence_seconds

    async def tick(seconds: int) -> None:
        freezer.tick(timedelta(seconds=seconds))
        async_fire_time_changed(hass, dt_util.utcnow())
        await hass.async_block_till_done()

    with patch(
        "custom_components.kustos_vision.vision_runner.async_analyse",
        sighting_stub(True),
    ):
        await coordinator.vision.async_analyse("beispiel", force=True)
        # Two thirds into the delay: seen again, which re-arms.
        await tick(delay * 2 // 3)
        await coordinator.vision.async_analyse("beispiel", force=True)

    # Past the FIRST sighting's would-be expiry: still present.
    await tick(delay // 2)
    assert coordinator.persons.state_for("dustin").present is True

    # Past the re-armed expiry: absent.
    await tick(delay)
    assert coordinator.persons.state_for("dustin").present is False


async def test_the_person_has_a_presence_entity_on_the_hub(
    hass: HomeAssistant, setup_vision
) -> None:
    entry = await setup_with_person(setup_vision)
    coordinator = entry.runtime_data
    await hass.async_block_till_done()

    from homeassistant.helpers import entity_registry as er

    registry = er.async_get(hass)
    match = next(
        (
            e
            for e in registry.entities.values()
            if e.unique_id == f"{entry.entry_id}_person_dustin"
        ),
        None,
    )
    assert match is not None
    assert hass.states.get(match.entity_id).state == "off"

    with patch(
        "custom_components.kustos_vision.vision_runner.async_analyse",
        sighting_stub(True),
    ):
        await coordinator.vision.async_analyse("beispiel", force=True)
    await hass.async_block_till_done()
    state = hass.states.get(match.entity_id)
    assert state.state == "on"
    assert state.attributes["last_camera"] == "beispiel"


async def test_persons_ws_round_trip(
    hass: HomeAssistant, hass_ws_client, setup_vision
) -> None:
    """Create, reconfigure and delete over the websocket, snapshot included."""
    await setup_vision()
    client = await hass_ws_client(hass)

    await client.send_json_auto_id(
        {"type": f"{DOMAIN}/persons/set", "name": "Dustin"}
    )
    reply = await client.receive_json()
    assert reply["success"]
    people = reply["result"]["persons"]["people"]
    assert people[0]["id"] == "dustin"
    assert people[0]["state"]["present"] is False

    await client.send_json_auto_id(
        {"type": f"{DOMAIN}/persons/options", "absence_seconds": 120}
    )
    reply = await client.receive_json()
    assert reply["result"]["persons"]["absence_seconds"] == 120

    await client.send_json_auto_id(
        {"type": f"{DOMAIN}/persons/delete", "person_id": "dustin"}
    )
    reply = await client.receive_json()
    assert reply["result"]["persons"]["people"] == []


async def test_a_second_person_under_the_same_name_is_refused(
    hass: HomeAssistant, hass_ws_client, setup_vision
) -> None:
    """The id is an entity's identity; silently replacing somebody else's
    would rebind their history."""
    await setup_vision()
    client = await hass_ws_client(hass)
    for _ in range(2):
        await client.send_json_auto_id(
            {"type": f"{DOMAIN}/persons/set", "name": "Dustin"}
        )
        reply = await client.receive_json()
    assert not reply["success"]
    assert reply["error"]["code"] == "invalid_config"


# ----------------------------------------------------------------------
# The media source
# ----------------------------------------------------------------------


async def test_the_media_source_resolves_frames_and_references(
    hass: HomeAssistant, setup_vision
) -> None:
    """AI Task attachments resolve through media_source and need a local
    path; this is what gives that backend the trigger-time frame."""
    from homeassistant.components import media_source
    from homeassistant.setup import async_setup_component

    await setup_vision()
    assert await async_setup_component(hass, "media_source", {})

    frames = Path(hass.config.path("kustos_vision")) / "frames" / "beispiel"
    frames.mkdir(parents=True, exist_ok=True)
    (frames / "frame_00.jpg").write_bytes(b"jpeg")
    references = Path(hass.config.path("kustos_vision")) / "references"
    references.mkdir(parents=True, exist_ok=True)
    (references / ("b" * 32 + ".png")).write_bytes(b"png")

    frame = await media_source.async_resolve_media(
        hass, "media-source://kustos_vision/frame/beispiel/frame_00.jpg", None
    )
    assert frame.path == frames / "frame_00.jpg"
    assert frame.mime_type == "image/jpeg"

    reference = await media_source.async_resolve_media(
        hass, "media-source://kustos_vision/reference/" + "b" * 32, None
    )
    assert reference.path == references / ("b" * 32 + ".png")
    assert reference.mime_type == "image/png"


@pytest.mark.parametrize(
    "identifier",
    [
        "frame/beispiel/index.db",
        "frame/../frames/beispiel/frame_00.jpg",
        "reference/../../secrets.yaml",
        "reference/zzz",
        "somewhere/else",
    ],
)
async def test_the_media_source_refuses_what_the_views_would_refuse(
    hass: HomeAssistant, setup_vision, identifier: str
) -> None:
    from homeassistant.components import media_source
    from homeassistant.exceptions import HomeAssistantError
    from homeassistant.setup import async_setup_component

    await setup_vision()
    assert await async_setup_component(hass, "media_source", {})
    with pytest.raises(HomeAssistantError):
        await media_source.async_resolve_media(
            hass, f"media-source://kustos_vision/{identifier}", None
        )


async def test_a_profile_with_only_person_detection_still_runs(
    hass: HomeAssistant, setup_vision, analysed
) -> None:
    """Regression: "no questions" used to be the whole definition of a
    pointless profile, so a camera meant to ONLY recognise persons never
    subscribed its trigger and every analysis was refused - while the
    editor's navigation guard happily saved exactly that configuration."""
    entry = await setup_vision([profile(observations=[], detect_persons=True)])
    coordinator = entry.runtime_data
    await coordinator.async_set_config(
        coordinator.config.with_person(make_person())
    )
    await fire(hass, "off")
    await fire(hass, "on")
    assert len(analysed) == 1
    assert [p.id for p in analysed[0]["request"].persons] == ["dustin"]


async def test_person_detection_without_any_person_is_still_pointless(
    hass: HomeAssistant, setup_vision, analysed
) -> None:
    """The switch alone asks nothing; only configured, enabled people do."""
    await setup_vision([profile(observations=[], detect_persons=True)])
    await fire(hass, "off")
    await fire(hass, "on")
    assert analysed == []


# ----------------------------------------------------------------------
# Endpoints
# ----------------------------------------------------------------------


def endpoint_backend() -> dict:
    return {"kind": "openai", "endpoint_id": "mini", "model": "gemma4-vision"}


async def test_a_profile_resolves_its_endpoint_at_request_time(
    hass: HomeAssistant, setup_vision, analysed
) -> None:
    """The profile carries only the endpoint id; url and key are filled in
    when the analysis runs, so editing the endpoint takes effect for every
    camera at once."""
    from custom_components.kustos_vision.core.config import EndpointConfig

    entry = await setup_vision([profile(backend=endpoint_backend())])
    coordinator = entry.runtime_data
    await coordinator.async_set_config(
        coordinator.config.with_endpoint(
            EndpointConfig(
                id="mini",
                name="Mac mini",
                url="http://mini.local:8080/v1",
                api_key="secret",
            )
        )
    )
    await coordinator.vision.async_analyse("beispiel", force=True)
    assert analysed
    backend = analysed[0]["backend"]
    assert backend.url == "http://mini.local:8080/v1"
    assert backend.api_key == "secret"
    assert backend.model == "gemma4-vision"


async def test_a_vanished_endpoint_fails_loudly_not_silently(
    hass: HomeAssistant, setup_vision, analysed
) -> None:
    entry = await setup_vision([profile(backend=endpoint_backend())])
    runner = entry.runtime_data.vision
    with pytest.raises(Exception, match="no longer exists"):
        await runner.async_analyse("beispiel", force=True)
    assert analysed == []


async def test_endpoints_ws_round_trip(
    hass: HomeAssistant, hass_ws_client, setup_vision
) -> None:
    await setup_vision()
    client = await hass_ws_client(hass)

    await client.send_json_auto_id(
        {
            "type": f"{DOMAIN}/endpoint/set",
            "name": "Mac mini",
            "url": "http://mini.local:8080/v1",
            "models": ["gemma4-vision"],
        }
    )
    reply = await client.receive_json()
    assert reply["success"]
    stored_endpoint = reply["result"]["endpoints"][0]
    assert stored_endpoint["id"] == "mac_mini"
    assert stored_endpoint["models"] == ["gemma4-vision"]

    await client.send_json_auto_id(
        {"type": f"{DOMAIN}/endpoint/delete", "endpoint_id": "mac_mini"}
    )
    reply = await client.receive_json()
    assert reply["success"]
    assert reply["result"]["endpoints"] == []


async def test_an_endpoint_in_use_cannot_be_deleted(
    hass: HomeAssistant, hass_ws_client, setup_vision
) -> None:
    """A deleted endpoint would strand every camera pointing at it; the
    refusal names the cameras so the user knows what to change first."""
    from custom_components.kustos_vision.core.config import EndpointConfig

    entry = await setup_vision([profile(backend=endpoint_backend())])
    coordinator = entry.runtime_data
    await coordinator.async_set_config(
        coordinator.config.with_endpoint(
            EndpointConfig(id="mini", name="Mac mini", url="http://mini:8080/v1")
        )
    )
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": f"{DOMAIN}/endpoint/delete", "endpoint_id": "mini"}
    )
    reply = await client.receive_json()
    assert not reply["success"]
    assert reply["error"]["code"] == "still_in_use"
    assert "beispiel" in reply["error"]["message"]


# ----------------------------------------------------------------------
# The frame image entity
# ----------------------------------------------------------------------


async def test_the_frame_entity_serves_the_latest_analysed_frame(
    hass: HomeAssistant, setup_vision
) -> None:
    """The picture a push notification would attach: always the frame of the
    newest analysis, updating with every run."""
    from homeassistant.components.image import async_get_image
    from homeassistant.helpers import entity_registry as er

    entry = await setup_vision([profile(frame_sensor=True)])
    runner = entry.runtime_data.vision
    await runner.async_analyse("beispiel", force=True)
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    match = next(
        (
            e
            for e in registry.entities.values()
            if e.unique_id == f"{entry.entry_id}_beispiel_analysed_frame"
        ),
        None,
    )
    assert match is not None
    state = hass.states.get(match.entity_id)
    # An image entity's state is the time of its picture.
    assert state.state not in ("unknown", "unavailable")

    served = await async_get_image(hass, match.entity_id)
    assert served.content == FRAME_BYTES
    assert served.content_type == "image/jpeg"


async def test_without_the_switch_no_frame_entity_appears(
    hass: HomeAssistant, setup_vision
) -> None:
    from homeassistant.helpers import entity_registry as er

    entry = await setup_vision()
    registry = er.async_get(hass)
    assert not any(
        e.unique_id == f"{entry.entry_id}_beispiel_analysed_frame"
        for e in registry.entities.values()
    )


# ----------------------------------------------------------------------
# Marked frames
# ----------------------------------------------------------------------


MARKED_BYTES = b"\xff\xd8\xff-marked-jpeg"


def marks_result():
    from custom_components.kustos_vision.core.marks import Mark

    return VisionResult(
        values={"paket": True},
        raw={},
        duration_s=0.1,
        marks=(Mark(label="Paket", x0=100, y0=100, x1=300, y1=300),),
    )


async def fake_draw(hass_, source, target, marks, with_labels=True) -> bool:
    target.write_bytes(MARKED_BYTES)
    return True


async def test_the_image_entity_prefers_the_marked_frame(
    hass: HomeAssistant, setup_vision
) -> None:
    """The entity exists for notifications, and the picture with the boxes
    burned in is the one worth attaching."""
    from homeassistant.components.image import async_get_image
    from homeassistant.helpers import entity_registry as er

    entry = await setup_vision(
        [profile(frame_sensor=True, mark_objects=True)]
    )
    runner = entry.runtime_data.vision
    with (
        patch(
            "custom_components.kustos_vision.vision_runner.async_analyse",
            AsyncMock(return_value=marks_result()),
        ),
        patch(
            "custom_components.kustos_vision.vision_runner.async_draw_marks",
            AsyncMock(side_effect=fake_draw),
        ),
    ):
        await runner.async_analyse("beispiel", force=True)
    await hass.async_block_till_done()

    run = runner.state_for("beispiel").history[0]
    assert run["marked"] == "marked_00.jpg"

    registry = er.async_get(hass)
    match = next(
        e
        for e in registry.entities.values()
        if e.unique_id == f"{entry.entry_id}_beispiel_analysed_frame"
    )
    served = await async_get_image(hass, match.entity_id)
    assert served.content == MARKED_BYTES


async def test_a_run_without_marks_removes_the_stale_marked_copy(
    hass: HomeAssistant, setup_vision
) -> None:
    """Ring slots come round again: a marked file from the previous lap must
    not survive a run that reported nothing, where the image entity could
    mistake it for current."""
    entry = await setup_vision([profile(frame_sensor=True, mark_objects=True)])
    runner = entry.runtime_data.vision
    frames = Path(hass.config.path("kustos_vision")) / "frames" / "beispiel"
    frames.mkdir(parents=True, exist_ok=True)
    stale = frames / "marked_00.jpg"
    stale.write_bytes(MARKED_BYTES)

    await runner.async_analyse("beispiel", force=True)  # stub reports no marks
    run = runner.state_for("beispiel").history[0]
    assert run["marked"] is None
    assert not stale.exists()


async def test_without_the_switch_no_marks_are_requested(
    hass: HomeAssistant, setup_vision, analysed
) -> None:
    """The image entity alone must not cost the request a marks field."""
    entry = await setup_vision([profile(frame_sensor=True)])
    await entry.runtime_data.vision.async_analyse("beispiel", force=True)
    assert analysed[0]["request"].mark_objects is False
