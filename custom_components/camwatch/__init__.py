"""camwatch: recording, viewing and understanding camera streams.

Three things in one integration, none of which needs another integration or a
front-end card from anywhere else:

* **Recording.** ffmpeg remuxes the RTSP packets straight into MP4 segments.
  No frame is ever decoded, which is what makes continuous recording cost a few
  percent of one core instead of whole cores.
* **Viewing.** A sidebar panel built on Home Assistant's own camera APIs.
* **Understanding.** Snapshots handed to an LLM of the user's choosing, which
  feeds sensors the user defined.

Milestone 1 covers recording and the state around it.
"""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_STOP, Platform
from homeassistant.core import Event, HomeAssistant
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.typing import ConfigType

from . import api
from .const import CONF_BASE_PATH, DOMAIN, INDEX_DB_NAME, LOCAL_STATE_DIR
from .coordinator import CamwatchCoordinator
from .core.config import ConfigError
from .core.index import SegmentIndex
from .http_views import async_register_views
from .panel import async_register_panel
from .services import async_register_services
from .storage import CamwatchStore

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.BINARY_SENSOR, Platform.SENSOR, Platform.SWITCH]

type CamwatchEntry = ConfigEntry[CamwatchCoordinator]


def _index_path(hass: HomeAssistant) -> Path:
    """Where the segment index lives.

    Deliberately beside the Home Assistant configuration and not beside the
    recordings: the recording target is frequently a network share, and SQLite
    file locking over SMB or NFS is unreliable. The index is rebuildable from
    the recordings at any time, so nothing is lost by keeping it local.
    """
    return Path(hass.config.path(LOCAL_STATE_DIR)) / INDEX_DB_NAME


def _prepare_storage(base: Path) -> None:
    """Make sure the recording location exists and can be written to."""
    base.mkdir(parents=True, exist_ok=True)
    probe = base / ".camwatch-write-test"
    try:
        probe.write_bytes(b"")
    finally:
        probe.unlink(missing_ok=True)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the websocket API and the panel, once per Home Assistant run.

    Both are independent of whether a config entry is loaded: the panel has to
    be able to say that camwatch is not set up yet, rather than not being there
    at all.
    """
    api.async_register(hass)
    async_register_services(hass)
    async_register_views(hass)
    await async_register_panel(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: CamwatchEntry) -> bool:
    """Set up camwatch from a config entry."""
    store = CamwatchStore(hass)
    try:
        config = await store.async_load(entry.data.get(CONF_BASE_PATH))
    except ConfigError as err:
        raise ConfigEntryNotReady(f"stored configuration is unusable: {err}") from err

    base = Path(config.storage.base_path)
    try:
        await hass.async_add_executor_job(_prepare_storage, base)
    except OSError as err:
        # Typically a network share that has not mounted yet, which is worth
        # retrying rather than failing setup outright.
        raise ConfigEntryNotReady(
            f"the recording location {base} is not writable: {err}"
        ) from err

    index = SegmentIndex(_index_path(hass))
    try:
        await hass.async_add_executor_job(index.initialise)
    except (OSError, RuntimeError) as err:
        raise ConfigEntryNotReady(f"the segment index could not be opened: {err}") from err

    # The per-camera devices point at this one through via_device, so it has to
    # exist before any of them is created. Letting a camera device create it
    # implicitly leaves a device with no name and logs a deprecation warning.
    dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={(DOMAIN, entry.entry_id)},
        name="camwatch",
        manufacturer="camwatch",
        entry_type=dr.DeviceEntryType.SERVICE,
    )

    coordinator = CamwatchCoordinator(hass, entry, config, index, store)
    entry.runtime_data = coordinator
    await coordinator.async_start()

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))

    async def _async_stop(_: Event) -> None:
        """Leave no ffmpeg behind when Home Assistant shuts down."""
        await coordinator.recorder.async_stop_all()

    entry.async_on_unload(
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, _async_stop)
    )
    return True


async def async_unload_entry(hass: HomeAssistant, entry: CamwatchEntry) -> bool:
    """Unload camwatch, stopping every recording."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        await entry.runtime_data.async_shutdown()
    return unloaded


async def _async_reload_entry(hass: HomeAssistant, entry: CamwatchEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)
