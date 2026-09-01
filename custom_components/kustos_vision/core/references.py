"""Reference pictures: stored images the model gets to compare against.

A reference shows the model what is meant - "this backyard, and the labelled
boxes name the bins" - so a question can point at things by name instead of
describing them. The pictures live below the local state directory,
content-addressed: the identifier of a picture is a hash of the picture
itself, so the same photo uploaded twice is one file and one id, and "is this
still in use" is answerable from the configuration alone - which is what
makes the orphan sweep safe.

Everything here is pure. Uploading, serving and deleting live in the HTTP
views; the loading of bytes for a request lives in the runner.
"""

from __future__ import annotations

import hashlib
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .observations import Observation

# A 12-megapixel phone JPEG is 4-6 MB; this accepts one straight from a phone
# while keeping a single upload far below what the event loop should hold in
# memory at once.
MAX_REFERENCE_BYTES = 8 * 1024 * 1024

# 128 bits of the SHA-256 as hex: collision-free for any realistic library,
# short enough to read in a URL.
REFERENCE_ID_LENGTH = 32

# An upload exists on disk before the profile that names it is saved. An hour
# is far longer than the minutes between choosing a file and pressing
# "Speichern", and short enough that an abandoned upload does not linger.
REFERENCE_ORPHAN_GRACE_SECONDS = 3600.0

# Every extra image costs the model a tile budget, and a request that
# overflows the runner's context fails WHOLESALE, not partially. Two per
# question is enough to show a thing and a counter-example; the ceiling
# protects the request when several questions each carry their own pictures.
MAX_REFERENCES_PER_OBSERVATION = 2
MAX_PICTURES_PER_REQUEST = 5

REFERENCES_DIR_NAME = "references"

_EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png"}


@dataclass(frozen=True, slots=True)
class ReferenceImage:
    """One stored picture and what it is meant to show."""

    asset_id: str
    caption: str = ""
    """What is what, in the user's own words - read by the model alongside
    the picture."""

    regions: tuple[dict[str, Any], ...] = ()
    """The drawn labels: rectangles {x, y, w, h, label}, normalised 0..1 so
    they survive any resolution. The panel burns them into a copy of the
    picture; the model sees the copy, this stays editable."""

    burned_asset_id: str = ""
    """The copy with the labels burned in - what actually travels to the
    model. Empty means nothing was drawn and the original travels."""

    @property
    def sent_asset_id(self) -> str:
        """The picture the model actually receives."""
        return self.burned_asset_id or self.asset_id

    def as_dict(self) -> dict[str, Any]:
        stored: dict[str, Any] = {"asset_id": self.asset_id}
        if self.caption:
            stored["caption"] = self.caption
        if self.regions:
            stored["regions"] = [dict(region) for region in self.regions]
        if self.burned_asset_id:
            stored["burned_asset_id"] = self.burned_asset_id
        return stored

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ReferenceImage:
        return cls(
            asset_id=str(data["asset_id"]),
            caption=str(data.get("caption", "")),
            # Carried through as-is, so a picture annotated by a newer panel
            # is not silently flattened by an older one round-tripping the
            # configuration.
            regions=tuple(dict(region) for region in data.get("regions", [])),
            burned_asset_id=str(data.get("burned_asset_id", "")),
        )


@dataclass(frozen=True, slots=True)
class PlannedPicture:
    """One picture a request will carry, and the text introducing it."""

    asset_id: str
    preamble: str


def sniff_image(data: bytes) -> str | None:
    """The type of an uploaded picture, from its first bytes.

    From the content, never from the file name or the browser's claim: both
    are the uploader's to choose, and a renamed file is exactly what an
    extension check waves through.
    """
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    return None


def extension_for(content_type: str) -> str:
    return _EXTENSIONS[content_type]


def asset_id_for(data: bytes) -> str:
    """The identifier of a picture: the picture itself, hashed."""
    return hashlib.sha256(data).hexdigest()[:REFERENCE_ID_LENGTH]


