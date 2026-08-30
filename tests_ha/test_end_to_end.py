"""The whole of milestone 1 against real ffmpeg.

Everything else mocks the process away, which proves the wiring but not that
recordings actually appear. This runs the real binary against a local file
standing in for a camera, then checks what the integration made of it: segments
on disk, rows in the index, preview frames, and retention deleting the oldest
first.

Skipped when ffmpeg is missing, so it never blocks a run that cannot do it.
"""

from __future__ import annotations

import asyncio
import shutil
import subprocess
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.kustos_vision.const import (
    CONF_BASE_PATH,
    DOMAIN,
    STORAGE_KEY_CONFIG,
    STORAGE_VERSION_CONFIG,
)
from custom_components.kustos_vision.core.index import SegmentIndex
from custom_components.kustos_vision.core.paths import iter_segments

pytestmark = pytest.mark.skipif(
    shutil.which("ffmpeg") is None, reason="needs a real ffmpeg binary"
)

# Short enough that a handful of segments appear within a test, long enough
# that the clock-aligned cuts are not dominated by startup.
SEGMENT_SECONDS = 2
SOURCE_SECONDS = 9


@pytest.fixture(scope="module")
def source_clip(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """A short H.264 clip with G.711 audio, as most cameras deliver."""
    path = tmp_path_factory.mktemp("source") / "camera.nut"
    subprocess.run(
        [
            "ffmpeg", "-loglevel", "error", "-y",
            "-f", "lavfi", "-i", "testsrc=size=320x180:rate=10",
            "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=8000",
            "-t", str(SOURCE_SECONDS),
            "-c:v", "libx264", "-g", "10", "-c:a", "pcm_mulaw",
            "-f", "nut", str(path),
        ],
        check=True,
        capture_output=True,
        timeout=120,
    )
    return path


def stored_config(base: Path, **storage_overrides) -> dict:
    storage = {"base_path": str(base), "segment_seconds": SEGMENT_SECONDS}
    storage.update(storage_overrides)
    return {
        "version": STORAGE_VERSION_CONFIG,
        "minor_version": 1,
        "key": STORAGE_KEY_CONFIG,
        "data": {
            "version": 1,
            "storage": storage,
            "cameras": [
                {
                    "slug": "vorgarten",
                    "name": "Vorgarten",
                    "streams": [
                        {"key": "hd", "entity_id": "camera.vorgarten", "record": True}
                    ],
                    "capabilities": {},
                    "retention_days": None,
                    "enabled": True,
                    "area_id": None,
                }
            ],
        },
    }


async def _record(
    hass: HomeAssistant, hass_storage: dict, base: Path, source: Path, **storage_overrides
) -> MockConfigEntry:
    """Set up kustos_vision against the clip and let it record for a while."""
    hass_storage[STORAGE_KEY_CONFIG] = stored_config(base, **storage_overrides)
    entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
    entry.add_to_hass(hass)

    with patch(
        "custom_components.kustos_vision.recorder.async_get_stream_source",
        AsyncMock(return_value=str(source)),
    ):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        # ffmpeg reads the file as fast as it can, so the clip is through in
        # well under its own duration.
        await asyncio.sleep(SOURCE_SECONDS)
        await hass.async_block_till_done()
    return entry


async def test_recording_produces_playable_segments(
    hass: HomeAssistant, hass_storage: dict, tmp_path: Path, source_clip: Path
) -> None:
    base = tmp_path / "recordings"
    entry = await _record(hass, hass_storage, base, source_clip)

    segments = list(iter_segments(base))
    assert len(segments) >= 2, "expected the clip to be split into segments"
    assert all(s.stat().st_size > 0 for s in segments)

    # Every segment has to stand on its own: the panel plays them individually
    # and hands them to the browser one at a time.
    for segment in segments[:-1]:
        probe = subprocess.run(
            ["ffprobe", "-loglevel", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(segment)],
            capture_output=True, text=True, timeout=30,
        )
        assert probe.returncode == 0, f"{segment.name} is not readable"
        assert float(probe.stdout.strip() or 0) > 0

    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()


async def test_segments_are_fragmented_so_a_crash_loses_nothing(
    hass: HomeAssistant, hass_storage: dict, tmp_path: Path, source_clip: Path
) -> None:
    """A plain MP4 only becomes playable when its trailing moov atom is
    written, so the segment open at a crash would be lost. Fragmented MP4 is
    also what the timeline player needs to append segments seamlessly."""
    base = tmp_path / "recordings"
    entry = await _record(hass, hass_storage, base, source_clip)

    first = next(iter(iter_segments(base)))
    head = first.read_bytes()[:4096]
    assert b"moof" in head, "segments are not fragmented MP4"

    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()


async def test_pcm_audio_does_not_break_the_recording(
    hass: HomeAssistant, hass_storage: dict, tmp_path: Path, source_clip: Path
) -> None:
    """The source carries G.711, which cannot be copied into MP4. Recording
    has to transcode it rather than abort, which is what most cameras need."""
    base = tmp_path / "recordings"
    entry = await _record(hass, hass_storage, base, source_clip)

    first = next(iter(iter_segments(base)))
    probe = subprocess.run(
        ["ffprobe", "-loglevel", "error", "-select_streams", "a:0",
         "-show_entries", "stream=codec_name", "-of", "csv=p=0", str(first)],
        capture_output=True, text=True, timeout=30,
    )
    assert probe.stdout.strip() == "aac"

    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()


async def test_housekeeping_indexes_and_previews_what_was_recorded(
    hass: HomeAssistant, hass_storage: dict, tmp_path: Path, source_clip: Path
) -> None:
    base = tmp_path / "recordings"
    entry = await _record(hass, hass_storage, base, source_clip)

    coordinator = entry.runtime_data
    await coordinator.async_refresh()
    await hass.async_block_till_done()

    index = SegmentIndex(Path(hass.config.path("kustos_vision")) / "index.db")
    rows = await hass.async_add_executor_job(index.oldest_first)
    assert len(rows) >= 2
    assert all(row.camera_slug == "vorgarten" for row in rows)
    assert all(row.stream_key == "hd" for row in rows)
    assert all(row.size_bytes > 0 for row in rows)
    assert [r.start_utc for r in rows] == sorted(r.start_utc for r in rows)

    # Previews are made for finished segments only; the one ffmpeg still holds
    # open would yield a frame that has to be redone anyway.
    assert any(row.has_thumbnail for row in rows)
    assert any(p.suffix == ".jpg" for p in (base / "vorgarten").rglob("*"))

    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()


async def test_the_size_budget_deletes_the_oldest_first(
    hass: HomeAssistant, hass_storage: dict, tmp_path: Path, source_clip: Path
) -> None:
    """The user's second retention mode: a total budget across all cameras,
    after which the oldest recordings are overwritten."""
    base = tmp_path / "recordings"
    entry = await _record(hass, hass_storage, base, source_clip)
    coordinator = entry.runtime_data

    await coordinator.async_refresh()
    await hass.async_block_till_done()

    index = SegmentIndex(Path(hass.config.path("kustos_vision")) / "index.db")
    before = await hass.async_add_executor_job(index.oldest_first)
    assert len(before) >= 3

    # A budget that fits roughly half of what was recorded.
    budget = sum(row.size_bytes for row in before) // 2
    config = coordinator.config
    await coordinator.async_set_config(
        config.with_storage(
            type(config.storage)(
                base_path=config.storage.base_path,
                segment_seconds=config.storage.segment_seconds,
                max_total_bytes=budget,
            )
        )
    )
    await coordinator.async_refresh()
    await hass.async_block_till_done()

    after = await hass.async_add_executor_job(index.oldest_first)
    assert len(after) < len(before), "retention freed nothing"

    surviving = {row.rel_path for row in after}
    deleted = [row for row in before if row.rel_path not in surviving]
    assert deleted, "nothing was deleted"
    # Whatever went, went from the old end.
    assert max(r.start_utc for r in deleted) <= min(r.start_utc for r in after)
    # And the files really are gone, not just the index rows.
    assert all(not (base / row.rel_path).exists() for row in deleted)

    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()


def _read_codec_like_the_player_does(header: bytes) -> str | None:
    """The exact rule the panel's player applies, restated in Python.

    Kept deliberately in step with ``readVideoCodec`` in
    ``frontend/src/components/player.ts``. The player has its own unit tests
    for the parsing; this one checks the assumption underneath both, namely
    that the segments kustos_vision actually writes carry an avcC box near the
    front with the codec bytes where the player looks for them.
    """
    marker = header.find(b"avcC")
    if marker == -1 or marker + 8 > len(header):
        return None
    profile, compatibility, level = header[marker + 5 : marker + 8]
    return f"avc1.{profile:02x}{compatibility:02x}{level:02x}"


async def test_segments_declare_their_codec_where_the_player_looks(
    hass: HomeAssistant, hass_storage: dict, tmp_path: Path, source_clip: Path
) -> None:
    """MediaSource needs the exact codec up front and rejects a wrong one with
    a decode error rather than anything useful, so the player reads it out of
    the file. That only works if the box is really there, in the first few
    kilobytes the player fetches."""
    base = tmp_path / "recordings"
    entry = await _record(hass, hass_storage, base, source_clip)

    first = next(iter(iter_segments(base)))
    header = first.read_bytes()[:8192]

    codec = _read_codec_like_the_player_does(header)
    assert codec is not None, "no avcC box in the first 8 KiB of a segment"
    assert codec.startswith("avc1.")

    # Cross-check against what ffprobe says the file contains, so a wrong
    # offset cannot pass by producing a plausible-looking string.
    probe = subprocess.run(
        ["ffprobe", "-loglevel", "error", "-select_streams", "v:0",
         "-show_entries", "stream=codec_name,profile,level",
         "-of", "default=nw=1:nk=1", str(first)],
        capture_output=True, text=True, timeout=30, check=False,
    )
    # One field per line; a profile name such as "Constrained Baseline"
    # contains a space, so splitting on whitespace would misread it.
    name, _profile, level = probe.stdout.strip().splitlines()
    assert name == "h264"
    # The last byte of the codec string is the level, which ffprobe reports as
    # the same number in decimal.
    assert int(codec[-2:], 16) == int(level)

    await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
