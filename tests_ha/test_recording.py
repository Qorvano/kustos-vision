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


# ----------------------------------------------------------------------
# A recording location that is gone
# ----------------------------------------------------------------------
#
# The location can only be changed inside the panel, and the panel only
# exists while the integration is loaded. Refusing to load over an
# unavailable path therefore locked the one door that leads to fixing it,
# measured live when a network share came back as a read-only placeholder
# after a crash and the integration sat in setup-retry.


async def test_a_readonly_location_does_not_keep_the_integration_down(
    hass: HomeAssistant,
    hass_storage: dict,
    tmp_path: Path,
    recording_env,
    spawned: list[list[str]],
) -> None:
    import os

    base = tmp_path / "recordings"
    base.mkdir()
    os.chmod(base, 0o555)
    try:
        hass_storage[STORAGE_KEY_CONFIG] = stored_config(base)
        entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
        entry.add_to_hass(hass)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

        assert entry.state is ConfigEntryState.LOADED
        assert spawned == []
        assert entry.runtime_data.storage_error is not None
        assert "read-only" in entry.runtime_data.storage_error.lower() or "denied" in entry.runtime_data.storage_error.lower()
    finally:
        os.chmod(base, 0o755)


async def test_recording_starts_when_the_location_returns(
    hass: HomeAssistant,
    hass_storage: dict,
    tmp_path: Path,
    recording_env,
    spawned: list[list[str]],
) -> None:
    import os

    base = tmp_path / "recordings"
    base.mkdir()
    os.chmod(base, 0o555)
    try:
        hass_storage[STORAGE_KEY_CONFIG] = stored_config(base)
        entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
        entry.add_to_hass(hass)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        assert spawned == []
    finally:
        os.chmod(base, 0o755)

    # The share is back; the next cycle notices and recording starts.
    await entry.runtime_data.async_refresh()
    await hass.async_block_till_done()
    assert len(spawned) == 1
    assert entry.runtime_data.storage_error is None


async def test_a_vanishing_location_pauses_recording_with_a_reason(
    hass: HomeAssistant, loaded, recording_env, spawned: list[list[str]]
) -> None:
    import os

    coordinator = loaded.runtime_data
    assert len(spawned) == 1
    base = Path(coordinator.config.storage.base_path)
    os.chmod(base, 0o555)
    try:
        await coordinator.async_refresh()
        await hass.async_block_till_done()
        assert coordinator.storage_error is not None
        assert recording_env[0].terminated or recording_env[0].killed
    finally:
        os.chmod(base, 0o755)


async def test_stopping_a_stream_is_not_an_error(
    hass: HomeAssistant,
    hass_storage: dict,
    tmp_path: Path,
    spawned: list[list[str]],
    caplog,
) -> None:
    """Regression: async_stop nulls the shared process reference while the
    supervisor still sits in the stderr drain. Waking up into
    self._process.wait() dereferenced None and logged "failed unexpectedly"
    three times for a perfectly ordinary pause, seen live during a storage
    migration. The drain here blocks until the process dies, which is exactly
    how a real ffmpeg behaves."""

    class SlowDrain(FakeProcess):
        def __init__(self) -> None:
            super().__init__()
            self.stderr.readline = self._readline

        async def _readline(self) -> bytes:
            await self._exit.wait()
            return b""

        async def wait(self) -> int:
            # One real suspension before the exit check. Without it the test
            # harness's eager tasks let async_stop's kill complete and cancel
            # the supervisor within a single loop step, and the race this test
            # exists for can never open; a real process wait always yields.
            await asyncio.sleep(0)
            return await super().wait()

    async def _spawn(program, *args, **kwargs):
        spawned.append([program, *args])
        return SlowDrain()

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
        patch(
            "custom_components.kustos_vision.recorder.create_subprocess_exec", _spawn
        ),
    ):
        base = tmp_path / "recordings"
        hass_storage[STORAGE_KEY_CONFIG] = stored_config(base)
        entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
        entry.add_to_hass(hass)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        assert len(spawned) == 1

        await entry.runtime_data.recorder.async_stop_all()
        await hass.async_block_till_done()

    assert "failed unexpectedly" not in caplog.text


# ----------------------------------------------------------------------
# The reconnect button behind the storage banner
# ----------------------------------------------------------------------


def test_the_mount_is_found_by_its_own_path() -> None:
    """Matched against what the Supervisor reports, not by parsing /media."""
    from custom_components.kustos_vision.supervisor_mount import mount_for_path

    mounts = [("backup", "/backup/x"), ("nas", "/media/nas"), ("other", "/share/o")]
    assert mount_for_path("/media/nas/Kameraaufnahmen", mounts) == "nas"
    assert mount_for_path("/media/nas", mounts) == "nas"
    assert mount_for_path("/media/elsewhere/clips", mounts) is None
    # The deepest matching mount wins when one is nested inside another.
    nested = [("outer", "/media"), ("inner", "/media/nas")]
    assert mount_for_path("/media/nas/x", nested) == "inner"


