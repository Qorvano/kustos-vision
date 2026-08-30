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


def camera_dict(slug="vorgarten", **overrides) -> dict:
    base = {
        "slug": slug,
        "name": slug.title(),
        "streams": [{"key": "hd", "entity_id": f"camera.{slug}_hd", "record": True}],
        "capabilities": {},
        "retention_days": None,
        "enabled": True,
        "area_id": None,
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
    assert data["cameras"][0]["slug"] == "vorgarten"
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
    assert [c["slug"] for c in result["result"]["cameras"]] == ["vorgarten"]


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


async def test_setting_an_existing_camera_replaces_it(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision([camera_dict()])
    client = await hass_ws_client(hass)

    result = await send(
        client, type=f"{DOMAIN}/camera/set", **camera_dict(name="Neuer Name")
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

    result = await send(client, type=f"{DOMAIN}/camera/delete", slug="vorgarten")
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
        [camera_dict()],
        [{"id": "aussen", "name": "Außen", "cameras": ["vorgarten"]}],
    )
    client = await hass_ws_client(hass)

    result = await send(client, type=f"{DOMAIN}/camera/delete", slug="vorgarten")
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
        views=[
            {"id": "a", "name": "A", "cameras": ["vorgarten"]},
            {"id": "b", "name": "B"},
        ],
    )
    assert result["success"]
    assert [v["id"] for v in result["result"]["views"]] == ["a", "b"]

    result = await send(
        client,
        type=f"{DOMAIN}/views/set",
        views=[{"id": "b", "name": "B"}, {"id": "a", "name": "A"}],
    )
    assert [v["id"] for v in result["result"]["views"]] == ["b", "a"]


async def test_a_view_cannot_reference_an_unknown_camera(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision
) -> None:
    await setup_kustos_vision()
    client = await hass_ws_client(hass)

    result = await send(
        client,
        type=f"{DOMAIN}/views/set",
        views=[{"id": "a", "name": "A", "cameras": ["ghost"]}],
    )
    assert not result["success"]
    assert result["error"]["code"] == "not_found"


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


async def test_the_storage_path_is_not_settable_here(
    hass: HomeAssistant, hass_ws_client, setup_kustos_vision, tmp_path: Path
) -> None:
    """Moving it would strand every existing recording."""
    await setup_kustos_vision()
    client = await hass_ws_client(hass)

    result = await send(
        client, type=f"{DOMAIN}/storage/set", base_path=str(tmp_path / "elsewhere")
    )
    assert not result["success"]
    assert result["error"]["code"] == "invalid_format"


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
        client, type=f"{DOMAIN}/camera/trigger", slug="vorgarten", capability="ptz_up"
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
        client, type=f"{DOMAIN}/camera/trigger", slug="vorgarten", capability="ptz_up"
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
        slug="vorgarten",
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
        slug="vorgarten",
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
        client, type=f"{DOMAIN}/camera/trigger", slug="vorgarten", capability="ptz_left"
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
        (f"{DOMAIN}/camera/delete", {"slug": "vorgarten"}),
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
