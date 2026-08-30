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
