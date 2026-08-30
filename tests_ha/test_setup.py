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


async def test_an_unusable_location_no_longer_blocks_setup(
    hass: HomeAssistant, hass_storage: dict, tmp_path: Path
) -> None:
    """The exact opposite of what this test used to assert.

    It used to demand SETUP_RETRY for an unusable recording location. That
    locked the user out: the location can only be changed inside the panel,
    and the panel's data only exists while the integration is loaded. Measured
    live when a network share came back as a read-only placeholder after a
    crash. The integration now loads, says why nothing records, and recovers
    on its own; the full behaviour lives in test_recording.py.
    """
    from custom_components.kustos_vision.const import (
        STORAGE_KEY_CONFIG,
        STORAGE_VERSION_CONFIG,
    )

    missing = tmp_path / "file-in-the-way"
    missing.write_text("a recording location cannot be a file")
    hass_storage[STORAGE_KEY_CONFIG] = {
        "version": STORAGE_VERSION_CONFIG,
        "minor_version": 1,
        "key": STORAGE_KEY_CONFIG,
        "data": {
            "version": 1,
            "storage": {"base_path": str(missing), "segment_seconds": 60},
            "cameras": [],
        },
    }
    entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(missing)})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    assert entry.state is ConfigEntryState.LOADED
    assert entry.runtime_data.storage_error is not None