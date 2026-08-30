"""Sidebar panel registration.

The panel is a pure projection of the websocket API: removing this module and
the built front-end must never cost functionality. That is a hard acceptance
criterion, tested rather than assumed, and it is what keeps the logic
verifiable without a browser.
"""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration

from .const import DOMAIN

FRONTEND_DIR = Path(__file__).parent / "frontend" / "dist"
PANEL_URL_PATH = DOMAIN


async def async_register_panel(hass: HomeAssistant) -> None:
    """Register the built front-end and the sidebar entry, once per run."""
    integration = await async_get_integration(hass, DOMAIN)

    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                f"/{DOMAIN}-frontend",
                str(FRONTEND_DIR),
                # The version below busts the cache on every release, so the
                # files themselves may be cached hard.
                cache_headers=True,
            )
        ]
    )
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name="camwatch-panel",
        frontend_url_path=PANEL_URL_PATH,
        module_url=f"/{DOMAIN}-frontend/panel.js?v={integration.version}",
        sidebar_title="camwatch",
        sidebar_icon="mdi:cctv",
        # Recording configuration decides what is captured and kept, and the
        # live view shows every camera in the house.
        require_admin=True,
    )