def is_asset_id(value: str) -> bool:
    """Whether a string is shaped like an asset id.

    Like the frame ring's name check, this IS the authorisation of the
    serving endpoint: only a hex id of the documented length can address a
    file, so nothing else below the state directory is reachable.
    """
    return len(value) == REFERENCE_ID_LENGTH and all(
        c in "0123456789abcdef" for c in value
    )


def references_dir(local_state: Path) -> Path:
    return local_state / REFERENCES_DIR_NAME


def asset_path(local_state: Path, asset_id: str, content_type: str) -> Path:
    if not is_asset_id(asset_id):
        raise ValueError(f"not an asset id: {asset_id!r}")
    return references_dir(local_state) / f"{asset_id}{extension_for(content_type)}"


def write_asset(target: Path, content: bytes) -> None:
    """Store one content-addressed picture.

    An existing file already holds exactly these bytes - that is what the
    addressing means - so it is never rewritten.
    """
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.is_file():
        target.write_bytes(content)


def find_asset(local_state: Path, asset_id: str) -> Path | None:
    """The stored file for an id, whichever type it was uploaded as."""
    if not is_asset_id(asset_id):
        return None
    for extension in _EXTENSIONS.values():
        candidate = references_dir(local_state) / f"{asset_id}{extension}"
        if candidate.is_file():
            return candidate
    return None


def referenced_asset_ids(observations: Sequence[Observation]) -> set[str]:
    """Every asset id the given questions name, originals and burned copies.

    Both count as referenced: deleting the original would strand the drawn
    labels' editability, deleting the burned copy would strand the request.
    """
    ids: set[str] = set()
    for observation in observations:
        for reference in getattr(observation, "references", ()):
            ids.add(reference.asset_id)
            if reference.burned_asset_id:
                ids.add(reference.burned_asset_id)
    return ids


def prune_unreferenced(
    directory: Path, referenced: set[str], now: float
) -> list[Path]:
    """Delete stored pictures nothing names any more. Returns what fell.

    A file survives while its id appears in the configuration OR while it is
    younger than the grace period - the latter is what keeps a picture that
    has been uploaded but not yet saved from being deleted underneath the
    person still typing its caption.
    """
    fallen: list[Path] = []
    if not directory.is_dir():
        return fallen
    for candidate in directory.iterdir():
        if not candidate.is_file():
            continue
        if candidate.stem in referenced:
            continue
        try:
            age = now - candidate.stat().st_mtime
        except OSError:
            continue
        if age <= REFERENCE_ORPHAN_GRACE_SECONDS:
            continue
        try:
            candidate.unlink()
            fallen.append(candidate)
        except OSError:
            continue
    return fallen


def plan_pictures(observations: Sequence[Observation]) -> tuple[PlannedPicture, ...]:
    """Which reference pictures one request carries, in order, and their texts.

    The current frame is NOT in here - it always travels first, before any of
    these, so a runner that truncates or a model that only honours the first
    image degrades toward the evidence, never toward a reference. The cap
    keeps the whole request inside a small model's context; what does not fit
    is dropped from the back.
    """
    planned: list[PlannedPicture] = []
    budget = MAX_PICTURES_PER_REQUEST - 1  # the frame occupies one slot
    number = 0
    for observation in observations:
        for reference in getattr(observation, "references", ()):
            if len(planned) >= budget:
                return tuple(planned)
            number += 1
            parts = [
                f"Reference picture {number}."
            ]
            if reference.caption:
                parts.append(reference.caption)
            if reference.regions:
                parts.append(
                    "The labelled boxes drawn on this picture name the "
                    "objects they surround."
                )
            parts.append(
                "This is NOT the current camera frame. It only shows what is "
                "meant, and it is not evidence that anything is there now."
            )
            planned.append(
                PlannedPicture(
                    asset_id=reference.sent_asset_id,
                    preamble=" ".join(parts),
                )
            )
    return tuple(planned)
