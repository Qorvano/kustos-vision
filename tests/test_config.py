"""Tests for the configuration model and its serialisation."""

from __future__ import annotations

import pytest
from kustos_vision.core.config import (
    CONFIG_VERSION,
    CameraConfig,
    CameraViewSettings,
    CamwatchConfig,
    CapabilityBinding,
    ConfigError,
    ControlKind,
    CustomControl,
    StorageConfig,
    StreamConfig,
    ViewConfig,
    kinds_for_entity,
)
from kustos_vision.core.recorder import AudioMode


def storage(**overrides) -> StorageConfig:
    return StorageConfig(**{"base_path": "/media/kustos_vision", **overrides})


def camera(**overrides) -> CameraConfig:
    values = {
        "slug": "beispiel",
        "name": "Beispiel",
        "streams": (StreamConfig("hd", "camera.beispiel_hd"),),
    }
    values.update(overrides)
    return CameraConfig(**values)


# ----------------------------------------------------------------------
# Streams
# ----------------------------------------------------------------------


def test_stream_defaults_to_recording_with_transcoded_audio() -> None:
    """Transcoding is the only audio setting that works with every camera,
    so it is what an unconfigured stream gets."""
    stream = StreamConfig("hd", "camera.x")
    assert stream.record is True
    assert stream.audio is AudioMode.TRANSCODE


def test_stream_key_must_be_usable_as_a_file_name() -> None:
    with pytest.raises(ConfigError, match="file name"):
        StreamConfig("../escape", "camera.x")


def test_stream_must_point_at_a_camera_entity() -> None:
    with pytest.raises(ConfigError, match="camera entity"):
        StreamConfig("hd", "switch.x")


def test_stream_round_trips() -> None:
    stream = StreamConfig("sd", "camera.x", record=False, audio=AudioMode.NONE)
    assert StreamConfig.from_dict(stream.as_dict()) == stream


def test_unknown_audio_mode_is_refused() -> None:
    with pytest.raises(ConfigError, match="audio mode"):
        StreamConfig.from_dict({"key": "hd", "entity_id": "camera.x", "audio": "flac"})


# ----------------------------------------------------------------------
# Capabilities
# ----------------------------------------------------------------------


def test_a_capability_can_bind_an_entity() -> None:
    binding = CapabilityBinding(entity_id="button.move_up")
    assert CapabilityBinding.from_dict(binding.as_dict()) == binding


def test_a_capability_can_bind_a_service_call_with_data() -> None:
    """Not every camera exposes a capability as an entity, so a free action
    with its own data has to be possible."""
    binding = CapabilityBinding(action="onvif.ptz", data={"pan": "LEFT"})
    assert CapabilityBinding.from_dict(binding.as_dict()) == binding


def test_a_capability_must_bind_something() -> None:
    with pytest.raises(ConfigError, match="entity or an action"):
        CapabilityBinding()


def test_an_action_must_name_a_service() -> None:
    with pytest.raises(ConfigError, match=r"domain\.service"):
        CapabilityBinding(action="ptz")


# ----------------------------------------------------------------------
# Cameras
# ----------------------------------------------------------------------


def test_camera_slug_must_be_usable_as_a_directory() -> None:
    with pytest.raises(ConfigError, match="directory"):
        camera(slug="../escape")


def test_camera_needs_a_name() -> None:
    with pytest.raises(ConfigError, match="name"):
        camera(name="")


def test_duplicate_stream_keys_are_refused() -> None:
    """Two streams with the same key would write into the same files."""
    with pytest.raises(ConfigError, match="duplicate stream keys"):
        camera(
            streams=(
                StreamConfig("hd", "camera.a"),
                StreamConfig("hd", "camera.b"),
            )
        )


def test_recorded_streams_skips_streams_not_being_recorded() -> None:
    cam = camera(
        streams=(
            StreamConfig("hd", "camera.a", record=True),
            StreamConfig("sd", "camera.b", record=False),
        )
    )
    assert [s.key for s in cam.recorded_streams] == ["hd"]


def test_a_disabled_camera_records_nothing() -> None:
    cam = camera(enabled=False)
    assert cam.recorded_streams == ()


def test_a_stream_can_be_looked_up_by_key() -> None:
    cam = camera()
    assert cam.stream("hd") is not None
    assert cam.stream("sd") is None


def test_retention_days_must_be_positive_or_absent() -> None:
    """Zero would mean deleting everything at once, which is never intended;
    disabling the age limit is done with null."""
    with pytest.raises(ConfigError, match="retention_days"):
        camera(retention_days=0)
    assert camera(retention_days=None).retention_days is None


