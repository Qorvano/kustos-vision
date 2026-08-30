"""The version that is installed right now.

Read from the manifest rather than written down a second time, because two
places that have to be kept in step are one place too many. Read once at
import: Home Assistant imports custom integrations in an executor thread, so
the file access happens off the event loop. The lazy variant read it on the
first snapshot instead, which runs in the loop and showed up in the live log
as a blocking call.
"""

from __future__ import annotations

import json
from pathlib import Path

MANIFEST = Path(__file__).parent / "manifest.json"


def _read() -> str:
    try:
        return str(json.loads(MANIFEST.read_text())["version"])
    except (OSError, ValueError, KeyError):
        # Nothing to compare against is better than refusing to answer.
        return ""


INTEGRATION_VERSION = _read()


def integration_version() -> str:
    """The installed version, as the manifest states it."""
    return INTEGRATION_VERSION
