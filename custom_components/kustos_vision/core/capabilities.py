"""Guessing which entity drives which camera capability.

A capability is a named slot such as ``ptz_up`` or ``light``. What fills it is
whatever the user assigns, and that assignment is the truth. This module only
proposes candidates when a camera is first added, so that a camera with a dozen
buttons does not have to be wired up entirely by hand.

The rules are deliberately about generic traits, never about a brand: an entity
domain, a device class, and words that appear in the entity id or name. A rule
that matched "tapo" or "reolink" would work for exactly the installations that
happen to own those cameras, which is the opposite of the point.

Matching is exact and deterministic: a candidate qualifies when it satisfies
every required word group, and the first qualifying candidate in registry order
wins. There is no score and no threshold, so a proposal can be explained by
pointing at the words that matched.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

_WORD_SPLIT = re.compile(r"[^a-z0-9]+")


@dataclass(frozen=True, slots=True)
class EntityCandidate:
    """An entity that might drive a capability, as the registry describes it."""

    entity_id: str
    name: str = ""
    device_class: str | None = None

    @property
    def domain(self) -> str:
        return self.entity_id.split(".", 1)[0]

    @property
    def words(self) -> frozenset[str]:
        """Every word in the entity id and the friendly name, lower-cased.

        Both are searched because integrations differ in which one carries the
        meaning: some encode the function in the object id, others only in the
        name a user sees.
        """
        text = f"{self.entity_id} {self.name}".lower()
        return frozenset(w for w in _WORD_SPLIT.split(text) if w)


@dataclass(frozen=True, slots=True)
class CapabilityRule:
    """What has to be true for an entity to be proposed for a capability."""

    key: str
    domains: tuple[str, ...]
    requires: tuple[tuple[str, ...], ...] = ()
    """Word groups. An entity qualifies when at least one word from EVERY group
    appears. Groups carry synonyms and translations, so a camera that calls it
    "move up" and one that calls it "ptz hoch" both match."""
    excludes: tuple[str, ...] = ()
    """Words that disqualify outright, to keep near-misses apart."""
    device_classes: tuple[str, ...] = ()
    """When set, the entity's device class must be one of these."""

    def matches(self, candidate: EntityCandidate) -> bool:
        if candidate.domain not in self.domains:
            return False
        if self.device_classes and candidate.device_class not in self.device_classes:
            return False
        words = candidate.words
        if words & frozenset(self.excludes):
            return False
        return all(bool(words & frozenset(group)) for group in self.requires)


# Movement verbs, as different integrations name the same four buttons.
_MOVE = ("move", "ptz", "pan", "tilt", "bewegen", "schwenken")

CAPABILITY_RULES: tuple[CapabilityRule, ...] = (
    CapabilityRule(
        key="ptz_up",
        domains=("button",),
        requires=(_MOVE, ("up", "hoch", "oben", "auf")),
    ),
    CapabilityRule(
        key="ptz_down",
        domains=("button",),
        requires=(_MOVE, ("down", "runter", "unten", "ab")),
    ),
    CapabilityRule(
        key="ptz_left",
        domains=("button",),
        requires=(_MOVE, ("left", "links")),
    ),
    CapabilityRule(
        key="ptz_right",
        domains=("button",),
        requires=(_MOVE, ("right", "rechts")),
    ),
    CapabilityRule(
        key="ptz_preset",
        domains=("select",),
        requires=(("preset", "position", "voreinstellung"),),
    ),
    CapabilityRule(
        key="ptz_patrol",
        domains=("select", "switch"),
        requires=(("patrol", "cruise", "tour", "patrouille"),),
    ),
    CapabilityRule(
        key="light",
        domains=("light", "switch"),
        requires=(
            ("light", "floodlight", "spotlight", "lamp", "licht", "scheinwerfer"),
        ),
        # The night-vision illuminator is a different thing from a floodlight
        # and would otherwise win this slot on some cameras.
        excludes=("infrared", "ir", "infrarot"),
    ),
    CapabilityRule(
        key="light_brightness",
        domains=("number",),
        requires=(
            ("light", "floodlight", "spotlight", "licht", "scheinwerfer"),
            ("intensity", "brightness", "level", "helligkeit"),
        ),
    ),
    # Cameras split the siren two ways: a single switchable entity, or a pair
    # of buttons. Both shapes get a slot, and only the matching one fills.
    CapabilityRule(
        key="siren",
        domains=("siren", "switch"),
        requires=(("siren", "sirene", "alarm"),),
    ),
    CapabilityRule(
        key="siren_on",
        domains=("button",),
        requires=(("siren", "sirene", "alarm"), ("start", "on", "an", "ein")),
    ),
    CapabilityRule(
        key="siren_off",
        domains=("button",),
        requires=(("siren", "sirene", "alarm"), ("stop", "off", "aus")),
    ),
    CapabilityRule(
        key="night_vision",
        domains=("select", "switch"),
        requires=(("night", "nacht", "infrared", "infrarot"),),
    ),
    CapabilityRule(
        key="privacy_mode",
        domains=("switch", "select"),
        requires=(("privacy", "privatsphare", "privatsphaere"),),
    ),
    CapabilityRule(
        key="motion_trigger",
        domains=("binary_sensor",),
        device_classes=("motion", "occupancy"),
    ),
)


# The capability keys a camera can bind, in the order the panel shows them.
CAPABILITY_KEYS: tuple[str, ...] = tuple(rule.key for rule in CAPABILITY_RULES)


def suggest_capabilities(
    candidates: list[EntityCandidate],
) -> dict[str, str]:
    """Propose an entity for each capability it can find one for.

    Returns capability key to entity id. A capability with no convincing
    candidate is simply absent: proposing something wrong is worse than
    proposing nothing, because a wrong proposal is one the user has to notice
    before it does something unexpected.

    Each entity is proposed at most once. Without that, a single entity named
    "Motion" would fill several slots at the same time and the user would have
    to undo the extras.
    """
    suggestions: dict[str, str] = {}
    taken: set[str] = set()
    for rule in CAPABILITY_RULES:
        for candidate in candidates:
            if candidate.entity_id in taken:
                continue
            if rule.matches(candidate):
                suggestions[rule.key] = candidate.entity_id
                taken.add(candidate.entity_id)
                break
    return suggestions


def suggest_streams(candidates: list[EntityCandidate]) -> list[tuple[str, str]]:
    """Propose stream keys for the camera entities of one device.

    Returns (stream key, entity id) pairs. Cameras commonly expose a main and a
    sub stream as two entities; the words in their names are what tells them
    apart, and a device with a single camera entity gets the neutral key
    ``main`` rather than a guess about its quality.
    """
    cameras = [c for c in candidates if c.domain == "camera"]
    if not cameras:
        return []
    if len(cameras) == 1:
        return [("main", cameras[0].entity_id)]

    high = ("hd", "high", "main", "haupt", "1080p", "2k", "4k")
    low = ("sd", "low", "sub", "neben", "360p", "480p")

    proposed: list[tuple[str, str]] = []
    used: set[str] = set()
    for key, words in (("hd", high), ("sd", low)):
        for camera in cameras:
            if camera.entity_id in used:
                continue
            if camera.words & frozenset(words):
                proposed.append((key, camera.entity_id))
                used.add(camera.entity_id)
                break

    # Anything the naming did not identify still deserves a slot, numbered so
    # the keys stay unique and file-name safe.
    for index, camera in enumerate(c for c in cameras if c.entity_id not in used):
        proposed.append((f"stream_{index + 1}", camera.entity_id))
    return proposed