def test_camera_round_trips_with_everything_set() -> None:
    cam = camera(
        streams=(
            StreamConfig("hd", "camera.a"),
            StreamConfig("sd", "camera.b", record=False, audio=AudioMode.COPY),
        ),
        capabilities={
            "ptz_up": CapabilityBinding(entity_id="button.up"),
            "light": CapabilityBinding(action="light.turn_on", data={"brightness": 200}),
        },
        retention_days=14,
        area_id="beispiel",
    )
    assert CameraConfig.from_dict(cam.as_dict()) == cam


# ----------------------------------------------------------------------
# Storage
# ----------------------------------------------------------------------


def test_storage_needs_a_path() -> None:
    with pytest.raises(ConfigError, match="storage path"):
        StorageConfig(base_path="")


@pytest.mark.parametrize("seconds", [0, -1])
def test_segment_length_must_be_positive(seconds: int) -> None:
    with pytest.raises(ConfigError, match="segment_seconds"):
        storage(segment_seconds=seconds)


def test_size_budget_must_be_positive_or_absent() -> None:
    with pytest.raises(ConfigError, match="max_total_bytes"):
        storage(max_total_bytes=0)
    assert storage(max_total_bytes=None).max_total_bytes is None


def test_storage_round_trips() -> None:
    config = storage(segment_seconds=60, max_total_bytes=1_000_000, max_gap_seconds=3.0)
    assert StorageConfig.from_dict(config.as_dict()) == config


# ----------------------------------------------------------------------
# Whole configuration
# ----------------------------------------------------------------------


def test_config_round_trips() -> None:
    config = CamwatchConfig(storage=storage(), cameras=(camera(),))
    assert CamwatchConfig.from_dict(config.as_dict()) == config


def test_stored_version_is_recorded() -> None:
    assert CamwatchConfig(storage=storage()).as_dict()["version"] == CONFIG_VERSION


def test_a_newer_stored_version_is_refused() -> None:
    """Reading a configuration written by a later release and silently
    dropping the fields it does not know would lose the user's settings."""
    data = CamwatchConfig(storage=storage()).as_dict()
    data["version"] = CONFIG_VERSION + 1
    with pytest.raises(ConfigError, match="newer"):
        CamwatchConfig.from_dict(data)


def test_duplicate_camera_slugs_are_refused() -> None:
    data = CamwatchConfig(storage=storage()).as_dict()
    data["cameras"] = [camera().as_dict(), camera().as_dict()]
    with pytest.raises(ConfigError, match="duplicate camera slugs"):
        CamwatchConfig.from_dict(data)


def test_with_camera_replaces_rather_than_duplicates() -> None:
    config = CamwatchConfig(storage=storage(), cameras=(camera(name="Alt"),))
    updated = config.with_camera(camera(name="Neu"))
    assert len(updated.cameras) == 1
    assert updated.camera("beispiel").name == "Neu"


def test_with_camera_adds_a_new_one() -> None:
    config = CamwatchConfig(storage=storage(), cameras=(camera(),))
    updated = config.with_camera(camera(slug="muster", name="Muster"))
    assert {c.slug for c in updated.cameras} == {"beispiel", "muster"}


def test_without_camera_removes_it() -> None:
    config = CamwatchConfig(storage=storage(), cameras=(camera(),))
    assert config.without_camera("beispiel").cameras == ()


def test_updates_leave_the_original_untouched() -> None:
    """The configuration is passed around freely, so mutation would be a
    source of hard-to-find bugs."""
    config = CamwatchConfig(storage=storage(), cameras=(camera(),))
    config.without_camera("beispiel")
    assert len(config.cameras) == 1


def test_retention_limits_omit_cameras_without_one() -> None:
    """The retention policy treats an absent entry as "no limit", so a camera
    without an age limit must not appear at all."""
    config = CamwatchConfig(
        storage=storage(),
        cameras=(
            camera(slug="beispiel", retention_days=7),
            camera(slug="muster", name="Muster", retention_days=None),
        ),
    )
    assert config.retention_days_by_camera == {"beispiel": 7}


# ----------------------------------------------------------------------
# Views
# ----------------------------------------------------------------------


def view(**overrides) -> ViewConfig:
    return ViewConfig(**{"id": "aussen", "name": "Außen", **overrides})


def test_view_id_must_be_a_usable_identifier() -> None:
    with pytest.raises(ConfigError, match="view id"):
        view(id="../escape")


