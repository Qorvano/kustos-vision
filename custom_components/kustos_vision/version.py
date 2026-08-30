"""The version that is installed right now.

Read from the manifest rather than written down a second time, because two
places that have to be kept in step are one place too many. It is cached after
the first read: the file does not change while Home Assistant is running, and
an update replaces it only for the next run.
"""

from __future__ import annotations

import json
from functools import cache
from pathlib import Path

MANIFEST = Path(__file__).parent / "manifest.json"


@cache
def integration_version() -> str:
    """The installed version, as the manifest states it."""
    try:
        return str(json.loads(MANIFEST.read_text())["version"])
    except (OSError, ValueError, KeyError):
        # Nothing to compare against is better than refusing to answer.
        return ""
