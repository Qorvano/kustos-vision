"""Keeping Home Assistant's entity registry in step with the questions.

A question's key is its identity: it becomes the entity's unique id, its
default name and the field name the model answers under. The panel therefore
freezes the key once a question is saved. What this module covers is the
other direction: a question that is deleted, or whose answer type moved it
to another entity domain, must not leave a dead entity behind in the
registry. It used to, deliberately, so that re-adding the same key kept its
history; measured live on 2026-09-07 that left a corrected key's old sensor
standing as "unavailable" without a word about it, which is worse.
"""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN
from .core.config import CamwatchConfig
from .core.observations import ObservationType

_LOGGER = logging.getLogger(__name__)

# What sits between the camera slug and the question key in an observation
# entity's unique id. ObservationEntity builds the id; this has to recognise
# exactly what it builds.
OBSERVATION_MARKER = "_vision_"

# The domains observation entities live in, by answer type.
OBSERVATION_DOMAINS = ("binary_sensor", "sensor")


def observation_domain(kind: ObservationType) -> str:
    """The entity domain an answer of this type is reported in."""
    return "binary_sensor" if kind is ObservationType.BOOLEAN else "sensor"


def expected_entities(entry_id: str, config: CamwatchConfig) -> set[tuple[str, str]]:
    """(domain, unique_id) of every entity in the sweep's reach that the
    configuration still calls for: the observation entities themselves, and
    the person entities, whose unique ids could in principle land inside a
    camera's observation prefix (a camera slugged "person", a person whose id
    starts with "vision_") and must never be mistaken for a dead question.
    """
    expected = {
        (observation_domain(o.type), f"{entry_id}_{p.camera_slug}{OBSERVATION_MARKER}{o.key}")
        for p in config.vision
        for o in p.observations
    }
    expected.update(
        ("binary_sensor", f"{entry_id}_person_{person.id}")
        for person in config.persons.people
    )
    return expected


@callback
def async_prune_observation_entities(
    hass: HomeAssistant, entry: ConfigEntry, config: CamwatchConfig
) -> list[str]:
    """Remove the registry entries of observation entities the configuration
    no longer names. Returns the entity ids removed.

    Home Assistant takes the live entity down with its registry entry, so
    nothing else has to happen here.

    Recognising an observation entity by its unique id alone would not be
    exact: slugs and keys both allow underscores, so a camera's other
    entities can share the prefix in unlucky combinations. Those all carry a
    translation key, and observation entities never do; together with the
    set of entities the configuration still expects, that keeps the sweep
    from touching anything but a question that is really gone.
    """
    registry = er.async_get(hass)
    expected = expected_entities(entry.entry_id, config)
    prefixes = tuple(
        f"{entry.entry_id}_{camera.slug}{OBSERVATION_MARKER}" for camera in config.cameras
    )
    removed: list[str] = []
    for registered in er.async_entries_for_config_entry(registry, entry.entry_id):
        if registered.platform != DOMAIN or registered.translation_key is not None:
            continue
        if registered.domain not in OBSERVATION_DOMAINS:
            continue
        if not registered.unique_id.startswith(prefixes):
            continue
        if (registered.domain, registered.unique_id) in expected:
            continue
        registry.async_remove(registered.entity_id)
        removed.append(registered.entity_id)
    if removed:
        _LOGGER.info(
            "kustos_vision: removed %d entity(ies) of deleted questions: %s",
            len(removed),
            ", ".join(removed),
        )
    return removed
