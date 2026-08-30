"""Sidebar panel registration.

The panel is a pure projection of the websocket API: removing this module and
the built front-end must never cost functionality. That is a hard acceptance
criterion, tested rather than assumed, and it is what keeps the logic
verifiable without a browser.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

from homeassistant.components import panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

from .const import DOMAIN

FRONTEND_DIR = Path(__file__).parent / "frontend" / "dist"
PANEL_URL_PATH = DOMAIN

# Length of the cache key taken from the bundle hash. Long enough that two
# different bundles cannot collide in practice, short enough to keep the URL
# readable in the network tab.
FINGERPRINT_LENGTH = 12


def bundle_fingerprint() -> str:
    """A cache key derived from the bundle itself.

    It used to be the integration version, which is wrong in both directions:
    the version does not change when the panel is rebuilt during development,
    so browsers kept serving a stale bundle from cache, and it does change on
    releases that do not touch the front end at all. Hashing the file ties the
    key to what is actually being served. Reading a hundred kilobytes once at
    startup costs nothing.
    """
    bundle = FRONTEND_DIR / "panel.js"
    try:
        digest = hashlib.sha256(bundle.read_bytes()).hexdigest()
    except OSError:
        # No bundle to fingerprint. Registration still happens so the panel can
        # say what is wrong rather than vanishing from the sidebar.
        return "missing"
    return digest[:FINGERPRINT_LENGTH]


async def async_register_panel(hass: HomeAssistant) -> None:
    """Register the built front-end and the sidebar entry, once per run."""
    fingerprint = await hass.async_add_executor_job(bundle_fingerprint)

    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                f"/{DOMAIN}-frontend",
                str(FRONTEND_DIR),
                # Deliberately no far-future caching, even though the URL
                # carries a fingerprint. The fingerprint is computed when the
                # panel is registered, which happens once at startup: after an
                # update through HACS the file on disk is new while the
                # registered URL still names the old hash, so a hard-cached
                # browser keeps serving the previous panel until Home Assistant
                # is restarted. Without the far-future header the browser
                # revalidates instead, which for a bundle this size costs one
                # conditional request and always shows what is actually there.
                cache_headers=False,
            )
        ]
    )
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name="kustos-vision-panel",
        frontend_url_path=PANEL_URL_PATH,
        module_url=f"/{DOMAIN}-frontend/panel.js?v={fingerprint}",
        sidebar_title="Kustos Vision",
        sidebar_icon="mdi:cctv",
        # Recording configuration decides what is captured and kept, and the
        # live view shows every camera in the house.
        require_admin=True,
    )
