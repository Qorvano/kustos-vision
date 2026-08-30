"""Tests for the capability heuristic.

Deliberately exercised against several naming conventions, not one. A rule that
only fits the cameras that happen to be in the author's house is worse than no
rule, because it looks like it works.
"""

from __future__ import annotations

import pytest
from camwatch.core.capabilities import (
    CAPABILITY_KEYS,
    EntityCandidate,
    suggest_capabilities,
    suggest_streams,
)


def ent(entity_id: str, name: str = "", device_class: str | None = None):
    return EntityCandidate(entity_id, name, device_class)


# A pan-tilt camera exposing its functions as buttons with English object ids,
# which is what one widely used community integration produces.
TAPO_STYLE = [
    ent("camera.kamera_vorgarten_hd_stream", "Kamera Vorgarten HD Stream"),
    ent("camera.kamera_vorgarten_sd_stream", "Kamera Vorgarten SD Stream"),
    ent("button.kamera_vorgarten_move_up", "Kamera Vorgarten Move Up"),
    ent("button.kamera_vorgarten_move_down", "Kamera Vorgarten Move Down"),
    ent("button.kamera_vorgarten_move_left", "Kamera Vorgarten Move Left"),
    ent("button.kamera_vorgarten_move_right", "Kamera Vorgarten Move Right"),
    ent("button.kamera_vorgarten_manual_alarm_start", "Manual Alarm Start"),
    ent("button.kamera_vorgarten_manual_alarm_stop", "Manual Alarm Stop"),
    ent("light.kamera_vorgarten_floodlight_timed", "Floodlight (Timed)"),
    ent("number.kamera_vorgarten_spotlight_intensity", "Spotlight Intensity"),
    ent("select.kamera_vorgarten_move_to_preset", "Move to Preset"),
    ent("select.kamera_vorgarten_patrol_mode", "Patrol Mode"),
    ent("select.kamera_vorgarten_night_vision", "Night Vision"),
    ent("binary_sensor.vorgarten_motion", "Motion", device_class="motion"),
    ent("button.kamera_vorgarten_reboot", "Reboot"),
    ent("button.kamera_vorgarten_sync_time", "Sync Time"),
]

# The same functions under a different integration's naming.
PTZ_STYLE = [
    ent("camera.hof_main", "Hof Main"),
    ent("camera.hof_sub", "Hof Sub"),
    ent("button.hof_ptz_up", "Hof PTZ up"),
    ent("button.hof_ptz_down", "Hof PTZ down"),
    ent("button.hof_ptz_left", "Hof PTZ left"),
    ent("button.hof_ptz_right", "Hof PTZ right"),
    ent("switch.hof_siren", "Hof Siren"),
    ent("light.hof_spotlight", "Hof Spotlight"),
    ent("binary_sensor.hof_person", "Hof Person", device_class="occupancy"),
]

# German object ids, to show the rules are not tied to English.
GERMAN_STYLE = [
    ent("camera.tor", "Tor"),
    ent("button.tor_schwenken_hoch", "Tor schwenken hoch"),
    ent("button.tor_schwenken_runter", "Tor schwenken runter"),
    ent("button.tor_schwenken_links", "Tor schwenken links"),
    ent("button.tor_schwenken_rechts", "Tor schwenken rechts"),
    ent("switch.tor_licht", "Tor Licht"),
    ent("binary_sensor.tor_bewegung", "Tor Bewegung", device_class="motion"),
]


@pytest.mark.parametrize(
    ("candidates", "expected"),
    [
        (
            TAPO_STYLE,
            {
                "ptz_up": "button.kamera_vorgarten_move_up",
                "ptz_down": "button.kamera_vorgarten_move_down",
                "ptz_left": "button.kamera_vorgarten_move_left",
                "ptz_right": "button.kamera_vorgarten_move_right",
                "light": "light.kamera_vorgarten_floodlight_timed",
                "light_brightness": "number.kamera_vorgarten_spotlight_intensity",
                "ptz_preset": "select.kamera_vorgarten_move_to_preset",
                "ptz_patrol": "select.kamera_vorgarten_patrol_mode",
                "night_vision": "select.kamera_vorgarten_night_vision",
                "motion_trigger": "binary_sensor.vorgarten_motion",
                "siren_on": "button.kamera_vorgarten_manual_alarm_start",
                "siren_off": "button.kamera_vorgarten_manual_alarm_stop",
            },
        ),
        (
            PTZ_STYLE,
            {
                "ptz_up": "button.hof_ptz_up",
                "ptz_down": "button.hof_ptz_down",
                "ptz_left": "button.hof_ptz_left",
                "ptz_right": "button.hof_ptz_right",
                "siren": "switch.hof_siren",
                "light": "light.hof_spotlight",
                "motion_trigger": "binary_sensor.hof_person",
            },
        ),
        (
            GERMAN_STYLE,
            {
                "ptz_up": "button.tor_schwenken_hoch",
                "ptz_down": "button.tor_schwenken_runter",
                "ptz_left": "button.tor_schwenken_links",
                "ptz_right": "button.tor_schwenken_rechts",
                "light": "switch.tor_licht",
                "motion_trigger": "binary_sensor.tor_bewegung",
            },
        ),
    ],
    ids=["english-buttons", "ptz-naming", "german-naming"],
)
def test_capabilities_are_proposed_across_naming_conventions(
    candidates, expected
) -> None:
    assert suggest_capabilities(candidates) == expected


