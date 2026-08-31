"""Reconnecting the Supervisor mount behind the recording location.

Exists because of a measured HAOS behaviour: network mounts are attempted
exactly once at boot. When the Pi loses the race against its own network
coming up, the Supervisor covers the mount point with an empty read-only
placeholder and waits for a manual reload; there is no automatic retry. The
panel's storage banner offers that reload as a button, so fixing it does not
require knowing where in the settings the reload lives.

Everything here degrades to "not available": installations without a
Supervisor, or recording locations that are not Supervisor mounts, simply get
no button.
"""

from __future__ import annotations

import logging
from collections.abc import Iterable
from pathlib import PurePosixPath

from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)


def mount_for_path(base_path: str, mounts: Iterable[tuple[str, str]]) -> str | None:
    """The name of the mount a path lives on, or None.

    Matched against each mount's own reported path rather than by parsing
    /media/<name> out of the string: the Supervisor knows where it mounted
    things, and guessing the layout would break the day it changes.
    """
    base = PurePosixPath(base_path)
    best: tuple[int, str] | None = None
    for name, user_path in mounts:
        if not user_path:
            continue
        mount_path = PurePosixPath(user_path)
        if base == mount_path or mount_path in base.parents:
            depth = len(mount_path.parts)
            if best is None or depth > best[0]:
                best = (depth, name)
    return best[1] if best else None


async def async_reconnectable_mount(hass: HomeAssistant, base_path: str) -> str | None:
    """The Supervisor mount the recording location lives on, if any."""
    from homeassistant.helpers.hassio import is_hassio

    if not is_hassio(hass):
        return None
    try:
        from homeassistant.components.hassio import get_supervisor_client

        info = await get_supervisor_client(hass).mounts.info()
    except Exception as err:
        _LOGGER.debug("kustos_vision: could not list supervisor mounts: %s", err)
        return None
    return mount_for_path(
        base_path,
        [(mount.name, str(mount.user_path or "")) for mount in info.mounts],
    )


async def async_reload_mount(hass: HomeAssistant, name: str) -> None:
    """Ask the Supervisor to reconnect one mount. Raises on failure."""
    from homeassistant.components.hassio import get_supervisor_client

    await get_supervisor_client(hass).mounts.reload_mount(name)
