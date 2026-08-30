"""Recording a configured camera: what gets started, and what gets stopped."""

from __future__ import annotations

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.kustos_vision.const import (
    CONF_BASE_PATH,
    DOMAIN,
    STORAGE_KEY_CONFIG,
    STORAGE_VERSION_CONFIG,
)

STREAM_URL = "rtsp://user:secret@camera.invalid:554/stream1"


def stored_config(base: Path, **camera_overrides) -> dict:
    camera = {
        "slug": "beispiel",
        "name": "Beispiel",
        "streams": [
            {"key": "hd", "entity_id": "camera.beispiel_hd", "record": True}
        ],
        "capabilities": {},
        "retention_days": None,
        "enabled": True,
        "area_id": None,
    }
    camera.update(camera_overrides)
    return {
        "version": STORAGE_VERSION_CONFIG,
        "minor_version": 1,
        "key": STORAGE_KEY_CONFIG,
        "data": {
            "version": 1,
            "storage": {"base_path": str(base), "segment_seconds": 60},
            "cameras": [camera],
        },
    }


class FakeProcess:
    """A stand-in for ffmpeg that stays up until it is told to stop."""

    def __init__(self) -> None:
        self.returncode: int | None = None
        self.terminated = False
        self.killed = False
        self.stderr = MagicMock()
        self.stderr.readline = AsyncMock(return_value=b"")
        self._exit = asyncio.Event()

    async def wait(self) -> int:
        await self._exit.wait()
        return self.returncode if self.returncode is not None else 0

    def terminate(self) -> None:
        self.terminated = True
        self.returncode = 0
        self._exit.set()

    def kill(self) -> None:
        self.killed = True
        self.returncode = -9
        self._exit.set()


@pytest.fixture
def spawned() -> list[list[str]]:
    """Records every command line the recorder would have run."""
    return []


@pytest.fixture
def recording_env(spawned: list[list[str]]):
    """Resolve a stream URL and capture the process launch, without ffmpeg."""
    processes: list[FakeProcess] = []

    async def _spawn(program, *args, **kwargs):
        spawned.append([program, *args])
        process = FakeProcess()
        processes.append(process)
        return process

    with (
        patch(
            "custom_components.kustos_vision.recorder.async_get_stream_source",
            AsyncMock(return_value=STREAM_URL),
        ),
        patch(
            "custom_components.kustos_vision.recorder.get_ffmpeg_manager",
            MagicMock(return_value=MagicMock(binary="/usr/bin/ffmpeg")),
        ),
        patch(
            "custom_components.kustos_vision.maintenance.get_ffmpeg_manager",
            MagicMock(return_value=MagicMock(binary="/usr/bin/ffmpeg")),
        ),
        patch("custom_components.kustos_vision.recorder.create_subprocess_exec", _spawn),
    ):
        yield processes


@pytest.fixture
async def loaded(
    hass: HomeAssistant, hass_storage: dict, tmp_path: Path, recording_env
):
    base = tmp_path / "recordings"
    hass_storage[STORAGE_KEY_CONFIG] = stored_config(base)
    entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    yield entry
    if entry.state is ConfigEntryState.LOADED:
        await hass.config_entries.async_unload(entry.entry_id)
        await hass.async_block_till_done()


async def test_a_configured_camera_starts_recording(
    hass: HomeAssistant, loaded: MockConfigEntry, spawned: list[list[str]]
) -> None:
    assert len(spawned) == 1


async def test_the_resolved_url_is_what_gets_recorded(
    hass: HomeAssistant, loaded: MockConfigEntry, spawned: list[list[str]]
) -> None:
    """Credentials come from whichever integration owns the camera entity, so
    the user never types a password into kustos_vision."""
    assert STREAM_URL in spawned[0]


async def test_the_recording_never_decodes_video(
    hass: HomeAssistant, loaded: MockConfigEntry, spawned: list[list[str]]
) -> None:
    """The whole cost argument for kustos_vision rests on this."""
    args = spawned[0]
    assert args[args.index("-c:v") + 1] == "copy"


async def test_the_output_goes_to_the_configured_location(
    hass: HomeAssistant, loaded: MockConfigEntry, spawned: list[list[str]], tmp_path: Path
) -> None:
    target = spawned[0][-1]
    assert target.startswith(str(tmp_path / "recordings" / "beispiel"))
    assert target.endswith("%H-%M-%S_hd.mp4")