def test_view_needs_a_name() -> None:
    with pytest.raises(ConfigError, match="name"):
        view(name="")


def test_columns_may_be_zero_for_automatic_layout() -> None:
    assert view(columns=0).columns == 0
    with pytest.raises(ConfigError, match="columns"):
        view(columns=-1)


def test_view_round_trips() -> None:
    original = view(icon="mdi:home", columns=3)
    assert ViewConfig.from_dict(original.as_dict()) == original


def test_views_survive_the_whole_config_round_trip() -> None:
    config = CamwatchConfig(
        storage=storage(),
        cameras=(camera(view_settings={"aussen": CameraViewSettings(position=1)}),),
        views=(view(id="aussen", name="Außen"),),
    )
    assert CamwatchConfig.from_dict(config.as_dict()) == config


def test_duplicate_view_ids_are_refused_when_loading() -> None:
    data = CamwatchConfig(storage=storage()).as_dict()
    data["views"] = [view().as_dict(), view().as_dict()]
    with pytest.raises(ConfigError, match="duplicate view ids"):
        CamwatchConfig.from_dict(data)


def test_editing_a_view_keeps_its_position() -> None:
    """Views are the panel's tabs; editing one must not move it to the end."""
    config = CamwatchConfig(
        storage=storage(),
        views=(view(id="a", name="A"), view(id="b", name="B"), view(id="c", name="C")),
    )
    updated = config.with_view(view(id="b", name="B neu"))
    assert [v.id for v in updated.views] == ["a", "b", "c"]
    assert updated.view("b").name == "B neu"


def test_a_new_view_is_appended() -> None:
    config = CamwatchConfig(storage=storage(), views=(view(id="a", name="A"),))
    assert [v.id for v in config.with_view(view(id="b", name="B")).views] == ["a", "b"]


def test_views_can_be_reordered_wholesale() -> None:
    config = CamwatchConfig(
        storage=storage(), views=(view(id="a", name="A"), view(id="b", name="B"))
    )
    reordered = config.with_views((config.view("b"), config.view("a")))
    assert [v.id for v in reordered.views] == ["b", "a"]


def test_reordering_refuses_duplicates() -> None:
    config = CamwatchConfig(storage=storage())
    with pytest.raises(ConfigError, match="duplicate view ids"):
        config.with_views((view(id="a", name="A"), view(id="a", name="A")))


def test_a_view_can_be_removed() -> None:
    config = CamwatchConfig(storage=storage(), views=(view(),))
    assert config.without_view("aussen").views == ()


def test_deleting_a_camera_removes_it_from_every_view() -> None:
    """Membership lives on the camera now, so deleting the camera takes its
    view settings with it and no view can render a tile for nothing."""
    shown = {"aussen": CameraViewSettings(), "alle": CameraViewSettings()}
    config = CamwatchConfig(
        storage=storage(),
        cameras=(
            camera(slug="beispiel", view_settings=dict(shown)),
            camera(slug="muster", name="Muster", view_settings=dict(shown)),
        ),
        views=(view(id="aussen"), view(id="alle", name="Alle")),
    )
    updated = config.without_camera("beispiel")
    assert [c.slug for c in updated.cameras] == ["muster"]
    assert [c.slug for c in updated.cameras_in_view("aussen")] == ["muster"]


# ----------------------------------------------------------------------
# Per-view camera settings
# ----------------------------------------------------------------------


def shown(**overrides) -> CameraViewSettings:
    return CameraViewSettings(**overrides)


def test_a_camera_is_only_in_the_views_it_names() -> None:
    cam = camera(view_settings={"aussen": shown()})
    assert cam.settings_for("aussen") is not None
    assert cam.settings_for("innen") is None


def test_a_camera_can_be_hidden_from_a_view_without_removing_it() -> None:
    """Keeps the stream and control choices for when it is shown again."""
    cam = camera(view_settings={"aussen": shown(visible=False, stream_key="hd")})
    assert cam.settings_for("aussen") is None
    assert cam.view_settings["aussen"].stream_key == "hd"


def test_a_view_gets_the_stream_it_asked_for() -> None:
    cam = camera(
        streams=(
            StreamConfig("hd", "camera.a", record=True),
            StreamConfig("sd", "camera.b", record=False),
        ),
        view_settings={"wand": shown(stream_key="hd"), "bedien": shown(stream_key="sd")},
    )
    assert cam.stream_for("wand").key == "hd"
    assert cam.stream_for("bedien").key == "sd"


