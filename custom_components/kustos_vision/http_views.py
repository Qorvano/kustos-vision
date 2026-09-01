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
from homeassistant.components.http import KEY_HASS_USER, HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import DATA_STAMP_AVAILABLE, DOMAIN, LOCAL_STATE_DIR
from .core.capture import frames_dir, is_frame_name
from .core.index import SegmentIndex
from .core.paths import is_valid_slug, parse_day_dir, parse_segment_name
from .core.references import (
    MAX_REFERENCE_BYTES,
    asset_id_for,
    asset_path,
    find_asset,
    sniff_image,
)
from .export import STAMP_DEFAULT_QUALITY, STAMP_QUALITY_CRF, stream_export

_LOGGER = logging.getLogger(__name__)

SEGMENT_URL = f"/api/{DOMAIN}/segment"
THUMBNAIL_URL = f"/api/{DOMAIN}/thumbnail"
EXPORT_URL = f"/api/{DOMAIN}/export"
VISION_FRAME_URL = f"/api/{DOMAIN}/vision-frame"
REFERENCE_URL = f"/api/{DOMAIN}/reference"

# Ring slots are REUSED: the same name holds a different run's picture after
# twenty analyses. no-cache still permits FileResponse's ETag/Last-Modified
# revalidation, so an unchanged slot costs one cheap 304, not a re-download.
FRAME_CACHE_CONTROL = "private, no-cache"

# The longest range one export may cover: a range far beyond a day is no
# longer a unit anyone picked deliberately, and joining a week of a main
# stream would occupy the machine for a long while with something nobody
# asked for twice. 25 hours rather than 24, because the night the clocks
# fall back makes one local day exactly that long and its download must
# not fail over it.
MAX_EXPORT_SECONDS = 25 * 60 * 60

# Segments never change once written, so a viewer that seeks back and forth
# should not fetch the same bytes twice. A day is far below the shortest
# retention anyone would configure.
CACHE_SECONDS = 24 * 60 * 60

# References are content-addressed: the bytes behind an id can never change,
# which is what earns the immutable that the frame ring cannot claim.
REFERENCE_CACHE_CONTROL = f"private, max-age={CACHE_SECONDS}, immutable"


