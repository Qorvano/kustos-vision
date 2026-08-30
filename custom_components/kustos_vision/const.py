"""Constants for the kustos_vision integration."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "kustos_vision"

# Storage keys
STORAGE_KEY_CONFIG: Final = f"{DOMAIN}.config"
STORAGE_VERSION_CONFIG: Final = 1

# Config entry data
CONF_BASE_PATH: Final = "base_path"

# Subdirectory below the HA config dir that holds integration-owned local
# state (the segment index). Kept off the recording target on purpose: the
# recording target is frequently a network share, and SQLite file locking is
# unreliable over SMB/NFS.
LOCAL_STATE_DIR: Final = DOMAIN
INDEX_DB_NAME: Final = "index.db"

# Default name of the directory created below the media root on first setup.
DEFAULT_DIR_NAME: Final = DOMAIN

# Whether the shipped ffmpeg can burn a clock into exports (drawtext).
DATA_STAMP_AVAILABLE = f"{DOMAIN}_stamp_available"
