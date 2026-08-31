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
from .core.paths import prepare_storage
from .maintenance import MaintenanceResult, MaintenanceRunner, interval_for
from .recorder import RecorderManager, StreamStatus
from .storage import CamwatchStore
from .supervisor_mount import async_reconnectable_mount
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
        # Why the recording location cannot be used right now, or None. The
        # location is probed every cycle rather than once at setup: the one
        # place it can be changed is the panel, and the panel only exists
        # while the integration is loaded, so an unavailable path must never
        # keep the integration down. Measured live: a network share that
        # failed to mount after a crash left a read-only placeholder, and
        # setup-retry locked the user out of their own settings.
        self.storage_error: str | None = None
        self._storage_ready = False
        # The Supervisor mount the recording location lives on, resolved only
        # while the location is broken; None hides the reconnect button.
        self.reconnect_mount: str | None = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def async_start(self) -> None:
        """Start watching triggers and run the first pass.

        Recording is not started here but by the first update cycle, through
        the same not-ready-to-ready transition that later brings it back when
        a vanished recording location reappears. One code path for both.
        """
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

        # The panel validated the new location before this was called, so the
        # next cycle's probe is expected to agree; setting the state directly
        # spares the panel from showing a stale warning until then.
        self.storage_error = None
        self._storage_ready = True

        if config.storage.segment_seconds != previous.storage.segment_seconds:
            self.update_interval = timedelta(
                seconds=interval_for(config.storage.segment_seconds)
            )

        await self.recorder.async_apply(config.storage, config.cameras)
        self.vision.async_apply(config)
        await self.async_publish_state()

    async def async_set_paused(self, camera_slug: str, paused: bool) -> None:
        """Pause or resume one camera without touching its configuration."""
        await self.recorder.async_set_paused(camera_slug, paused)
        await self.recorder.async_apply(self.config.storage, self.config.cameras)
        await self.async_publish_state()

    async def async_publish_state(self) -> None:
        """Recompute and publish the state without running housekeeping.

        Needed because async_request_refresh is debounced by several seconds
        and does a full maintenance pass. A configuration change has to be
        visible at once: the panel reads the snapshot returned by the very call
        that changed something, and with a debounced refresh that snapshot
        still carried the state from before the change. Switching a camera to
        recording appeared to do nothing until the page was reloaded.

        Only index queries and the recorder's own status are read here, so it
        is cheap enough to run on every change.
        """
        self.async_set_updated_data(
            await self._async_build_state(self.maintenance.last_result)
        )

    # ------------------------------------------------------------------
    # The update cycle
    # ------------------------------------------------------------------

    async def _async_update_data(self) -> CamwatchData:
        await self._async_reconcile_storage()
        if self.storage_error is not None:
            # No directory creation, no housekeeping, no stream retries: every
            # one of them writes to the place that is gone. The state still
            # updates so the panel can say what is wrong.
            return await self._async_build_state(self.maintenance.last_result)

        # The safety net behind the state listener: a camera whose integration
        # never fires a state change still gets another chance every cycle.
        # Free when nothing is unresolved.
        await self.recorder.async_retry_unresolved()
        created = await self.recorder.async_ensure_directories(self.config.cameras)
        result = await self.maintenance.async_run(self.config, created)
        return await self._async_build_state(result)

    async def _async_reconcile_storage(self) -> None:
        """Probe the recording location and act on the transition.

        Ready to gone: recording stops, with the reason kept for the panel.
        Gone to ready: recording starts, which also covers the very first
        cycle after setup.
        """
        try:
            await self.hass.async_add_executor_job(
                prepare_storage, Path(self.config.storage.base_path)
            )
            self.storage_error = None
            self.reconnect_mount = None
        except OSError as err:
            self.storage_error = str(err)
            self.reconnect_mount = await async_reconnectable_mount(
                self.hass, self.config.storage.base_path
            )

        if self.storage_error is None and not self._storage_ready:
            self._storage_ready = True
            _LOGGER.info(
                "kustos_vision: recording location %s is available, starting",
                self.config.storage.base_path,
            )
            await self.recorder.async_apply(self.config.storage, self.config.cameras)
        elif self.storage_error is not None and self._storage_ready:
            self._storage_ready = False
            _LOGGER.warning(
                "kustos_vision: recording location became unavailable, "
                "recording pauses: %s",
                self.storage_error,
            )
            await self.recorder.async_stop_all()

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
        """A process started or died; show it without waiting for the cycle.

        Publishes directly rather than requesting a refresh, which is debounced
        and would leave a camera reading as stopped for seconds after it came
        back, and as running for seconds after it died.
        """
        if self.data is None:
            return
        self.hass.async_create_task(self.async_publish_state())


def _free_bytes(path: Path) -> int | None:
    """Free space at the recording location, or None when it cannot be read."""
    import shutil

    try:
        return shutil.disk_usage(path).free
    except OSError:
        return None
