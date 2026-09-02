"""Tests for the reported boxes: parsing the model's answer, drawing args."""

from __future__ import annotations

from pathlib import Path

from kustos_vision.core.marks import (
    MARK_COORD_MAX,
    MARKS_FIELD,
    MAX_LABEL_CHARS,
    MAX_MARKS,
    Mark,
    build_mark_args,
    escape_drawtext,
    marked_name,
    marks_prompt,
    marks_schema_fragment,
    parse_marks,
)

FONT = Path("/fonts/mono.ttf")


def entry(box, label="Gelbe Tonne"):
    return {"label": label, "box": box}


# ----------------------------------------------------------------------
# Parsing
# ----------------------------------------------------------------------


def test_a_clean_box_parses() -> None:
    marks = parse_marks([entry([100, 200, 400, 600])])
    assert marks == (Mark(label="Gelbe Tonne", x0=100, y0=200, x1=400, y1=600),)


def test_reversed_corners_are_reordered_not_refused() -> None:
    """Models mix the corner convention up; the intended box is still
    unambiguous, so drawing it beats dropping it."""
    marks = parse_marks([entry([400, 600, 100, 200])])
    assert marks[0] == Mark(label="Gelbe Tonne", x0=100, y0=200, x1=400, y1=600)


def test_coordinates_are_clamped_to_the_frame_cap() -> None:
    marks = parse_marks([entry([-50, 0, 5000, 100])])
    assert (marks[0].x0, marks[0].x1) == (0, MARK_COORD_MAX)


def test_a_repeated_box_is_dropped() -> None:
    """Regression: a small model at temperature 0 filled the array's
    remaining slots with copies of one detection - five identical boxes
    around the tire stack, each labelled a little differently."""
    marks = parse_marks(
        [
            entry([56, 32, 136, 191], label="Reifenstapel"),
            entry([56, 32, 136, 191], label="blaue Tonne"),
            entry([56, 32, 136, 191], label="blaue Tonne"),
            entry([200, 300, 400, 500], label="blaue Tonne"),
        ]
    )
    assert len(marks) == 2
    assert marks[0].label == "Reifenstapel"


def test_degenerate_and_garbled_entries_fall_away() -> None:
    """Marks are decoration on top of a finished analysis; a garbled entry
    must never be fatal."""
    assert parse_marks("nonsense") == ()
    assert (
        parse_marks(
            [
                entry([100, 100, 100, 400]),  # zero width
                "not a dict",
                {"label": "ohne Box"},
                entry(["a", "b", "c", "d"]),
                entry([1, 2, 3]),  # wrong length
            ]
        )
        == ()
    )


def test_more_than_the_cap_is_cut() -> None:
    many = [entry([i, i, i + 10, i + 10]) for i in range(0, 200, 20)]
    assert len(parse_marks(many)) == MAX_MARKS


def test_a_label_is_a_name_not_a_sentence() -> None:
    marks = parse_marks([entry([0, 0, 10, 10], label="x" * 100)])
    assert len(marks[0].label) == MAX_LABEL_CHARS


# ----------------------------------------------------------------------
# Drawing arguments
# ----------------------------------------------------------------------


def test_the_boxes_are_pixels_clamped_into_the_frame() -> None:
    """Regression: coordinates are PIXELS of the sent frame. The Qwen-VL
    class emits pixel coordinates no matter what grid the prompt requests,
    and mapping them onto a 0..1000 grid squashed every box upward - the
    "boxes sit too high" pattern across every tested model. The filter still
    clamps against iw/ih, because a claimed corner slightly past an edge
    must not fail drawbox."""
    args = build_mark_args(
        Path("/a.jpg"),
        Path("/b.jpg"),
        (Mark("Tonne", 100, 200, 400, 600),),
        FONT,
        with_labels=True,
    )
    graph = args[args.index("-vf") + 1]
    assert "x=min(100\\,iw-1)" in graph
    assert "y=min(200\\,ih-1)" in graph
    assert "w=max(min(400\\,iw)-min(100\\,iw-1)\\,1)" in graph
    assert "drawtext" in graph
    assert "text='Tonne'" in graph


def test_drawtext_never_uses_drawbox_vocabulary() -> None:
    """Regression: drawtext calls the frame height h, not ih - ih is
    drawbox vocabulary, and the unknown constant failed the whole filter
    graph. The symptom was silently unmarked pictures on every analysis,
    invisible because the exit code was swallowed too."""
    args = build_mark_args(
        Path("/a.jpg"),
        Path("/b.jpg"),
        (Mark("Tonne", 100, 200, 400, 600),),
        FONT,
        with_labels=True,
    )
    graph = args[args.index("-vf") + 1]
    # One mark: its drawtext is the last filter, everything after the
    # keyword belongs to it.
    drawtext_part = graph[graph.index("drawtext") :]
    assert "ih" not in drawtext_part
    assert "iw" not in drawtext_part
    assert "\\,h-1)" in drawtext_part


