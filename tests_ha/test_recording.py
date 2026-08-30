"""Recording a configured camera: what gets started, and what gets stopped."""

from __future__ import annotations

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.camwatch.const import (
    CONF_BASE_PATH,
    DOMAIN,
    STORAGE_KEY_CONFIG,
    STORAGE_VERSION_CONFIG,
)

STREAM_URL = "rtsp://user:secret@camera.invalid:554/stream1"


def stored_config(base: Path, **camera_overrides) -> dict:
    camera = {
        "slug": "vorgarten",
        "name": "Vorgarten",
        "streams": [
            {"key": "hd", "entity_id": "camera.vorgarten_hd", "record": True}
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
            "custom_components.camwatch.recorder.async_get_stream_source",
            AsyncMock(return_value=STREAM_URL),
        ),
        patch(
            "custom_components.camwatch.recorder.get_ffmpeg_manager",
            MagicMock(return_value=MagicMock(binary="/usr/bin/ffmpeg")),
        ),
        patch(
            "custom_components.camwatch.maintenance.get_ffmpeg_manager",
            MagicMock(return_value=MagicMock(binary="/usr/bin/ffmpeg")),
        ),
        patch("custom_components.camwatch.recorder.create_subprocess_exec", _spawn),
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
    the user never types a password into camwatch."""
    assert STREAM_URL in spawned[0]


async def test_the_recording_never_decodes_video(
    hass: HomeAssistant, loaded: MockConfigEntry, spawned: list[list[str]]
) -> None:
    """The whole cost argument for camwatch rests on this."""
    args = spawned[0]
    assert args[args.index("-c:v") + 1] == "copy"


async def test_the_output_goes_to_the_configured_location(
    hass: HomeAssistant, loaded: MockConfigEntry, spawned: list[list[str]], tmp_path: Path
) -> None:
    target = spawned[0][-1]
    assert target.startswith(str(tmp_path / "recordings" / "vorgarten"))
    assert target.endswith("%H-%M-%S_hd.mp4")


async def test_the_day_directories_exist_before_ffmpeg_needs_them(
    hass: HomeAssistant, loaded: MockConfigEntry, tmp_path: Path
) -> None:
    """The segment muxer has no strftime_mkdir and aborts on a missing
    directory, so today and tomorrow have to be there up front."""
    days = sorted(p.name for p in (tmp_path / "recordings" / "vorgarten").iterdir())
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
            "custom_components.camwatch.recorder.async_get_stream_source",
            AsyncMock(return_value=None),
        ),
        patch(
            "custom_components.camwatch.recorder.get_ffmpeg_manager",
            MagicMock(return_value=MagicMock(binary="/usr/bin/ffmpeg")),
        ),
        patch(
            "custom_components.camwatch.maintenance.get_ffmpeg_manager",
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