async def test_the_day_directories_exist_before_ffmpeg_needs_them(
    hass: HomeAssistant, loaded: MockConfigEntry, tmp_path: Path
) -> None:
    """The segment muxer has no strftime_mkdir and aborts on a missing
    directory, so today and tomorrow have to be there up front."""
    days = sorted(p.name for p in (tmp_path / "recordings" / "beispiel").iterdir())
    assert len(days) == 2


async def test_camera_entities_appear(
    hass: HomeAssistant, loaded: MockConfigEntry
) -> None:
    assert hass.states.async_entity_ids("binary_sensor")
    assert hass.states.async_entity_ids("switch")


async def test_the_recording_sensor_follows_the_process(
    hass: HomeAssistant, loaded: MockConfigEntry
) -> None:
    entity_id = hass.states.async_entity_ids("binary_sensor")[0]
    assert hass.states.get(entity_id).state == "on"


async def test_unload_stops_every_process(
    hass: HomeAssistant, loaded: MockConfigEntry, recording_env
) -> None:
    """A left-behind ffmpeg would keep writing into files nothing tracks."""
    assert await hass.config_entries.async_unload(loaded.entry_id)
    await hass.async_block_till_done()
    assert all(p.terminated for p in recording_env)
    assert not any(p.killed for p in recording_env)


async def test_pausing_a_camera_stops_its_recording(
    hass: HomeAssistant, loaded: MockConfigEntry, recording_env
) -> None:
    switch_id = hass.states.async_entity_ids("switch")[0]
    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": switch_id}, blocking=True
    )
    await hass.async_block_till_done()

    assert all(p.terminated for p in recording_env)
    assert hass.states.get(switch_id).state == "off"


async def test_resuming_a_camera_starts_it_again(
    hass: HomeAssistant, loaded: MockConfigEntry, spawned: list[list[str]]
) -> None:
    switch_id = hass.states.async_entity_ids("switch")[0]
    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": switch_id}, blocking=True
    )
    await hass.async_block_till_done()
    await hass.services.async_call(
        "switch", "turn_on", {"entity_id": switch_id}, blocking=True
    )
    await hass.async_block_till_done()
    await asyncio.sleep(0)
    await hass.async_block_till_done()

    assert len(spawned) == 2
    assert hass.states.get(switch_id).state == "on"


async def test_a_stream_without_a_url_is_skipped_not_fatal(
    hass: HomeAssistant, hass_storage: dict, tmp_path: Path, spawned: list[list[str]]
) -> None:
    """Some camera integrations expose no stream source. That camera cannot be
    recorded, but it must not stop the others or fail setup."""
    base = tmp_path / "recordings"
    hass_storage[STORAGE_KEY_CONFIG] = stored_config(base)
    entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
    entry.add_to_hass(hass)

    with (
        patch(
            "custom_components.kustos_vision.recorder.async_get_stream_source",
            AsyncMock(return_value=None),
        ),
        patch(
            "custom_components.kustos_vision.recorder.get_ffmpeg_manager",
            MagicMock(return_value=MagicMock(binary="/usr/bin/ffmpeg")),
        ),
        patch(
            "custom_components.kustos_vision.maintenance.get_ffmpeg_manager",
            MagicMock(return_value=MagicMock(binary="/usr/bin/ffmpeg")),
        ),
    ):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

    assert spawned == []
    assert hass.states.async_entity_ids("binary_sensor")
    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()


async def test_a_disabled_camera_is_not_recorded(
    hass: HomeAssistant, hass_storage: dict, tmp_path: Path, recording_env,
    spawned: list[list[str]],
) -> None:
    base = tmp_path / "recordings"
    hass_storage[STORAGE_KEY_CONFIG] = stored_config(base, enabled=False)
    entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert spawned == []
    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()


async def test_moving_the_storage_location_restarts_the_recording(
    hass: HomeAssistant, loaded: MockConfigEntry, spawned: list[list[str]], tmp_path: Path
) -> None:
    """Regression: the storage path is not part of the stream spec, so
    reconciliation saw an unchanged spec and left the running ffmpeg writing
    into the previous location."""
    coordinator = loaded.runtime_data
    target = tmp_path / "moved"
    target.mkdir()

    await coordinator.async_set_config(
        coordinator.config.with_storage(
            type(coordinator.config.storage)(
                base_path=str(target),
                segment_seconds=coordinator.config.storage.segment_seconds,
            )
        )
    )
    await hass.async_block_till_done()
    await asyncio.sleep(0)
    await hass.async_block_till_done()

    assert len(spawned) == 2, "ffmpeg was not restarted for the new location"
    assert spawned[1][-1].startswith(str(target))


