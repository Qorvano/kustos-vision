"""HA-suite bootstrap: repo paths plus custom-integration discovery.

Run this suite with its own configuration (the plugin's asyncio setup
conflicts with the plain core suite):

    pytest -c tests_ha/pytest.ini tests_ha
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_REPO_ROOT))


@pytest.fixture(autouse=True)
def _auto_enable_custom_integrations(enable_custom_integrations: None) -> None:
    """Let the HA test loader discover custom_components/."""
    return


@pytest.fixture(autouse=True)
def _fresh_segment_index(hass) -> None:
    """Give every test its own segment index.

    The index lives beside the Home Assistant configuration, and the test
    harness reuses one configuration directory for the whole run. Without this,
    a test would inherit the rows an earlier one left behind, and the
    incremental scan would skip those paths as already known rather than
    re-reading them.
    """
    index_dir = Path(hass.config.path("camwatch"))
    if index_dir.is_dir():
        shutil.rmtree(index_dir, ignore_errors=True)
