"""Bounding boxes the model reports, and the ffmpeg that draws them.

The model cannot produce images, but grounding-trained VLMs can name WHERE
things are: boxes on a normalised integer grid. The request asks for exactly
that as a synthetic field, and after the answer arrives the boxes are burned
into a copy of the frame - coloured, labelled - which the image entity then
serves instead of the plain frame.

Boxes, not contour polygons, deliberately: grounding training teaches models
the [x0, y0, x1, y1] convention, a polygon would be schema-heavy and beyond
what a small local model returns reliably. The Mark shape can grow a points
field later without breaking anything stored, because marks are never stored.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .capture import FRAME_JPEG_QUALITY

# The normalised coordinate grid. 0..1000 integers are the convention
# grounding-trained VLMs know from their training data, and integers keep the
# grammar a constrained runner builds from the schema small.
MARK_GRID = 1000

# Every mark costs answer tokens and drawing space; a frame with more than a
# handful of highlighted objects reads as noise, not as an answer.
MAX_MARKS = 8

# A label is a name, not a sentence; longer text would not fit next to its
# box at the frame sizes the capture produces.
MAX_LABEL_CHARS = 40

# Frames are capped at FRAME_LONG_EDGE (1024) by the capture, so fixed pixel
# values stay proportionate: a 3 px line is visible without hiding what it
# surrounds, and 20 px text is readable. drawtext accepts no expressions for
# fontsize, so a constant is the only option anyway.
MARK_BOX_THICKNESS = 3
MARK_FONT_SIZE = 20

# High-contrast rotation so neighbouring boxes stay tellable apart; ffmpeg
# colour names, fixed rather than themed because the burned file must look
# the same everywhere.
MARK_COLORS = ("red", "yellow", "lime", "cyan", "magenta", "orange")

# The synthetic field the answer carries the boxes in. The underscore makes a
# collision with a user's observation key impossible: their keys must start
# with a lowercase letter (see core.observations).
MARKS_FIELD = "_marks"


@dataclass(frozen=True, slots=True)
class Mark:
    """One reported object: its label and its box on the MARK_GRID."""

    label: str
    x0: int
    y0: int
    x1: int
    y1: int


def marks_schema_fragment() -> dict[str, Any]:
    """The JSON-schema property asking for the boxes, strict like the rest."""
    return {
        "type": "array",
        "maxItems": MAX_MARKS,
        "description": (
            "For every object your other answers report as present, one "
            "entry: a short label and its bounding box [x0, y0, x1, y1] on "
            f"a 0..{MARK_GRID} grid over the current camera frame (x0,y0 = "
            "top left, x1,y1 = bottom right). An empty list when nothing "
            "reported is locatable."
        ),
        "items": {
            "type": "object",
            "properties": {
                "label": {"type": "string"},
                "box": {
                    "type": "array",
                    "items": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": MARK_GRID,
                    },
                    "minItems": 4,
                    "maxItems": 4,
                },
            },
            "required": ["label", "box"],
            "additionalProperties": False,
        },
    }


def marks_prompt() -> str:
    """The instruction block for the prompt, beside the other fields."""
    return (
        f'Field "{MARKS_FIELD}": For every object your other answers report '
        "as present in the current camera frame, add one entry with a short "
        "label (in the language of the questions) and its bounding box "
        f"[x0, y0, x1, y1] on a 0..{MARK_GRID} grid, where x0,y0 is the top "
        "left and x1,y1 the bottom right corner of the object. Boxes must "
        "come from this frame only. Return an empty list when nothing you "
        "reported can be located."
    )


def parse_marks(value: Any) -> tuple[Mark, ...]:
    """Read the model's boxes, keeping only what is drawable.

    Tolerant on purpose: a garbled entry is dropped, never fatal - the
    analysis result stands on its own and the marks are decoration on top.
    Reversed corners are reordered rather than refused, because models mix
    the convention up and the intended box is still unambiguous.
    """
    if not isinstance(value, list):
        return ()
    marks: list[Mark] = []
    for entry in value:
        if not isinstance(entry, dict):
            continue
        box = entry.get("box")
        label = entry.get("label")
        if not isinstance(box, list) or len(box) != 4:
            continue
        try:
            coords = [max(0, min(MARK_GRID, int(v))) for v in box]
        except (TypeError, ValueError):
            continue
        x0, x1 = sorted((coords[0], coords[2]))
        y0, y1 = sorted((coords[1], coords[3]))
        if x1 <= x0 or y1 <= y0:
            continue
        marks.append(
            Mark(
                label=str(label or "").strip()[:MAX_LABEL_CHARS],
                x0=x0,
                y0=y0,
                x1=x1,
                y1=y1,
            )
        )
        if len(marks) >= MAX_MARKS:
            break
    return tuple(marks)


def escape_drawtext(text: str) -> str:
    """Escape a label for drawtext's option parser (backslash, quote, colon,
    percent are all syntax there)."""
    out = text.replace("\\", r"\\")
    out = out.replace("'", r"\'")
    out = out.replace(":", r"\:")
    return out.replace("%", r"\%")


def marked_name(frame_file: str) -> str:
    """The marked copy's file name, derived from its ring frame's name."""
    return frame_file.replace("frame_", "marked_", 1)


def build_mark_args(
    source: Path,
    target: Path,
    marks: tuple[Mark, ...],
    font: Path,
    with_labels: bool,
) -> list[str]:
    """ffmpeg arguments that burn the boxes into a copy of the frame.

    The grid scales inside the filter expressions (iw/ih for drawbox, w/h
    for drawtext), so nothing here needs to know the frame's pixel size.
    ``with_labels`` is the drawtext capability switch: an ffmpeg without
    freetype still draws the boxes, only the words are lost.
    """
    filters: list[str] = []
    for index, mark in enumerate(marks):
        color = MARK_COLORS[index % len(MARK_COLORS)]
        x = f"({mark.x0}*iw)/{MARK_GRID}"
        y = f"({mark.y0}*ih)/{MARK_GRID}"
        w = f"({mark.x1 - mark.x0}*iw)/{MARK_GRID}"
        h = f"({mark.y1 - mark.y0}*ih)/{MARK_GRID}"
        filters.append(
            f"drawbox=x={x}:y={y}:w={w}:h={h}"
            f":color={color}:t={MARK_BOX_THICKNESS}"
        )
        if not with_labels or not mark.label:
            continue
        text = escape_drawtext(mark.label)
        # The plaque sits above the box when there is room, inside its top
        # edge otherwise; the comma inside max() is filter-arg syntax and
        # has to be escaped.
        label_y = (
            f"max(({mark.y0}*h)/{MARK_GRID}-th-{MARK_BOX_THICKNESS}\\,2)"
        )
        filters.append(
            f"drawtext=fontfile='{font}':text='{text}'"
            f":fontsize={MARK_FONT_SIZE}:fontcolor=black"
            f":box=1:boxcolor={color}@0.9:boxborderw=3"
            f":x=({mark.x0}*w)/{MARK_GRID}:y={label_y}"
        )
    return [
        "-nostdin",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(source),
        "-vf",
        ",".join(filters),
        "-frames:v",
        "1",
        "-q:v",
        FRAME_JPEG_QUALITY,
        "-f",
        "image2",
        str(target),
    ]
