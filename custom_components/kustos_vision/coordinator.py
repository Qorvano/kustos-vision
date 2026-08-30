"""Holding everything together: configuration, recording, housekeeping, state.

The housekeeping pass doubles as the update cycle. That keeps the two in step
by construction: whatever the last run indexed and deleted is exactly what the
entities and the panel then show, with no second schedule to drift against it.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from .const import DOMAIN
from .core.config import CamwatchConfig
from .core.index import SegmentIndex
from .maintenance import MaintenanceResult, MaintenanceRunner, interval_for
from .recorder import RecorderManager, StreamStatus
from .storage import CamwatchStore
from .vision_runner import VisionRunner

_LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class CameraState:
    """What the entities of one camera report."""

    slug: str
    name: str
    recording: bool
    wants_recording: bool
    """Whether any stream is meant to be recorded at all.

    Distinct from ``recording``, which says whether one is. A camera that is
    not supposed to record is not the same as one that is supposed to and
    cannot, and showing both as "not recording" makes a deliberate setting look
    like a fault.
    """
    paused: bool
    used_bytes: int
    oldest_start: datetime | None
    segments: int
    streams: tuple[StreamStatus, ...] = ()


@dataclass(frozen=True, slots=True)
class CamwatchData:
    """The state one housekeeping pass leaves behind."""

    cameras: dict[str, CameraState] = field(default_factory=dict)
    total_bytes: int = 0
    free_bytes: int | None = None
    maintenance: MaintenanceResult = field(default_factory=MaintenanceResult)

    @property
    def over_budget_bytes(self) -> int:
        return self.maintenance.shortfall_bytes


class CamwatchCoordinator(DataUpdateCoordinator[CamwatchData]):
    """Owns the configuration and everything that acts on it."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        config: CamwatchConfig,
        index: SegmentIndex,
        store: CamwatchStore,
    ) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=interval_for(config.storage.segment_seconds)),
        )
        self.entry = entry
        self.config = config
        self.index = index
        self.store = store
        self.recorder = RecorderManager(hass, self._on_recorder_change)
        self.maintenance = MaintenanceRunner(hass, index)
        self.vision = VisionRunner(hass, self)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def async_start(self) -> None:
        """Begin recording, start watching triggers, run the first pass."""
        await self.recorder.async_apply(self.config.storage, self.config.cameras)
        self.vision.async_apply(self.config)
        await self.async_config_entry_first_refresh()

    async def async_shutdown(self) -> None:
        """Stop recording and stop watching. Called on unload and on stop."""
        self.vision.async_stop()
        await self.recorder.async_stop_all()
        await super().async_shutdown()

    # ------------------------------------------------------------------
    # Configuration changes, driven by the panel
    # ------------------------------------------------------------------

    async def async_set_config(self, config: CamwatchConfig) -> None:
        """Persist a new configuration and make the world match it."""
        previous = self.config
        await self.store.async_save(config)
        self.config = config

        if config.storage.segment_seconds != previous.storage.segment_seconds:
            self.update_interval = timedelta(
                seconds=interval_for(config.storage.segment_seconds)
            )

        await self.recorder.async_apply(config.storage, config.cameras)
        self.vision.async_apply(config)
        await self.async_request_refresh()

    async def async_set_paused(self, camera_slug: str, paused: bool) -> None:
        """Pause or resume one camera without touching its configuration."""
        await self.recorder.async_set_paused(camera_slug, paused)
        await self.recorder.async_apply(self.config.storage, self.config.cameras)
        await self.async_request_refresh()

    # ------------------------------------------------------------------
    # The update cycle
    # ------------------------------------------------------------------

    async def _async_update_data(self) -> CamwatchData:
        created = await self.recorder.async_ensure_directories(self.config.cameras)
        result = await self.maintenance.async_run(self.config, created)
        return await self._async_build_state(result)

    async def _async_build_state(self, result: MaintenanceResult) -> CamwatchData:
        by_camera = await self.hass.async_add_executor_job(self.index.bytes_by_camera)
        statuses = self.recorder.statuses

        cameras: dict[str, CameraState] = {}
        for camera in self.config.cameras:
            oldest = await self.hass.async_add_executor_job(
                self.index.oldest_start, camera.slug
            )
            streams = tuple(
                status
                for key, status in statuses.items()
                if key.startswith(f"{camera.slug}/")
            )
            cameras[camera.slug] = CameraState(
                slug=camera.slug,
                name=camera.name,
                recording=any(s.running for s in streams),
                wants_recording=bool(camera.recorded_streams),
                paused=self.recorder.is_paused(camera.slug),
                used_bytes=by_camera.get(camera.slug, 0),
                oldest_start=(
                    datetime.fromtimestamp(oldest, tz=UTC)
                    if oldest is not None
                    else None
                ),
                segments=0,
                streams=streams,
            )

        free = await self.hass.async_add_executor_job(
            _free_bytes, Path(self.config.storage.base_path)
        )
        return CamwatchData(
            cameras=cameras,
            total_bytes=sum(by_camera.values()),
            free_bytes=free,
            maintenance=result,
        )

    @callback
    def _on_recorder_change(self) -> None:
        """A process started or died; show it without waiting for the cycle."""
        if self.data is None:
            return
        self.hass.async_create_task(self.async_request_refresh())


def _free_bytes(path: Path) -> int | None:
    """Free space at the recording location, or None when it cannot be read."""
    import shutil

    try:
        return shutil.disk_usage(path).free
    except OSError:
        return None
