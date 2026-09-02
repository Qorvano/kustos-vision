"""Tests for the reference-picture store logic and the request plan."""

from __future__ import annotations

import time
from pathlib import Path

from kustos_vision.core.observations import Observation, ObservationType
from kustos_vision.core.references import (
    MAX_PICTURES_PER_REQUEST,
    REFERENCE_ID_LENGTH,
    REFERENCE_ORPHAN_GRACE_SECONDS,
    ReferenceImage,
    asset_id_for,
    is_asset_id,
    plan_pictures,
    prune_unreferenced,
    referenced_asset_ids,
    sniff_image,
)

JPEG = b"\xff\xd8\xff\xe0rest-of-a-jpeg"
PNG = b"\x89PNG\r\n\x1a\nrest-of-a-png"


def ref(asset: str = "a" * 32, **overrides) -> ReferenceImage:
    return ReferenceImage(asset_id=asset, **overrides)


def obs(key: str, references: tuple = ()) -> Observation:
    return Observation(
        key=key,
        type=ObservationType.BOOLEAN,
        question="Ist die gelbe Tonne zu sehen?",
        references=references,
    )


# ----------------------------------------------------------------------
# Sniffing
# ----------------------------------------------------------------------


def test_jpeg_and_png_are_recognised_by_their_bytes() -> None:
    assert sniff_image(JPEG) == "image/jpeg"
    assert sniff_image(PNG) == "image/png"


def test_everything_else_is_refused() -> None:
    """From the content, never the file name: a text file renamed .jpg is
    exactly what an extension check waves through."""
    assert sniff_image(b"hello, I claim to be a picture") is None
    assert sniff_image(b"GIF89a...") is None
    assert sniff_image(b"<svg xmlns='...'></svg>") is None
    assert sniff_image(b"") is None


# ----------------------------------------------------------------------
# Content addressing
# ----------------------------------------------------------------------


def test_the_id_is_the_picture() -> None:
    assert asset_id_for(JPEG) == asset_id_for(JPEG)
    assert asset_id_for(JPEG) != asset_id_for(JPEG + b"\x00")


def test_the_id_has_the_documented_shape() -> None:
    asset_id = asset_id_for(JPEG)
    assert len(asset_id) == REFERENCE_ID_LENGTH
    assert is_asset_id(asset_id)
    assert not is_asset_id("../" + "a" * 29)
    assert not is_asset_id("A" * REFERENCE_ID_LENGTH)
    assert not is_asset_id("a" * (REFERENCE_ID_LENGTH - 1))


# ----------------------------------------------------------------------
# The orphan sweep
# ----------------------------------------------------------------------


def test_the_sweep_spares_what_is_named_and_what_is_young(tmp_path: Path) -> None:
    """Regression: the sweep must not delete the picture while its caption is
    still being typed - an upload exists before the profile that names it."""
    named = tmp_path / ("a" * 32 + ".jpg")
    young = tmp_path / ("b" * 32 + ".jpg")
    old = tmp_path / ("c" * 32 + ".jpg")
    for file in (named, young, old):
        file.write_bytes(JPEG)
    ancient = time.time() - 2 * REFERENCE_ORPHAN_GRACE_SECONDS
    import os

    os.utime(named, (ancient, ancient))
    os.utime(old, (ancient, ancient))

    fallen = prune_unreferenced(tmp_path, {"a" * 32}, time.time())

    assert named.is_file()
    assert young.is_file()
    assert not old.is_file()
    assert fallen == [old]


def test_the_burned_copy_counts_as_referenced() -> None:
    """Deleting the original strands the drawn labels' editability; deleting
    the burned copy strands the request. Both are protected."""
    ids = referenced_asset_ids(
        [obs("frage", (ref("a" * 32, burned_asset_id="b" * 32),))]
    )
    assert ids == {"a" * 32, "b" * 32}


# ----------------------------------------------------------------------
# The request plan
# ----------------------------------------------------------------------


