"""Tests for the configuration model and its serialisation."""

from __future__ import annotations

import pytest
from kustos_vision.core.config import (
    CONFIG_VERSION,
    CameraConfig,
    CamwatchConfig,
    CapabilityBinding,
    ConfigError,
    StorageConfig,
    StreamConfig,
    ViewConfig,
)
from kustos_vision.core.recorder import AudioMode


def storage(**overrides) -> StorageConfig:
    return StorageConfig(**{"base_path": "/media/kustos_vision", **overrides})


def camera(**overrides) -> CameraConfig:
    values = {
        "slug": "vorgarten",
        "name": "Vorgarten",
        "streams": (StreamConfig("hd", "camera.vorgarten_hd"),),
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
        area_id="vorgarten",
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
    assert updated.camera("vorgarten").name == "Neu"


def test_with_camera_adds_a_new_one() -> None:
    config = CamwatchConfig(storage=storage(), cameras=(camera(),))
    updated = config.with_camera(camera(slug="garten", name="Garten"))
    assert {c.slug for c in updated.cameras} == {"vorgarten", "garten"}


def test_without_camera_removes_it() -> None:
    config = CamwatchConfig(storage=storage(), cameras=(camera(),))
    assert config.without_camera("vorgarten").cameras == ()


def test_updates_leave_the_original_untouched() -> None:
    """The configuration is passed around freely, so mutation would be a
    source of hard-to-find bugs."""
    config = CamwatchConfig(storage=storage(), cameras=(camera(),))
    config.without_camera("vorgarten")
    assert len(config.cameras) == 1


def test_retention_limits_omit_cameras_without_one() -> None:
    """The retention policy treats an absent entry as "no limit", so a camera
    without an age limit must not appear at all."""
    config = CamwatchConfig(
        storage=storage(),
        cameras=(
            camera(slug="vorgarten", retention_days=7),
            camera(slug="garten", name="Garten", retention_days=None),
        ),
    )
    assert config.retention_days_by_camera == {"vorgarten": 7}


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


def test_a_view_may_not_list_a_camera_twice() -> None:
    with pytest.raises(ConfigError, match="twice"):
        view(cameras=("vorgarten", "vorgarten"))


def test_columns_may_be_zero_for_automatic_layout() -> None:
    assert view(columns=0).columns == 0
    with pytest.raises(ConfigError, match="columns"):
        view(columns=-1)


def test_view_round_trips() -> None:
    original = view(cameras=("vorgarten", "garten"), icon="mdi:home", columns=3)
    assert ViewConfig.from_dict(original.as_dict()) == original


def test_views_survive_the_whole_config_round_trip() -> None:
    config = CamwatchConfig(
        storage=storage(), cameras=(camera(),), views=(view(cameras=("vorgarten",)),)
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
    """A stale slug in a view would make the panel render a tile for a camera
    that no longer exists."""
    config = CamwatchConfig(
        storage=storage(),
        cameras=(camera(slug="vorgarten"), camera(slug="garten", name="Garten")),
        views=(
            view(id="aussen", cameras=("vorgarten", "garten")),
            view(id="alle", name="Alle", cameras=("vorgarten",)),
        ),
    )
    updated = config.without_camera("vorgarten")
    assert [c.slug for c in updated.cameras] == ["garten"]
    assert updated.view("aussen").cameras == ("garten",)
    assert updated.view("alle").cameras == ()
