"""The websocket API is the whole interface; the panel only projects it.

These tests are what makes that claim checkable: everything the panel can do is
exercised here without a browser.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.kustos_vision.const import (
    CONF_BASE_PATH,
    DOMAIN,
    STORAGE_KEY_CONFIG,
    STORAGE_VERSION_CONFIG,
)


def stored(base: Path, cameras=None, views=None) -> dict:
    return {
        "version": STORAGE_VERSION_CONFIG,
        "minor_version": 1,
        "key": STORAGE_KEY_CONFIG,
        "data": {
            "version": 1,
            "storage": {"base_path": str(base), "segment_seconds": 60},
            "cameras": cameras or [],
            "views": views or [],
        },
    }


def camera_dict(slug="beispiel", **overrides) -> dict:
    base = {
        "slug": slug,
        "name": slug.title(),
        "streams": [{"key": "hd", "entity_id": f"camera.{slug}_hd", "record": True}],
        "capabilities": {},
        "retention_days": None,
        "enabled": True,
        "area_id": None,
        "view_settings": {},
    }
    base.update(overrides)
    return base


@pytest.fixture
def no_ffmpeg():
    """Keep the recorder from launching anything during API tests."""
    with (
        patch(
            "custom_components.kustos_vision.recorder.async_get_stream_source",
            AsyncMock(return_value=None),
        ),
        patch(
            "custom_components.kustos_vision.maintenance.get_ffmpeg_manager",
            MagicMock(return_value=MagicMock(binary="/usr/bin/ffmpeg")),
        ),
    ):
        yield


@pytest.fixture
async def setup_kustos_vision(hass: HomeAssistant, hass_storage: dict, tmp_path: Path, no_ffmpeg):
    """Set up kustos_vision with the given cameras and views."""

    async def _setup(cameras=None, views=None):
        base = tmp_path / "recordings"
        hass_storage[STORAGE_KEY_CONFIG] = stored(base, cameras, views)
        entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
        entry.add_to_hass(hass)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        return entry

    return _setup


async def send(client, **payload) -> dict:
    await client.send_json_auto_id(payload)
    return await client.receive_json()


# ----------------------------------------------------------------------
# Reading
# ----------------------------------------------------------------------


async def test_config_get_returns_a_complete_snapshot(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """The panel's first paint needs all of it at once; a partial snapshot
    would show cameras without their state."""
    await setup_kustos_vision([camera_dict()])
    client = await hass_ws_client(hass)

    result = await send(client, type=f"{DOMAIN}/config/get")
    assert result["success"]
    data = result["result"]
    assert data["storage"]["segment_seconds"] == 60
    assert len(data["cameras"]) == 1
    assert data["cameras"][0]["slug"] == "beispiel"
    assert "state" in data["cameras"][0]
    assert "capability_keys" in data
    assert "totals" in data


async def test_config_get_reports_when_kustos_vision_is_not_set_up(
    hass: HomeAssistant, hass_ws_client
) -> None:
    """The panel is registered for the whole run, so it has to be able to say
    that nothing is configured rather than simply failing."""
    await async_setup_component(hass, DOMAIN, {})
    client = await hass_ws_client(hass)
    result = await send(client, type=f"{DOMAIN}/config/get")
    assert not result["success"]
    assert result["error"]["code"] == "not_loaded"


async def test_available_cameras_lists_camera_entities(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision, entity_registry: er.EntityRegistry
) -> None:
    await setup_kustos_vision()
    entity_registry.async_get_or_create(
        "camera", "demo", "abc", suggested_object_id="hof", original_name="Hof"
    )
    client = await hass_ws_client(hass)

    result = await send(client, type=f"{DOMAIN}/cameras/available")
    assert result["success"]
    ids = [c["entity_id"] for c in result["result"]["cameras"]]
    assert "camera.hof" in ids


# ----------------------------------------------------------------------
# Cameras
# ----------------------------------------------------------------------


async def test_a_camera_can_be_added(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision()
    client = await hass_ws_client(hass)

    result = await send(client, type=f"{DOMAIN}/camera/set", **camera_dict())
    assert result["success"]
    assert [c["slug"] for c in result["result"]["cameras"]] == ["beispiel"]


async def test_adding_a_camera_creates_its_entities(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """Cameras are managed in the panel, so the platforms have to grow
    entities after setup rather than only at it."""
    await setup_kustos_vision()
    client = await hass_ws_client(hass)
    assert hass.states.async_entity_ids("binary_sensor") == []

    await send(client, type=f"{DOMAIN}/camera/set", **camera_dict())
    await hass.async_block_till_done()

    assert hass.states.async_entity_ids("binary_sensor")
    assert hass.states.async_entity_ids("switch")


async def test_updating_an_existing_camera_replaces_it(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """Replacing happens only when the caller says it is editing. Without the
    flag this was a blind upsert, which is how adding a camera under an
    existing name wiped that camera out."""
    await setup_kustos_vision([camera_dict()])
    client = await hass_ws_client(hass)

    result = await send(
        client,
        type=f"{DOMAIN}/camera/set",
        replace_existing=True,
        **camera_dict(name="Neuer Name"),
    )
    assert len(result["result"]["cameras"]) == 1
    assert result["result"]["cameras"][0]["name"] == "Neuer Name"


async def test_an_invalid_camera_is_refused_with_a_reason(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision()
    client = await hass_ws_client(hass)

    result = await send(
        client, type=f"{DOMAIN}/camera/set", **camera_dict(slug="../escape")
    )
    assert not result["success"]
    assert result["error"]["code"] == "invalid_config"


async def test_a_camera_can_be_deleted(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision([camera_dict()])
    client = await hass_ws_client(hass)

    result = await send(client, type=f"{DOMAIN}/camera/delete", slug="beispiel")
    assert result["success"]
    assert result["result"]["cameras"] == []


async def test_deleting_an_unknown_camera_says_so(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision()
    client = await hass_ws_client(hass)

    result = await send(client, type=f"{DOMAIN}/camera/delete", slug="nope")
    assert not result["success"]
    assert result["error"]["code"] == "not_found"


async def test_deleting_a_camera_clears_it_from_views(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """A stale slug would make the panel render a tile for nothing."""
    await setup_kustos_vision(
        [camera_dict(view_settings={"aussen": {"visible": True}})],
        [{"id": "aussen", "name": "Außen"}],
    )
    client = await hass_ws_client(hass)

    result = await send(client, type=f"{DOMAIN}/camera/delete", slug="beispiel")
    assert result["result"]["views"][0]["cameras"] == []


# ----------------------------------------------------------------------
# Suggestions
# ----------------------------------------------------------------------


async def test_suggest_proposes_streams_and_capabilities(
    hass: HomeAssistant,
    hass_ws_client,
    setup_kustos_vision,
    device_registry: dr.DeviceRegistry,
    entity_registry: er.EntityRegistry,
) -> None:
    """The proposal comes from the sibling entities of the same device,
    matched on generic traits rather than on any brand."""
    await setup_kustos_vision()
    config_entry = MockConfigEntry(domain="demo")
    config_entry.add_to_hass(hass)
    device = device_registry.async_get_or_create(
        config_entry_id=config_entry.entry_id,
        identifiers={("demo", "cam1")},
        name="Kamera Hof",
    )
    for domain, unique, object_id, name in (
        ("camera", "hd", "hof_hd_stream", "Hof HD Stream"),
        ("camera", "sd", "hof_sd_stream", "Hof SD Stream"),
        ("button", "up", "hof_move_up", "Hof Move Up"),
        ("light", "fl", "hof_floodlight", "Hof Floodlight"),
    ):
        entity_registry.async_get_or_create(
            domain,
            "demo",
            unique,
            device_id=device.id,
            suggested_object_id=object_id,
            original_name=name,
        )

    client = await hass_ws_client(hass)
    result = await send(
        client, type=f"{DOMAIN}/camera/suggest", entity_id="camera.hof_hd_stream"
    )
    assert result["success"]
    data = result["result"]
    assert data["name"] == "Kamera Hof"
    assert {s["key"] for s in data["streams"]} == {"hd", "sd"}
    assert data["capabilities"]["ptz_up"] == "button.hof_move_up"
    assert data["capabilities"]["light"] == "light.hof_floodlight"


async def test_suggest_on_an_unknown_entity_says_so(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision()
    client = await hass_ws_client(hass)
    result = await send(
        client, type=f"{DOMAIN}/camera/suggest", entity_id="camera.does_not_exist"
    )
    assert not result["success"]
    assert result["error"]["code"] == "not_found"


# ----------------------------------------------------------------------
# Views
# ----------------------------------------------------------------------


async def test_views_can_be_set_and_reordered(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision([camera_dict()])
    client = await hass_ws_client(hass)

    result = await send(
        client,
        type=f"{DOMAIN}/views/set",
        views=[{"id": "a", "name": "A"}, {"id": "b", "name": "B"}],
    )
    assert result["success"]
    assert [v["id"] for v in result["result"]["views"]] == ["a", "b"]

    result = await send(
        client,
        type=f"{DOMAIN}/views/set",
        views=[{"id": "b", "name": "B"}, {"id": "a", "name": "A"}],
    )
    assert [v["id"] for v in result["result"]["views"]] == ["b", "a"]


async def test_which_cameras_a_view_shows_is_set_on_the_cameras(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """Membership moved onto the camera so that the stream and the controls a
    camera offers can differ per view."""
    await setup_kustos_vision([camera_dict()])
    client = await hass_ws_client(hass)
    await send(client, type=f"{DOMAIN}/views/set", views=[{"id": "a", "name": "A"}])

    result = await send(
        client,
        type=f"{DOMAIN}/camera/set",
        replace_existing=True,
        **camera_dict(view_settings={"a": {"visible": True, "stream_key": "hd"}}),
    )
    assert result["success"]
    assert result["result"]["views"][0]["cameras"] == ["beispiel"]


async def test_a_camera_can_be_hidden_from_a_view(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision([camera_dict()])
    client = await hass_ws_client(hass)
    await send(client, type=f"{DOMAIN}/views/set", views=[{"id": "a", "name": "A"}])

    result = await send(
        client,
        type=f"{DOMAIN}/camera/set",
        replace_existing=True,
        **camera_dict(view_settings={"a": {"visible": False}}),
    )
    assert result["result"]["views"][0]["cameras"] == []


async def test_the_order_of_a_view_is_set_in_one_call(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """All cameras of a view at once, because the order belongs to the view."""
    await setup_kustos_vision()
    client = await hass_ws_client(hass)
    await send(client, type=f"{DOMAIN}/views/set", views=[{"id": "a", "name": "A"}])
    for slug in ("eins", "zwei", "drei"):
        await send(
            client,
            type=f"{DOMAIN}/camera/set",
            **camera_dict(slug=slug, view_settings={"a": {"visible": True}}),
        )

    result = await send(
        client, type=f"{DOMAIN}/view/order", view_id="a", cameras=["drei", "eins", "zwei"]
    )
    assert result["success"]
    assert result["result"]["views"][0]["cameras"] == ["drei", "eins", "zwei"]


async def test_ordering_an_unknown_view_says_so(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision()
    client = await hass_ws_client(hass)
    result = await send(client, type=f"{DOMAIN}/view/order", view_id="weg", cameras=[])
    assert not result["success"]
    assert result["error"]["code"] == "not_found"


async def test_ordering_refuses_an_unknown_camera(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision()
    client = await hass_ws_client(hass)
    await send(client, type=f"{DOMAIN}/views/set", views=[{"id": "a", "name": "A"}])

    result = await send(
        client, type=f"{DOMAIN}/view/order", view_id="a", cameras=["gibtsnicht"]
    )
    assert not result["success"]
    assert result["error"]["code"] == "not_found"


async def test_deleting_a_view_clears_it_from_the_cameras(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """A leftover setting would resurrect the old layout if a view with the
    same id were created again."""
    await setup_kustos_vision([camera_dict()])
    client = await hass_ws_client(hass)
    await send(client, type=f"{DOMAIN}/views/set", views=[{"id": "a", "name": "A"}])
    await send(
        client,
        type=f"{DOMAIN}/camera/set",
        replace_existing=True,
        **camera_dict(view_settings={"a": {"visible": True}}),
    )

    result = await send(client, type=f"{DOMAIN}/views/set", views=[])
    assert result["result"]["views"] == []
    assert result["result"]["cameras"][0]["view_settings"] == {}


# ----------------------------------------------------------------------
# Storage
# ----------------------------------------------------------------------


async def test_storage_limits_can_be_changed(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision()
    client = await hass_ws_client(hass)

    result = await send(
        client,
        type=f"{DOMAIN}/storage/set",
        segment_seconds=120,
        max_total_bytes=5_000_000,
    )
    assert result["success"]
    assert result["result"]["storage"]["segment_seconds"] == 120
    assert result["result"]["storage"]["max_total_bytes"] == 5_000_000


async def test_the_size_budget_can_be_switched_off(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """Null disables the limit; zero would mean deleting everything."""
    await setup_kustos_vision()
    client = await hass_ws_client(hass)

    await send(client, type=f"{DOMAIN}/storage/set", max_total_bytes=1000)
    result = await send(client, type=f"{DOMAIN}/storage/set", max_total_bytes=None)
    assert result["result"]["storage"]["max_total_bytes"] is None


async def test_the_storage_path_can_be_changed(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision, tmp_path: Path
) -> None:
    """Starting on the internal disk and moving to a share later is the normal
    course of events, so it cannot require editing storage files by hand."""
    await setup_kustos_vision()
    client = await hass_ws_client(hass)
    target = tmp_path / "elsewhere"

    result = await send(client, type=f"{DOMAIN}/storage/set", base_path=str(target))
    assert result["success"]
    assert result["result"]["storage"]["base_path"] == str(target)
    assert target.is_dir()


async def test_changing_the_path_leaves_the_old_recordings_alone(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision, tmp_path: Path
) -> None:
    """Deleting footage as a side effect of a settings change would be the
    worst possible surprise."""
    entry = await setup_kustos_vision()
    old = Path(entry.runtime_data.config.storage.base_path)
    day = old / "beispiel" / "2026-01-20"
    day.mkdir(parents=True)
    recording = day / "14-30-00_hd.mp4"
    recording.write_bytes(b"important")

    client = await hass_ws_client(hass)
    await send(
        client, type=f"{DOMAIN}/storage/set", base_path=str(tmp_path / "elsewhere")
    )

    assert recording.is_file()
    assert recording.read_bytes() == b"important"


async def test_recordings_carried_across_by_hand_are_found_again(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision, tmp_path: Path
) -> None:
    """The index stores paths relative to the root precisely so that the root
    can move. Copying the tree across has to be enough."""
    entry = await setup_kustos_vision()
    target = tmp_path / "elsewhere"
    day = target / "beispiel" / "2026-01-20"
    day.mkdir(parents=True)
    (day / "14-30-00_hd.mp4").write_bytes(b"x" * 64)

    client = await hass_ws_client(hass)
    result = await send(client, type=f"{DOMAIN}/storage/set", base_path=str(target))
    assert result["success"]

    await entry.runtime_data.async_refresh()
    await hass.async_block_till_done()
    rows = await hass.async_add_executor_job(entry.runtime_data.index.oldest_first)
    assert [r.rel_path for r in rows] == ["beispiel/2026-01-20/14-30-00_hd.mp4"]


async def test_an_unusable_path_is_refused_with_a_reason(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision, tmp_path: Path
) -> None:
    """A share that is not mounted is the common case here, and the user needs
    to be told rather than have recording quietly stop."""
    await setup_kustos_vision()
    blocker = tmp_path / "a-file-not-a-directory"
    blocker.write_text("x")
    client = await hass_ws_client(hass)

    result = await send(
        client, type=f"{DOMAIN}/storage/set", base_path=str(blocker / "under")
    )
    assert not result["success"]
    assert result["error"]["code"] == "path_not_writable"


async def test_a_relative_path_is_refused(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision()
    client = await hass_ws_client(hass)
    result = await send(client, type=f"{DOMAIN}/storage/set", base_path="recordings")
    assert not result["success"]
    assert result["error"]["code"] == "path_not_absolute"


async def test_the_limits_can_still_be_changed_without_touching_the_path(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    entry = await setup_kustos_vision()
    before = entry.runtime_data.config.storage.base_path
    client = await hass_ws_client(hass)

    result = await send(client, type=f"{DOMAIN}/storage/set", segment_seconds=90)
    assert result["result"]["storage"]["base_path"] == before
    assert result["result"]["storage"]["segment_seconds"] == 90


# ----------------------------------------------------------------------
# Capabilities
# ----------------------------------------------------------------------


async def test_a_capability_can_be_triggered(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """This is the PTZ button in the panel."""
    calls = []

    async def _record(call):
        calls.append(call)

    hass.services.async_register("button", "press", _record)
    await setup_kustos_vision(
        [camera_dict(capabilities={"ptz_up": {"entity_id": "button.hof_up"}})]
    )
    client = await hass_ws_client(hass)

    result = await send(
        client, type=f"{DOMAIN}/camera/trigger", slug="beispiel", capability="ptz_up"
    )
    assert result["success"]
    assert calls[0].data["entity_id"] == "button.hof_up"


async def test_triggering_an_unbound_capability_says_so(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """The panel only offers controls for bound capabilities, so this means
    the two got out of step and should be visible, not silent."""
    await setup_kustos_vision([camera_dict()])
    client = await hass_ws_client(hass)

    result = await send(
        client, type=f"{DOMAIN}/camera/trigger", slug="beispiel", capability="ptz_up"
    )
    assert not result["success"]
    assert result["error"]["code"] == "not_bound"


async def test_a_select_capability_takes_the_option(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    calls = []

    async def _record(call):
        calls.append(call)

    hass.services.async_register("select", "select_option", _record)
    await setup_kustos_vision(
        [camera_dict(capabilities={"ptz_preset": {"entity_id": "select.hof_preset"}})]
    )
    client = await hass_ws_client(hass)

    result = await send(
        client,
        type=f"{DOMAIN}/camera/trigger",
        slug="beispiel",
        capability="ptz_preset",
        value="Haustuer",
    )
    assert result["success"]
    assert calls[0].data["option"] == "Haustuer"


async def test_a_light_capability_can_be_turned_off(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    calls = []

    async def _record(call):
        calls.append(call)

    hass.services.async_register("light", "turn_off", _record)
    await setup_kustos_vision(
        [camera_dict(capabilities={"light": {"entity_id": "light.hof_flood"}})]
    )
    client = await hass_ws_client(hass)

    result = await send(
        client,
        type=f"{DOMAIN}/camera/trigger",
        slug="beispiel",
        capability="light",
        value=False,
    )
    assert result["success"]
    assert calls[0].data["entity_id"] == "light.hof_flood"


async def test_a_capability_can_be_bound_to_a_free_action(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """Not every camera exposes a capability as an entity, so an arbitrary
    service call with its own data has to work too."""
    calls = []

    async def _record(call):
        calls.append(call)

    hass.services.async_register("onvif", "ptz", _record)
    await setup_kustos_vision(
        [
            camera_dict(
                capabilities={
                    "ptz_left": {"action": "onvif.ptz", "data": {"pan": "LEFT"}}
                }
            )
        ]
    )
    client = await hass_ws_client(hass)

    result = await send(
        client, type=f"{DOMAIN}/camera/trigger", slug="beispiel", capability="ptz_left"
    )
    assert result["success"]
    assert calls[0].data["pan"] == "LEFT"


# ----------------------------------------------------------------------
# Index
# ----------------------------------------------------------------------


async def test_the_index_can_be_rebuilt(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """The index is a cache over the recordings, so rebuilding is always safe."""
    await setup_kustos_vision()
    client = await hass_ws_client(hass)
    result = await send(client, type=f"{DOMAIN}/index/rebuild")
    assert result["success"]


# ----------------------------------------------------------------------
# Permissions
# ----------------------------------------------------------------------


@pytest.mark.parametrize(
    ("command", "extra"),
    [
        (f"{DOMAIN}/camera/set", camera_dict()),
        (f"{DOMAIN}/camera/delete", {"slug": "beispiel"}),
        (f"{DOMAIN}/storage/set", {"segment_seconds": 30}),
        (f"{DOMAIN}/views/set", {"views": []}),
        (f"{DOMAIN}/index/rebuild", {}),
    ],
)
async def test_writing_requires_an_admin(
    hass: HomeAssistant,
    hass_ws_client,
    hass_read_only_access_token: str,
    setup_kustos_vision,
    command: str,
    extra: dict,
) -> None:
    """These decide what gets recorded and what gets deleted."""
    await setup_kustos_vision([camera_dict()])
    client = await hass_ws_client(hass, hass_read_only_access_token)

    result = await send(client, type=command, **extra)
    assert not result["success"]
    assert result["error"]["code"] == "unauthorized"


async def test_a_camera_without_a_device_can_still_be_added(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision, entity_registry: er.EntityRegistry
) -> None:
    """Regression: the suggestion walked the device registry and returned
    nothing for an entity with no device, so the picked camera was not even
    offered as its own stream and could not be added at all.

    This is not an edge case. A generic camera pointed at an arbitrary RTSP
    URL, which is the standard way to use a camera Home Assistant has no
    integration for, creates no device.
    """
    await setup_kustos_vision()
    entity_registry.async_get_or_create(
        "camera",
        "generic",
        "no-device",
        suggested_object_id="hof_rtsp",
        original_name="Hof RTSP",
        # No device_id: this is what a generic or template camera looks like.
    )
    client = await hass_ws_client(hass)

    result = await send(
        client, type=f"{DOMAIN}/camera/suggest", entity_id="camera.hof_rtsp"
    )
    assert result["success"]
    data = result["result"]
    assert [s["entity_id"] for s in data["streams"]] == ["camera.hof_rtsp"]
    assert data["streams"][0]["key"] == "main"
    assert data["name"] == "Hof RTSP"


async def test_a_device_less_camera_survives_being_saved(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision, entity_registry: er.EntityRegistry
) -> None:
    """The suggestion is only useful if what it proposes can then be saved."""
    await setup_kustos_vision()
    entity_registry.async_get_or_create(
        "camera", "generic", "no-device", suggested_object_id="hof_rtsp",
        original_name="Hof RTSP",
    )
    client = await hass_ws_client(hass)
    suggestion = (
        await send(client, type=f"{DOMAIN}/camera/suggest", entity_id="camera.hof_rtsp")
    )["result"]

    result = await send(
        client,
        type=f"{DOMAIN}/camera/set",
        slug="hof",
        name=suggestion["name"],
        streams=[
            {"key": s["key"], "entity_id": s["entity_id"]}
            for s in suggestion["streams"]
        ],
    )
    assert result["success"]
    saved = next(c for c in result["result"]["cameras"] if c["slug"] == "hof")
    assert saved["streams"][0]["entity_id"] == "camera.hof_rtsp"


async def test_the_picked_entity_is_offered_even_when_its_device_has_others(
    hass: HomeAssistant,
    hass_ws_client,
    setup_kustos_vision,
    device_registry: dr.DeviceRegistry,
    entity_registry: er.EntityRegistry,
) -> None:
    """The device walk must not be replaced by the fallback, only completed by
    it: a camera on a real device still gets its siblings proposed."""
    await setup_kustos_vision()
    config_entry = MockConfigEntry(domain="demo")
    config_entry.add_to_hass(hass)
    device = device_registry.async_get_or_create(
        config_entry_id=config_entry.entry_id,
        identifiers={("demo", "withdev")},
        name="Mit Geraet",
    )
    entity_registry.async_get_or_create(
        "camera", "demo", "c", device_id=device.id,
        suggested_object_id="mit_dev", original_name="Mit Dev",
    )
    entity_registry.async_get_or_create(
        "button", "demo", "u", device_id=device.id,
        suggested_object_id="mit_dev_move_up", original_name="Mit Dev Move Up",
    )
    client = await hass_ws_client(hass)

    data = (
        await send(client, type=f"{DOMAIN}/camera/suggest", entity_id="camera.mit_dev")
    )["result"]
    assert data["capabilities"]["ptz_up"] == "button.mit_dev_move_up"
    assert [s["entity_id"] for s in data["streams"]] == ["camera.mit_dev"]


async def test_a_budget_larger_than_the_volume_is_refused(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """A limit larger than what exists is not a limit. Accepting it would look
    like protection while the disk fills anyway."""
    await setup_kustos_vision()
    client = await hass_ws_client(hass)

    result = await send(
        client, type=f"{DOMAIN}/storage/set", max_total_bytes=999 * 1024**4
    )
    assert not result["success"]
    assert result["error"]["code"] == "budget_too_large"
    assert "at most" in result["error"]["message"]


async def test_a_budget_that_fits_is_accepted(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision()
    client = await hass_ws_client(hass)

    result = await send(client, type=f"{DOMAIN}/storage/set", max_total_bytes=64 * 1024**2)
    assert result["success"]
    assert result["result"]["storage"]["max_total_bytes"] == 64 * 1024**2


async def test_the_budget_can_still_be_cleared(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """Clearing it does not mean unlimited; it means the automatic limit."""
    await setup_kustos_vision()
    client = await hass_ws_client(hass)

    await send(client, type=f"{DOMAIN}/storage/set", max_total_bytes=64 * 1024**2)
    result = await send(client, type=f"{DOMAIN}/storage/set", max_total_bytes=None)
    assert result["success"]
    assert result["result"]["storage"]["max_total_bytes"] is None


# ----------------------------------------------------------------------
# Duplicates
# ----------------------------------------------------------------------


async def test_adding_a_camera_over_an_existing_one_is_refused(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """Regression, reported from real use: adding a SECOND camera and giving it
    the name of an existing one silently replaced that one. The name derives
    the slug, the slug is the directory, so both cameras then recorded into the
    same folder and their footage became indistinguishable.
    """
    await setup_kustos_vision([camera_dict(slug="hof", name="Hof")])
    client = await hass_ws_client(hass)

    result = await send(
        client,
        type=f"{DOMAIN}/camera/set",
        **camera_dict(
            slug="hof",
            name="Hof",
            streams=[{"key": "hd", "entity_id": "camera.eine_ganz_andere"}],
        ),
    )
    assert not result["success"]
    assert result["error"]["code"] == "duplicate"


async def test_the_existing_camera_survives_a_refused_duplicate(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    entry = await setup_kustos_vision([camera_dict(slug="hof", name="Hof")])
    client = await hass_ws_client(hass)

    await send(
        client,
        type=f"{DOMAIN}/camera/set",
        **camera_dict(
            slug="hof",
            name="Hof",
            streams=[{"key": "hd", "entity_id": "camera.eine_ganz_andere"}],
        ),
    )

    kept = entry.runtime_data.config.camera("hof")
    assert kept is not None
    assert kept.streams[0].entity_id == "camera.hof_hd"


async def test_a_duplicate_name_under_a_different_slug_is_refused(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """Two cameras called the same thing are indistinguishable everywhere the
    user looks, even when their folders differ."""
    await setup_kustos_vision([camera_dict(slug="hof", name="Hof")])
    client = await hass_ws_client(hass)

    result = await send(
        client, type=f"{DOMAIN}/camera/set", **camera_dict(slug="hof2", name="Hof")
    )
    assert not result["success"]
    assert result["error"]["code"] == "duplicate"


async def test_a_stream_entity_cannot_be_recorded_by_two_cameras(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """Two cameras on the same entity would pull and store the same stream
    twice, for twice the disk and nothing gained."""
    await setup_kustos_vision([camera_dict(slug="hof", name="Hof")])
    client = await hass_ws_client(hass)

    result = await send(
        client,
        type=f"{DOMAIN}/camera/set",
        **camera_dict(
            slug="zweiter",
            name="Zweiter Blick",
            streams=[{"key": "hd", "entity_id": "camera.hof_hd"}],
        ),
    )
    assert not result["success"]
    assert result["error"]["code"] == "duplicate"


async def test_editing_a_camera_still_works(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """The duplicate check must not make a camera uneditable: saving it back
    over itself is the normal case, not a collision."""
    await setup_kustos_vision([camera_dict(slug="hof", name="Hof")])
    client = await hass_ws_client(hass)

    result = await send(
        client,
        type=f"{DOMAIN}/camera/set",
        replace_existing=True,
        **camera_dict(slug="hof", name="Hof umbenannt"),
    )
    assert result["success"]
    assert result["result"]["cameras"][0]["name"] == "Hof umbenannt"


# ----------------------------------------------------------------------
# The camera picker
# ----------------------------------------------------------------------


async def test_a_camera_with_two_streams_is_offered_once(
    hass: HomeAssistant,
    hass_ws_client,
    setup_kustos_vision,
    device_registry: dr.DeviceRegistry,
    entity_registry: er.EntityRegistry,
) -> None:
    """A camera offering a main and a sub stream is two entities in Home
    Assistant. Listing both invites picking one of them as if it were a second
    camera; it is one camera, and its streams are chosen afterwards."""
    await setup_kustos_vision()
    config_entry = MockConfigEntry(domain="demo")
    config_entry.add_to_hass(hass)
    device = device_registry.async_get_or_create(
        config_entry_id=config_entry.entry_id,
        identifiers={("demo", "cam")},
        name="Kamera Hof",
    )
    for unique, object_id, name in (
        ("hd", "hof_hd_stream", "Hof HD Stream"),
        ("sd", "hof_sd_stream", "Hof SD Stream"),
    ):
        entity_registry.async_get_or_create(
            "camera", "demo", unique, device_id=device.id,
            suggested_object_id=object_id, original_name=name,
        )

    client = await hass_ws_client(hass)
    result = await send(client, type=f"{DOMAIN}/cameras/available")
    cameras = result["result"]["cameras"]

    assert len(cameras) == 1
    assert cameras[0]["name"] == "Kamera Hof"
    assert len(cameras[0]["streams"]) == 2


async def test_cameras_without_a_device_stay_separate(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision,
    entity_registry: er.EntityRegistry,
) -> None:
    """For a generic camera pointed at a URL there is no device to group by,
    and each really is one camera."""
    await setup_kustos_vision()
    for unique, object_id in (("a", "erste"), ("b", "zweite")):
        entity_registry.async_get_or_create(
            "camera", "generic", unique, suggested_object_id=object_id,
            original_name=object_id.title(),
        )

    client = await hass_ws_client(hass)
    result = await send(client, type=f"{DOMAIN}/cameras/available")
    names = {c["name"] for c in result["result"]["cameras"]}
    assert {"Erste", "Zweite"} <= names


async def test_a_camera_already_in_use_is_marked(
    hass: HomeAssistant,
    hass_ws_client,
    setup_kustos_vision,
    device_registry: dr.DeviceRegistry,
    entity_registry: er.EntityRegistry,
) -> None:
    """Marked rather than hidden: hiding it makes an existing camera look
    missing, marking it says why it cannot be added again."""
    config_entry = MockConfigEntry(domain="demo")
    config_entry.add_to_hass(hass)
    device = device_registry.async_get_or_create(
        config_entry_id=config_entry.entry_id,
        identifiers={("demo", "cam")}, name="Kamera Hof",
    )
    entry = entity_registry.async_get_or_create(
        "camera", "demo", "hd", device_id=device.id,
        suggested_object_id="hof_hd", original_name="Hof HD",
    )
    await setup_kustos_vision(
        [camera_dict(streams=[{"key": "hd", "entity_id": entry.entity_id}])]
    )

    client = await hass_ws_client(hass)
    result = await send(client, type=f"{DOMAIN}/cameras/available")
    hof = next(c for c in result["result"]["cameras"] if c["name"] == "Kamera Hof")
    assert hof["in_use"] is True


async def test_a_camera_not_yet_used_is_not_marked(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision,
    entity_registry: er.EntityRegistry,
) -> None:
    await setup_kustos_vision()
    entity_registry.async_get_or_create(
        "camera", "generic", "frei", suggested_object_id="frei", original_name="Frei",
    )
    client = await hass_ws_client(hass)
    result = await send(client, type=f"{DOMAIN}/cameras/available")
    frei = next(c for c in result["result"]["cameras"] if c["name"] == "Frei")
    assert frei["in_use"] is False


async def test_the_device_name_is_preferred_over_the_entity_name(
    hass: HomeAssistant,
    hass_ws_client,
    setup_kustos_vision,
    device_registry: dr.DeviceRegistry,
    entity_registry: er.EntityRegistry,
) -> None:
    """"Kamera Hof" reads better than "Hof HD Stream" when the entry stands for
    the whole camera."""
    await setup_kustos_vision()
    config_entry = MockConfigEntry(domain="demo")
    config_entry.add_to_hass(hass)
    device = device_registry.async_get_or_create(
        config_entry_id=config_entry.entry_id,
        identifiers={("demo", "cam")}, name="Kamera Hof",
    )
    entity_registry.async_get_or_create(
        "camera", "demo", "hd", device_id=device.id,
        suggested_object_id="hof_hd_stream", original_name="Hof HD Stream",
    )

    client = await hass_ws_client(hass)
    result = await send(client, type=f"{DOMAIN}/cameras/available")
    assert any(c["name"] == "Kamera Hof" for c in result["result"]["cameras"])


async def test_a_custom_control_can_be_saved_and_triggered(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """The fourteen named slots cover what nearly every camera has; everything
    else it offers had nowhere to go. A custom control is triggered through
    exactly the same path as a built-in one."""
    calls = []

    async def _record(call):
        calls.append(call)

    hass.services.async_register("button", "press", _record)
    await setup_kustos_vision()
    client = await hass_ws_client(hass)

    result = await send(
        client,
        type=f"{DOMAIN}/camera/set",
        **camera_dict(
            controls=[
                {
                    "key": "zoom_rein",
                    "name": "Zoom rein",
                    "kind": "button",
                    "binding": {"entity_id": "button.hof_zoom_in"},
                }
            ]
        ),
    )
    assert result["success"]

    result = await send(
        client,
        type=f"{DOMAIN}/camera/trigger",
        slug="beispiel",
        capability="zoom_rein",
    )
    assert result["success"]
    assert calls[0].data["entity_id"] == "button.hof_zoom_in"


async def test_a_custom_control_cannot_shadow_a_built_in_one(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision()
    client = await hass_ws_client(hass)

    result = await send(
        client,
        type=f"{DOMAIN}/camera/set",
        **camera_dict(
            capabilities={"light": {"entity_id": "light.a"}},
            controls=[
                {
                    "key": "light",
                    "name": "Anderes Licht",
                    "kind": "switch",
                    "binding": {"entity_id": "switch.b"},
                }
            ],
        ),
    )
    assert not result["success"]
    assert result["error"]["code"] == "invalid_config"


async def test_a_camera_that_records_nothing_says_so_rather_than_failing(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """Not meant to record is not the same as meant to and cannot. Showing
    both as "not recording" makes a deliberate setting look like a fault."""
    await setup_kustos_vision(
        [camera_dict(streams=[{"key": "hd", "entity_id": "camera.a", "record": False}])]
    )
    client = await hass_ws_client(hass)

    result = await send(client, type=f"{DOMAIN}/config/get")
    state = result["result"]["cameras"][0]["state"]
    assert state["recording"] is False
    assert state["wants_recording"] is False


async def test_a_camera_that_should_record_reports_that_it_wants_to(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision(
        [camera_dict(streams=[{"key": "hd", "entity_id": "camera.a", "record": True}])]
    )
    client = await hass_ws_client(hass)

    result = await send(client, type=f"{DOMAIN}/config/get")
    assert result["result"]["cameras"][0]["state"]["wants_recording"] is True


async def test_the_answer_to_a_change_already_reflects_it(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """Regression: the state was refreshed through a debounced call, so the
    snapshot returned by the very command that changed something still carried
    the state from before it. Switching a camera to recording looked like it
    had done nothing until the page was reloaded."""
    await setup_kustos_vision(
        [camera_dict(streams=[{"key": "hd", "entity_id": "camera.a", "record": False}])]
    )
    client = await hass_ws_client(hass)

    before = await send(client, type=f"{DOMAIN}/config/get")
    assert before["result"]["cameras"][0]["state"]["wants_recording"] is False

    result = await send(
        client,
        type=f"{DOMAIN}/camera/set",
        replace_existing=True,
        **camera_dict(
            streams=[{"key": "hd", "entity_id": "camera.a", "record": True}]
        ),
    )
    # No second call, no waiting: the answer itself has to be current.
    assert result["result"]["cameras"][0]["state"]["wants_recording"] is True


async def test_pausing_is_reflected_in_the_same_answer(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision([camera_dict()])
    client = await hass_ws_client(hass)

    switch_id = hass.states.async_entity_ids("switch")[0]
    await hass.services.async_call(
        "switch", "turn_off", {"entity_id": switch_id}, blocking=True
    )
    result = await send(client, type=f"{DOMAIN}/config/get")
    assert result["result"]["cameras"][0]["state"]["paused"] is True


async def test_a_deleted_camera_is_gone_from_the_same_answer(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision([camera_dict()])
    client = await hass_ws_client(hass)
    result = await send(client, type=f"{DOMAIN}/camera/delete", slug="beispiel")
    assert result["result"]["cameras"] == []

async def test_the_panel_is_told_what_is_installed(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """So a browser holding an older bundle can notice and say so, instead of
    quietly showing a panel from before the update."""
    from custom_components.kustos_vision.version import integration_version

    await setup_kustos_vision([])
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": f"{DOMAIN}/config/get"})
    result = await client.receive_json()

    build = result["result"]["build"]
    assert build["version"] == integration_version()
    assert build["version"] != ""
    assert build["restart_pending"] is False


async def test_a_rebuilt_bundle_is_reported_until_the_next_start(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    """The sidebar entry is registered once per Home Assistant run, so an
    update through HACS leaves the address naming the previous bundle. Nothing
    else would ever mention that."""
    await setup_kustos_vision([])
    client = await hass_ws_client(hass)

    from custom_components.kustos_vision import panel as panel_module

    # What housekeeping would store after an update replaced the bundle.
    panel_module.store_disk_fingerprint(hass, "somethingelse")
    await client.send_json_auto_id({"type": f"{DOMAIN}/config/get"})
    result = await client.receive_json()

    assert result["result"]["build"]["restart_pending"] is True
