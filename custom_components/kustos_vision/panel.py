"""Sidebar panel registration.

The panel is a pure projection of the websocket API: removing this module and
the built front-end must never cost functionality. That is a hard acceptance
criterion, tested rather than assumed, and it is what keeps the logic
verifiable without a browser.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

from aiohttp import web
from homeassistant.components import panel_custom
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import DOMAIN

FRONTEND_DIR = Path(__file__).parent / "frontend" / "dist"
PANEL_URL_PATH = DOMAIN
# Under /api on purpose. The Home Assistant front end runs a service worker
# that caches every same-origin path EXCEPT /api and /auth with a
# stale-while-revalidate strategy: it answers with the stored copy first and
# fetches the new one only for next time. Read from its source, not assumed.
# Any path outside /api therefore shows a freshly updated bundle one reload
# too late, no matter what cache headers the server sends, because the
# worker never asks the server before answering. /api is network-only.
FRONTEND_URL = f"/api/{DOMAIN}/frontend"

# Where the fingerprint that was actually registered is kept, so the panel can
# be told when the file on disk has moved on since then.
DATA_REGISTERED_FINGERPRINT = f"{DOMAIN}_registered_fingerprint"

# The fingerprint of the bundle as it currently lies on disk. Refreshed by the
# housekeeping pass, in the executor: hashing the bundle is file I/O, and a
# snapshot request runs in the event loop and must only compare, never read.
DATA_DISK_FINGERPRINT = f"{DOMAIN}_disk_fingerprint"

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


class FrontendView(HomeAssistantView):
    """Serve the built front-end so a browser always notices a new one.

    Home Assistant's own static handler offers two settings and neither is
    right here. With caching on it sends a month of far-future caching; with it
    off it sends no Cache-Control header at all, which sounds harmless but is
    not. A response carrying only ETag and Last-Modified lets the browser pick
    its own freshness by guesswork, so it may skip asking for minutes or hours
    at a time. That is what kept showing the previous panel after an update
    until somebody reloaded past the cache by hand.

    no-cache does not mean "do not store". It means "ask before using what you
    stored", and when nothing changed the answer is a 304 with no body at all.
    For a bundle this size that is a rounding error, and it is the only setting
    under which a change is visible without anyone having to know about
    caching.

    The module is fetched by a plain script tag, which cannot send an
    Authorization header, so this is reachable without authentication. That is
    no change: static paths are served the same way, as is Home Assistant's own
    front end.
    """

    url = FRONTEND_URL + "/{filename:.*}"
    name = f"{DOMAIN}:frontend"
    requires_auth = False

    async def get(self, request: web.Request, filename: str) -> web.StreamResponse:
        candidate = Path(filename)
        if candidate.is_absolute() or ".." in candidate.parts:
            return web.Response(status=404)
        target = FRONTEND_DIR / candidate
        # resolve() also settles any symlink, so nothing outside the built
        # front-end can be reached through one.
        if not target.resolve().is_relative_to(FRONTEND_DIR.resolve()):
            return web.Response(status=404)
        if not target.is_file():
            return web.Response(status=404)
        return web.FileResponse(target, headers={"Cache-Control": "no-cache"})


def registered_fingerprint(hass: HomeAssistant) -> str | None:
    """The fingerprint the sidebar entry was registered with, if any."""
    return hass.data.get(DATA_REGISTERED_FINGERPRINT)


def disk_fingerprint(hass: HomeAssistant) -> str | None:
    """The last known fingerprint of the bundle on disk."""
    return hass.data.get(DATA_DISK_FINGERPRINT)


def store_disk_fingerprint(hass: HomeAssistant, fingerprint: str) -> None:
    """Record what the housekeeping pass hashed, from the event loop."""
    hass.data[DATA_DISK_FINGERPRINT] = fingerprint


async def async_register_panel(hass: HomeAssistant) -> None:
    """Register the built front-end and the sidebar entry, once per run."""
    fingerprint = await hass.async_add_executor_job(bundle_fingerprint)
    # Kept so the panel can say when the bundle on disk has moved on since
    # this ran. Registration happens once per Home Assistant run, so after an
    # update through HACS the address still names the previous bundle until
    # Home Assistant is restarted, and nothing else would ever mention it.
    hass.data[DATA_REGISTERED_FINGERPRINT] = fingerprint
    hass.data[DATA_DISK_FINGERPRINT] = fingerprint

    hass.http.register_view(FrontendView())
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name="kustos-vision-panel",
        frontend_url_path=PANEL_URL_PATH,
        module_url=f"{FRONTEND_URL}/panel.js?v={fingerprint}",
        sidebar_title="Kustos Vision",
        sidebar_icon="mdi:cctv",
        # Recording configuration decides what is captured and kept, and the
        # live view shows every camera in the house.
        require_admin=True,
    )