def test_without_a_choice_the_view_gets_the_stream_nobody_is_recording() -> None:
    """Watching the recorded stream live would pull it from the camera a
    second time; the substream is free."""
    cam = camera(
        streams=(
            StreamConfig("hd", "camera.a", record=True),
            StreamConfig("sd", "camera.b", record=False),
        ),
        view_settings={"irgendeine": shown()},
    )
    assert cam.stream_for("irgendeine").key == "sd"


def test_a_stream_key_that_no_longer_exists_falls_back() -> None:
    """Renaming a stream must not leave a view showing nothing."""
    cam = camera(view_settings={"aussen": shown(stream_key="gibtsnicht")})
    assert cam.stream_for("aussen").key == "hd"


def test_a_view_can_show_a_subset_of_the_controls() -> None:
    cam = camera(
        capabilities={
            "ptz_up": CapabilityBinding(entity_id="button.a"),
            "light": CapabilityBinding(entity_id="light.b"),
        },
        view_settings={"nur_licht": shown(capabilities=("light",))},
    )
    assert cam.capabilities_for("nur_licht") == ("light",)


def test_a_view_can_show_no_controls_at_all() -> None:
    """What a wall display wants; distinct from "not configured"."""
    cam = camera(
        capabilities={"light": CapabilityBinding(entity_id="light.b")},
        view_settings={"wand": shown(capabilities=())},
    )
    assert cam.capabilities_for("wand") == ()


def test_without_a_choice_every_bound_control_is_offered() -> None:
    cam = camera(
        capabilities={
            "ptz_up": CapabilityBinding(entity_id="button.a"),
            "light": CapabilityBinding(entity_id="light.b"),
        },
        view_settings={"aussen": shown()},
    )
    assert set(cam.capabilities_for("aussen")) == {"ptz_up", "light"}


def test_a_control_that_is_not_bound_is_never_offered() -> None:
    """Offering a button that cannot work is worse than offering none."""
    cam = camera(
        capabilities={"light": CapabilityBinding(entity_id="light.b")},
        view_settings={"aussen": shown(capabilities=("light", "siren"))},
    )
    assert cam.capabilities_for("aussen") == ("light",)


def test_cameras_in_a_view_are_ordered_by_position_then_name() -> None:
    config = CamwatchConfig(
        storage=storage(),
        cameras=(
            camera(slug="c", name="Zebra", view_settings={"v": shown(position=0)}),
            camera(slug="a", name="Anton", view_settings={"v": shown(position=1)}),
            camera(slug="b", name="Berta", view_settings={"v": shown(position=0)}),
        ),
        views=(view(id="v", name="V"),),
    )
    assert [c.name for c in config.cameras_in_view("v")] == ["Berta", "Zebra", "Anton"]


def test_a_disabled_camera_is_in_no_view() -> None:
    config = CamwatchConfig(
        storage=storage(),
        cameras=(camera(enabled=False, view_settings={"v": shown()}),),
        views=(view(id="v", name="V"),),
    )
    assert config.cameras_in_view("v") == ()


def test_removing_a_view_clears_it_from_the_cameras() -> None:
    """A leftover setting would silently resurrect the old layout if a view
    with the same id were created again."""
    config = CamwatchConfig(
        storage=storage(),
        cameras=(camera(view_settings={"v": shown(stream_key="hd")}),),
        views=(view(id="v", name="V"),),
    )
    updated = config.without_view("v")
    assert updated.views == ()
    assert updated.cameras[0].view_settings == {}


# ----------------------------------------------------------------------
# Migration
# ----------------------------------------------------------------------


def test_view_membership_migrates_onto_the_cameras() -> None:
    """Version 2 moved membership from the view to the camera. An existing
    installation must come across without anyone re-creating their layout."""
    old = {
        "version": 1,
        "storage": {"base_path": "/media/x"},
        "cameras": [
            {"slug": "eins", "name": "Eins", "streams": []},
            {"slug": "zwei", "name": "Zwei", "streams": []},
        ],
        "views": [
            {"id": "v", "name": "V", "cameras": ["zwei", "eins"], "columns": 2}
        ],
    }
    config = CamwatchConfig.from_dict(old)

    assert [v.name for v in config.views] == ["V"]
    assert config.view("v").columns == 2
    # The order the view listed them in is preserved as positions.
    assert [c.slug for c in config.cameras_in_view("v")] == ["zwei", "eins"]


