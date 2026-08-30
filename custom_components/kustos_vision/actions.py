"""Triggering a camera capability the user has bound to something.

A capability points at either an entity or a free service call. For an entity,
the service to call follows from its domain, which is what keeps this
independent of any particular camera integration: a PTZ button is a button
wherever it comes from.
"""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from .core.config import CameraConfig, CapabilityBinding

_LOGGER = logging.getLogger(__name__)

# What "activate this entity" means, per domain. Momentary capabilities such as
# a PTZ step are buttons; switchable ones take an explicit on or off.
_ACTIVATE: dict[str, tuple[str, str]] = {
    "button": ("button", "press"),
    "scene": ("scene", "turn_on"),
    "script": ("script", "turn_on"),
    "light": ("light", "turn_on"),
    "switch": ("switch", "turn_on"),
    "siren": ("siren", "turn_on"),
}

_DEACTIVATE: dict[str, tuple[str, str]] = {
    "light": ("light", "turn_off"),
    "switch": ("switch", "turn_off"),
    "siren": ("siren", "turn_off"),
}


class CapabilityError(HomeAssistantError):
    """The capability cannot be triggered as configured."""


async def async_trigger(
    hass: HomeAssistant,
    camera: CameraConfig,
    capability: str,
    value: Any | None = None,
) -> None:
    """Trigger one capability of one camera.

    ``value`` carries what the capability needs beyond "do it": a brightness, a
    preset name, or False to turn something off. A capability that is not bound
    raises rather than failing silently, because the panel only offers controls
    for capabilities it was told exist.
    """
    binding = camera.capabilities.get(capability)
    if binding is None:
        # Custom controls share the namespace with the built-in slots and are
        # triggered the same way; only where they are defined differs.
        custom = camera.control(capability)
        binding = custom.binding if custom is not None else None
    if binding is None:
        raise CapabilityError(
            f"camera {camera.slug!r} has no entity bound to {capability!r}"
        )

    if binding.action is not None:
        domain, service = binding.action.split(".", 1)
        data = dict(binding.data)
        if binding.entity_id is not None:
            data.setdefault("entity_id", binding.entity_id)
        if value is not None:
            data.setdefault("value", value)
        await hass.services.async_call(domain, service, data, blocking=True)
        return

    await _async_call_entity(hass, binding, value)


async def _async_call_entity(
    hass: HomeAssistant, binding: CapabilityBinding, value: Any | None
) -> None:
    entity_id = binding.entity_id
    assert entity_id is not None  # guaranteed by CapabilityBinding
    domain = entity_id.split(".", 1)[0]
    data: dict[str, Any] = {"entity_id": entity_id, **binding.data}

    if domain == "select":
        if not isinstance(value, str):
            raise CapabilityError(f"{entity_id} needs an option to select")
        await hass.services.async_call(
            "select", "select_option", {**data, "option": value}, blocking=True
        )
        return

    if domain == "number":
        if value is None:
            raise CapabilityError(f"{entity_id} needs a value")
        await hass.services.async_call(
            "number", "set_value", {**data, "value": value}, blocking=True
        )
        return

    turning_off = value is False
    table = _DEACTIVATE if turning_off else _ACTIVATE
    target = table.get(domain)
    if target is None:
        raise CapabilityError(
            f"kustos_vision does not know how to {'turn off' if turning_off else 'trigger'} "
            f"a {domain} entity; bind an explicit action instead"
        )
    # Brightness and similar extras only make sense when switching on.
    if value is not None and not isinstance(value, bool):
        data.setdefault("value", value)
    await hass.services.async_call(*target, data, blocking=True)
