"""The oldest-recording sensor reports a day, not a moment.

Regression test for the logbook flood seen live on 2026-09-07: with a 7-day
age limit, retention moved the oldest segment on every housekeeping run, and
the timestamp sensor turned each move into a logbook line, one per segment
length all day, burying every other entry of the camera's device.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.kustos_vision.const import (
    CONF_BASE_PATH,
    DOMAIN,
    STORAGE_KEY_CONFIG,
    STORAGE_VERSION_CONFIG,
)
from custom_components.kustos_vision.core.index import Segment

SLUG = "beispiel"
ENTITY_ID = f"sensor.{SLUG}_oldest_recording"


def stored(base: Path) -> dict:
    return {
        "version": STORAGE_VERSION_CONFIG,
        "minor_version": 1,
        "key": STORAGE_KEY_CONFIG,
        "data": {
            "version": 1,
            "storage": {"base_path": str(base), "segment_seconds": 60},
            "cameras": [
                {
                    "slug": SLUG,
                    "name": SLUG.title(),
                    "streams": [
                        {
                            "key": "hd",
                            "entity_id": f"camera.{SLUG}_hd",
                            "record": True,
                        }
                    ],
                    "capabilities": {},
                    "retention_days": None,
                    "enabled": True,
                    "area_id": None,
                    "view_settings": {},
                }
            ],
            "views": [],
        },
    }


def segment(start_utc: int) -> Segment:
    return Segment(
        rel_path=f"{SLUG}/day/{start_utc}_hd.mp4",
        camera_slug=SLUG,
        stream_key="hd",
        start_utc=start_utc,
        duration_s=60.0,
        size_bytes=1000,
        has_thumbnail=False,
    )


@pytest.fixture
def no_ffmpeg():
    """Keep the recorder from launching anything."""
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
async def entry(
    hass: HomeAssistant, hass_storage: dict, tmp_path: Path, no_ffmpeg
) -> MockConfigEntry:
    # A zone east of UTC, so that a UTC evening is already the next local day
    # and a sensor reporting the UTC date would be caught.
    await hass.config.async_set_time_zone("Europe/Berlin")
    base = tmp_path / "recordings"
    hass_storage[STORAGE_KEY_CONFIG] = stored(base)
    entry = MockConfigEntry(domain=DOMAIN, data={CONF_BASE_PATH: str(base)})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def publish(
    hass: HomeAssistant, entry: MockConfigEntry, segments: list[Segment]
) -> None:
    coordinator = entry.runtime_data
    await hass.async_add_executor_job(coordinator.index.upsert, segments)
    await coordinator.async_publish_state()
    await hass.async_block_till_done()


async def test_reports_the_local_day_of_the_oldest_segment(
    hass: HomeAssistant, entry: MockConfigEntry
) -> None:
    # 22:30 UTC on 30 August is already 31 August in Berlin (UTC+2).
    first = int(datetime(2026, 8, 30, 22, 30, tzinfo=UTC).timestamp())
    await publish(hass, entry, [segment(first), segment(first + 60)])

    state = hass.states.get(ENTITY_ID)
    assert state is not None
    assert state.state == "2026-08-31"
    assert state.attributes["device_class"] == "date"


async def test_retention_within_a_day_leaves_the_state_alone(
    hass: HomeAssistant, entry: MockConfigEntry
) -> None:
    """Deleting the oldest segment must not produce a state change as long as
    the day stays the same; that state change was the logbook line."""
    first = int(datetime(2026, 8, 31, 4, 0, tzinfo=UTC).timestamp())
    await publish(
        hass, entry, [segment(first), segment(first + 60), segment(first + 120)]
    )
    before = hass.states.get(ENTITY_ID)
    assert before is not None

    coordinator = entry.runtime_data
    await hass.async_add_executor_job(
        coordinator.index.forget, [segment(first).rel_path]
    )
    await coordinator.async_publish_state()
    await hass.async_block_till_done()

    after = hass.states.get(ENTITY_ID)
    assert after is not None
    assert before.state == after.state == "2026-08-31"
    assert after.last_changed == before.last_changed


async def test_unknown_without_any_recording(
    hass: HomeAssistant, entry: MockConfigEntry
) -> None:
    state = hass.states.get(ENTITY_ID)
    assert state is not None
    assert state.state == "unknown"
