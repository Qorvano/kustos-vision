"""Setting kustos_vision up.

The flow asks one question, the storage location, and stops. Everything else,
cameras included, is configured in the panel, so that there is exactly one
place to look for a setting rather than two that can disagree.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.core import HomeAssistant

from .const import CONF_BASE_PATH, DOMAIN
from .storage import default_base_path


def _check_writable(path: Path) -> None:
    """Raise OSError when recordings cannot be written to this location."""
    path.mkdir(parents=True, exist_ok=True)
    probe = path / ".kustos-vision-write-test"
    try:
        probe.write_bytes(b"")
    finally:
        probe.unlink(missing_ok=True)


async def async_validate_base_path(hass: HomeAssistant, raw: str) -> tuple[str, str | None]:
    """Return the cleaned path, and an error key when it cannot be used."""
    candidate = raw.strip()
    if not candidate:
        return candidate, "path_required"
    path = Path(candidate)
    if not path.is_absolute():
        return candidate, "path_not_absolute"
    try:
        await hass.async_add_executor_job(_check_writable, path)
    except OSError:
        return candidate, "path_not_writable"
    return str(path), None


class CamwatchConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle the one step kustos_vision needs to start."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        suggested = str(default_base_path(self.hass))

        if user_input is not None:
            suggested = user_input[CONF_BASE_PATH]
            cleaned, error = await async_validate_base_path(self.hass, suggested)
            if error is None:
                return self.async_create_entry(
                    title="Kustos Vision", data={CONF_BASE_PATH: cleaned}
                )
            errors[CONF_BASE_PATH] = error

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {vol.Required(CONF_BASE_PATH, default=suggested): str}
            ),
            errors=errors,
        )