def _safe_relative(raw: str) -> Path | None:
    """Return the relative path, or None when it is not one kustos_vision writes.

    Checked in two independent ways. The shape check rejects anything that does
    not look like a recording, including traversal attempts, before any
    file system call happens. The caller then confirms ownership against the
    index, so only files kustos_vision itself recorded can be served.
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
        """Turn a requested path into a file kustos_vision actually recorded."""
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

        # Burnt-in clock on request; the raw join stays the default because it
        # is lossless and finishes in seconds instead of the footage's length.
        stamp = request.query.get("stamp") == "1"
        if stamp and not self.hass.data.get(DATA_STAMP_AVAILABLE, False):
            return web.Response(
                status=400,
                text="Das mitgelieferte ffmpeg kann keinen Text zeichnen "
                "(drawtext fehlt); nur der Roh-Export ist verfügbar.",
            )
        quality = request.query.get("quality", STAMP_DEFAULT_QUALITY)
        if quality not in STAMP_QUALITY_CRF:
            return web.Response(
                status=400,
                text=f"quality must be one of {', '.join(sorted(STAMP_QUALITY_CRF))}",
            )

        began = datetime.fromtimestamp(start, tz=UTC).astimezone()
        suffix = "_zeitstempel" if stamp else ""
        filename = f"{camera}_{began:%Y-%m-%d_%H-%M-%S}{suffix}.mp4"

        response = web.StreamResponse(
            headers={
                "Content-Type": "video/mp4",
                "Content-Disposition": f'attachment; filename="{filename}"',
            }
        )
        await response.prepare(request)
        async for chunk in stream_export(
            self.hass,
            segments,
            base,
            stamp=stamp,
            clip=(start, end),
            stamp_crf=STAMP_QUALITY_CRF[quality],
        ):
            await response.write(chunk)
        await response.write_eof()
        return response


class VisionFrameView(HomeAssistantView):
    """The exact frame one analysis was answered from.

    Its own view rather than a branch of the segment views: those authorise a
    path by asking the index whether kustos_vision recorded it, and a frame is
    not a recording. Here the shape check IS the authorisation - a valid slug
    plus a ring-slot name can only ever address a file this integration wrote
    below its own state directory.
    """

    url = VISION_FRAME_URL + "/{camera}/{name}"
    name = f"api:{DOMAIN}:vision-frame"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(
        self, request: web.Request, camera: str, name: str
    ) -> web.StreamResponse:
        if not is_valid_slug(camera) or not is_frame_name(name):
            return web.Response(status=404)
        path = (
            frames_dir(Path(self.hass.config.path(LOCAL_STATE_DIR)), camera)
            / name
        )
        if not await self.hass.async_add_executor_job(path.is_file):
            return web.Response(status=404)
        return web.FileResponse(
            path,
            headers={
                "Content-Type": "image/jpeg",
                "Cache-Control": FRAME_CACHE_CONTROL,
            },
        )


class ReferenceUploadView(HomeAssistantView):
    """Accepting a reference picture, following core's image_upload.

    A POST view rather than websocket, because the websocket cannot carry
    binary and base64 would hold the whole picture in memory twice.
    """

    url = REFERENCE_URL
    name = f"api:{DOMAIN}:reference-upload"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def post(self, request: web.Request) -> web.Response:
        user = request.get(KEY_HASS_USER)
        if user is None or not user.is_admin:
            return web.Response(status=403)
        # aiohttp enforces this itself and refuses an oversized body with 413
        # before holding a byte of it; checking Content-Length afterwards
        # would trust the sender about the size of what they sent.
        request._client_max_size = MAX_REFERENCE_BYTES  # noqa: SLF001
        try:
            data = await request.post()
        except web.HTTPRequestEntityTooLarge:
            return web.Response(
                status=413,
                text=(
                    "Das Bild ist größer als "
                    f"{MAX_REFERENCE_BYTES // (1024 * 1024)} MB. Bitte laden "
                    "Sie eine kleinere Datei hoch."
                ),
            )

        uploaded = data.get("file")
        if not hasattr(uploaded, "file"):
            return web.Response(
                status=400, text="Es wurde keine Datei übermittelt."
            )
        content = await self.hass.async_add_executor_job(uploaded.file.read)

        # From the content, never from the file name or the browser's claim:
        # both are the uploader's to choose.
        content_type = sniff_image(content)
        if content_type is None:
            return web.Response(
                status=400,
                text="Nur JPEG- und PNG-Bilder werden als Referenz akzeptiert.",
            )

        asset_id = asset_id_for(content)
        target = asset_path(
            Path(self.hass.config.path(LOCAL_STATE_DIR)), asset_id, content_type
        )
        await self.hass.async_add_executor_job(_write_asset, target, content)
        return self.json(
            {
                "asset_id": asset_id,
                "content_type": content_type,
                "bytes": len(content),
            }
        )


def _write_asset(target: Path, content: bytes) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    # Content-addressed: an existing file already holds exactly these bytes.
    if not target.is_file():
        target.write_bytes(content)


class ReferenceServeView(HomeAssistantView):
    """One stored reference picture, addressed by its content id."""

    url = REFERENCE_URL + "/{asset_id}"
    name = f"api:{DOMAIN}:reference"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def get(
        self, request: web.Request, asset_id: str
    ) -> web.StreamResponse:
        path = await self.hass.async_add_executor_job(
            find_asset, Path(self.hass.config.path(LOCAL_STATE_DIR)), asset_id
        )
        if path is None:
            return web.Response(status=404)
        content_type = "image/png" if path.suffix == ".png" else "image/jpeg"
        return web.FileResponse(
            path,
            headers={
                "Content-Type": content_type,
                "Cache-Control": REFERENCE_CACHE_CONTROL,
            },
        )


def async_register_views(hass: HomeAssistant) -> None:
    """Register the file endpoints, once per Home Assistant run."""
    hass.http.register_view(SegmentView(hass))
    hass.http.register_view(ThumbnailView(hass))
    hass.http.register_view(ExportView(hass))
    hass.http.register_view(VisionFrameView(hass))
    hass.http.register_view(ReferenceUploadView(hass))
    hass.http.register_view(ReferenceServeView(hass))