def test_migration_leaves_the_stored_dictionary_alone() -> None:
    """A migration that goes wrong must not corrupt what is still on disk."""
    old = {
        "version": 1,
        "storage": {"base_path": "/media/x"},
        "cameras": [{"slug": "eins", "name": "Eins", "streams": []}],
        "views": [{"id": "v", "name": "V", "cameras": ["eins"]}],
    }
    CamwatchConfig.from_dict(old)
    assert old["views"][0]["cameras"] == ["eins"]


def test_migration_ignores_a_camera_a_view_named_but_does_not_exist() -> None:
    old = {
        "version": 1,
        "storage": {"base_path": "/media/x"},
        "cameras": [],
        "views": [{"id": "v", "name": "V", "cameras": ["weg"]}],
    }
    config = CamwatchConfig.from_dict(old)
    assert config.cameras_in_view("v") == ()


def test_a_current_configuration_is_not_migrated_again() -> None:
    config = CamwatchConfig(
        storage=storage(),
        cameras=(camera(view_settings={"v": shown(position=3)}),),
        views=(view(id="v", name="V"),),
    )
    assert CamwatchConfig.from_dict(config.as_dict()) == config


def test_the_order_of_a_whole_view_can_be_set_at_once() -> None:
    """The order belongs to the view, not to any one camera, so it is edited as
    a list. Numbering each camera separately would mean opening every one of
    them to find out which position is still free."""
    config = CamwatchConfig(
        storage=storage(),
        cameras=(
            camera(slug="a", name="A", view_settings={"v": shown(position=0)}),
            camera(slug="b", name="B", view_settings={"v": shown(position=1)}),
            camera(slug="c", name="C", view_settings={"v": shown(position=2)}),
        ),
        views=(view(id="v", name="V"),),
    )
    reordered = config.with_view_order("v", ["c", "a", "b"])
    assert [c.slug for c in reordered.cameras_in_view("v")] == ["c", "a", "b"]


def test_reordering_one_view_leaves_the_others_alone() -> None:
    config = CamwatchConfig(
        storage=storage(),
        cameras=(
            camera(slug="a", name="A",
                   view_settings={"v": shown(position=0), "w": shown(position=0)}),
            camera(slug="b", name="B",
                   view_settings={"v": shown(position=1), "w": shown(position=1)}),
        ),
        views=(view(id="v", name="V"), view(id="w", name="W")),
    )
    reordered = config.with_view_order("v", ["b", "a"])
    assert [c.slug for c in reordered.cameras_in_view("v")] == ["b", "a"]
    assert [c.slug for c in reordered.cameras_in_view("w")] == ["a", "b"]


def test_a_camera_the_order_does_not_mention_keeps_its_place() -> None:
    """A stale list must not silently reshuffle what it does not know about."""
    config = CamwatchConfig(
        storage=storage(),
        cameras=(
            camera(slug="a", name="A", view_settings={"v": shown(position=5)}),
            camera(slug="b", name="B", view_settings={"v": shown(position=9)}),
        ),
        views=(view(id="v", name="V"),),
    )
    reordered = config.with_view_order("v", ["b"])
    assert reordered.camera("b").view_settings["v"].position == 0
    assert reordered.camera("a").view_settings["v"].position == 5


def test_ordering_ignores_a_camera_that_is_not_in_the_view() -> None:
    config = CamwatchConfig(
        storage=storage(),
        cameras=(camera(slug="a", name="A"),),
        views=(view(id="v", name="V"),),
    )
    assert config.with_view_order("v", ["a"]) == config


# ----------------------------------------------------------------------
# Custom controls
# ----------------------------------------------------------------------


def control(**overrides) -> CustomControl:
    values = {
        "key": "zoom_rein",
        "name": "Zoom rein",
        "kind": ControlKind.BUTTON,
        "binding": CapabilityBinding(entity_id="button.zoom_in"),
    }
    values.update(overrides)
    return CustomControl(**values)


def test_a_custom_control_covers_what_no_slot_does() -> None:
    """Measured against one ordinary camera, eighteen of its thirty-one
    entities fit no built-in slot."""
    cam = camera(controls=(control(),))
    assert cam.control("zoom_rein") is not None
    assert cam.control("gibtsnicht") is None


def test_a_control_needs_a_usable_key_and_a_name() -> None:
    with pytest.raises(ConfigError, match="identifier"):
        control(key="Zoom rein")
    with pytest.raises(ConfigError, match="name"):
        control(name="  ")


