"""Persisting the configuration.

The model and its serialisation live in ``core.config``; this only owns the
Home Assistant store that holds the resulting dictionary, plus the defaults a
fresh installation starts from.
"""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DEFAULT_DIR_NAME, STORAGE_KEY_CONFIG, STORAGE_VERSION_CONFIG
from .core.config import CamwatchConfig, ConfigError, StorageConfig

_LOGGER = logging.getLogger(__name__)


def default_base_path(hass: HomeAssistant) -> Path:
    """Where recordings go when the user has not chosen somewhere else.

    The media root is the natural default: it is the one directory every kind
    of Home Assistant installation has, it is writable, and a user who mounts a
    network share for recordings almost always mounts it there. Putting
    recordings inside it also makes them show up in the media browser, which is
    a free extra rather than something kustos_vision depends on.
    """
    media_dirs = hass.config.media_dirs
    root = media_dirs.get("local") or next(iter(media_dirs.values()), None)
    if root is None:
        root = hass.config.path("media")
    return Path(root) / DEFAULT_DIR_NAME


def default_config(hass: HomeAssistant, base_path: str | None = None) -> CamwatchConfig:
    """The configuration a fresh installation starts with: a storage location
    and no cameras, because cameras are added in the panel."""
    return CamwatchConfig(
        storage=StorageConfig(base_path=base_path or str(default_base_path(hass)))
    )


class CamwatchStore:
    """Loads and saves the configuration."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store: Store[dict] = Store(
            hass, STORAGE_VERSION_CONFIG, STORAGE_KEY_CONFIG
        )

    async def async_load(self, base_path: str | None = None) -> CamwatchConfig:
        """Return the stored configuration, or a fresh default.

        A stored configuration that cannot be read is never silently replaced:
        that would throw away every camera the user set up. The error is raised
        so setup fails visibly and the file stays untouched.
        """
        data = await self._store.async_load()
        if not data:
            return default_config(self._hass, base_path)
        try:
            return CamwatchConfig.from_dict(data)
        except ConfigError:
            _LOGGER.error(
                "kustos_vision: the stored configuration could not be read; it has been "
                "left untouched so it can be recovered or corrected by hand"
            )
            raise

    async def async_save(self, config: CamwatchConfig) -> None:
        await self._store.async_save(config.as_dict())

    async def async_remove(self) -> None:
        await self._store.async_remove()
