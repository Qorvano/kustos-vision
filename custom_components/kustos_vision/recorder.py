"""Running and supervising the ffmpeg processes.

One process per recorded stream, started with the arguments ``core.recorder``
builds and kept alive by a watchdog. A camera going away is the normal case,
not an error: cameras reboot on a schedule, lose their network, or get power
cycled, and the recording has to come back on its own every time.

The processes live in the Home Assistant process, so a Home Assistant restart
interrupts recording for as long as the restart takes. That is the accepted
cost of shipping a single artefact that installs on every kind of Home
Assistant installation rather than only on OS and Supervised.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from asyncio import create_subprocess_exec
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from homeassistant.components.camera import async_get_stream_source
from homeassistant.components.ffmpeg import get_ffmpeg_manager
from homeassistant.core import HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .core.config import CameraConfig, StorageConfig, StreamConfig
from .core.paths import ensure_day_dirs
from .core.recorder import StreamSpec, build_record_args

_LOGGER = logging.getLogger(__name__)

# A camera that reboots is back within about a minute, so the retry interval
# starts short to keep the gap small and grows only for a source that stays
# gone, where retrying every second would just fill the log.
INITIAL_BACKOFF_SECONDS = 1.0
BACKOFF_FACTOR = 2.0
MAX_BACKOFF_SECONDS = 60.0

# A process that has stayed up this long is considered healthy, so its next
# failure starts over at the short interval instead of inheriting the long one
# from an earlier outage.
HEALTHY_RUNTIME_SECONDS = 60.0

# How long ffmpeg gets to shut down on its own before it is killed. Segments
# are fragmented MP4 and are readable at any point, so there is nothing to
# finalise; this only covers the process winding down.
TERMINATE_TIMEOUT_SECONDS = 5.0

# ffmpeg messages kept per stream for the diagnostics view in the panel. Enough
# to see why a stream keeps dying, few enough to be bounded.
ERROR_LOG_LINES = 20


@dataclass(slots=True)
class StreamStatus:
    """What the panel and the entities show about one stream."""

    camera_slug: str
    stream_key: str
    running: bool = False
    enabled: bool = True
    started_at: float | None = None
    restarts: int = 0
    last_error: str | None = None
    recent_output: tuple[str, ...] = ()

    @property
    def stream_id(self) -> str:
        return f"{self.camera_slug}/{self.stream_key}"


class StreamProcess:
    """One ffmpeg process, restarted for as long as it is wanted."""

    def __init__(
        self,
        hass: HomeAssistant,
        spec: StreamSpec,
        base: Path,
        on_change: Callable[[], None],
    ) -> None:
        self._hass = hass
        self._spec = spec
        self._base = base
        self._on_change = on_change
        self._process: asyncio.subprocess.Process | None = None
        self._supervisor: asyncio.Task | None = None
        self._stopping = False
        self._output: deque[str] = deque(maxlen=ERROR_LOG_LINES)
        self.status = StreamStatus(spec.camera_slug, spec.stream_key)

    @property
    def spec(self) -> StreamSpec:
        return self._spec

    @property
    def base(self) -> Path:
        """Where this process is writing.

        Kept separate from the spec because it is not a property of the stream
        but of the installation, and compared alongside it when reconciling:
        a process whose spec is unchanged but whose target moved is still
        writing to the old place.
        """
        return self._base

    async def async_start(self) -> None:
        """Start supervising this stream. Returns once the loop is running."""
        if self._supervisor is not None:
            return
        self._supervisor = self._hass.async_create_background_task(
            self._supervise(), f"kustos_vision record {self._spec.stream_id}"
        )

    async def async_stop(self) -> None:
        """Stop supervising and shut the process down.

        The process is killed BEFORE the supervisor is cancelled, and the
        order is not interchangeable. Cancelling first runs the supervisor's
        cleanup, which clears the process reference, leaving nothing to kill
        and a real ffmpeg still running and still writing into files that
        nothing tracks any more. The stopping flag covers the other direction:
        it keeps the supervisor from treating the kill as a crash and starting
        a replacement.
        """
        self._stopping = True
        try:
            await self._async_kill()
            supervisor, self._supervisor = self._supervisor, None
            if supervisor is not None:
                supervisor.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await supervisor
            # A process that started while the cancellation was in flight
            # would otherwise survive its own supervisor.
            await self._async_kill()
        finally:
            self._stopping = False
        self.status.running = False
        self.status.started_at = None
        self._notify()

    async def _supervise(self) -> None:
        """Keep the process alive until cancelled."""
        backoff = INITIAL_BACKOFF_SECONDS
        while not self._stopping:
            started = self._hass.loop.time()
            try:
                await self._async_run_once()
            except asyncio.CancelledError:
                raise
            except Exception:
                _LOGGER.exception(
                    "kustos_vision: recording %s failed unexpectedly", self._spec.stream_id
                )

            # An exit we asked for is not a crash and must not be replaced.
            if self._stopping:
                return

            if self._hass.loop.time() - started >= HEALTHY_RUNTIME_SECONDS:
                backoff = INITIAL_BACKOFF_SECONDS

            self.status.running = False
            self.status.restarts += 1
            self._notify()

            await asyncio.sleep(backoff)
            backoff = min(backoff * BACKOFF_FACTOR, MAX_BACKOFF_SECONDS)

    async def _async_run_once(self) -> None:
        """Run ffmpeg until it exits, recording why if it failed."""
        if self._stopping:
            return
        # The segment muxer aborts when its target directory is missing, and it
        # has no strftime_mkdir of its own, so both sides of the next midnight
        # have to exist before it starts.
        await self._hass.async_add_executor_job(
            ensure_day_dirs, self._base, self._spec.camera_slug, dt_util.now().date()
        )

        binary = get_ffmpeg_manager(self._hass).binary
        args = build_record_args(self._spec, self._base)
        _LOGGER.debug("kustos_vision: starting %s", self._spec.stream_id)

        self._process = await create_subprocess_exec(
            binary,
            *args,
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        self.status.running = True
        self.status.started_at = self._hass.loop.time()
        self.status.last_error = None
        self._notify()

        try:
            await self._async_drain_stderr(self._process)
            code = await self._process.wait()
        finally:
            self._process = None

        self.status.recent_output = tuple(self._output)
        if code != 0:
            self.status.last_error = self._output[-1] if self._output else f"exit {code}"
            _LOGGER.warning(
                "kustos_vision: recording %s stopped (exit %s): %s",
                self._spec.stream_id,
                code,
                self.status.last_error,
            )

    async def _async_drain_stderr(self, process: asyncio.subprocess.Process) -> None:
        """Collect ffmpeg's messages so the panel can show why a stream died.

        Draining is not optional: ffmpeg blocks once the pipe buffer fills, so
        a stream nobody reads from eventually freezes the recording.
        """
        if process.stderr is None:
            return
        while line := await process.stderr.readline():
            text = line.decode("utf-8", errors="replace").strip()
            if text:
                self._output.append(text)

    async def _async_kill(self) -> None:
        """Ask the process to stop, then insist."""
        process, self._process = self._process, None
        if process is None or process.returncode is not None:
            return
        with contextlib.suppress(ProcessLookupError):
            process.terminate()
        try:
            await asyncio.wait_for(process.wait(), TERMINATE_TIMEOUT_SECONDS)
        except TimeoutError:
            _LOGGER.warning(
                "kustos_vision: %s did not stop in time, killing it", self._spec.stream_id
            )
            with contextlib.suppress(ProcessLookupError):
                process.kill()
            with contextlib.suppress(Exception):
                await process.wait()

    @callback
    def _notify(self) -> None:
        self.status.recent_output = tuple(self._output)
        self._on_change()


class RecorderManager:
    """Every recording process, reconciled against the configuration."""

    def __init__(self, hass: HomeAssistant, on_change: Callable[[], None]) -> None:
        self._hass = hass
        self._on_change = on_change
        self._streams: dict[str, StreamProcess] = {}
        self._base: Path | None = None
        self._paused: set[str] = set()

    @property
    def statuses(self) -> dict[str, StreamStatus]:
        return {key: proc.status for key, proc in self._streams.items()}

    def is_paused(self, camera_slug: str) -> bool:
        return camera_slug in self._paused

    async def async_set_paused(self, camera_slug: str, paused: bool) -> None:
        """Pause or resume one camera without changing its configuration."""
        if paused:
            self._paused.add(camera_slug)
        else:
            self._paused.discard(camera_slug)

    async def async_apply(
        self, storage: StorageConfig, cameras: tuple[CameraConfig, ...]
    ) -> None:
        """Make the running processes match the configuration.

        Streams whose arguments are unchanged keep running: reconfiguring one
        camera must not interrupt the recording of another.
        """
        self._base = Path(storage.base_path)
        wanted: dict[str, StreamSpec] = {}
        for camera in cameras:
            if self.is_paused(camera.slug):
                continue
            for stream in camera.recorded_streams:
                spec = await self._async_build_spec(camera, stream, storage)
                if spec is not None:
                    wanted[spec.stream_id] = spec

        for stream_id in set(self._streams) - set(wanted):
            await self._streams.pop(stream_id).async_stop()

        for stream_id, spec in wanted.items():
            existing = self._streams.get(stream_id)
            # Both have to match. Comparing only the spec would leave a running
            # ffmpeg writing into the previous location after the storage path
            # is changed, because the path is not part of the spec.
            if (
                existing is not None
                and existing.spec == spec
                and existing.base == self._base
            ):
                continue
            if existing is not None:
                await existing.async_stop()
            process = StreamProcess(self._hass, spec, self._base, self._on_change)
            self._streams[stream_id] = process
            await process.async_start()

        self._on_change()

    async def _async_build_spec(
        self, camera: CameraConfig, stream: StreamConfig, storage: StorageConfig
    ) -> StreamSpec | None:
        """Resolve a configured stream into something ffmpeg can run.

        The URL, credentials included, comes from whichever integration owns
        the camera entity. Nothing about a camera brand is stored or assumed
        here, and the user never types a password into kustos_vision.
        """
        try:
            source = await async_get_stream_source(self._hass, stream.entity_id)
        except Exception as err:
            _LOGGER.warning(
                "kustos_vision: could not resolve a stream URL for %s: %s",
                stream.entity_id,
                err,
            )
            return None
        if not source:
            _LOGGER.warning(
                "kustos_vision: %s provides no stream URL, so it cannot be recorded",
                stream.entity_id,
            )
            return None
        return StreamSpec(
            camera_slug=camera.slug,
            stream_key=stream.key,
            source_url=source,
            segment_seconds=storage.segment_seconds,
            audio=stream.audio,
        )

    async def async_stop_all(self) -> None:
        """Shut every process down, for unload or a Home Assistant stop."""
        streams, self._streams = self._streams, {}
        await asyncio.gather(*(s.async_stop() for s in streams.values()))

    async def async_ensure_directories(self, cameras: tuple[CameraConfig, ...]) -> list[Path]:
        """Create the day directories every running recording needs next.

        Called from the maintenance run rather than by a timer of its own, so
        the midnight handover is covered no matter when Home Assistant started.
        """
        if self._base is None:
            return []
        today = dt_util.now().date()
        return await self._hass.async_add_executor_job(
            self._ensure_directories, self._base, cameras, today
        )

    @staticmethod
    def _ensure_directories(
        base: Path, cameras: tuple[CameraConfig, ...], today: date
    ) -> list[Path]:
        created: list[Path] = []
        for camera in cameras:
            if camera.recorded_streams:
                created.extend(ensure_day_dirs(base, camera.slug, today))
        return created
