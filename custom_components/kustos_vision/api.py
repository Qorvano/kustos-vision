"""The websocket API the panel talks to.

This is the whole of kustos_vision's interface. The panel renders what these
commands return and calls them to change anything; deleting the front-end
directory must not cost a single capability. That is a hard rule, not a style
preference: it keeps the logic testable without a browser, and it means a
future front-end rewrite touches nothing else.

Commands are named ``kustos_vision/<area>/<action>``. Everything that writes
requires an admin, because it changes what gets recorded and where.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util

from .actions import CapabilityError, async_trigger
from .config_flow import async_validate_base_path
from .const import DATA_STAMP_AVAILABLE, DOMAIN
from .coordinator import CamwatchCoordinator
from .core.capabilities import (
    CAPABILITY_KEYS,
    EntityCandidate,
    suggest_capabilities,
    suggest_streams,
)
from .core.config import (
    CameraConfig,
    CameraViewSettings,
    CapabilityBinding,
    ConfigError,
    CustomControl,
    StorageConfig,
    StreamConfig,
    ViewConfig,
    VisionProfile,
)
from .core.index import blocks_from_segments
from .core.observations import ObservationError
from .panel import disk_fingerprint, registered_fingerprint
from .version import integration_version
from .vision import VisionError

_LOGGER = logging.getLogger(__name__)


@callback
def async_register(hass: HomeAssistant) -> None:
    """Register every websocket command."""
    for command in (
        ws_get_config,
        ws_set_storage,
        ws_reconnect_storage,
        ws_set_camera,
        ws_delete_camera,
        ws_suggest_camera,
        ws_available_cameras,
        ws_set_views,
        ws_set_view_order,
        ws_trigger_capability,
        ws_rebuild_index,
        ws_recording_days,
        ws_timeline,
        ws_set_vision,
        ws_delete_vision,
        ws_analyse_now,
        ws_vision_history,
        ws_vision_backends,
    ):
        websocket_api.async_register_command(hass, command)


def _coordinator(hass: HomeAssistant) -> CamwatchCoordinator | None:
    entries = hass.config_entries.async_loaded_entries(DOMAIN)
    return entries[0].runtime_data if entries else None


def _require(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict):
    """Return the coordinator, or report that kustos_vision is not set up."""
    coordinator = _coordinator(hass)
    if coordinator is None:
        connection.send_error(
            msg["id"], "not_loaded", "kustos_vision is not set up"
        )
        return None
    return coordinator


def _snapshot(coordinator: CamwatchCoordinator) -> dict[str, Any]:
    """Everything the panel needs to render, in one message.

    Sent as a whole rather than in pieces because the panel's first paint needs
    all of it, and a partial snapshot would show cameras without their state.
    """
    data = coordinator.data
    cameras = []
    for camera in coordinator.config.cameras:
        state = data.cameras.get(camera.slug) if data else None
        cameras.append(
            {
                **camera.as_dict(),
                "state": {
                    "recording": state.recording if state else False,
                    "wants_recording": state.wants_recording if state else False,
                    "paused": state.paused if state else False,
                    "used_bytes": state.used_bytes if state else 0,
                    "oldest_start": (
                        state.oldest_start.isoformat()
                        if state and state.oldest_start
                        else None
                    ),
                    "streams": [
                        {
                            "stream_key": s.stream_key,
                            "running": s.running,
                            "restarts": s.restarts,
                            "last_error": s.last_error,
                            "recent_output": list(s.recent_output),
                        }
                        for s in (state.streams if state else ())
                    ],
                },
            }
        )

    vision = []
    for profile in coordinator.config.vision:
        state = coordinator.vision.state_for(profile.camera_slug)
        vision.append(
            {
                **profile.as_dict(),
                "state": {
                    "values": dict(state.values),
                    "last_run": state.last_run.isoformat() if state.last_run else None,
                    "last_error": state.last_error,
                    "running": state.running,
                    "analyses_today": state.count_for(dt_util.now().date()),
                },
            }
        )

    return {
        "storage": coordinator.config.storage.as_dict(),
        "cameras": cameras,
        "vision": vision,
        "views": [
            {
                **view.as_dict(),
                # Resolved here so the panel renders what it is given instead
                # of re-deriving the ordering rules.
                "cameras": [
                    camera.slug
                    for camera in coordinator.config.cameras_in_view(view.id)
                ],
            }
            for view in coordinator.config.views
        ],
        "capability_keys": list(CAPABILITY_KEYS),
        # Why the recording location cannot be used right now, or None. The
        # panel shows this as a banner, because a camera page that silently
        # records nothing is the worst way to find out.
        "storage_error": coordinator.storage_error,
        # Whether the banner may offer to reconnect the mount: only on
        # Supervisor installations, and only when the broken location actually
        # lives on a Supervisor mount.
        "storage_reconnect_available": coordinator.reconnect_mount is not None,
        "totals": {
            "used_bytes": data.total_bytes if data else 0,
            "free_bytes": data.free_bytes if data else None,
            "over_budget_bytes": data.over_budget_bytes if data else 0,
        },
        "maintenance": {
            "indexed": data.maintenance.indexed if data else 0,
            "deleted": data.maintenance.deleted if data else 0,
            "thumbnails": data.maintenance.thumbnails if data else 0,
            "error": data.maintenance.error if data else None,
        },
        # What is installed, and whether what is being served still matches it.
        # A panel that keeps showing an old version after an update is
        # otherwise invisible: everything looks like it worked, the change is
        # simply not there, and the only way to find out is to know how browser
        # caches behave. The panel compares this against the version it was
        # built with and says so plainly.
        "build": {
            "version": integration_version(),
            # Greyed-out checkbox instead of a failed download: whether the
            # shipped ffmpeg can draw the clock into an export at all.
            "stamp_available": bool(
                coordinator.hass.data.get(DATA_STAMP_AVAILABLE, False)
            ),
            # True when the bundle on disk is no longer the one the sidebar
            # entry points at. Registration happens once per Home Assistant
            # run, so an update through HACS leaves the address naming the
            # previous bundle until Home Assistant is restarted.
            "restart_pending": _restart_pending(coordinator.hass),
        },
    }


def _restart_pending(hass: HomeAssistant) -> bool:
    """Whether the built front-end has changed since it was registered.

    Compares two stored values and reads no file: this runs in the event
    loop for every command that returns a snapshot, and hashing the bundle
    here showed up in the live log as a blocking call. The disk side is
    refreshed by the housekeeping pass, so an update through HACS is
    noticed within one pass.
    """
    registered = registered_fingerprint(hass)
    current = disk_fingerprint(hass)
    return (
        registered is not None and current is not None and registered != current
    )


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/config/get"})
@websocket_api.async_response
async def ws_get_config(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Return the configuration and the current state in one snapshot."""
    if (coordinator := _require(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], _snapshot(coordinator))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/storage/reconnect"}
)
@websocket_api.async_response
async def ws_reconnect_storage(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Ask the Supervisor to reconnect the mount behind the recording location.

    The button in the storage banner. HAOS attempts network mounts exactly
    once at boot and never retries on its own; this is that missing retry,
    placed where the person is already looking at the consequence.
    """
    if (coordinator := _require(hass, connection, msg)) is None:
        return
    mount = coordinator.reconnect_mount
    if mount is None:
        connection.send_error(
            msg["id"],
            "no_mount",
            "Der Aufnahmeort liegt auf keinem neu verbindbaren Netzwerkspeicher.",
        )
        return
    from .supervisor_mount import async_reload_mount

    try:
        await async_reload_mount(hass, mount)
    except Exception as err:
        connection.send_error(
            msg["id"],
            "reconnect_failed",
            f"Neu verbinden von {mount} fehlgeschlagen: {err}",
        )
        return
    # Probe at once instead of waiting for the next cycle: the person is
    # watching, and a successful reload should start recording immediately.
    await coordinator.async_refresh()
    connection.send_result(msg["id"], _snapshot(coordinator))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/storage/set",
        vol.Optional("base_path"): str,
        vol.Optional("segment_seconds"): vol.All(int, vol.Range(min=1)),
        vol.Optional("max_total_bytes"): vol.Any(None, vol.All(int, vol.Range(min=1))),
        vol.Optional("max_gap_seconds"): vol.All(vol.Coerce(float), vol.Range(min=0)),
    }
)
@websocket_api.async_response
async def ws_set_storage(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Change where recordings go, and the limits that apply to them.

    Changing the location does NOT move or delete anything. The recordings
    already written stay exactly where they are; recording simply continues in
    the new place. The index is rebuilt from whatever is at the new location,
    which is why moving the files across by hand first works: the index stores
    paths relative to the root, so it recognises them again on the other side.
    """
    if (coordinator := _require(hass, connection, msg)) is None:
        return
    current = coordinator.config.storage

    base_path = current.base_path
    if "base_path" in msg and msg["base_path"] != current.base_path:
        cleaned, error = await async_validate_base_path(hass, msg["base_path"])
        if error is not None:
            connection.send_error(msg["id"], error, f"cannot use {cleaned!r}")
            return
        base_path = cleaned

    try:
        storage = StorageConfig(
            base_path=base_path,
            segment_seconds=msg.get("segment_seconds", current.segment_seconds),
            max_total_bytes=msg.get("max_total_bytes", current.max_total_bytes),
            max_gap_seconds=msg.get("max_gap_seconds", current.max_gap_seconds),
        )
    except ConfigError as err:
        connection.send_error(msg["id"], "invalid_config", str(err))
        return

    if storage.max_total_bytes is not None:
        ceiling = await coordinator.maintenance.async_ceiling(
            coordinator.config, Path(base_path)
        )
        if storage.max_total_bytes > ceiling:
            connection.send_error(
                msg["id"],
                "budget_too_large",
                f"{storage.max_total_bytes} bytes is more than fits at "
                f"{base_path}; at most {ceiling} bytes can be used there",
            )
            return

    moved = base_path != current.base_path
    if moved:
        # The index describes what is under the old root. Clearing it lets the
        # next scan describe the new one, whether the user brought the
        # recordings along or started fresh.
        await hass.async_add_executor_job(coordinator.index.clear)

    await coordinator.async_set_config(coordinator.config.with_storage(storage))
    if moved:
        _LOGGER.info(
            "kustos_vision: recordings now go to %s; anything under %s was left "
            "untouched",
            base_path,
            current.base_path,
        )
        await coordinator.async_refresh()
    connection.send_result(msg["id"], _snapshot(coordinator))


CAMERA_SCHEMA = {
    vol.Required("slug"): str,
    vol.Required("name"): str,
    vol.Optional("streams", default=[]): [
        {
            vol.Required("key"): str,
            vol.Required("entity_id"): str,
            vol.Optional("record", default=True): bool,
            vol.Optional("audio", default="transcode"): str,
        }
    ],
    vol.Optional("capabilities", default={}): {str: dict},
    vol.Optional("retention_days", default=None): vol.Any(
        None, vol.All(int, vol.Range(min=1))
    ),
    vol.Optional("enabled", default=True): bool,
    vol.Optional("area_id", default=None): vol.Any(None, str),
    vol.Optional("controls", default=[]): [
        {
            vol.Required("key"): str,
            vol.Required("name"): str,
            vol.Required("kind"): vol.In(["button", "switch", "select", "number"]),
            vol.Required("binding"): dict,
        }
    ],
    vol.Optional("view_settings", default={}): {
        str: {
            vol.Optional("visible", default=True): bool,
            vol.Optional("stream_key", default=None): vol.Any(None, str),
            vol.Optional("capabilities", default=None): vol.Any(None, [str]),
            vol.Optional("position", default=0): int,
        }
    },
}


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/camera/set",
        vol.Optional("replace_existing", default=False): bool,
        **CAMERA_SCHEMA,
    }
)
@websocket_api.async_response
async def ws_set_camera(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Add a camera, or update one when replace_existing says so.

    The flag is what separates the two. Without it this command was a blind
    upsert, so adding a camera under a name that already existed replaced that
    camera and pointed both at the same recording folder.
    """
    if (coordinator := _require(hass, connection, msg)) is None:
        return
    try:
        camera = CameraConfig(
            slug=msg["slug"],
            name=msg["name"],
            streams=tuple(StreamConfig.from_dict(s) for s in msg["streams"]),
            capabilities={
                key: CapabilityBinding.from_dict(value)
                for key, value in msg["capabilities"].items()
            },
            retention_days=msg["retention_days"],
            enabled=msg["enabled"],
            area_id=msg["area_id"],
            view_settings={
                view_id: CameraViewSettings.from_dict(value)
                for view_id, value in msg["view_settings"].items()
            },
            controls=tuple(CustomControl.from_dict(c) for c in msg["controls"]),
        )
    except ConfigError as err:
        connection.send_error(msg["id"], "invalid_config", str(err))
        return

    replacing = camera.slug if msg["replace_existing"] else None
    if msg["replace_existing"] and coordinator.config.camera(camera.slug) is None:
        connection.send_error(
            msg["id"], "not_found", f"no camera '{camera.slug}' to update"
        )
        return

    if conflicts := coordinator.config.camera_conflicts(camera, replacing):
        connection.send_error(msg["id"], "duplicate", "; ".join(conflicts))
        return

    await coordinator.async_set_config(coordinator.config.with_camera(camera))
    connection.send_result(msg["id"], _snapshot(coordinator))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/camera/delete", vol.Required("slug"): str}
)
@websocket_api.async_response
async def ws_delete_camera(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Stop recording a camera and forget its configuration.

    The recordings themselves are left on disk. Deleting a camera by accident
    must not be the same as deleting its history; retention or the file manager
    can remove it deliberately.
    """
    if (coordinator := _require(hass, connection, msg)) is None:
        return
    if coordinator.config.camera(msg["slug"]) is None:
        connection.send_error(msg["id"], "not_found", f"no camera {msg['slug']!r}")
        return
    await coordinator.async_set_config(coordinator.config.without_camera(msg["slug"]))
    connection.send_result(msg["id"], _snapshot(coordinator))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/camera/suggest", vol.Required("entity_id"): str}
)
@websocket_api.async_response
async def ws_suggest_camera(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Propose streams and capability bindings for a camera entity.

    Everything proposed here is a starting point the user edits. The proposal
    comes from the sibling entities of the same device, matched on generic
    traits, so it works the same for any camera integration.
    """
    entity_registry = er.async_get(hass)
    entry = entity_registry.async_get(msg["entity_id"])
    if entry is None:
        connection.send_error(msg["id"], "not_found", f"unknown entity {msg['entity_id']}")
        return

    candidates = _device_candidates(hass, entry.device_id)

    # The chosen entity is always a candidate for itself, even when its
    # integration creates no device to walk. Several of the most general camera
    # integrations do exactly that: a generic camera pointed at an arbitrary
    # RTSP URL, or a template camera, has no device, so the device walk returns
    # nothing and the user would be unable to add the very camera they picked.
    if all(c.entity_id != msg["entity_id"] for c in candidates):
        state = hass.states.get(msg["entity_id"])
        candidates.insert(
            0,
            EntityCandidate(
                entity_id=msg["entity_id"],
                name=(
                    entry.name
                    or entry.original_name
                    or (state.name if state else "")
                    or msg["entity_id"]
                ),
                device_class=entry.device_class or entry.original_device_class,
            ),
        )

    device_name = None
    if entry.device_id:
        device = dr.async_get(hass).async_get(entry.device_id)
        device_name = device.name_by_user or device.name if device else None

    connection.send_result(
        msg["id"],
        {
            "name": device_name or entry.name or entry.original_name or msg["entity_id"],
            "area_id": entry.area_id,
            "streams": [
                {"key": key, "entity_id": entity_id}
                for key, entity_id in suggest_streams(candidates)
            ],
            "capabilities": suggest_capabilities(candidates),
            "candidates": [
                {
                    "entity_id": c.entity_id,
                    "name": c.name,
                    "domain": c.domain,
                }
                for c in candidates
            ],
        },
    )


def _device_candidates(hass: HomeAssistant, device_id: str | None) -> list[EntityCandidate]:
    """Every entity of the device a camera entity belongs to."""
    if device_id is None:
        return []
    entity_registry = er.async_get(hass)
    candidates: list[EntityCandidate] = []
    for entry in er.async_entries_for_device(
        entity_registry, device_id, include_disabled_entities=False
    ):
        state = hass.states.get(entry.entity_id)
        candidates.append(
            EntityCandidate(
                entity_id=entry.entity_id,
                name=(
                    entry.name
                    or entry.original_name
                    or (state.name if state else "")
                    or ""
                ),
                device_class=entry.device_class or entry.original_device_class,
            )
        )
    return candidates


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/cameras/available"})
@websocket_api.async_response
async def ws_available_cameras(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """List what could be added, one entry per physical camera.

    Grouped by device rather than listed per entity. A camera that offers a
    main and a sub stream appears in Home Assistant as two camera entities, and
    offering both separately invites picking one of them as if it were a second
    camera. It is one camera; its streams are chosen afterwards, together.

    Entities without a device stay on their own, because for them that really
    is one camera each. Cameras kustos_vision itself might publish are excluded,
    so the panel cannot offer to record its own output.

    Devices already in use are marked rather than hidden: hiding them makes an
    existing camera look missing, and marking them says why it cannot be added
    again while still allowing it to be seen.
    """
    entity_registry = er.async_get(hass)
    device_registry = dr.async_get(hass)

    if (coordinator := _coordinator(hass)) is not None:
        taken = {
            stream.entity_id
            for camera in coordinator.config.cameras
            for stream in camera.streams
        }
    else:
        taken = set()

    groups: dict[str, dict[str, Any]] = {}
    for entry in entity_registry.entities.values():
        if entry.domain != "camera" or entry.platform == DOMAIN or entry.disabled:
            continue
        state = hass.states.get(entry.entity_id)
        entity_name = (
            entry.name or entry.original_name or (state.name if state else None)
        )
        available = state is not None and state.state != "unavailable"

        # One key per device, and a key of its own for an entity that has none.
        key = f"device:{entry.device_id}" if entry.device_id else f"entity:{entry.entity_id}"
        group = groups.get(key)
        if group is None:
            name = entity_name
            if entry.device_id:
                device = device_registry.async_get(entry.device_id)
                if device is not None:
                    name = device.name_by_user or device.name or entity_name
            groups[key] = {
                "entity_id": entry.entity_id,
                "name": name,
                "device_id": entry.device_id,
                "area_id": entry.area_id,
                "available": available,
                "streams": [{"entity_id": entry.entity_id, "name": entity_name}],
                "in_use": entry.entity_id in taken,
            }
            continue

        group["streams"].append({"entity_id": entry.entity_id, "name": entity_name})
        # A device counts as reachable when any of its streams is, and as taken
        # when any of them is already recorded.
        group["available"] = group["available"] or available
        group["in_use"] = group["in_use"] or entry.entity_id in taken

    cameras = sorted(
        groups.values(), key=lambda c: (c["name"] or c["entity_id"]).lower()
    )
    for camera in cameras:
        camera["streams"].sort(key=lambda s: (s["name"] or s["entity_id"]).lower())
    connection.send_result(msg["id"], {"cameras": cameras})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/views/set",
        vol.Required("views"): [
            {
                vol.Required("id"): str,
                vol.Required("name"): str,
                vol.Optional("icon", default="mdi:cctv"): str,
                vol.Optional("columns", default=0): vol.All(int, vol.Range(min=0)),
            }
        ],
    }
)
@websocket_api.async_response
async def ws_set_views(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Replace every view at once, which is also how reordering the tabs works.

    Which cameras a view shows is not set here: that lives on the cameras, so
    that the stream and the controls a camera offers can differ per view.
    """
    if (coordinator := _require(hass, connection, msg)) is None:
        return
    try:
        views = tuple(ViewConfig.from_dict(v) for v in msg["views"])
    except ConfigError as err:
        connection.send_error(msg["id"], "invalid_config", str(err))
        return

    try:
        updated = coordinator.config.with_views(views)
    except ConfigError as err:
        connection.send_error(msg["id"], "invalid_config", str(err))
        return
    await coordinator.async_set_config(updated)
    connection.send_result(msg["id"], _snapshot(coordinator))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/view/order",
        vol.Required("view_id"): str,
        vol.Required("cameras"): [str],
    }
)
@websocket_api.async_response
async def ws_set_view_order(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Set the order of every camera in one view.

    Edited as a whole list because the order is a property of the view. Setting
    it as a number on each camera would mean opening every camera in turn just
    to find out which position is still free.
    """
    if (coordinator := _require(hass, connection, msg)) is None:
        return
    if coordinator.config.view(msg["view_id"]) is None:
        connection.send_error(msg["id"], "not_found", f"no view '{msg['view_id']}'")
        return

    known = {c.slug for c in coordinator.config.cameras}
    if unknown := [slug for slug in msg["cameras"] if slug not in known]:
        connection.send_error(
            msg["id"], "not_found", f"unknown cameras: {', '.join(unknown)}"
        )
        return

    await coordinator.async_set_config(
        coordinator.config.with_view_order(msg["view_id"], msg["cameras"])
    )
    connection.send_result(msg["id"], _snapshot(coordinator))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/camera/trigger",
        vol.Required("slug"): str,
        vol.Required("capability"): str,
        vol.Optional("value"): vol.Any(None, bool, int, float, str),
    }
)
@websocket_api.async_response
async def ws_trigger_capability(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Press a PTZ button, switch a light, sound a siren."""
    if (coordinator := _require(hass, connection, msg)) is None:
        return
    camera = coordinator.config.camera(msg["slug"])
    if camera is None:
        connection.send_error(msg["id"], "not_found", f"no camera {msg['slug']!r}")
        return
    try:
        await async_trigger(hass, camera, msg["capability"], msg.get("value"))
    except CapabilityError as err:
        connection.send_error(msg["id"], "not_bound", str(err))
        return
    except Exception as err:
        connection.send_error(msg["id"], "call_failed", str(err))
        return
    connection.send_result(msg["id"], {})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/index/rebuild"})
@websocket_api.async_response
async def ws_rebuild_index(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Rebuild the segment index from what is actually on disk.

    The index is a cache over the recordings, so this is always safe: it can
    only bring it back in line with the files.
    """
    if (coordinator := _require(hass, connection, msg)) is None:
        return
    await hass.async_add_executor_job(coordinator.index.clear)
    await coordinator.async_refresh()
    connection.send_result(msg["id"], _snapshot(coordinator))


# ----------------------------------------------------------------------
# Recordings
# ----------------------------------------------------------------------


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/recordings/days",
        vol.Required("camera"): str,
    }
)
@websocket_api.async_response
async def ws_recording_days(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Local days that hold at least one segment, for the day picker.

    Derived from the stored UTC times rather than from directory names, so a
    day is offered exactly when it has content the user can actually watch.
    """
    if (coordinator := _require(hass, connection, msg)) is None:
        return
    days = await hass.async_add_executor_job(
        coordinator.index.days_with_recordings,
        msg["camera"],
        dt_util.get_default_time_zone(),
    )
    connection.send_result(msg["id"], {"days": [d.isoformat() for d in days]})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/recordings/timeline",
        vol.Required("camera"): str,
        vol.Required("from"): vol.Coerce(float),
        vol.Required("to"): vol.Coerce(float),
        vol.Optional("stream"): vol.Any(None, str),
    }
)
@websocket_api.async_response
async def ws_timeline(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """What was recorded in a time range, as blocks and as segments.

    Both in one answer because the panel needs both at once: the blocks draw
    the bar, and the segments are what the player appends. Sending them
    separately would let the two disagree about the same moment.

    Gaps are not smoothed over. A camera reboot, a network outage or a Home
    Assistant restart leaves a hole, and that is information the user needs
    rather than something to hide.
    """
    if (coordinator := _require(hass, connection, msg)) is None:
        return

    start, end = msg["from"], msg["to"]
    if end <= start:
        connection.send_error(msg["id"], "invalid_range", "the range is empty")
        return

    segments = await hass.async_add_executor_job(
        coordinator.index.in_range, start, end, msg["camera"], msg.get("stream")
    )
    blocks = blocks_from_segments(segments, coordinator.config.storage.max_gap_seconds)

    connection.send_result(
        msg["id"],
        {
            "blocks": [
                {
                    "stream_key": b.stream_key,
                    "start": b.start_utc,
                    "end": b.end_utc,
                    "segments": b.segments,
                }
                for b in blocks
            ],
            "segments": [
                {
                    "path": s.rel_path,
                    "stream_key": s.stream_key,
                    "start": s.start_utc,
                    "duration": s.duration_s,
                    "size": s.size_bytes,
                    "thumbnail": s.has_thumbnail,
                }
                for s in segments
            ],
        },
    )


# ----------------------------------------------------------------------
# Vision
# ----------------------------------------------------------------------


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/vision/set",
        vol.Required("camera_slug"): str,
        vol.Required("backend"): dict,
        vol.Optional("observations", default=[]): [dict],
        vol.Optional("triggers", default=[]): [str],
        vol.Optional("context", default=""): str,
        vol.Optional("cooldown_seconds"): vol.All(int, vol.Range(min=0)),
        vol.Optional("daily_budget"): vol.All(int, vol.Range(min=1)),
        vol.Optional("condition_entity", default=None): vol.Any(None, str),
        vol.Optional("enabled", default=True): bool,
    }
)
@websocket_api.async_response
async def ws_set_vision(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Create or replace the vision profile of one camera."""
    if (coordinator := _require(hass, connection, msg)) is None:
        return

    payload = {
        "camera_slug": msg["camera_slug"],
        "backend": msg["backend"],
        "observations": msg["observations"],
        "triggers": msg["triggers"],
        "context": msg["context"],
        "condition_entity": msg["condition_entity"],
        "enabled": msg["enabled"],
    }
    for optional in ("cooldown_seconds", "daily_budget"):
        if optional in msg:
            payload[optional] = msg[optional]

    try:
        profile = VisionProfile.from_dict(payload)
        updated = coordinator.config.with_vision(profile)
    except (ConfigError, ObservationError) as err:
        connection.send_error(msg["id"], "invalid_config", str(err))
        return

    await coordinator.async_set_config(updated)
    connection.send_result(msg["id"], _snapshot(coordinator))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/vision/delete", vol.Required("camera_slug"): str}
)
@websocket_api.async_response
async def ws_delete_vision(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Stop analysing a camera. Its recordings are untouched."""
    if (coordinator := _require(hass, connection, msg)) is None:
        return
    if coordinator.config.vision_for(msg["camera_slug"]) is None:
        connection.send_error(msg["id"], "not_found", "no vision profile")
        return
    await coordinator.async_set_config(
        coordinator.config.without_vision(msg["camera_slug"])
    )
    connection.send_result(msg["id"], _snapshot(coordinator))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/vision/analyse",
        vol.Required("camera_slug"): str,
    }
)
@websocket_api.async_response
async def ws_analyse_now(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Run an analysis right now, which is how a question gets tried out.

    The cooldown is skipped because the user just asked; the daily budget is
    not, because that is the limit that exists to stop runaway cost.
    """
    if (coordinator := _require(hass, connection, msg)) is None:
        return
    try:
        result = await coordinator.vision.async_analyse(
            msg["camera_slug"], reason="panel", force=True
        )
    except VisionError as err:
        connection.send_error(msg["id"], "analysis_failed", str(err))
        return

    if result is None:
        connection.send_result(
            msg["id"], {"ran": False, "values": {}, "problems": {}}
        )
        return
    connection.send_result(
        msg["id"],
        {
            "ran": True,
            "values": result.values,
            "problems": result.problems,
            "raw": result.raw,
            "duration": round(result.duration_s, 2),
        },
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/vision/history", vol.Required("camera_slug"): str}
)
@websocket_api.async_response
async def ws_vision_history(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """The last few analyses, with what the model actually returned.

    This is the only practical way to improve a question: seeing the raw answer
    next to the picture that produced it beats guessing at wording.
    """
    if (coordinator := _require(hass, connection, msg)) is None:
        return
    state = coordinator.vision.state_for(msg["camera_slug"])
    connection.send_result(msg["id"], {"history": list(state.history)})


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/vision/backends"})
@websocket_api.async_response
async def ws_vision_backends(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """The AI Task entities that can actually be used.

    Filtered to those that both generate data and accept attachments: an entity
    without attachment support cannot be shown a picture, and offering it would
    only produce a confusing failure later.
    """
    from homeassistant.components.ai_task import AITaskEntityFeature

    needed = AITaskEntityFeature.GENERATE_DATA | AITaskEntityFeature.SUPPORT_ATTACHMENTS
    entities = []
    for state in hass.states.async_all("ai_task"):
        features = state.attributes.get("supported_features", 0)
        if features & needed == needed:
            entities.append(
                {
                    "entity_id": state.entity_id,
                    "name": state.attributes.get("friendly_name", state.entity_id),
                    "available": state.state not in ("unavailable", "unknown"),
                }
            )
    connection.send_result(msg["id"], {"ai_task": entities})
