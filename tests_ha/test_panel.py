"""The panel registers, and the API stands on its own without it.

The second half is the acceptance criterion from the design: the panel is a
projection of the websocket API, so removing the built front-end must cost
presentation and not capability. Asserting it here keeps it true.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.components import frontend
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.kustos_vision import panel as panel_module
from custom_components.kustos_vision.const import (
    CONF_BASE_PATH,
    DOMAIN,
    STORAGE_KEY_CONFIG,
    STORAGE_VERSION_CONFIG,
)


@pytest.fixture
def no_ffmpeg():
    with (
        patch(
            "custom_components.kustos_vision.recorder.async_get_stream_source",
            AsyncMock(return_value=None),
        ),
        patch(
            "custom_components.kustos_vision.maintenance.get_ffmpeg_manager",
            MagicMock(return_value=MagicMock(binary="/usr/bin/ffmpeg")),
        ),
    ):
        yield


async def test_the_panel_appears_in_the_sidebar(hass: HomeAssistant) -> None:
    await async_setup_component(hass, DOMAIN, {})
    await hass.async_block_till_done()

    panels = hass.data[frontend.DATA_PANELS]
    assert DOMAIN in panels
    # The sidebar carries the product name, not the domain slug: the slug is an
    # identifier for entity ids and file paths, and showing it to the user
    # instead would be a bug that only ever surfaces by looking at the sidebar.
    assert panels[DOMAIN].sidebar_title == "Kustos Vision"


async def test_the_panel_requires_an_admin(hass: HomeAssistant) -> None:
    """It configures what gets recorded and shows every camera in the house."""
    await async_setup_component(hass, DOMAIN, {})
    await hass.async_block_till_done()
    assert hass.data[frontend.DATA_PANELS][DOMAIN].require_admin is True


async def test_the_panel_is_registered_before_any_camera_exists(
    hass: HomeAssistant,
) -> None:
    """A fresh installation has to be able to reach the settings, so the panel
    cannot depend on a config entry being loaded."""
    await async_setup_component(hass, DOMAIN, {})
    await hass.async_block_till_done()
    assert DOMAIN in hass.data[frontend.DATA_PANELS]
    assert hass.config_entries.async_entries(DOMAIN) == []


def test_the_front_end_bundle_is_committed() -> None:
    """HACS ships what is in the repository and never runs a build, so the
    built file has to be there."""
    bundle = panel_module.FRONTEND_DIR / "panel.js"
    assert bundle.is_file(), "frontend/dist/panel.js is missing; run the vite build"
    assert bundle.stat().st_size > 0


def test_the_bundle_defines_the_element_the_panel_asks_for() -> None:
    """A mismatch between the registered web component name and the one the
    bundle defines shows up as an empty page, with nothing in any log."""
    source = (panel_module.FRONTEND_DIR / "panel.js").read_text(encoding="utf-8")
    assert "kustos-vision-panel" in source


def test_the_bundle_is_self_contained() -> None:
    """Home Assistant loads exactly one module for a custom panel, and the
    viewer has no second file to fetch."""
    source = (panel_module.FRONTEND_DIR / "panel.js").read_text(encoding="utf-8")
    assert 'from"./' not in source
    assert "from './" not in source


async def test_everything_works_without_the_front_end(
    hass: HomeAssistant, hass_ws_client, hass_storage: dict, tmp_path: Path, no_ffmpeg
) -> None:
    """The acceptance criterion: with the built front-end gone, every command
    the panel would issue still works. Only the rendering is missing.
    """
    base = tmp_path / "recordings"
    hass_storage[STORAGE_KEY_CONFIG] = {
        "version": STORAGE_VERSION_CONFIG,
        "minor_version": 1,
        "key": STORAGE_KEY_CONFIG,
        "data": {
            "version": 1,
            "storage": {"base_path": str(base), "segment_seconds": 60},
            "cameras": [],
            "views": [],
        },
    }
    entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
    entry.add_to_hass(hass)

    with patch.object(panel_module, "FRONTEND_DIR", tmp_path / "does-not-exist"):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

        client = await hass_ws_client(hass)

        await client.send_json_auto_id({"type": f"{DOMAIN}/config/get"})
        assert (await client.receive_json())["success"]

        await client.send_json_auto_id(
            {
                "type": f"{DOMAIN}/camera/set",
                "slug": "hof",
                "name": "Hof",
                "streams": [{"key": "hd", "entity_id": "camera.hof"}],
            }
        )
        assert (await client.receive_json())["success"]

        await client.send_json_auto_id(
            {
                "type": f"{DOMAIN}/views/set",
                "views": [{"id": "aussen", "name": "Außen"}],
            }
        )
        assert (await client.receive_json())["success"]

        # Membership lives on the camera now, so putting one into a view is a
        # camera edit.
        await client.send_json_auto_id(
            {
                "type": f"{DOMAIN}/camera/set",
                "replace_existing": True,
                "slug": "hof",
                "name": "Hof",
                "streams": [{"key": "hd", "entity_id": "camera.hof"}],
                "view_settings": {"aussen": {"visible": True}},
            }
        )
        result = await client.receive_json()
        assert result["success"]
        assert result["result"]["views"][0]["cameras"] == ["hof"]

    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