def test_the_burned_copy_travels_when_labels_were_drawn() -> None:
    planned = plan_pictures(
        [
            obs(
                "frage",
                (
                    ref(
                        "a" * 32,
                        burned_asset_id="b" * 32,
                        regions=({"x": 0.1, "y": 0.1, "w": 0.2, "h": 0.2, "label": "Gelbe Tonne"},),
                    ),
                ),
            )
        ]
    )
    assert planned[0].asset_id == "b" * 32
    assert "labelled boxes" in planned[0].preamble


def test_the_original_travels_when_nothing_was_drawn() -> None:
    planned = plan_pictures([obs("frage", (ref("a" * 32, caption="Der Hinterhof."),))])
    assert planned[0].asset_id == "a" * 32
    assert "Der Hinterhof." in planned[0].preamble
    assert "labelled boxes" not in planned[0].preamble


def test_every_reference_is_declared_not_to_be_the_frame() -> None:
    """The whole hazard of a reference is that the model treats it as
    evidence; every preamble has to disclaim that explicitly."""
    planned = plan_pictures([obs("frage", (ref(),))])
    assert "NOT the current camera frame" in planned[0].preamble


def test_the_cap_protects_the_request_and_keeps_the_frame_slot() -> None:
    """A request that overflows the runner's context fails wholesale; the
    plan never exceeds the picture budget minus the frame's own slot."""
    many = [
        obs(f"frage_{i}", (ref(str(i) * 32 if len(str(i)) == 1 else "d" * 32),))
        for i in range(9)
    ]
    planned = plan_pictures(many)
    assert len(planned) == MAX_PICTURES_PER_REQUEST - 1


# ----------------------------------------------------------------------
# The normal-scene baseline
# ----------------------------------------------------------------------


def test_no_baseline_plans_nothing() -> None:
    from kustos_vision.core.references import plan_baseline

    assert plan_baseline("") == ()


def test_the_baseline_frames_the_comparison_and_disclaims_evidence() -> None:
    """The normal-scene picture exists to steer the object list toward what
    DIFFERS from it - and like every reference it must disclaim being the
    current frame, or it becomes evidence for things long gone."""
    from kustos_vision.core.references import plan_baseline

    (planned,) = plan_baseline("b" * 32)
    assert planned.asset_id == "b" * 32
    assert "NORMAL scene" in planned.preamble
    assert "NOT the current frame" in planned.preamble
    assert "new, missing or moved" in planned.preamble
    assert "priority in the object list" in planned.preamble


def test_baselines_count_as_referenced_for_the_sweep() -> None:
    """Regression guard for the orphan sweep: a pinned normal scene is named
    nowhere in the observations, so without this collector the sweep would
    delete a camera's baseline an hour after any unrelated save."""
    from kustos_vision.core.references import baseline_asset_ids

    class Profile:
        def __init__(self, baseline: str) -> None:
            self.baseline = baseline

    ids = baseline_asset_ids([Profile("e" * 32), Profile(""), Profile("e" * 32)])
    assert ids == {"e" * 32}


# ----------------------------------------------------------------------
# Round trip
# ----------------------------------------------------------------------


def test_regions_survive_a_round_trip_untouched() -> None:
    """Forward compatibility: a picture annotated by a newer panel must not
    be flattened by an older backend round-tripping the configuration."""
    original = ref(
        caption="Alle Tonnen.",
        regions=({"x": 0.1, "y": 0.2, "w": 0.3, "h": 0.4, "label": "Gelb", "extra": 1},),
        burned_asset_id="b" * 32,
    )
    restored = ReferenceImage.from_dict(original.as_dict())
    assert restored == original


def test_an_observation_with_references_round_trips() -> None:
    observation = obs("frage", (ref(caption="Der Hinterhof."),))
    restored = Observation.from_dict(observation.as_dict())
    assert restored.references == observation.references


def test_a_stored_observation_without_references_still_loads() -> None:
    restored = Observation.from_dict(
        {"key": "alt", "type": "boolean", "question": "Sichtbar?"}
    )
    assert restored.references == ()
