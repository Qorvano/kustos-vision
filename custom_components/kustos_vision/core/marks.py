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

from .capture import FRAME_JPEG_QUALITY, FRAME_LONG_EDGE

# Boxes are ABSOLUTE PIXELS of the frame as sent. Measured, not chosen: the
# Qwen-VL class emits pixel coordinates of its input image no matter what
# grid the prompt requests, and mapping its y values onto a 0..1000 grid
# squashed every box upward - the "boxes sit too high" pattern across every
# tested model. The capture caps both edges at FRAME_LONG_EDGE, so that is
# the largest coordinate a valid box can carry.
MARK_COORD_MAX = FRAME_LONG_EDGE

# Every mark costs answer tokens and drawing space; a frame with dozens of
# highlighted objects reads as noise, not as an answer. Twelve, not eight:
# the schema enforces this as a grammar, and a garden scene proved that
# eight slots fill up with the furniture cluster before a bicycle or a
# wheelbarrow at the back ever gets named.
MAX_MARKS = 12

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

# The synthetic field naming the recognised objects, used by the split flow:
# the main model NAMES things (its strength), a grounding model then LOCATES
# exactly those names (its strength) in a second request.
OBJECTS_FIELD = "_objects"


@dataclass(frozen=True, slots=True)
class Mark:
    """One reported object: its label and its box on the MARK_GRID."""

    label: str
    x0: int
    y0: int
    x1: int
    y1: int


def _box_schema() -> dict[str, Any]:
    return {
        "type": "array",
        "items": {
            "type": "integer",
            "minimum": 0,
            "maximum": MARK_COORD_MAX,
        },
        "minItems": 4,
        "maxItems": 4,
    }


def marks_schema_fragment() -> dict[str, Any]:
    """The JSON-schema property asking for the boxes, strict like the rest."""
    return {
        "type": "array",
        "maxItems": MAX_MARKS,
        "description": (
            "One entry for every distinct object you recognise in the "
            "current camera frame - everything your other answers mention, "
            "and likewise any other clearly recognisable thing such as a "
            "person, an animal, a vehicle, a package or a bin. Not surfaces "
            "or fixed background like hedges, walls or floors. Each entry: "
            "a short label and the bounding box [x0, y0, x1, y1] in PIXELS "
            "of this image (x from the left edge, y from the top edge). An "
            "empty list when nothing is locatable."
        ),
        "items": {
            "type": "object",
            "properties": {
                "label": {"type": "string"},
                "box": _box_schema(),
            },
            "required": ["label", "box"],
            "additionalProperties": False,
        },
    }


def marks_prompt() -> str:
    """The instruction block for the prompt, beside the other fields.

    Every recognised THING, not only what the questions asked about: a dog
    walking through the frame deserves its box even though no question ever
    mentioned dogs. Surfaces and fixed background are excluded, or the model
    boxes the hedge and the floor and the picture drowns.
    """
    return (
        f'Field "{MARKS_FIELD}": One entry for every distinct object you '
        "recognise in the current camera frame - everything your other "
        "answers mention, and likewise any other clearly recognisable thing "
        "(a person, an animal, a vehicle, a package, a bin and the like). "
        "Do not box surfaces or fixed background such as hedges, walls or "
        "floors. Each entry has a short label in the language of the "
        "questions and the bounding box [x0, y0, x1, y1] in PIXELS of the "
        "image exactly as provided: x0,y0 is the object's top left corner "
        "(x measured from the left edge, y from the top edge), x1,y1 its "
        "bottom right corner. Boxes must come from this frame only. Return "
        "an empty list when nothing is locatable."
    )


def objects_schema_fragment() -> dict[str, Any]:
    """The name-list field of the split flow: naming only, no coordinates."""
    return {
        "type": "array",
        "maxItems": MAX_MARKS,
        "description": (
            "The name of every distinct object you recognise in the current "
            "camera frame, in the language of the questions. Each name must "
            "tell ITS object apart from the others - by colour, kind or "
            "place (like 'blaue Tonne', not five entries saying 'Tonne') - "
            "because each name is later used to point at exactly one thing. "
            "Never surfaces or fixed background such as hedges, walls or "
            "floors. Names only, no positions. An empty list when nothing "
            "stands out."
        ),
        "items": {"type": "string"},
    }


def objects_prompt() -> str:
    return (
        f'Field "{OBJECTS_FIELD}": Name every distinct object you recognise '
        "in the current camera frame, in the language of the questions - "
        "everything your other answers mention, and likewise any other "
        "clearly recognisable thing (a person, an animal, a vehicle, a "
        "package, a bin and the like). Prefer the thing's plain kind name "
        "('Fahrrad', 'Tisch'); repeating one name for several things of the "
        "same kind is fine. Add a colour or place ONLY when several of the "
        "same kind differ obviously and the difference matters ('blaue "
        "Tonne' next to 'braune Tonne') - each name is later used to point "
        "at its object in the picture, and a guessed adjective makes that "
        "pointing fail. "
        "Never name surfaces or fixed background such as hedges, walls or "
        "floors. List a thing even when it is ordinary, permanent or called "
        "unremarkable by the extra context: this field is an inventory of "
        "what is visible, not a report of anomalies. The list is capped: "
        "when more things are visible than fit, people, animals, vehicles "
        "and anything that does not belong to the scene take the slots "
        "before furniture and fixtures do - and if a reference picture of "
        "the camera's normal scene was provided, whatever differs from it "
        "comes first of all. Names only; the positions are somebody else's "
        "job."
    )


