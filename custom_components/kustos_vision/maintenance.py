"""The periodic housekeeping run.

One pass does everything that has to happen regularly and nothing that has to
happen immediately:

1. create the day directories the recordings will need next,
2. pick up newly finished segments into the index,
3. generate the preview frames the timeline shows,
4. apply retention, and
5. remove the day directories retention emptied.

Bundling these into one scheduled run rather than four timers is deliberate:
they all need the same directory listing, and the midnight directory handover
is then covered no matter when Home Assistant happened to start.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from asyncio import create_subprocess_exec
from dataclasses import dataclass
from pathlib import Path

from homeassistant.components.ffmpeg import get_ffmpeg_manager
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .core.config import CamwatchConfig
from .core.index import ScanResult, Segment, SegmentIndex, scan_incremental
from .core.paths import prune_empty_day_dirs, thumbnail_for
from .core.recorder import build_thumbnail_args
from .core.retention import (
    RetentionPlan,
    RetentionPolicy,
    effective_budget,
    headroom_bytes,
    newest_per_stream,
    plan_retention,
    usable_capacity,
)

_LOGGER = logging.getLogger(__name__)

# A run happens once per segment length, because that is when a new segment has
# finished and there is something new to record about. Below a minute the
# directory listing would cost more than the freshness is worth, so that is the
# floor regardless of how short segments are configured to be.
MIN_INTERVAL_SECONDS = 60.0

# Preview frames generated per run, as a multiple of the number of streams
# being recorded. Each run produces at most one new segment per stream, so a
# factor above one also works off any backlog, while staying low enough that
# the decoding stays well under a second of CPU per run.
THUMBNAIL_BATCH_FACTOR = 4

# How long a single preview extraction may take before it is abandoned. It
# decodes one frame, so anything near this means the storage is not responding
# and the run should move on rather than stall.
THUMBNAIL_TIMEOUT_SECONDS = 30.0


@dataclass(frozen=True, slots=True)
class MaintenanceResult:
    """What one run did, for the diagnostics view and for tests."""

    indexed: int = 0
    forgotten: int = 0
    thumbnails: int = 0
    deleted: int = 0
    freed_bytes: int = 0
    shortfall_bytes: int = 0
    pruned_dirs: int = 0
    error: str | None = None


def interval_for(segment_seconds: int) -> float:
    """How often housekeeping should run for a given segment length."""
    return max(float(segment_seconds), MIN_INTERVAL_SECONDS)


class MaintenanceRunner:
    """Runs housekeeping, one pass at a time."""

    def __init__(self, hass: HomeAssistant, index: SegmentIndex) -> None:
        self._hass = hass
        self._index = index
        self._lock = asyncio.Lock()
        self.last_result = MaintenanceResult()

    async def async_run(
        self, config: CamwatchConfig, ensure_dirs: list[Path] | None = None
    ) -> MaintenanceResult:
        """Perform one housekeeping pass.

        Runs are serialised: a pass that overruns its interval must not have a
        second one delete the files it is still indexing.
        """
        if self._lock.locked():
            _LOGGER.debug("kustos_vision: housekeeping still running, skipping this turn")
            return self.last_result

        async with self._lock:
            try:
                self.last_result = await self._async_run_once(config, ensure_dirs or [])
            except Exception as err:
                _LOGGER.exception("kustos_vision: housekeeping failed")
                self.last_result = MaintenanceResult(error=str(err))
            return self.last_result

    async def _async_run_once(
        self, config: CamwatchConfig, ensure_dirs: list[Path]
    ) -> MaintenanceResult:
        base = Path(config.storage.base_path)
        local_tz = dt_util.get_default_time_zone()

        known = await self._run(self._index.all_paths)
        growing = await self._run(lambda: newest_per_stream(self._index.oldest_first()))
        scan: ScanResult = await self._run(
            scan_incremental, base, local_tz, known, growing
        )

        indexed = await self._run(self._index.upsert, scan.changed)
        forgotten = await self._run(self._index.forget, scan.vanished)

        thumbnails = await self._async_make_thumbnails(config, base)
        plan = await self._async_apply_retention(config, base)
        pruned = await self._run(prune_empty_day_dirs, base, ensure_dirs)

        return MaintenanceResult(
            indexed=indexed,
            forgotten=forgotten,
            thumbnails=thumbnails,
            deleted=len(plan.doomed),
            freed_bytes=plan.freed_bytes,
            shortfall_bytes=plan.shortfall_bytes,
            pruned_dirs=len(pruned),
        )

    async def _async_make_thumbnails(self, config: CamwatchConfig, base: Path) -> int:
        """Extract preview frames for finished segments that lack one.

        The newest segment of every stream is skipped: ffmpeg is still writing
        into it, so a frame pulled now would be from an incomplete file and
        would have to be redone anyway.
        """
        segments = await self._run(self._index.oldest_first)
        if not segments:
            return 0

        in_progress = newest_per_stream(segments)
        streams = max(1, len(in_progress))
        budget = streams * THUMBNAIL_BATCH_FACTOR

        pending = [
            s
            for s in segments
            if not s.has_thumbnail and s.rel_path not in in_progress
        ][:budget]
        if not pending:
            return 0

        binary = get_ffmpeg_manager(self._hass).binary
        made: list[Segment] = []
        for segment in pending:
            if await self._async_extract_frame(binary, segment.absolute(base)):
                made.append(
                    Segment(
                        rel_path=segment.rel_path,
                        camera_slug=segment.camera_slug,
                        stream_key=segment.stream_key,
                        start_utc=segment.start_utc,
                        duration_s=segment.duration_s,
                        size_bytes=segment.size_bytes,
                        has_thumbnail=True,
                    )
                )
        await self._run(self._index.upsert, made)
        return len(made)

    async def _async_extract_frame(self, binary: str, segment: Path) -> bool:
        """Pull one frame out of a segment. Returns whether it worked."""
        target = thumbnail_for(segment)
        args = build_thumbnail_args(segment, target)
        try:
            process = await create_subprocess_exec(
                binary,
                *args,
                stdin=asyncio.subprocess.DEVNULL,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
        except OSError as err:
            _LOGGER.warning("kustos_vision: could not start ffmpeg for a preview: %s", err)
            return False

        try:
            code = await asyncio.wait_for(process.wait(), THUMBNAIL_TIMEOUT_SECONDS)
        except TimeoutError:
            _LOGGER.warning("kustos_vision: preview for %s timed out", segment.name)
            with contextlib.suppress(ProcessLookupError):
                process.kill()
            with contextlib.suppress(Exception):
                await process.wait()
            return False

        # A segment can be unreadable for good reasons: it was the open file
        # when the process died, or the camera sent a broken keyframe. Not
        # having a preview is not worth a warning every run.
        return code == 0 and await self._run(target.is_file)

    async def async_ceiling(self, config: CamwatchConfig, base: Path) -> int:
        """The largest size limit that makes sense at this location.

        Everything the recordings could occupy, minus the headroom a retention
        run needs to work with. Both the automatic fallback and the check on a
        user-entered budget go through here, so the two can never disagree
        about what fits.
        """
        usage = await self._run(_disk_usage, base)
        used = await self._run(self._index.total_bytes)
        largest = await self._run(self._index.largest_segment_bytes)
        streams = sum(len(camera.recorded_streams) for camera in config.cameras)

        capacity = usable_capacity(usage.free if usage else 0, used)
        return effective_budget(None, capacity, headroom_bytes(largest, streams))

    async def _async_budget(self, config: CamwatchConfig, base: Path) -> int:
        """The size limit this run applies, configured or not.

        Recording that fills the disk and then dies is not an acceptable
        default, so an installation without a configured budget gets one
        derived from what is physically there. The headroom is measured, not
        assumed: see ``core.retention.headroom_bytes``.
        """
        ceiling = await self.async_ceiling(config, base)
        budget = effective_budget(config.storage.max_total_bytes, ceiling, 0)

        if budget <= 0:
            # Less space left than the headroom asks for. Freeing everything
            # that can be freed is the only useful response; the alternative is
            # recording stopping outright within the next few minutes.
            _LOGGER.warning(
                "kustos_vision: nothing usable is left at %s once the headroom "
                "a retention run needs is accounted for; freeing everything "
                "that is not currently being written",
                base,
            )
            return 1
        return budget

    async def _async_apply_retention(
        self, config: CamwatchConfig, base: Path
    ) -> RetentionPlan:
        """Plan and carry out deletions."""
        policy = RetentionPolicy(
            max_age_days=config.retention_days_by_camera,
            max_total_bytes=await self._async_budget(config, base),
        )

        segments = await self._run(self._index.oldest_first)
        plan = plan_retention(segments, policy, dt_util.utcnow().timestamp())
        if not plan:
            if plan.shortfall_bytes:
                _LOGGER.warning(
                    "kustos_vision: storage is %s bytes over the configured budget and "
                    "nothing further can be deleted",
                    plan.shortfall_bytes,
                )
            return plan

        removed = await self._run(self._delete_files, base, plan)
        await self._run(self._index.forget, removed)
        _LOGGER.debug(
            "kustos_vision: retention removed %s segments, freeing %s bytes",
            len(removed),
            plan.freed_bytes,
        )
        return plan

    @staticmethod
    def _delete_files(base: Path, plan: RetentionPlan) -> list[str]:
        """Delete segments and their previews, oldest first.

        Files go before the index does. If the run is interrupted in between,
        the next scan notices the missing files and corrects the index, whereas
        the other order would leave files nothing knows about.
        """
        removed: list[str] = []
        for segment in plan.doomed:
            path = segment.absolute(base)
            try:
                path.unlink(missing_ok=True)
            except OSError as err:
                _LOGGER.warning("kustos_vision: could not delete %s: %s", path, err)
                continue
            with contextlib.suppress(OSError):
                thumbnail_for(path).unlink(missing_ok=True)
            removed.append(segment.rel_path)
        return removed

    async def _run(self, func, *args):
        """Run a blocking call off the event loop."""
        return await self._hass.async_add_executor_job(func, *args)


def _disk_usage(path: Path):
    """Free space at the recording location, or None when it cannot be read."""
    import shutil

    try:
        return shutil.disk_usage(path)
    except OSError:
        return None