async def test_no_supervisor_means_no_button(
    hass: HomeAssistant, hass_storage: dict, tmp_path: Path, recording_env
) -> None:
    """The test harness has no Supervisor, which is exactly the Container and
    Core case: the flag stays off and nothing else changes."""
    import os

    base = tmp_path / "recordings"
    base.mkdir()
    os.chmod(base, 0o555)
    try:
        hass_storage[STORAGE_KEY_CONFIG] = stored_config(base)
        entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
        entry.add_to_hass(hass)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        assert entry.runtime_data.storage_error is not None
        assert entry.runtime_data.reconnect_mount is None
    finally:
        os.chmod(base, 0o755)


async def test_the_reconnect_command_reloads_and_reprobes(
    hass: HomeAssistant,
    hass_storage: dict,
    hass_ws_client,
    tmp_path: Path,
    recording_env,
    spawned: list[list[str]],
) -> None:
    """Reload the mount, probe at once, come back recording."""
    import os

    base = tmp_path / "recordings"
    base.mkdir()
    os.chmod(base, 0o555)
    try:
        hass_storage[STORAGE_KEY_CONFIG] = stored_config(base)
        entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
        entry.add_to_hass(hass)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        assert spawned == []
    finally:
        pass

    coordinator = entry.runtime_data
    coordinator.reconnect_mount = "nas"
    reloaded: list[str] = []

    async def _reload(hass_, name):
        # The reload is what makes the location writable again.
        reloaded.append(name)
        os.chmod(base, 0o755)

    client = await hass_ws_client(hass)
    with patch(
        "custom_components.kustos_vision.supervisor_mount.async_reload_mount",
        _reload,
    ):
        await client.send_json_auto_id({"type": f"{DOMAIN}/storage/reconnect"})
        result = await client.receive_json()

    assert result["success"], result
    assert reloaded == ["nas"]
    assert result["result"]["storage_error"] is None
    assert len(spawned) == 1  # die Aufzeichnung lief direkt wieder an


async def test_reconnect_without_a_mount_says_so(
    hass: HomeAssistant, hass_ws_client, loaded
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": f"{DOMAIN}/storage/reconnect"})
    result = await client.receive_json()
    assert not result["success"]
    assert result["error"]["code"] == "no_mount"


async def test_a_broken_location_reconnects_its_mount_by_itself(
    hass: HomeAssistant,
    hass_storage: dict,
    tmp_path: Path,
    recording_env,
    spawned: list[list[str]],
) -> None:
    """Regression for the boot race: the Supervisor mounts network shares
    exactly once at boot, before its own network is up after an unclean
    reboot, and never retries (measured live: mount.nfs failed with "Network
    is unreachable" five seconds into boot, and recording stayed down until
    a person clicked the banner). The first cycle that sees the broken
    location now reloads the mount itself and starts recording in the same
    cycle."""
    import os

    base = tmp_path / "recordings"
    base.mkdir()
    os.chmod(base, 0o555)
    reloaded: list[str] = []

    async def _reload(hass_, name):
        # The reload is what makes the location writable again.
        reloaded.append(name)
        os.chmod(base, 0o755)

    try:
        hass_storage[STORAGE_KEY_CONFIG] = stored_config(base)
        entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
        entry.add_to_hass(hass)
        with (
            patch(
                "custom_components.kustos_vision.coordinator."
                "async_reconnectable_mount",
                AsyncMock(return_value="nas"),
            ),
            patch(
                "custom_components.kustos_vision.supervisor_mount."
                "async_reload_mount",
                _reload,
            ),
        ):
            assert await hass.config_entries.async_setup(entry.entry_id)
            await hass.async_block_till_done()
    finally:
        os.chmod(base, 0o755)

    assert reloaded == ["nas"]
    assert entry.runtime_data.storage_error is None
    assert len(spawned) == 1  # die Aufzeichnung lief im selben Zyklus an


async def test_auto_reconnect_backs_off_while_the_share_stays_gone(
    hass: HomeAssistant,
    hass_storage: dict,
    tmp_path: Path,
    recording_env,
    spawned: list[list[str]],
) -> None:
    """A share that is genuinely off is not asked to mount on every cycle:
    attempts run on cycles 1 and 2, then double their spacing."""
    import os

    base = tmp_path / "recordings"
    base.mkdir()
    os.chmod(base, 0o555)
    attempts: list[str] = []

    async def _reload(hass_, name):
        attempts.append(name)
        raise OSError("still unreachable")

    try:
        hass_storage[STORAGE_KEY_CONFIG] = stored_config(base)
        entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
        entry.add_to_hass(hass)
        with (
            patch(
                "custom_components.kustos_vision.coordinator."
                "async_reconnectable_mount",
                AsyncMock(return_value="nas"),
            ),
            patch(
                "custom_components.kustos_vision.supervisor_mount."
                "async_reload_mount",
                _reload,
            ),
        ):
            assert await hass.config_entries.async_setup(entry.entry_id)
            await hass.async_block_till_done()
            assert len(attempts) == 1  # Zyklus 1 versucht sofort
            coordinator = entry.runtime_data
            await coordinator.async_refresh()
            assert len(attempts) == 2  # Zyklus 2 direkt hinterher
            await coordinator.async_refresh()
            assert len(attempts) == 2  # Zyklus 3 setzt aus
            await coordinator.async_refresh()
            assert len(attempts) == 3  # Zyklus 4 versucht wieder
    finally:
        os.chmod(base, 0o755)