def test_without_freetype_the_boxes_survive_and_the_words_are_lost() -> None:
    args = build_mark_args(
        Path("/a.jpg"),
        Path("/b.jpg"),
        (Mark("Tonne", 0, 0, 10, 10),),
        FONT,
        with_labels=False,
    )
    graph = args[args.index("-vf") + 1]
    assert "drawbox" in graph
    assert "drawtext" not in graph


def test_labels_are_escaped_for_the_option_parser() -> None:
    """Colon, quote, percent and backslash are drawtext syntax; a label
    containing them must not be able to inject options."""
    assert escape_drawtext(r"a:b'c%d\e") == r"a\:b\'c\%d\\e"


def test_the_marked_name_mirrors_its_ring_frame() -> None:
    assert marked_name("frame_07.jpg") == "marked_07.jpg"


# ----------------------------------------------------------------------
# Schema and prompt
# ----------------------------------------------------------------------


def test_the_schema_fragment_is_strict_and_bounded() -> None:
    fragment = marks_schema_fragment()
    assert fragment["maxItems"] == MAX_MARKS
    assert fragment["items"]["additionalProperties"] is False
    assert (
        fragment["items"]["properties"]["box"]["items"]["maximum"]
        == MARK_COORD_MAX
    )


def test_the_prompt_asks_for_every_recognised_object() -> None:
    """Regression: the first wording tied boxes to what the questions asked,
    so a description mentioning three bins produced boxes for only the two
    with sensors - and a dog walking through would have gone unboxed. The
    contract is: every recognised THING, but never surfaces or background."""
    text = marks_prompt()
    assert MARKS_FIELD in text
    assert "any other clearly recognisable thing" in text
    assert "animal" in text
    assert "hedges" in text
    assert "PIXELS" in text


# ----------------------------------------------------------------------
# The split flow: naming and locating are different jobs
# ----------------------------------------------------------------------


def test_object_names_are_trimmed_deduplicated_and_capped() -> None:
    from kustos_vision.core.marks import parse_object_names

    names = parse_object_names(
        ["  blaue Tonne ", "blaue Tonne", "", None, "Reifenstapel"]
    )
    assert names == ("blaue Tonne", "Reifenstapel")
    assert len(parse_object_names([f"n{i}" for i in range(20)])) == MAX_MARKS


def test_the_grounding_schema_locks_labels_to_the_given_names() -> None:
    """The locating model cannot even mislabel what it marks: the labels are
    an enum over the names the main model reported - that split answers the
    objection that a weak recogniser would caption the boxes wrongly."""
    from kustos_vision.core.marks import MARKS_FIELD, grounding_schema

    schema = grounding_schema(("blaue Tonne", "Reifenstapel"))
    items = schema["properties"][MARKS_FIELD]["items"]
    assert items["properties"]["label"]["enum"] == ["blaue Tonne", "Reifenstapel"]
    assert schema["properties"][MARKS_FIELD]["maxItems"] == 2
    assert items["properties"]["box"]["items"]["maximum"] == MARK_COORD_MAX


def test_the_grounding_prompt_names_the_targets_and_allows_skipping() -> None:
    from kustos_vision.core.marks import grounding_prompt

    text = grounding_prompt(("blaue Tonne", "Reifenstapel"))
    assert "blaue Tonne, Reifenstapel" in text
    assert "Skip every name you cannot actually find" in text
    assert "PIXELS" in text


def test_the_objects_field_asks_for_names_only() -> None:
    from kustos_vision.core.marks import objects_prompt, objects_schema_fragment

    assert "Names only" in objects_prompt()
    fragment = objects_schema_fragment()
    assert fragment["items"] == {"type": "string"}
    assert fragment["maxItems"] == MAX_MARKS


def test_the_object_list_is_an_inventory_not_an_anomaly_report() -> None:
    """Regression: a garden profile whose extra context declared furniture
    and bike "nothing unusual" made the main model flap between listing
    them and returning an empty list for near-identical frames - and an
    empty list silently skips the whole grounding step. The prompt must
    say that ordinariness never exempts an object."""
    from kustos_vision.core.marks import objects_prompt

    text = objects_prompt()
    assert "inventory" in text
    assert "not a report of anomalies" in text
    assert "unremarkable" in text