# ----------------------------------------------------------------------
# A camera whose integration has not loaded yet
# ----------------------------------------------------------------------
#
# At Home Assistant startup this is the normal case, not a corner: custom
# integrations load in no particular order, so the camera entity regularly
# does not exist yet when recording begins. These streams used to be dropped
# with no retry at all, and a restart left the house unrecorded until
# something else happened to reapply the configuration. Measured live as a
# twenty-minute hole after an update.


@pytest.fixture
def flaky_camera_env(spawned: list[list[str]]):
    """A stream source that is absent first and appears later."""
    resolver = AsyncMock(side_effect=Exception("Camera not found"))

    async def _spawn(program, *args, **kwargs):
        spawned.append([program, *args])
        return FakeProcess()

    with (
        patch(
            "custom_components.kustos_vision.recorder.async_get_stream_source",
            resolver,
        ),
        patch(
            "custom_components.kustos_vision.recorder.get_ffmpeg_manager",
            MagicMock(return_value=MagicMock(binary="/usr/bin/ffmpeg")),
        ),
        patch(
            "custom_components.kustos_vision.maintenance.get_ffmpeg_manager",
            MagicMock(return_value=MagicMock(binary="/usr/bin/ffmpeg")),
        ),
        patch(
            "custom_components.kustos_vision.recorder.create_subprocess_exec", _spawn
        ),
    ):
        yield resolver


async def test_an_unavailable_camera_is_not_dropped(
    hass: HomeAssistant,
    hass_storage: dict,
    tmp_path: Path,
    flaky_camera_env,
    spawned: list[list[str]],
) -> None:
    """The stream stays visible as waiting instead of vanishing."""
    hass_storage[STORAGE_KEY_CONFIG] = stored_config(tmp_path / "recordings")
    entry = MockConfigEntry(
        domain=DOMAIN, data={CONF_BASE_PATH: str(tmp_path / "recordings")}
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert spawned == []
    statuses = entry.runtime_data.recorder.statuses
    assert "beispiel/hd" in statuses
    assert statuses["beispiel/hd"].running is False
    assert "noch nicht verfügbar" in statuses["beispiel/hd"].last_error


async def test_recording_starts_the_moment_the_camera_appears(
    hass: HomeAssistant,
    hass_storage: dict,
    tmp_path: Path,
    flaky_camera_env,
    spawned: list[list[str]],
) -> None:
    """The camera integration finishing its setup is the trigger, not luck."""
    hass_storage[STORAGE_KEY_CONFIG] = stored_config(tmp_path / "recordings")
    entry = MockConfigEntry(
        domain=DOMAIN, data={CONF_BASE_PATH: str(tmp_path / "recordings")}
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert spawned == []

    # The camera integration comes up: the entity gets its first state.
    flaky_camera_env.side_effect = None
    flaky_camera_env.return_value = STREAM_URL
    hass.states.async_set("camera.beispiel_hd", "idle")
    await hass.async_block_till_done()

    assert len(spawned) == 1
    assert STREAM_URL in spawned[0]
    statuses = entry.runtime_data.recorder.statuses
    assert statuses["beispiel/hd"].last_error is None


async def test_the_update_cycle_is_the_safety_net(
    hass: HomeAssistant,
    hass_storage: dict,
    tmp_path: Path,
    flaky_camera_env,
    spawned: list[list[str]],
) -> None:
    """A source that never announces itself still gets retried every cycle."""
    hass_storage[STORAGE_KEY_CONFIG] = stored_config(tmp_path / "recordings")
    entry = MockConfigEntry(
        domain=DOMAIN, data={CONF_BASE_PATH: str(tmp_path / "recordings")}
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert spawned == []

    flaky_camera_env.side_effect = None
    flaky_camera_env.return_value = STREAM_URL
    await entry.runtime_data.recorder.async_retry_unresolved()
    await hass.async_block_till_done()

    assert len(spawned) == 1
