"""Expose the analysed frames and the reference pictures as media.

Not for browsing - nobody wants these in the media browser, and the root is
deliberately empty - but because it is the only way to hand Home Assistant's
AI Task API a file this integration owns: attachments are resolved through
media_source, and an attachment is usable exactly when the resolution yields
a local path. This platform is therefore the difference between the AI Task
backend getting the trigger-time frame and the reference pictures, and it
getting whatever still its camera provider can fetch.
"""

from __future__ import annotations

from pathlib import Path

from homeassistant.components.media_player import MediaClass
from homeassistant.components.media_source import (
    BrowseMediaSource,
    MediaSource,
    MediaSourceItem,
    PlayMedia,
    Unresolvable,
)
from homeassistant.core import HomeAssistant

from .const import DOMAIN, LOCAL_STATE_DIR
from .core.capture import frames_dir, is_frame_name
from .core.paths import is_valid_slug
from .core.references import find_asset
from .http_views import REFERENCE_URL, VISION_FRAME_URL


async def async_get_media_source(hass: HomeAssistant) -> MediaSource:
    return KustosVisionMediaSource(hass)


class KustosVisionMediaSource(MediaSource):
    """Two identifier shapes: frame/<slug>/<name> and reference/<asset_id>.

    Both validated by the same pure helpers the HTTP views use, so nothing
    below the state directory is reachable that those views would not serve.
    """

    name = "Kustos Vision"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(DOMAIN)
        self.hass = hass

    async def async_resolve_media(self, item: MediaSourceItem) -> PlayMedia:
        parts = (item.identifier or "").split("/")
        local_state = Path(self.hass.config.path(LOCAL_STATE_DIR))

        if len(parts) == 3 and parts[0] == "frame":
            _, slug, frame = parts
            if not is_valid_slug(slug) or not is_frame_name(frame):
                raise Unresolvable("not a frame kustos_vision wrote")
            path = frames_dir(local_state, slug) / frame
            if not await self.hass.async_add_executor_job(path.is_file):
                raise Unresolvable("no such frame")
            return PlayMedia(
                url=f"{VISION_FRAME_URL}/{slug}/{frame}",
                mime_type="image/jpeg",
                path=path,
            )

        if len(parts) == 2 and parts[0] == "reference":
            path = await self.hass.async_add_executor_job(
                find_asset, local_state, parts[1]
            )
            if path is None:
                raise Unresolvable("no such reference picture")
            mime = "image/png" if path.suffix == ".png" else "image/jpeg"
            return PlayMedia(
                url=f"{REFERENCE_URL}/{parts[1]}", mime_type=mime, path=path
            )

        raise Unresolvable(f"unknown identifier {item.identifier!r}")

    async def async_browse_media(self, item: MediaSourceItem) -> BrowseMediaSource:
        return BrowseMediaSource(
            domain=DOMAIN,
            identifier="",
            media_class=MediaClass.DIRECTORY,
            media_content_type="",
            title="Kustos Vision",
            can_play=False,
            can_expand=False,
            children=[],
        )
