"""Serving recordings to the panel.

Two endpoints, both authenticated: one for a segment, one for its preview
frame. They exist rather than relying on the media browser because the storage
location does not have to be inside the media folder, and the timeline needs to
seek within a file rather than play it from the start.

Range requests are not optional. A browser seeking inside a video asks for a
byte range, and a server that answers every request with the whole file makes
seeking either impossible or extremely slow. ``web.FileResponse`` implements
the range handling itself, which is the reason it is used here instead of
reading bytes by hand.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from pathlib import Path

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .core.index import SegmentIndex
from .core.paths import parse_day_dir, parse_segment_name
from .export import stream_export

_LOGGER = logging.getLogger(__name__)

SEGMENT_URL = f"/api/{DOMAIN}/segment"
THUMBNAIL_URL = f"/api/{DOMAIN}/thumbnail"
EXPORT_URL = f"/api/{DOMAIN}/export"

# The longest range one export may cover. The timeline works a day at a time,
# so a range beyond that is no longer a unit the user picked deliberately, and
# joining a week of a main stream would occupy the machine for a long while
# with something nobody asked for twice.
MAX_EXPORT_SECONDS = 24 * 60 * 60

# Segments never change once written, so a viewer that seeks back and forth
# should not fetch the same bytes twice. A day is far below the shortest
# retention anyone would configure.
CACHE_SECONDS = 24 * 60 * 60


def _safe_relative(raw: str) -> Path | None:
    """Return the relative path, or None when it is not one camwatch writes.

    Checked in two independent ways. The shape check rejects anything that does
    not look like a recording, including traversal attempts, before any
    file system call happens. The caller then confirms ownership against the
    index, so only files camwatch itself recorded can be served.
    """
    candidate = Path(raw)
    if candidate.is_absolute() or ".." in candidate.parts:
        return None
    if len(candidate.parts) != 3:
        return None
    camera, day, name = candidate.parts
    if parse_day_dir(day) is None or parse_segment_name(name) is None:
        return None
    if not camera or camera.startswith("."):
        return None
    return candidate


class CamwatchFileView(HomeAssistantView):
    """Base for the two file endpoints."""

    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    def _runtime(self) -> tuple[Path, SegmentIndex] | None:
        entries = self.hass.config_entries.async_loaded_entries(DOMAIN)
        if not entries:
            return None
        coordinator = entries[0].runtime_data
        return Path(coordinator.config.storage.base_path), coordinator.index

    async def _resolve(self, raw: str) -> Path | None:
        """Turn a requested path into a file camwatch actually recorded."""
        relative = _safe_relative(raw)
        if relative is None:
            return None
        runtime = self._runtime()
        if runtime is None:
            return None
        base, index = runtime

        if not await self.hass.async_add_executor_job(index.knows, str(relative)):
            return None
        return base / relative

    @staticmethod
    def _serve(path: Path, content_type: str) -> web.StreamResponse:
        return web.FileResponse(
            path,
            headers={
                "Content-Type": content_type,
                "Cache-Control": f"private, max-age={CACHE_SECONDS}",
            },
        )


class SegmentView(CamwatchFileView):
    """One recorded segment."""

    url = SEGMENT_URL + "/{path:.*}"
    name = f"api:{DOMAIN}:segment"

    async def get(self, request: web.Request, path: str) -> web.StreamResponse:
        target = await self._resolve(path)
        if target is None or not target.is_file():
            return web.Response(status=404)
        return self._serve(target, "video/mp4")


class ThumbnailView(CamwatchFileView):
    """The preview frame of a segment.

    Addressed by the segment's own path so the caller does not have to know how
    previews are named; the two always live side by side.
    """

    url = THUMBNAIL_URL + "/{path:.*}"
    name = f"api:{DOMAIN}:thumbnail"

    async def get(self, request: web.Request, path: str) -> web.StreamResponse:
        target = await self._resolve(path)
        if target is None:
            return web.Response(status=404)
        preview = target.with_suffix(".jpg")
        if not preview.is_file():
            return web.Response(status=404)
        return self._serve(preview, "image/jpeg")


class ExportView(CamwatchFileView):
    """A time range, joined into one downloadable file.

    Streamed as it is produced rather than assembled on disk first: there is no
    export directory to fill up, nothing to clean up, and no second copy of
    footage that already exists.
    """

    url = EXPORT_URL
    name = f"api:{DOMAIN}:export"

    async def get(self, request: web.Request) -> web.StreamResponse:
        runtime = self._runtime()
        if runtime is None:
            return web.Response(status=404)
        base, index = runtime

        try:
            camera = request.query["camera"]
            start = float(request.query["from"])
            end = float(request.query["to"])
        except (KeyError, ValueError):
            return web.Response(status=400, text="camera, from and to are required")

        stream = request.query.get("stream")
        if end <= start:
            return web.Response(status=400, text="the range is empty")
        if end - start > MAX_EXPORT_SECONDS:
            return web.Response(
                status=400,
                text=f"a single export covers at most {MAX_EXPORT_SECONDS // 3600} hours",
            )

        segments = await self.hass.async_add_executor_job(
            index.in_range, start, end, camera, stream
        )
        if not segments:
            return web.Response(status=404, text="nothing recorded in that range")

        began = datetime.fromtimestamp(start, tz=UTC).astimezone()
        filename = f"{camera}_{began:%Y-%m-%d_%H-%M-%S}.mp4"

        response = web.StreamResponse(
            headers={
                "Content-Type": "video/mp4",
                "Content-Disposition": f'attachment; filename="{filename}"',
            }
        )
        await response.prepare(request)
        async for chunk in stream_export(self.hass, segments, base):
            await response.write(chunk)
        await response.write_eof()
        return response


def async_register_views(hass: HomeAssistant) -> None:
    """Register the file endpoints, once per Home Assistant run."""
    hass.http.register_view(SegmentView(hass))
    hass.http.register_view(ThumbnailView(hass))
    hass.http.register_view(ExportView(hass))
