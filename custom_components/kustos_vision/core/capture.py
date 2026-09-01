"""Taking one current frame for an analysis, and where such frames live.

The reason this exists: the trigger promises "now", and the camera entity does
not. A camera integration may answer a snapshot request with a still it
fetched minutes ago, or with whatever keyframe the stream worker happened to
hold. The only picture guaranteed to be from the moment of the trigger is one
decoded from the camera's own stream at that moment - which is what the
arguments built here do.

Split like the recorder: the argument building and the path arithmetic are
pure and live here, the process spawning and Home Assistant calls live in the
package root's ``capture.py``. That keeps everything below testable without
ffmpeg and without Home Assistant.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from pathlib import Path

from .paths import validate_slug
from .recorder import RTSP_READ_TIMEOUT_US

# Long edge of the frame handed to the model. A vision model resizes to its
# own tile grid before it looks at anything (the gemma class works on 896 px
# tiles); pixels beyond that are discarded after having cost transfer, base64
# inflation and memory. Same figure the old still request asked for, kept so
# behaviour does not shift twice at once.
FRAME_LONG_EDGE = 1024

# ffmpeg's JPEG quality scale runs 1 (best) to 31. The frame is both what the
# model sees and the evidence the history shows; compression artefacts here
# would be indistinguishable from something the camera did.
FRAME_JPEG_QUALITY = "2"

# RTSP DESCRIBE/SETUP/PLAY plus the wait for the next keyframe. Cameras ship
# keyframes every 1-4 s, some as slowly as 8 s; this covers the handshake plus
# two of the longest intervals, and sits far below the backend timeout (120 s)
# so a slow camera costs a fallback picture, not a failed analysis.
FRAME_CAPTURE_TIMEOUT_SECONDS = 15.0

# Probing exists for containers whose streams are unknown; an RTSP session
# announces its streams in the SDP before the first packet arrives. Shrinking
# it removes ffmpeg's multi-second probing default from the front of every
# capture.
PROBE_BYTES = "1000000"
PROBE_MICROSECONDS = "1000000"

FRAME_DIR_NAME = "frames"

# Two digits carry any ring size up to 100; the ring is HISTORY_LENGTH (20)
# slots, one per remembered analysis, which a test pins.
_FRAME_NAME_RE = re.compile(r"^frame_(\d{2})\.jpg$")


class FrameSource(StrEnum):
    """Where a frame actually came from - the honesty marker in the history."""

    STREAM = "stream"
    """Decoded from the camera's own stream at the moment of the analysis."""

    ENTITY_STILL = "still"
    """Whatever the camera integration had. May be minutes old."""


@dataclass(frozen=True, slots=True)
class CapturedFrame:
    """One frame as it was handed to the model."""

    content: bytes
    content_type: str
    taken_at: datetime
    source: FrameSource
    path: Path | None = None
    """Where it was kept for the history, or None when it was not kept."""


def build_frame_args(
    source_url: str, target: Path, long_edge: int = FRAME_LONG_EDGE
) -> list[str]:
    """ffmpeg arguments that write exactly one current frame as a JPEG.

    Deliberately not build_thumbnail_args with a different input: that one
    reads a finished file from its beginning, this one opens a live source,
    and the two disagree about every input option that matters. What they
    share is the shape - decode, stop after one frame, scale, image2.
    """
    if long_edge <= 0:
        raise ValueError("long_edge must be positive")
    args = ["-nostdin", "-loglevel", "error", "-y"]
    if source_url.lower().startswith("rtsp://"):
        # Same reasoning as the recording invocation: UDP drops packets
        # silently, and a half-open TCP connection has to become an exit
        # rather than a wait. See core.recorder.RTSP_READ_TIMEOUT_US.
        args += ["-rtsp_transport", "tcp", "-timeout", RTSP_READ_TIMEOUT_US]
    args += ["-probesize", PROBE_BYTES, "-analyzeduration", PROBE_MICROSECONDS]
    args += ["-i", source_url, "-an", "-frames:v", "1"]
    # min() on BOTH edges: a stream smaller than the box is never blown up,
    # because upscaling invents detail the model would then answer from.
    # force_original_aspect_ratio keeps the geometry, which the entity-still
    # fallback cannot do (Home Assistant only scales when width AND height
    # are given, and then by exact reformat, which distorts).
    args += [
        "-vf",
        f"scale=w='min({long_edge},iw)':h='min({long_edge},ih)'"
        ":force_original_aspect_ratio=decrease",
    ]
    args += ["-q:v", FRAME_JPEG_QUALITY, "-f", "image2", str(target)]
    return args


def frames_dir(local_state: Path, camera_slug: str) -> Path:
    """Where one camera's analysed frames live.

    Below the local state directory, never the recording target: the target is
    frequently a network share, and these are small, hot, integration-owned
    files. validate_slug is what stops a configured name from reaching outside
    the state directory.
    """
    return local_state / FRAME_DIR_NAME / validate_slug(camera_slug)


def frame_slot(counter: int, slots: int) -> int:
    """The ring slot the next frame overwrites.

    A fixed set of names, so the directory can never grow and no cleanup pass
    exists that could get out of step with the history: run N writes slot
    N mod slots, and by the time that slot comes round again the history entry
    that pointed at it has already been dropped.
    """
    return counter % slots


def frame_name(slot: int) -> str:
    return f"frame_{slot:02d}.jpg"


def is_frame_name(name: str) -> bool:
    """Whether a requested file name is one the ring could have written.

    This IS the authorisation of the serving endpoint: a valid slug plus a
    ring-slot name can only ever address a file this integration wrote.
    """
    return bool(_FRAME_NAME_RE.match(name))