def test_controls_may_not_repeat_a_key() -> None:
    with pytest.raises(ConfigError, match="duplicate control keys"):
        camera(controls=(control(), control()))


def test_a_control_may_not_shadow_a_built_in_slot() -> None:
    """Both share one namespace because a view selects from them together, so
    an ambiguous key would make that selection undecidable."""
    with pytest.raises(ConfigError, match="built-in"):
        camera(
            capabilities={"light": CapabilityBinding(entity_id="light.a")},
            controls=(control(key="light"),),
        )


def test_every_control_key_is_listed_together() -> None:
    cam = camera(
        capabilities={"light": CapabilityBinding(entity_id="light.a")},
        controls=(control(),),
    )
    assert set(cam.all_control_keys) == {"light", "zoom_rein"}


def test_a_view_can_select_among_custom_controls_too() -> None:
    cam = camera(
        controls=(control(), control(key="wischer", name="Wischer")),
        view_settings={"v": CameraViewSettings(capabilities=("wischer",))},
    )
    assert [c.key for c in cam.controls_for("v")] == ["wischer"]


def test_without_a_selection_every_custom_control_is_offered() -> None:
    cam = camera(
        controls=(control(),), view_settings={"v": CameraViewSettings()}
    )
    assert [c.key for c in cam.controls_for("v")] == ["zoom_rein"]


def test_controls_round_trip_with_every_kind() -> None:
    entities = {
        ControlKind.BUTTON: "button.a",
        ControlKind.SWITCH: "switch.a",
        ControlKind.SELECT: "select.a",
        ControlKind.NUMBER: "number.a",
    }
    for kind, entity_id in entities.items():
        original = camera(
            controls=(
                control(kind=kind, binding=CapabilityBinding(entity_id=entity_id)),
            )
        )
        assert CameraConfig.from_dict(original.as_dict()) == original


def test_an_unknown_control_kind_is_refused() -> None:
    with pytest.raises(ConfigError, match="control kind"):
        CustomControl.from_dict(
            {"key": "x", "name": "X", "kind": "telepathie", "binding": {"entity_id": "a.b"}}
        )


def test_the_kinds_an_entity_supports_are_derived_from_its_domain() -> None:
    assert kinds_for_entity("select.x") == ("select",)
    assert kinds_for_entity("button.x") == ("button",)
    assert kinds_for_entity("number.x") == ("number",)
    assert kinds_for_entity("switch.x") == ("switch", "button")


def test_an_unknown_domain_places_no_restriction() -> None:
    """Guessing wrong would block something that works."""
    assert kinds_for_entity("vacuum.x") == ()
    assert kinds_for_entity(None) == ()
    assert kinds_for_entity("kaputt") == ()


def test_a_control_a_select_cannot_perform_is_refused() -> None:
    """Reported from use: a select set to on/off is sent true and false, which
    it does not accept. It failed on the first press, inside Home Assistant,
    where the cause is hard to connect back to this setting."""
    with pytest.raises(ConfigError, match="cannot do"):
        control(
            kind=ControlKind.SWITCH,
            binding=CapabilityBinding(entity_id="select.person_detection"),
        )


def test_a_button_cannot_be_a_switch() -> None:
    with pytest.raises(ConfigError, match="cannot do"):
        control(
            kind=ControlKind.SWITCH,
            binding=CapabilityBinding(entity_id="button.reboot"),
        )


def test_a_switch_may_also_be_a_plain_button() -> None:
    """Switching one on without offering the off half is legitimate."""
    assert control(
        kind=ControlKind.BUTTON, binding=CapabilityBinding(entity_id="switch.x")
    )


def test_an_unrestricted_domain_accepts_any_kind() -> None:
    for kind in ControlKind:
        assert control(
            kind=kind, binding=CapabilityBinding(entity_id="vacuum.x")
        )


def test_a_free_action_places_no_restriction() -> None:
    """A service call can do whatever the user wrote."""
    assert control(
        kind=ControlKind.NUMBER,
        binding=CapabilityBinding(action="script.zoom", data={"level": 3}),
    )


def test_an_empty_entity_is_not_a_binding() -> None:
    """A form sends "" for "nothing chosen", which is not None; checking only
    against None let it through and produced a control bound to nothing."""
    with pytest.raises(ConfigError, match="entity or an action"):
        CapabilityBinding(entity_id="")
    with pytest.raises(ConfigError, match="entity or an action"):
        CapabilityBinding(entity_id="   ")
    with pytest.raises(ConfigError, match="entity or an action"):
        CapabilityBinding(action="")
