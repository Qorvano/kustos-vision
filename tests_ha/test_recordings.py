"""Serving recordings, and answering what exists when."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.kustos_vision.const import (
    CONF_BASE_PATH,
    DOMAIN,
    STORAGE_KEY_CONFIG,
    STORAGE_VERSION_CONFIG,
)

# The scan resolves a file name to UTC through Home Assistant's timezone, so
# the fixture has to place its files with the same one. Using the system
# timezone instead makes the durations come out as zero whenever the two
# differ, which is exactly the kind of failure that only appears in a full run.
TIMEZONE = "Europe/Berlin"


@pytest.fixture
def no_ffmpeg():
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
async def recorded(hass: HomeAssistant, hass_storage: dict, tmp_path: Path, no_ffmpeg):
    """A kustos_vision with three real files on disk, indexed the way it really is.

    The index is filled by kustos_vision's own scan rather than by inserting rows:
    the start time comes from the file name and never changes afterwards, so a
    test that writes its own times would be testing something the integration
    does not do.

    Two segments touch, the third is two hours later, which is the gap the
    timeline has to show.
    """
    import os

    await hass.config.async_update(time_zone=TIMEZONE)
    local = dt_util.get_default_time_zone()

    base = tmp_path / "recordings"
    day = base / "vorgarten" / "2026-08-30"
    day.mkdir(parents=True)

    files = []
    for name, duration in (
        ("14-00-00_hd.mp4", 300),
        ("14-05-00_hd.mp4", 300),
        ("16-00-00_hd.mp4", 300),
    ):
        path = day / name
        path.write_bytes(b"video-bytes-" + name.encode())
        (day / name.replace(".mp4", ".jpg")).write_bytes(b"jpeg-bytes")
        # mtime marks when the segment was last written, which is what the
        # scan reads the duration from.
        hour, minute, _ = name.split("_")[0].split("-")
        naive = datetime(2026, 8, 30, int(hour), int(minute))
        end = naive.replace(tzinfo=local).timestamp() + duration
        os.utime(path, (end, end))
        files.append((f"vorgarten/2026-08-30/{name}", path))

    hass_storage[STORAGE_KEY_CONFIG] = {
        "version": STORAGE_VERSION_CONFIG,
        "minor_version": 1,
        "key": STORAGE_KEY_CONFIG,
        "data": {
            "version": 1,
            "storage": {"base_path": str(base), "segment_seconds": 300},
            "cameras": [
                {
                    "slug": "vorgarten",
                    "name": "Vorgarten",
                    "streams": [
                        {"key": "hd", "entity_id": "camera.vg", "record": False}
                    ],
                    "capabilities": {},
                    "retention_days": None,
                    "enabled": True,
                    "area_id": None,
                }
            ],
            "views": [],
        },
    }
    entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    coordinator = entry.runtime_data
    rows = await hass.async_add_executor_job(coordinator.index.oldest_first)
    assert len(rows) == 3, "kustos_vision did not index the prepared recordings"
    first = rows[0].start_utc
    yield entry, base, files, first
    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()


async def send(client, **payload) -> dict:
    await client.send_json_auto_id(payload)
    return await client.receive_json()


# ----------------------------------------------------------------------
# Timeline queries
# ----------------------------------------------------------------------


async def test_days_with_recordings_are_listed(
    hass: HomeAssistant, hass_ws_client, recorded
) -> None:
    client = await hass_ws_client(hass)
    result = await send(client, type=f"{DOMAIN}/recordings/days", camera="vorgarten")
    assert result["success"]
    assert result["result"]["days"] == ["2026-08-30"]


async def test_the_timeline_returns_blocks_and_segments_together(
    hass: HomeAssistant, hass_ws_client, recorded
) -> None:
    _, _, _, start = recorded
    """The panel needs both at once; separate answers could disagree about the
    same moment."""
    client = await hass_ws_client(hass)
    result = await send(
        client,
        type=f"{DOMAIN}/recordings/timeline",
        camera="vorgarten",
        **{"from": start - 60, "to": start + 10000},
    )
    assert result["success"]
    assert len(result["result"]["segments"]) == 3
    assert "blocks" in result["result"]


async def test_a_real_gap_splits_the_timeline(
    hass: HomeAssistant, hass_ws_client, recorded
) -> None:
    _, _, _, start = recorded
    """Two segments touch, the third is two hours later. A camera reboot or a
    Home Assistant restart is information the user needs to see."""
    client = await hass_ws_client(hass)
    result = await send(
        client,
        type=f"{DOMAIN}/recordings/timeline",
        camera="vorgarten",
        **{"from": start - 60, "to": start + 10000},
    )
    blocks = result["result"]["blocks"]
    assert len(blocks) == 2
    assert blocks[0]["segments"] == 2
    assert blocks[1]["segments"] == 1


async def test_the_timeline_can_be_limited_to_a_window(
    hass: HomeAssistant, hass_ws_client, recorded
) -> None:
    _, _, _, start = recorded
    client = await hass_ws_client(hass)
    result = await send(
        client,
        type=f"{DOMAIN}/recordings/timeline",
        camera="vorgarten",
        **{"from": start, "to": start + 400},
    )
    assert len(result["result"]["segments"]) == 2


async def test_an_empty_range_is_refused(
    hass: HomeAssistant, hass_ws_client, recorded
) -> None:
    _, _, _, start = recorded
    client = await hass_ws_client(hass)
    result = await send(
        client,
        type=f"{DOMAIN}/recordings/timeline",
        camera="vorgarten",
        **{"from": start, "to": start},
    )
    assert not result["success"]
    assert result["error"]["code"] == "invalid_range"


# ----------------------------------------------------------------------
# File endpoints
# ----------------------------------------------------------------------


async def test_a_segment_is_served(
    hass: HomeAssistant, hass_client, recorded
) -> None:
    _, _, files, _ = recorded
    client = await hass_client()
    response = await client.get(f"/api/{DOMAIN}/segment/{files[0][0]}")
    assert response.status == 200
    assert response.headers["Content-Type"] == "video/mp4"
    assert await response.read() == files[0][1].read_bytes()


async def test_a_segment_supports_range_requests(
    hass: HomeAssistant, hass_client, recorded
) -> None:
    """Without this a browser cannot seek inside a recording, which is the
    whole point of a timeline."""
    _, _, files, _ = recorded
    client = await hass_client()
    response = await client.get(
        f"/api/{DOMAIN}/segment/{files[0][0]}", headers={"Range": "bytes=0-4"}
    )
    assert response.status == 206
    assert await response.read() == files[0][1].read_bytes()[:5]


async def test_a_thumbnail_is_served_under_the_segment_path(
    hass: HomeAssistant, hass_client, recorded
) -> None:
    """Addressed by the segment so the caller does not have to know how
    previews are named."""
    _, _, files, _ = recorded
    client = await hass_client()
    response = await client.get(f"/api/{DOMAIN}/thumbnail/{files[0][0]}")
    assert response.status == 200
    assert response.headers["Content-Type"] == "image/jpeg"


@pytest.mark.parametrize(
    "path",
    [
        "../../../etc/passwd",
        "vorgarten/2026-08-30/../../../etc/passwd",
        "/etc/passwd",
        "vorgarten/2026-08-30/notes.txt",
        "vorgarten/backup/14-00-00_hd.mp4",
        "vorgarten/2026-08-30/14-00-00_hd.mp4/extra",
    ],
)
async def test_only_kustos_vision_recordings_can_be_fetched(
    hass: HomeAssistant, hass_client, recorded, path: str
) -> None:
    """Two independent checks: the shape has to look like a recording, and the
    index has to actually know it."""
    client = await hass_client()
    response = await client.get(f"/api/{DOMAIN}/segment/{path}")
    assert response.status == 404


async def test_a_file_the_index_does_not_know_is_not_served(
    hass: HomeAssistant, hass_client, recorded
) -> None:
    """Someone dropping a file into the tree by hand does not make it
    fetchable through the API."""
    _, base, _, _ = recorded
    intruder = base / "vorgarten" / "2026-08-30" / "23-59-59_hd.mp4"
    intruder.write_bytes(b"not ours")

    client = await hass_client()
    response = await client.get(
        f"/api/{DOMAIN}/segment/vorgarten/2026-08-30/23-59-59_hd.mp4"
    )
    assert response.status == 404


async def test_fetching_a_recording_needs_authentication(
    hass: HomeAssistant, hass_client_no_auth, recorded
) -> None:
    _, _, files, _ = recorded
    client = await hass_client_no_auth()
    response = await client.get(f"/api/{DOMAIN}/segment/{files[0][0]}")
    assert response.status == 401


# ----------------------------------------------------------------------
# Export
# ----------------------------------------------------------------------


async def test_export_refuses_an_empty_range(
    hass: HomeAssistant, hass_client, recorded
) -> None:
    _, _, _, start = recorded
    client = await hass_client()
    response = await client.get(
        f"/api/{DOMAIN}/export", params={"camera": "vorgarten", "from": start, "to": start}
    )
    assert response.status == 400


async def test_export_refuses_more_than_a_day(
    hass: HomeAssistant, hass_client, recorded
) -> None:
    _, _, _, start = recorded
    """The timeline works a day at a time, so a longer range is not a unit the
    user picked on purpose."""
    client = await hass_client()
    response = await client.get(
        f"/api/{DOMAIN}/export",
        params={"camera": "vorgarten", "from": start, "to": start + 25 * 3600},
    )
    assert response.status == 400


async def test_export_of_a_range_without_recordings_is_not_found(
    hass: HomeAssistant, hass_client, recorded
) -> None:
    _, _, _, start = recorded
    client = await hass_client()
    response = await client.get(
        f"/api/{DOMAIN}/export",
        params={"camera": "vorgarten", "from": start + 100000, "to": start + 103000},
    )
    assert response.status == 404


async def test_export_requires_its_parameters(
    hass: HomeAssistant, hass_client, recorded
) -> None:
    client = await hass_client()
    response = await client.get(f"/api/{DOMAIN}/export", params={"camera": "vorgarten"})
    assert response.status == 400


async def test_retention_runs_even_without_a_configured_budget(
    hass: HomeAssistant, recorded, monkeypatch
) -> None:
    """The point of the automatic fallback: an installation that configured
    nothing must not fill the disk and then die with "no space left on
    device". It behaves as though a budget were set.
    """
    entry, _base, _files, _ = recorded
    coordinator = entry.runtime_data
    assert coordinator.config.storage.max_total_bytes is None

    index = coordinator.index
    before = await hass.async_add_executor_job(index.oldest_first)
    assert len(before) == 3

    # A volume with almost nothing left. The headroom alone exceeds it, so
    # everything that can go, goes.
    class _Full:
        free = 0

    monkeypatch.setattr(
        "custom_components.kustos_vision.maintenance._disk_usage",
        lambda _p: _Full(),
    )

    await coordinator.async_refresh()
    await hass.async_block_till_done()

    after = await hass.async_add_executor_job(index.oldest_first)
    assert len(after) < len(before), "nothing was freed despite a full volume"


async def test_an_unreadable_volume_does_not_delete_anything(
    hass: HomeAssistant, recorded, monkeypatch
) -> None:
    """Regression, found by review: a failed free-space reading was folded into
    the budget as "zero free", which made the automatic budget equal to what is
    already recorded minus the headroom. Every run then deleted one headroom of
    the oldest footage, and the next run computed an even lower budget from the
    result. A remote mount whose statfs is unsupported or briefly failing would
    lose its entire archive that way, on a disk with plenty of room.
    """
    entry, _base, _files, _ = recorded
    coordinator = entry.runtime_data
    index = coordinator.index
    before = await hass.async_add_executor_job(index.oldest_first)
    assert len(before) == 3

    monkeypatch.setattr(
        "custom_components.kustos_vision.maintenance._disk_usage",
        lambda _p: None,
    )

    for _ in range(3):
        await coordinator.async_refresh()
        await hass.async_block_till_done()

    after = await hass.async_add_executor_job(index.oldest_first)
    assert len(after) == len(before), "recordings were deleted on an unmeasurable volume"


async def test_an_unreadable_volume_still_honours_a_configured_budget(
    hass: HomeAssistant, recorded, monkeypatch
) -> None:
    """Not measuring the volume is a reason not to invent a limit, not a reason
    to ignore one the user set."""
    entry, _base, _files, _ = recorded
    coordinator = entry.runtime_data
    index = coordinator.index
    rows = await hass.async_add_executor_job(index.oldest_first)
    budget = sum(r.size_bytes for r in rows) // 2

    monkeypatch.setattr(
        "custom_components.kustos_vision.maintenance._disk_usage",
        lambda _p: None,
    )
    storage = coordinator.config.storage
    await coordinator.async_set_config(
        coordinator.config.with_storage(
            type(storage)(
                base_path=storage.base_path,
                segment_seconds=storage.segment_seconds,
                max_total_bytes=budget,
            )
        )
    )
    await coordinator.async_refresh()
    await hass.async_block_till_done()

    after = await hass.async_add_executor_job(index.oldest_first)
    assert len(after) < len(rows)


# ----------------------------------------------------------------------
# How the panel actually reaches these files
# ----------------------------------------------------------------------
#
# The tests above use hass_client, which puts an Authorization header on every
# request by itself. That is exactly why a real bug got past them: an <img>, a
# download link and a plain fetch in the panel send no such header, so every
# one of those requests was refused. The player reported that a recording could
# not be loaded when the recording was perfectly intact, and previews stayed
# blank. These tests use the two ways a browser really has.


def _sign(hass: HomeAssistant, path: str) -> str:
    """Sign a path the way the panel asks Home Assistant to sign it."""
    from datetime import timedelta

    from homeassistant.components.http.auth import async_sign_path

    return async_sign_path(hass, path, timedelta(seconds=60))


async def test_a_file_request_without_credentials_is_refused(
    hass: HomeAssistant, hass_client_no_auth, recorded
) -> None:
    """The reason the panel has to authenticate at all, pinned down.

    There is no cookie to fall back on: Home Assistant accepts an
    Authorization header or a signed path and nothing else.
    """
    _, _, files, _ = recorded
    client = await hass_client_no_auth()
    for endpoint in ("segment", "thumbnail"):
        response = await client.get(f"/api/{DOMAIN}/{endpoint}/{files[0][0]}")
        assert response.status == 401, endpoint


async def test_a_signed_address_serves_a_segment(
    hass: HomeAssistant, hass_client_no_auth, recorded
) -> None:
    """What the player falls back to when it has no token to present."""
    _, _, files, _ = recorded
    client = await hass_client_no_auth()
    response = await client.get(_sign(hass, f"/api/{DOMAIN}/segment/{files[0][0]}"))
    assert response.status == 200
    assert await response.read() == files[0][1].read_bytes()


async def test_a_signed_address_serves_a_preview(
    hass: HomeAssistant, hass_client_no_auth, recorded
) -> None:
    """How the timeline shows previews: an <img> cannot send a header, so the
    address itself has to carry the permission."""
    _, _, files, _ = recorded
    client = await hass_client_no_auth()
    response = await client.get(_sign(hass, f"/api/{DOMAIN}/thumbnail/{files[0][0]}"))
    assert response.status == 200
    assert response.headers["Content-Type"] == "image/jpeg"


async def test_a_signed_address_survives_a_range_request(
    hass: HomeAssistant, hass_client_no_auth, recorded
) -> None:
    """Seeking asks for a byte range. The signature covers the path and the
    query, not the headers, so ranges have to keep working."""
    _, _, files, _ = recorded
    client = await hass_client_no_auth()
    response = await client.get(
        _sign(hass, f"/api/{DOMAIN}/segment/{files[0][0]}"),
        headers={"Range": "bytes=0-4"},
    )
    assert response.status == 206
    assert await response.read() == files[0][1].read_bytes()[:5]


async def test_a_signed_export_keeps_its_query(
    hass: HomeAssistant, hass_client_no_auth, recorded
) -> None:
    """The export carries camera and range in the query, and the signature
    covers those in order. If the panel rebuilt the address after signing, or
    reordered it, the request would be refused."""
    _, _, _, first = recorded
    client = await hass_client_no_auth()
    query = f"camera=vorgarten&from={first}&to={first + 3600}&stream=hd"
    with patch(
        "custom_components.kustos_vision.http_views.stream_export"
    ) as export:
        export.return_value = _async_bytes(b"joined")
        response = await client.get(_sign(hass, f"/api/{DOMAIN}/export?{query}"))
    assert response.status == 200
    assert await response.read() == b"joined"


async def test_a_signature_does_not_cover_a_different_file(
    hass: HomeAssistant, hass_client_no_auth, recorded
) -> None:
    """A signed address is a key to one file, not to the recordings folder."""
    _, _, files, _ = recorded
    signed = _sign(hass, f"/api/{DOMAIN}/segment/{files[0][0]}")
    swapped = signed.replace(files[0][0], files[2][0])
    client = await hass_client_no_auth()
    assert (await client.get(swapped)).status == 401


async def _async_bytes(*chunks: bytes):
    for chunk in chunks:
        yield chunk


def test_a_pipe_export_names_its_container() -> None:
    """Regression: without an explicit format, ffmpeg cannot infer a container
    for a pipe and refuses to start at all, which reached the browser as a
    zero-byte download (live log: exit 234, "Unable to choose an output
    format for 'pipe:1'")."""
    from custom_components.kustos_vision.export import pipe_concat_args

    args = pipe_concat_args(Path("/tmp/list.txt"))
    assert args[-3:] == ["-f", "mp4", "pipe:1"]
    flags = args[args.index("-movflags") + 1]
    assert "frag_keyframe" in flags and "empty_moov" in flags