def parse_object_names(value: Any) -> tuple[str, ...]:
    """Read the main model's name list: trimmed, disambiguated, capped.

    A repeated name is NOT dropped: "Holzstuhl" three times means three
    chairs, and dropping two of them silently unboxed two real objects in a
    garden test. Repeats are numbered instead ("Holzstuhl 2", "Holzstuhl 3"),
    so each instance keeps its own grounding slot.
    """
    if not isinstance(value, list):
        return ()
    names: list[str] = []
    for entry in value:
        name = str(entry or "").strip()[:MAX_LABEL_CHARS]
        if not name:
            continue
        if name in names:
            counter = 2
            while f"{name} {counter}" in names:
                counter += 1
            name = f"{name} {counter}"
        names.append(name)
        if len(names) >= MAX_MARKS:
            break
    return tuple(names)


def grounding_schema(names: tuple[str, ...]) -> dict[str, Any]:
    """The strict schema of the grounding request.

    One OPTIONAL property per given name, not an array of labelled entries:
    the grammar itself then forbids naming anything twice, forbids labels
    outside the list, and makes "cannot find it" a plain omission. The
    array form allowed a repetition loop - a grounding model once filled
    all its slots with one bucket's box under alternating labels, and no
    prompt wording can forbid what the grammar permits.
    """
    return {
        "type": "object",
        "properties": {
            MARKS_FIELD: {
                "type": "object",
                "properties": {name: _box_schema() for name in names},
                "additionalProperties": False,
            }
        },
        "required": [MARKS_FIELD],
        "additionalProperties": False,
    }


def grounding_prompt(names: tuple[str, ...]) -> str:
    return (
        "Locate each of the following named objects in this camera frame: "
        + ", ".join(names)
        + ". For each name give its bounding box [x0, y0, x1, y1] in PIXELS "
        "of this image (x measured from the left edge, y from the top edge; "
        "x0,y0 the top left corner, x1,y1 the bottom right corner). Names "
        "that differ only by a trailing number are DIFFERENT objects of the "
        "same kind - give each its own box. Skip every name you cannot "
        "actually find in the frame by leaving it out."
    )


def grounding_to_marks(value: Any) -> list[dict[str, Any]]:
    """The grounding answer's {name: box} object, as labelled entries.

    Pure format conversion so everything downstream - the stored raw answer,
    parse_marks, the panel's history - keeps seeing the one established
    shape regardless of which flow produced the boxes.
    """
    if not isinstance(value, dict):
        return []
    return [{"label": name, "box": box} for name, box in value.items()]


def parse_marks(value: Any) -> tuple[Mark, ...]:
    """Read the model's boxes, keeping only what is drawable.

    Tolerant on purpose: a garbled entry is dropped, never fatal - the
    analysis result stands on its own and the marks are decoration on top.
    Reversed corners are reordered rather than refused, because models mix
    the convention up and the intended box is still unambiguous. A box that
    repeats an already kept box is dropped: a small model at temperature 0
    filled the array's remaining slots with copies of one detection.
    """
    if not isinstance(value, list):
        return ()
    marks: list[Mark] = []
    seen_boxes: set[tuple[int, int, int, int]] = set()
    for entry in value:
        if not isinstance(entry, dict):
            continue
        box = entry.get("box")
        label = entry.get("label")
        if not isinstance(box, list) or len(box) != 4:
            continue
        try:
            coords = [max(0, min(MARK_COORD_MAX, int(v))) for v in box]
        except (TypeError, ValueError):
            continue
        x0, x1 = sorted((coords[0], coords[2]))
        y0, y1 = sorted((coords[1], coords[3]))
        if x1 <= x0 or y1 <= y0:
            continue
        if (x0, y0, x1, y1) in seen_boxes:
            continue
        seen_boxes.add((x0, y0, x1, y1))
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

    Coordinates are pixels of the very frame being drawn on. They are still
    clamped into the image inside the filter expressions (min against iw/ih),
    because a model may claim a corner slightly past an edge and drawbox must
    not fail over it. ``with_labels`` is the drawtext capability switch: an
    ffmpeg without freetype still draws the boxes, only the words are lost.
    """
    filters: list[str] = []
    for index, mark in enumerate(marks):
        color = MARK_COLORS[index % len(MARK_COLORS)]
        # Commas inside min()/max() are filter-arg syntax and must be escaped.
        # Width and height are re-derived from the clamped corners and
        # floored at one pixel, so a claim entirely past an edge degrades to
        # a sliver on the edge instead of a negative size drawbox refuses.
        x = f"min({mark.x0}\\,iw-1)"
        y = f"min({mark.y0}\\,ih-1)"
        w = f"max(min({mark.x1}\\,iw)-min({mark.x0}\\,iw-1)\\,1)"
        h = f"max(min({mark.y1}\\,ih)-min({mark.y0}\\,ih-1)\\,1)"
        filters.append(
            f"drawbox=x={x}:y={y}:w={w}:h={h}"
            f":color={color}:t={MARK_BOX_THICKNESS}"
        )
        if not with_labels or not mark.label:
            continue
        text = escape_drawtext(mark.label)
        # The plaque sits above the box when there is room, inside its top
        # edge otherwise. Regression trap: drawtext calls the frame height
        # `h`, NOT `ih` - that is drawbox vocabulary, and an unknown
        # constant fails the whole filter graph, silently unmarked pictures
        # were the symptom.
        label_y = f"max(min({mark.y0}\\,h-1)-th-{MARK_BOX_THICKNESS}\\,2)"
        filters.append(
            f"drawtext=fontfile='{font}':text='{text}'"
            f":fontsize={MARK_FONT_SIZE}:fontcolor=black"
            f":box=1:boxcolor={color}@0.9:boxborderw=3"
            f":x=min({mark.x0}\\,w-1):y={label_y}"
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
