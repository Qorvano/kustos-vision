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
    day = base / "beispiel" / "2026-06-15"
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
        naive = datetime(2026, 6, 15, int(hour), int(minute))
        end = naive.replace(tzinfo=local).timestamp() + duration
        os.utime(path, (end, end))
        files.append((f"beispiel/2026-06-15/{name}", path))

    hass_storage[STORAGE_KEY_CONFIG] = {
        "version": STORAGE_VERSION_CONFIG,
        "minor_version": 1,
        "key": STORAGE_KEY_CONFIG,
        "data": {
            "version": 1,
            "storage": {"base_path": str(base), "segment_seconds": 300},
            "cameras": [
                {
                    "slug": "beispiel",
                    "name": "Beispiel",
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
    result = await send(client, type=f"{DOMAIN}/recordings/days", camera="beispiel")
    assert result["success"]
    assert result["result"]["days"] == ["2026-06-15"]


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
        camera="beispiel",
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
        camera="beispiel",
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
        camera="beispiel",
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
        camera="beispiel",
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
        "beispiel/2026-06-15/../../../etc/passwd",
        "/etc/passwd",
        "beispiel/2026-06-15/notes.txt",
        "beispiel/backup/14-00-00_hd.mp4",
        "beispiel/2026-06-15/14-00-00_hd.mp4/extra",
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
    intruder = base / "beispiel" / "2026-06-15" / "23-59-59_hd.mp4"
    intruder.write_bytes(b"not ours")

    client = await hass_client()
    response = await client.get(
        f"/api/{DOMAIN}/segment/beispiel/2026-06-15/23-59-59_hd.mp4"
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
        f"/api/{DOMAIN}/export", params={"camera": "beispiel", "from": start, "to": start}
    )
    assert response.status == 400


async def test_export_refuses_more_than_the_longest_day(
    hass: HomeAssistant, hass_client, recorded
) -> None:
    _, _, _, start = recorded
    """A range far beyond a day is not a unit the user picked on purpose. The
    cap sits at 25 hours, because the night the clocks fall back makes one
    local day exactly that long and its download must not fail over it."""
    client = await hass_client()
    response = await client.get(
        f"/api/{DOMAIN}/export",
        params={"camera": "beispiel", "from": start, "to": start + 26 * 3600},
    )
    assert response.status == 400


async def test_export_of_a_range_without_recordings_is_not_found(
    hass: HomeAssistant, hass_client, recorded
) -> None:
    _, _, _, start = recorded
    client = await hass_client()
    response = await client.get(
        f"/api/{DOMAIN}/export",
        params={"camera": "beispiel", "from": start + 100000, "to": start + 103000},
    )
    assert response.status == 404


async def test_export_requires_its_parameters(
    hass: HomeAssistant, hass_client, recorded
) -> None:
    client = await hass_client()
    response = await client.get(f"/api/{DOMAIN}/export", params={"camera": "beispiel"})
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
    query = f"camera=beispiel&from={first}&to={first + 3600}&stream=hd"
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


def test_the_stamped_export_gets_one_clock_per_segment() -> None:
    """One shared clock base would be wrong from the first recording gap
    onward: the joined timeline is contiguous while real time jumps."""
    from custom_components.kustos_vision.export import stamp_concat_args

    args = stamp_concat_args(
        [(Path("/a.mp4"), 1000.0), (Path("/b.mp4"), 5000.0)],
        height=1620,
        with_audio=True,
    )
    graph = args[args.index("-filter_complex") + 1]
    assert r"localtime\:1000\:" in graph
    assert r"localtime\:5000\:" in graph
    assert "concat=n=2:v=1:a=1" in graph
    assert "fontsize=68" in graph  # 1620 / 24, rounded
    assert args[-3:] == ["-f", "mp4", "pipe:1"]
    assert "libx264" in args


def test_the_stamped_export_stays_silent_for_silent_footage() -> None:
    from custom_components.kustos_vision.export import stamp_concat_args

    args = stamp_concat_args([(Path("/a.mp4"), 0.0)], height=360, with_audio=False)
    graph = args[args.index("-filter_complex") + 1]
    assert "a=0" in graph
    assert "-an" in args
    assert "aac" not in args


def test_the_dominant_stream_wins_the_stamped_export(recorded) -> None:
    """Mixing resolutions in a transcode would mean scaling evidence footage;
    the stream with the most material is exported instead."""
    from types import SimpleNamespace

    from custom_components.kustos_vision.export import dominant_stream

    segments = [
        SimpleNamespace(stream_key="sd", duration_s=300.0),
        SimpleNamespace(stream_key="hd", duration_s=200.0),
        SimpleNamespace(stream_key="hd", duration_s=200.0),
    ]
    chosen = dominant_stream(segments)  # type: ignore[arg-type]
    assert {s.stream_key for s in chosen} == {"hd"}


async def test_the_export_passes_the_stamp_wish_on(
    hass: HomeAssistant, hass_client, recorded
) -> None:
    from custom_components.kustos_vision.const import DATA_STAMP_AVAILABLE

    hass.data[DATA_STAMP_AVAILABLE] = True
    _, _, _, first = recorded
    client = await hass_client()
    query = f"camera=beispiel&from={first}&to={first + 3600}&stream=hd&stamp=1"
    with patch(
        "custom_components.kustos_vision.http_views.stream_export"
    ) as export:
        export.return_value = _async_bytes(b"gestempelt")
        response = await client.get(f"/api/{DOMAIN}/export?{query}")
    assert response.status == 200
    assert export.call_args.kwargs["stamp"] is True
    assert "_zeitstempel" in response.headers["Content-Disposition"]


async def test_a_stampless_ffmpeg_refuses_honestly(
    hass: HomeAssistant, hass_client, recorded
) -> None:
    """A greyed-out checkbox plus a clear refusal beat a download that
    silently arrives without the clock that was asked for."""
    from custom_components.kustos_vision.const import DATA_STAMP_AVAILABLE

    hass.data[DATA_STAMP_AVAILABLE] = False
    _, _, _, first = recorded
    client = await hass_client()
    query = f"camera=beispiel&from={first}&to={first + 3600}&stamp=1"
    response = await client.get(f"/api/{DOMAIN}/export?{query}")
    assert response.status == 400
    assert "drawtext" in await response.text()


async def test_fragments_map_a_segment_for_mid_file_seeks(
    hass: HomeAssistant, hass_ws_client, recorded, tmp_path: Path
) -> None:
    """A click deep into a daylight segment used to download up to 170 MB of
    prefix; the map lets the player start at the right fragment."""
    import struct

    def box(kind: bytes, payload: bytes) -> bytes:
        return struct.pack(">I4s", 8 + len(payload), kind) + payload

    def full(kind: bytes, version: int, payload: bytes) -> bytes:
        return box(kind, bytes([version, 0, 0, 0]) + payload)

    tkhd = full(b"tkhd", 0, b"\0" * 8 + (1).to_bytes(4, "big") + b"\0" * 56
                + (640 << 16).to_bytes(4, "big") + (360 << 16).to_bytes(4, "big"))
    mdhd = full(b"mdhd", 0, b"\0" * 8 + (1000).to_bytes(4, "big") + b"\0" * 4)
    moov = box(b"moov", box(b"trak", tkhd + box(b"mdia", mdhd)))
    ftyp = box(b"ftyp", b"iso5" * 3)

    def moof(base: int) -> bytes:
        return box(b"moof", box(b"traf",
            full(b"tfhd", 0, (1).to_bytes(4, "big"))
            + full(b"tfdt", 1, base.to_bytes(8, "big"))))

    mdat = box(b"mdat", b"\0" * 500)
    _entry, _base, files, _ = recorded
    target = files[0][1]
    target.write_bytes(ftyp + moov + moof(0) + mdat + moof(4000) + mdat)
    # Der Index kennt die Datei bereits (recorded-Fixture).

    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": f"{DOMAIN}/recordings/fragments", "path": files[0][0]}
    )
    result = await client.receive_json()
    assert result["success"], result
    body = result["result"]
    assert body["init_end"] == len(ftyp) + len(moov)
    assert [f["start"] for f in body["fragments"]] == [0.0, 4.0]
    assert body["data_end"] == target.stat().st_size


async def test_fragments_refuse_paths_the_index_does_not_know(
    hass: HomeAssistant, hass_ws_client, recorded
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": f"{DOMAIN}/recordings/fragments", "path": "x/2026-01-01/a.mp4"}
    )
    result = await client.receive_json()
    assert not result["success"]
    assert result["error"]["code"] == "unknown_segment"


def _segment(start: int, duration: float, key: str = "hd") -> "Segment":
    from custom_components.kustos_vision.core.index import Segment

    return Segment(
        rel_path=f"kamera/{start}.mp4",
        camera_slug="beispiel",
        stream_key=key,
        start_utc=start,
        duration_s=duration,
        size_bytes=1,
        has_thumbnail=False,
    )


def test_the_clip_measures_from_the_joined_timeline() -> None:
    """A download cut to the minute: the lead is how far into the first file
    the range begins, the length what remains after both cut-offs."""
    from custom_components.kustos_vision.export import clip_bounds

    segments = [_segment(100, 60), _segment(160, 60)]
    lead, duration = clip_bounds(segments, 130, 190)
    assert lead == 30
    assert duration == 60


def test_a_recording_gap_never_inflates_the_clip() -> None:
    """Regression for the range export: wall time jumps across gaps while the
    joined material is contiguous, so the length has to come from the
    material, not from the requested span."""
    from custom_components.kustos_vision.export import clip_bounds

    segments = [_segment(0, 60), _segment(120, 60)]
    lead, duration = clip_bounds(segments, 30, 150)
    assert lead == 30
    # 120 s of material, minus 30 s lead and the 30 s cut off the tail.
    assert duration == 60


def test_exact_segment_edges_need_no_cut() -> None:
    from custom_components.kustos_vision.export import clip_bounds

    segments = [_segment(0, 60), _segment(60, 60)]
    assert clip_bounds(segments, 0, 120) == (0, 120)


def test_the_stamped_cut_lands_on_input_seek_and_output_length() -> None:
    """For the transcoding path -ss must be an input option (it seeks the
    first file to the keyframe at or before the moment) and -t an output
    option that bounds the length."""
    from pathlib import Path

    from custom_components.kustos_vision.export import (
        clipped_args,
        stamp_concat_args,
    )

    stamped = clipped_args(
        stamp_concat_args([(Path("/a.mp4"), 100.0)], 720, False), 5, 30
    )
    assert stamped.index("-ss") < stamped.index("-i")
    assert stamped[stamped.index("-ss") + 1] == "5.000"
    assert stamped[stamped.index("-t") + 1] == "30.000"


def test_without_a_lead_the_stamped_cut_does_not_seek() -> None:
    from pathlib import Path

    from custom_components.kustos_vision.export import clipped_args, stamp_concat_args

    args = clipped_args(stamp_concat_args([(Path("/a.mp4"), 100.0)], 720, False), 0, 60)
    assert "-ss" not in args
    assert args[args.index("-t") + 1] == "60.000"


def test_the_raw_cut_travels_inside_the_concat_list() -> None:
    """Regression: the concat demuxer silently ignores -ss while the seek
    still shifts the timestamps, so a requested ten-minute cut came out
    longer and started at the segment boundary (measured live). The raw
    join therefore cuts through the demuxer's own inpoint and outpoint."""
    from pathlib import Path

    from custom_components.kustos_vision.export import clipped_concat_list_text

    entries = [
        (Path("/a.mp4"), _segment(0, 300)),
        (Path("/b.mp4"), _segment(300, 300)),
    ]
    text = clipped_concat_list_text(entries, 150, 390)
    lines = text.strip().splitlines()
    assert lines == [
        "file '/a.mp4'",
        "inpoint 150.000",
        "file '/b.mp4'",
        "outpoint 90.000",
    ]


def test_exact_edges_write_a_plain_concat_list() -> None:
    from pathlib import Path

    from custom_components.kustos_vision.export import clipped_concat_list_text

    entries = [(Path("/a.mp4"), _segment(0, 300))]
    assert clipped_concat_list_text(entries, 0, 300) == "file '/a.mp4'\n"


def test_a_single_file_may_carry_both_cut_points() -> None:
    from pathlib import Path

    from custom_components.kustos_vision.export import clipped_concat_list_text

    entries = [(Path("/a.mp4"), _segment(100, 300))]
    lines = clipped_concat_list_text(entries, 160, 220).strip().splitlines()
    assert lines == ["file '/a.mp4'", "inpoint 60.000", "outpoint 120.000"]


def test_the_stamped_bitrate_is_capped_near_the_source() -> None:
    """Regression: ultrafast at CRF 23 blew a stamped download up to eight
    times its raw sibling. The cap ties the copy to the source's own rate,
    because the copy carries no picture information the source did not."""
    from pathlib import Path

    from custom_components.kustos_vision.export import stamp_concat_args

    args = stamp_concat_args(
        [(Path("/a.mp4"), 100.0)], 720, False, maxrate_bps=4_000_000
    )
    assert args[args.index("-maxrate") + 1] == "4000000"
    assert args[args.index("-bufsize") + 1] == "8000000"
    assert args[args.index("-preset") + 1] == "veryfast"
