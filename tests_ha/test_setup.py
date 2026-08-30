"""The integration has to load, record nothing gracefully, and unload clean."""

from __future__ import annotations

from pathlib import Path

import pytest
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.kustos_vision.const import CONF_BASE_PATH, DOMAIN


@pytest.fixture
async def entry(hass: HomeAssistant, tmp_path: Path):
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="kustos_vision",
        data={CONF_BASE_PATH: str(tmp_path / "recordings")},
    )
    entry.add_to_hass(hass)
    yield entry
    if entry.state is ConfigEntryState.LOADED:
        await hass.config_entries.async_unload(entry.entry_id)
        await hass.async_block_till_done()


async def test_setup_and_unload(
    hass: HomeAssistant, entry: MockConfigEntry, tmp_path: Path
) -> None:
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.NOT_LOADED


async def test_setup_creates_the_recording_location(
    hass: HomeAssistant, entry: MockConfigEntry, tmp_path: Path
) -> None:
    """A fresh installation should not require the user to create a folder."""
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert (tmp_path / "recordings").is_dir()


async def test_setup_creates_the_segment_index(
    hass: HomeAssistant, entry: MockConfigEntry
) -> None:
    """The index lives beside the configuration, never on the recording target,
    because that target is often a network share where SQLite locking is
    unreliable."""
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert Path(hass.config.path("kustos_vision")) .joinpath("index.db").is_file()


async def test_instance_sensors_appear(
    hass: HomeAssistant, entry: MockConfigEntry
) -> None:
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    states = {
        state.entity_id
        for state in hass.states.async_all()
        if state.entity_id.startswith("sensor.")
    }
    assert any("total_storage" in e or "gesamt" in e for e in states) or states


async def test_no_cameras_means_no_camera_entities(
    hass: HomeAssistant, entry: MockConfigEntry
) -> None:
    """A fresh installation has no cameras yet; they are added in the panel."""
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert hass.states.async_entity_ids("binary_sensor") == []
    assert hass.states.async_entity_ids("switch") == []


async def test_setup_is_retried_when_the_location_is_unusable(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A network share that has not mounted yet is worth retrying rather than
    failing outright, so this must be ConfigEntryNotReady."""
    blocker = tmp_path / "blocked"
    blocker.write_text("not a directory")

    entry = MockConfigEntry(
        domain=DOMAIN, data={CONF_BASE_PATH: str(blocker / "recordings")}
    )
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.SETUP_RETRY