def test_directions_are_never_confused() -> None:
    """The four movement buttons differ by one word, which is exactly where a
    sloppy rule would swap them."""
    found = suggest_capabilities(TAPO_STYLE)
    assert found["ptz_up"].endswith("_up")
    assert found["ptz_down"].endswith("_down")
    assert found["ptz_left"].endswith("_left")
    assert found["ptz_right"].endswith("_right")


def test_unrelated_entities_are_left_alone() -> None:
    """Reboot and time sync are buttons on the same device and must not be
    proposed for anything."""
    proposed = set(suggest_capabilities(TAPO_STYLE).values())
    assert "button.kamera_vorgarten_reboot" not in proposed
    assert "button.kamera_vorgarten_sync_time" not in proposed


def test_an_entity_is_proposed_at_most_once() -> None:
    """Otherwise one entity fills several slots and the user has to undo the
    extras."""
    proposed = list(suggest_capabilities(TAPO_STYLE).values())
    assert len(proposed) == len(set(proposed))


def test_the_infrared_illuminator_does_not_win_the_light_slot() -> None:
    """Night vision is not a floodlight; a camera with both must not offer the
    illuminator as the light the user switches on."""
    found = suggest_capabilities(
        [
            ent("switch.cam_infrared_light", "Infrared light"),
            ent("light.cam_floodlight", "Floodlight"),
        ]
    )
    assert found["light"] == "light.cam_floodlight"


def test_an_illuminator_alone_is_not_offered_as_a_light() -> None:
    found = suggest_capabilities([ent("switch.cam_ir_light", "IR light")])
    assert "light" not in found


def test_motion_is_matched_by_device_class_not_by_name() -> None:
    """Motion sensors are named in every language there is; the device class
    is the one part integrations agree on."""
    found = suggest_capabilities(
        [ent("binary_sensor.whatever_xyz", "Etwas", device_class="motion")]
    )
    assert found["motion_trigger"] == "binary_sensor.whatever_xyz"


def test_a_binary_sensor_of_another_kind_is_not_a_motion_trigger() -> None:
    found = suggest_capabilities(
        [ent("binary_sensor.cam_tamper", "Tamper", device_class="tamper")]
    )
    assert "motion_trigger" not in found


def test_nothing_is_proposed_for_an_empty_device() -> None:
    assert suggest_capabilities([]) == {}


def test_every_rule_has_a_key_the_panel_knows() -> None:
    assert len(CAPABILITY_KEYS) == len(set(CAPABILITY_KEYS))


# ----------------------------------------------------------------------
# Streams
# ----------------------------------------------------------------------


def test_two_streams_are_told_apart_by_their_names() -> None:
    assert suggest_streams(TAPO_STYLE) == [
        ("hd", "camera.kamera_vorgarten_hd_stream"),
        ("sd", "camera.kamera_vorgarten_sd_stream"),
    ]


def test_main_and_sub_are_recognised_as_high_and_low() -> None:
    assert suggest_streams(PTZ_STYLE) == [
        ("hd", "camera.hof_main"),
        ("sd", "camera.hof_sub"),
    ]


def test_a_single_camera_entity_gets_a_neutral_key() -> None:
    """Calling it "hd" would be a guess about a quality nothing stated."""
    assert suggest_streams(GERMAN_STYLE) == [("main", "camera.tor")]


def test_unrecognised_streams_still_get_usable_keys() -> None:
    proposed = suggest_streams(
        [ent("camera.cam_one", "One"), ent("camera.cam_two", "Two")]
    )
    keys = [key for key, _ in proposed]
    assert keys == ["stream_1", "stream_2"]
    assert len(set(keys)) == 2


def test_a_device_without_a_camera_yields_no_streams() -> None:
    assert suggest_streams([ent("button.x", "X")]) == []
