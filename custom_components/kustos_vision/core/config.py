"""The configuration model, and its serialisation.

Everything a user can set lives here as plain dataclasses, together with the
conversion to and from the dictionaries that get persisted. Keeping the model
free of Home Assistant means the whole of it, including migrations, is
testable as plain Python; the HA layer only owns the store that holds the
dictionary.

The panel is the only editor for this configuration, and it reaches it through
the websocket API, so every field here is something the panel renders.
"""

from __future__ import annotations

from collections.abc import Sequence
from copy import deepcopy
from dataclasses import dataclass, field, replace
from enum import StrEnum
from typing import Any, Self

from .observations import Observation, ObservationError
from .persons import PersonProfile, PersonsConfig
from .paths import is_valid_slug
from .recorder import AudioMode

CONFIG_VERSION = 2

# Five minutes balances the two things segment length trades off: retention can
# only free whole segments, so shorter means finer control over disk use, while
# longer means fewer files to index and list. At five minutes a camera produces
# 288 files a day, which stays manageable for a month of history.
DEFAULT_SEGMENT_SECONDS = 300

# Without a floor between analyses, a camera whose motion sensor chatters in
# wind or rain would send a picture to the model every few seconds. A minute is
# short enough that a real event is still caught promptly.
DEFAULT_COOLDOWN_SECONDS = 60

# A ceiling per camera and day, so a misconfigured trigger cannot run up a
# cloud bill or saturate a local model overnight without anyone noticing. A
# hundred is generous for event-driven use and obviously wrong for a runaway.
DEFAULT_DAILY_BUDGET = 100

# Consecutive segments touch within a fraction of a second rather than exactly,
# because a cut can only land on a keyframe. Two seconds is comfortably above
# the keyframe interval cameras use (typically one to four seconds at their
# configured GOP) while far below anything a user would call a gap.
DEFAULT_MAX_GAP_SECONDS = 2.0


class ConfigError(ValueError):
    """The stored configuration is not usable as it stands."""


@dataclass(frozen=True, slots=True)
class StreamConfig:
    """One stream of one camera, and whether it is being recorded."""

    key: str
    """Short name distinguishing the streams of a camera, e.g. "hd" or "sd".
    Becomes part of the file name, so it has to be slug-safe."""

    entity_id: str
    """The Home Assistant camera entity this stream reads from. The RTSP URL
    is resolved from it at runtime, so no credentials are stored here."""

    record: bool = True
    audio: AudioMode = AudioMode.TRANSCODE

    def __post_init__(self) -> None:
        if not is_valid_slug(self.key):
            raise ConfigError(f"stream key {self.key!r} is not usable as a file name")
        if not self.entity_id.startswith("camera."):
            raise ConfigError(f"{self.entity_id!r} is not a camera entity")

    def as_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "entity_id": self.entity_id,
            "record": self.record,
            "audio": str(self.audio),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Self:
        try:
            audio = AudioMode(data.get("audio", AudioMode.TRANSCODE))
        except ValueError as err:
            raise ConfigError(f"unknown audio mode {data.get('audio')!r}") from err
        return cls(
            key=data["key"],
            entity_id=data["entity_id"],
            record=bool(data.get("record", True)),
            audio=audio,
        )


@dataclass(frozen=True, slots=True)
class CapabilityBinding:
    """What a camera capability is wired to.

    A capability is a named slot such as ``ptz_up`` or ``light``. It points at
    either an entity or a free service call, which is what keeps the
    integration independent of any particular camera integration: nothing here
    knows a brand, only what the user assigned.
    """

    entity_id: str | None = None
    action: str | None = None
    """A service to call, as ``domain.service``. Used when a capability has no
    entity of its own, or when the entity needs specific data."""
    data: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        # An empty string is what a form sends for "nothing chosen", and it is
        # not None, so checking against None alone let it through and produced
        # a control bound to nothing.
        if not (self.entity_id or "").strip() and not (self.action or "").strip():
            raise ConfigError("a capability must bind either an entity or an action")
        if self.action is not None and self.action.count(".") != 1:
            raise ConfigError(f"{self.action!r} is not a domain.service action")

    def as_dict(self) -> dict[str, Any]:
        stored: dict[str, Any] = {}
        if self.entity_id is not None:
            stored["entity_id"] = self.entity_id
        if self.action is not None:
            stored["action"] = self.action
        if self.data:
            stored["data"] = dict(self.data)
        return stored

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Self:
        return cls(
            entity_id=data.get("entity_id"),
            action=data.get("action"),
            data=dict(data.get("data", {})),
        )


class ControlKind(StrEnum):
    """How a control is operated, which decides how a tile draws it."""

    BUTTON = "button"
    """One press, no state. A PTZ step, a reboot, a siren trigger."""
    SWITCH = "switch"
    """On and off."""
    SELECT = "select"
    """One of a set the entity itself offers."""
    NUMBER = "number"
    """A value within a range the entity itself defines."""


# Which ways of operating an entity its domain actually supports, most
# obvious first. A select cannot be driven with on and off, and a button has
# no state to switch, so offering those would produce a control that fails the
# moment it is pressed. Domains not listed here accept anything, because a
# free service call can do whatever the user wrote.
KINDS_BY_DOMAIN: dict[str, tuple[str, ...]] = {
    "button": ("button",),
    "scene": ("button",),
    "script": ("button",),
    "switch": ("switch", "button"),
    "light": ("switch", "button"),
    "siren": ("switch", "button"),
    "fan": ("switch", "button"),
    "input_boolean": ("switch", "button"),
    "select": ("select",),
    "input_select": ("select",),
    "number": ("number",),
    "input_number": ("number",),
}


def kinds_for_entity(entity_id: str | None) -> tuple[str, ...]:
    """The ways this entity can be operated, most obvious first.

    An empty tuple means no restriction: either there is no entity, or its
    domain is one this does not know, and guessing wrong would block something
    that works.
    """
    if not entity_id or "." not in entity_id:
        return ()
    return KINDS_BY_DOMAIN.get(entity_id.split(".", 1)[0], ())


@dataclass(frozen=True, slots=True)
class CustomControl:
    """A control the user put on a camera themselves.

    The fourteen named slots cover what nearly every pan-tilt camera has, and
    the heuristic can guess them because their meaning is fixed. Everything
    else a camera offers had nowhere to go: zoom, a wiper, lens heating,
    detection sensitivity, siren volume. Measured against one ordinary camera,
    that was eighteen of its thirty-one entities.

    A custom control carries what a slot gets for free: a name to show and how
    it is operated. Beyond that it is the same binding, so triggering it goes
    through exactly the same path.
    """

    key: str
    name: str
    kind: ControlKind
    binding: CapabilityBinding

    def __post_init__(self) -> None:
        if not is_valid_slug(self.key):
            raise ConfigError(f"control key {self.key!r} is not a usable identifier")
        if not self.name.strip():
            raise ConfigError(f"control {self.key!r} needs a name")

        # A control whose kind its entity cannot do fails the moment it is
        # pressed, and it fails inside Home Assistant where the reason is hard
        # to connect back to this setting. Refusing it here says so plainly.
        allowed = kinds_for_entity(self.binding.entity_id)
        if allowed and str(self.kind) not in allowed:
            entity = self.binding.entity_id
            raise ConfigError(
                f"control {self.key!r} is set to '{self.kind}', which "
                f"{entity} cannot do; it supports: {', '.join(allowed)}"
            )

    def as_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "name": self.name,
            "kind": str(self.kind),
            "binding": self.binding.as_dict(),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Self:
        try:
            kind = ControlKind(data["kind"])
        except (KeyError, ValueError) as err:
            raise ConfigError(f"unknown control kind {data.get('kind')!r}") from err
        return cls(
            key=data["key"],
            name=data["name"],
            kind=kind,
            binding=CapabilityBinding.from_dict(data["binding"]),
        )


@dataclass(frozen=True, slots=True)
class CameraViewSettings:
    """How one camera appears in one view.

    Kept on the camera rather than on the view because everything else about a
    camera lives here too: which stream to show and which controls to offer are
    decisions about that camera, and having to open a view to change them would
    split one thought across two screens.

    It also makes the interesting case natural: the same camera can appear in a
    control view with its substream and every button, and in a wall view with
    its main stream and nothing else.
    """

    visible: bool = True
    stream_key: str | None = None
    """Which stream to show. None picks one automatically."""
    capabilities: tuple[str, ...] | None = None
    """Which controls to offer. None means every one that is bound; an empty
    tuple means none at all, which is what a pure wall display wants."""
    position: int = 0
    """Sort order within the view. Ties fall back to the camera name, so the
    layout is stable without anyone having to number every camera."""

    def as_dict(self) -> dict[str, Any]:
        stored: dict[str, Any] = {"visible": self.visible, "position": self.position}
        if self.stream_key is not None:
            stored["stream_key"] = self.stream_key
        if self.capabilities is not None:
            stored["capabilities"] = list(self.capabilities)
        return stored

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Self:
        capabilities = data.get("capabilities")
        return cls(
            visible=bool(data.get("visible", True)),
            stream_key=data.get("stream_key"),
            capabilities=None if capabilities is None else tuple(capabilities),
            position=int(data.get("position", 0)),
        )


@dataclass(frozen=True, slots=True)
class CameraConfig:
    """One camera as kustos_vision knows it."""

    slug: str
    name: str
    streams: tuple[StreamConfig, ...] = ()
    capabilities: dict[str, CapabilityBinding] = field(default_factory=dict)
    retention_days: int | None = None
    """Age limit for this camera. None means it is only bound by the global
    size budget, if one is set."""
    enabled: bool = True
    area_id: str | None = None
    view_settings: dict[str, CameraViewSettings] = field(default_factory=dict)
    """Per view id. A view not listed here does not show this camera."""
    controls: tuple[CustomControl, ...] = ()
    """Controls beyond the named slots, defined by the user."""

    def __post_init__(self) -> None:
        if not is_valid_slug(self.slug):
            raise ConfigError(f"camera slug {self.slug!r} is not usable as a directory")
        if not self.name:
            raise ConfigError("a camera needs a name")
        if self.retention_days is not None and self.retention_days <= 0:
            raise ConfigError(
                "retention_days must be positive; use null to disable the age limit"
            )
        keys = [s.key for s in self.streams]
        if len(keys) != len(set(keys)):
            raise ConfigError(f"camera {self.slug!r} has duplicate stream keys")

        control_keys = [c.key for c in self.controls]
        if len(control_keys) != len(set(control_keys)):
            raise ConfigError(f"camera {self.slug!r} has duplicate control keys")
        # Both kinds share one namespace, because a view selects from them
        # together and an ambiguous key would make that selection undecidable.
        clashing = set(control_keys) & set(self.capabilities)
        if clashing:
            raise ConfigError(
                f"control keys already used by a built-in control: "
                f"{', '.join(sorted(clashing))}"
            )

    @property
    def recorded_streams(self) -> tuple[StreamConfig, ...]:
        """The streams that are actually being written to disk."""
        if not self.enabled:
            return ()
        return tuple(s for s in self.streams if s.record)

    def stream(self, key: str) -> StreamConfig | None:
        return next((s for s in self.streams if s.key == key), None)

    def settings_for(self, view_id: str) -> CameraViewSettings | None:
        """How this camera appears in a view, or None when it does not."""
        settings = self.view_settings.get(view_id)
        if settings is None or not settings.visible:
            return None
        return settings

    def stream_for(self, view_id: str) -> StreamConfig | None:
        """The stream a view should show.

        Falls back to a stream that is NOT being recorded when the view does
        not name one: on a camera with both, that is the substream, and
        watching it live leaves the main stream to the recorder rather than
        pulling it a second time.
        """
        if not self.streams:
            return None
        settings = self.view_settings.get(view_id)
        if settings is not None and settings.stream_key:
            chosen = self.stream(settings.stream_key)
            if chosen is not None:
                return chosen
        return next((s for s in self.streams if not s.record), self.streams[0])

    def control(self, key: str) -> CustomControl | None:
        return next((c for c in self.controls if c.key == key), None)

    @property
    def all_control_keys(self) -> tuple[str, ...]:
        """Every control this camera can offer, built-in and custom."""
        return (*self.capabilities.keys(), *(c.key for c in self.controls))

    def controls_for(self, view_id: str) -> tuple[CustomControl, ...]:
        """The custom controls a view should offer, in the order defined."""
        settings = self.view_settings.get(view_id)
        if settings is None or settings.capabilities is None:
            return self.controls
        wanted = set(settings.capabilities)
        return tuple(c for c in self.controls if c.key in wanted)

    def capabilities_for(self, view_id: str) -> tuple[str, ...]:
        """The controls a view should offer, in the configured order.

        Only ever capabilities that are actually bound: offering a button that
        cannot work is worse than offering none.
        """
        settings = self.view_settings.get(view_id)
        wanted = (
            tuple(self.capabilities)
            if settings is None or settings.capabilities is None
            else settings.capabilities
        )
        return tuple(key for key in wanted if key in self.capabilities)

    def as_dict(self) -> dict[str, Any]:
        return {
            "slug": self.slug,
            "name": self.name,
            "streams": [s.as_dict() for s in self.streams],
            "capabilities": {k: v.as_dict() for k, v in self.capabilities.items()},
            "retention_days": self.retention_days,
            "enabled": self.enabled,
            "area_id": self.area_id,
            "view_settings": {
                view_id: settings.as_dict()
                for view_id, settings in self.view_settings.items()
            },
            "controls": [c.as_dict() for c in self.controls],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Self:
        return cls(
            slug=data["slug"],
            name=data["name"],
            streams=tuple(StreamConfig.from_dict(s) for s in data.get("streams", [])),
            capabilities={
                key: CapabilityBinding.from_dict(value)
                for key, value in data.get("capabilities", {}).items()
            },
            retention_days=data.get("retention_days"),
            enabled=bool(data.get("enabled", True)),
            area_id=data.get("area_id"),
            view_settings={
                view_id: CameraViewSettings.from_dict(value)
                for view_id, value in data.get("view_settings", {}).items()
            },
            controls=tuple(
                CustomControl.from_dict(c) for c in data.get("controls", [])
            ),
        )


class VisionBackendKind(StrEnum):
    """Where the pictures are sent."""

    AI_TASK = "ai_task"
    """A Home Assistant AI Task entity, which covers every provider Home
    Assistant supports and grows with it."""

    OPENAI = "openai"
    """An OpenAI-compatible endpoint given by URL. Covers a local llama.cpp,
    LM Studio, vLLM, and the hosted services that speak the same protocol."""


@dataclass(frozen=True, slots=True)
class VisionBackend:
    """How to reach the model."""

    kind: VisionBackendKind
    entity_id: str | None = None
    """For AI_TASK: the ai_task entity to use."""
    url: str | None = None
    model: str | None = None
    api_key: str | None = None
    timeout_seconds: int = 120

    def __post_init__(self) -> None:
        if self.kind is VisionBackendKind.AI_TASK:
            if not self.entity_id:
                raise ConfigError("an AI Task backend needs an entity")
            if not self.entity_id.startswith("ai_task."):
                raise ConfigError(f"{self.entity_id!r} is not an AI Task entity")
        else:
            if not self.url:
                raise ConfigError("an OpenAI-compatible backend needs a URL")
            if not self.model:
                raise ConfigError("an OpenAI-compatible backend needs a model name")
        if self.timeout_seconds <= 0:
            raise ConfigError("timeout_seconds must be positive")

    def as_dict(self) -> dict[str, Any]:
        stored: dict[str, Any] = {
            "kind": str(self.kind),
            "timeout_seconds": self.timeout_seconds,
        }
        for name in ("entity_id", "url", "model", "api_key"):
            value = getattr(self, name)
            if value:
                stored[name] = value
        return stored

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Self:
        try:
            kind = VisionBackendKind(data["kind"])
        except (KeyError, ValueError) as err:
            raise ConfigError(f"unknown vision backend {data.get('kind')!r}") from err
        return cls(
            kind=kind,
            entity_id=data.get("entity_id"),
            url=data.get("url"),
            model=data.get("model"),
            api_key=data.get("api_key"),
            timeout_seconds=int(data.get("timeout_seconds", 120)),
        )


@dataclass(frozen=True, slots=True)
class VisionProfile:
    """What one camera is analysed for, and how often it may be."""

    camera_slug: str
    backend: VisionBackend
    observations: tuple[Observation, ...] = ()
    triggers: tuple[str, ...] = ()
    """Entities whose turning on starts an analysis. Camera-side motion or
    person detection costs Home Assistant nothing, which is why it is the
    intended source rather than anything kustos_vision computes."""
    context: str = ""
    """Extra prompt text placed before the questions, for what the model
    cannot see: which way the camera points, what belongs in the picture."""
    cooldown_seconds: int = DEFAULT_COOLDOWN_SECONDS
    daily_budget: int = DEFAULT_DAILY_BUDGET
    enabled: bool = True
    detect_persons: bool = False
    """Whether this camera's analyses also ask for the configured people.
    One switch, off by default: not every camera should recognise persons,
    and every person question costs the request pictures and context."""

    def __post_init__(self) -> None:
        if not is_valid_slug(self.camera_slug):
            raise ConfigError(f"{self.camera_slug!r} is not a camera slug")
        if self.cooldown_seconds < 0:
            raise ConfigError("cooldown_seconds must not be negative")
        if self.daily_budget <= 0:
            raise ConfigError(
                "daily_budget must be positive; disable the profile to stop it"
            )
        keys = [o.key for o in self.observations]
        if len(keys) != len(set(keys)):
            raise ConfigError(f"vision profile {self.camera_slug!r} has duplicate keys")

    def observation(self, key: str) -> Observation | None:
        return next((o for o in self.observations if o.key == key), None)

    @property
    def active_observations(self) -> tuple[Observation, ...]:
        """The questions an analysis actually asks.

        Paused questions keep their entity and its history, but they no
        longer travel to the model and cost nothing.
        """
        return tuple(o for o in self.observations if o.enabled)

    def as_dict(self) -> dict[str, Any]:
        return {
            "camera_slug": self.camera_slug,
            "backend": self.backend.as_dict(),
            "observations": [o.as_dict() for o in self.observations],
            "triggers": list(self.triggers),
            "context": self.context,
            "cooldown_seconds": self.cooldown_seconds,
            "daily_budget": self.daily_budget,
            "enabled": self.enabled,
            "detect_persons": self.detect_persons,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Self:
        try:
            observations = tuple(
                Observation.from_dict(o) for o in data.get("observations", [])
            )
        except ObservationError as err:
            raise ConfigError(str(err)) from err
        return cls(
            camera_slug=data["camera_slug"],
            backend=VisionBackend.from_dict(data["backend"]),
            observations=observations,
            triggers=tuple(data.get("triggers", [])),
            context=data.get("context", ""),
            cooldown_seconds=int(
                data.get("cooldown_seconds", DEFAULT_COOLDOWN_SECONDS)
            ),
            daily_budget=int(data.get("daily_budget", DEFAULT_DAILY_BUDGET)),
            # condition_entity, the old "only while this entity is on" gate,
            # may still sit in stored data and is deliberately ignored.
            enabled=bool(data.get("enabled", True)),
            detect_persons=bool(data.get("detect_persons", False)),
        )


@dataclass(frozen=True, slots=True)
class ViewConfig:
    """One user-defined tab in the panel.

    Views are the reason the panel is worth having over a dashboard: the user
    groups cameras the way the house is laid out, not the way the integration
    happens to list them.
    """

    id: str
    name: str
    icon: str = "mdi:cctv"
    columns: int = 0
    """0 lets the layout choose from the available width."""

    def __post_init__(self) -> None:
        if not is_valid_slug(self.id):
            raise ConfigError(f"view id {self.id!r} is not a usable identifier")
        if not self.name:
            raise ConfigError("a view needs a name")
        if self.columns < 0:
            raise ConfigError("columns must not be negative")

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "icon": self.icon,
            "columns": self.columns,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Self:
        # "cameras" appears in configurations written before the membership
        # moved onto the cameras themselves. It is read during migration in
        # CamwatchConfig.from_dict and ignored here.
        return cls(
            id=data["id"],
            name=data["name"],
            icon=data.get("icon", "mdi:cctv"),
            columns=int(data.get("columns", 0)),
        )


@dataclass(frozen=True, slots=True)
class StorageConfig:
    """Where recordings go, and the limits that apply to all of them."""

    base_path: str
    segment_seconds: int = DEFAULT_SEGMENT_SECONDS
    max_total_bytes: int | None = None
    """Budget across every camera. None disables the size limit."""
    max_gap_seconds: float = DEFAULT_MAX_GAP_SECONDS

    def __post_init__(self) -> None:
        if not self.base_path:
            raise ConfigError("a storage path is required")
        if self.segment_seconds <= 0:
            raise ConfigError("segment_seconds must be positive")
        if self.max_total_bytes is not None and self.max_total_bytes <= 0:
            raise ConfigError(
                "max_total_bytes must be positive; use null to disable the limit"
            )
        if self.max_gap_seconds < 0:
            raise ConfigError("max_gap_seconds must not be negative")

    def as_dict(self) -> dict[str, Any]:
        return {
            "base_path": self.base_path,
            "segment_seconds": self.segment_seconds,
            "max_total_bytes": self.max_total_bytes,
            "max_gap_seconds": self.max_gap_seconds,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Self:
        return cls(
            base_path=data["base_path"],
            segment_seconds=int(data.get("segment_seconds", DEFAULT_SEGMENT_SECONDS)),
            max_total_bytes=data.get("max_total_bytes"),
            max_gap_seconds=float(data.get("max_gap_seconds", DEFAULT_MAX_GAP_SECONDS)),
        )


@dataclass(frozen=True, slots=True)
class CamwatchConfig:
    """The whole configuration, as one immutable value."""

    storage: StorageConfig
    cameras: tuple[CameraConfig, ...] = ()
    views: tuple[ViewConfig, ...] = ()
    vision: tuple[VisionProfile, ...] = ()
    persons: PersonsConfig = field(default_factory=PersonsConfig)

    def camera(self, slug: str) -> CameraConfig | None:
        return next((c for c in self.cameras if c.slug == slug), None)

    def camera_conflicts(
        self, camera: CameraConfig, replacing: str | None = None
    ) -> list[str]:
        """Reasons this camera cannot be saved, phrased for the user.

        ``replacing`` names the camera being edited, which is exempt from every
        check: saving a camera back over itself is the normal case, not a
        collision.

        The identifier check is the important one. It derives from the name, it
        is the directory recordings are written into, and adding a second
        camera under an existing identifier used to replace the first one
        outright. Both cameras then recorded into the same folder and their
        footage became indistinguishable, with the older configuration gone.
        """
        others = [c for c in self.cameras if c.slug != replacing]
        problems: list[str] = []

        if any(c.slug == camera.slug for c in others):
            problems.append(
                f"another camera already uses the identifier '{camera.slug}', "
                "and it decides which folder recordings are written to"
            )

        wanted = camera.name.strip().casefold()
        clash = next((c for c in others if c.name.strip().casefold() == wanted), None)
        if clash is not None:
            problems.append(
                f"another camera is already called '{clash.name}', which would "
                "make the two impossible to tell apart"
            )

        taken = {
            stream.entity_id: other.name
            for other in others
            for stream in other.streams
        }
        for stream in camera.streams:
            if stream.entity_id in taken:
                problems.append(
                    f"'{stream.entity_id}' is already used by "
                    f"'{taken[stream.entity_id]}', so it would be pulled and "
                    "stored twice"
                )
        return problems

    def with_camera(self, camera: CameraConfig) -> Self:
        """Return a copy with this camera added or replaced.

        Replacing is intended for editing. Callers adding a camera must check
        ``camera_conflicts`` first; this method cannot tell the two apart.
        """
        others = tuple(c for c in self.cameras if c.slug != camera.slug)
        return replace(self, cameras=(*others, camera))

    def without_camera(self, slug: str) -> Self:
        """Remove a camera, and any reference to it from the views.

        Leaving the slug behind in a view would make the panel render a tile
        for a camera that no longer exists.
        """
        return replace(
            self,
            cameras=tuple(c for c in self.cameras if c.slug != slug),
            vision=tuple(p for p in self.vision if p.camera_slug != slug),
        )

    def view(self, view_id: str) -> ViewConfig | None:
        return next((v for v in self.views if v.id == view_id), None)

    def with_view(self, view: ViewConfig) -> Self:
        """Add or replace a view, keeping its position when it already exists.

        Position matters: the views are the panel's tabs, and editing one must
        not move it to the end of the tab bar.
        """
        if self.view(view.id) is None:
            return replace(self, views=(*self.views, view))
        return replace(
            self, views=tuple(view if v.id == view.id else v for v in self.views)
        )

    def without_view(self, view_id: str) -> Self:
        """Remove a view, and the per-camera settings that referenced it.

        Leaving them behind would silently resurrect the old layout if a view
        with the same id were created again later.
        """
        remaining = tuple(v for v in self.views if v.id != view_id)
        cameras = tuple(
            replace(
                camera,
                view_settings={
                    key: value
                    for key, value in camera.view_settings.items()
                    if key != view_id
                },
            )
            for camera in self.cameras
        )
        return replace(self, views=remaining, cameras=cameras)

    def with_view_order(self, view_id: str, ordered: Sequence[str]) -> Self:
        """Set the order of every camera in one view at once.

        The order is a property of the view, not of any single camera, so it is
        edited as a whole list rather than as a number on each camera. Doing it
        the other way round would mean opening every camera in turn to work out
        what position was still free.

        Cameras the list does not mention keep the position they had, so a
        stale list cannot silently reshuffle the rest.
        """
        positions = {slug: index for index, slug in enumerate(ordered)}
        cameras = tuple(
            (
                replace(
                    camera,
                    view_settings={
                        **camera.view_settings,
                        view_id: replace(
                            camera.view_settings[view_id],
                            position=positions[camera.slug],
                        ),
                    },
                )
                if camera.slug in positions and view_id in camera.view_settings
                else camera
            )
            for camera in self.cameras
        )
        return replace(self, cameras=cameras)

    def cameras_in_view(self, view_id: str) -> tuple[CameraConfig, ...]:
        """The cameras a view shows, in the order it shows them.

        Position first, then name, so a layout is stable without the user
        having to number every camera.
        """
        members = [
            camera
            for camera in self.cameras
            if camera.enabled and camera.settings_for(view_id) is not None
        ]
        return tuple(
            sorted(
                members,
                key=lambda c: (c.view_settings[view_id].position, c.name.casefold()),
            )
        )

    def with_views(self, views: tuple[ViewConfig, ...]) -> Self:
        """Replace every view at once, which is how reordering the tabs works.

        Settings for views that disappear are dropped from the cameras too.
        Leaving them behind would silently resurrect the old layout if a view
        with the same id were created again later.
        """
        ids = [v.id for v in views]
        if len(ids) != len(set(ids)):
            raise ConfigError("duplicate view ids")
        surviving = set(ids)
        cameras = tuple(
            replace(
                camera,
                view_settings={
                    key: value
                    for key, value in camera.view_settings.items()
                    if key in surviving
                },
            )
            if any(key not in surviving for key in camera.view_settings)
            else camera
            for camera in self.cameras
        )
        return replace(self, views=views, cameras=cameras)

    def with_storage(self, storage: StorageConfig) -> Self:
        return replace(self, storage=storage)

    def vision_for(self, camera_slug: str) -> VisionProfile | None:
        return next((p for p in self.vision if p.camera_slug == camera_slug), None)

    def with_vision(self, profile: VisionProfile) -> Self:
        """Add or replace the profile of one camera. A camera has at most one:
        the questions live in a list inside it, so a second profile would only
        be a way for two to disagree."""
        if self.camera(profile.camera_slug) is None:
            raise ConfigError(f"no camera {profile.camera_slug!r} to analyse")
        others = tuple(p for p in self.vision if p.camera_slug != profile.camera_slug)
        return replace(self, vision=(*others, profile))

    def without_vision(self, camera_slug: str) -> Self:
        return replace(
            self, vision=tuple(p for p in self.vision if p.camera_slug != camera_slug)
        )

    def with_person(self, person: PersonProfile) -> Self:
        """Add or replace one person, keyed by the id that names the entity."""
        others = tuple(p for p in self.persons.people if p.id != person.id)
        return replace(
            self, persons=replace(self.persons, people=(*others, person))
        )

    def without_person(self, person_id: str) -> Self:
        return replace(
            self,
            persons=replace(
                self.persons,
                people=tuple(p for p in self.persons.people if p.id != person_id),
            ),
        )

    def with_persons_options(self, absence_seconds: int) -> Self:
        if absence_seconds < 0:
            raise ConfigError("absence_seconds must not be negative")
        return replace(
            self, persons=replace(self.persons, absence_seconds=absence_seconds)
        )

    @property
    def retention_days_by_camera(self) -> dict[str, int]:
        """The per-camera age limits, in the shape the retention policy wants.
        Cameras without a limit are absent rather than present with a zero."""
        return {
            c.slug: c.retention_days
            for c in self.cameras
            if c.retention_days is not None
        }

    def as_dict(self) -> dict[str, Any]:
        return {
            "version": CONFIG_VERSION,
            "storage": self.storage.as_dict(),
            "cameras": [c.as_dict() for c in self.cameras],
            "views": [v.as_dict() for v in self.views],
            "vision": [p.as_dict() for p in self.vision],
            "persons": self.persons.as_dict(),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Self:
        version = data.get("version", CONFIG_VERSION)
        if version > CONFIG_VERSION:
            raise ConfigError(
                f"configuration version {version} is newer than this integration "
                f"understands (expected at most {CONFIG_VERSION})"
            )
        data = _migrate(data, version)
        cameras = tuple(CameraConfig.from_dict(c) for c in data.get("cameras", []))
        slugs = [c.slug for c in cameras]
        if len(slugs) != len(set(slugs)):
            raise ConfigError("duplicate camera slugs in the stored configuration")
        views = tuple(ViewConfig.from_dict(v) for v in data.get("views", []))
        view_ids = [v.id for v in views]
        if len(view_ids) != len(set(view_ids)):
            raise ConfigError("duplicate view ids in the stored configuration")
        vision = tuple(VisionProfile.from_dict(p) for p in data.get("vision", []))
        vision_slugs = [p.camera_slug for p in vision]
        if len(vision_slugs) != len(set(vision_slugs)):
            raise ConfigError("more than one vision profile for the same camera")
        return cls(
            storage=StorageConfig.from_dict(data["storage"]),
            cameras=cameras,
            views=views,
            vision=vision,
            # Absent in every configuration stored before the feature; the
            # default covers that without a version bump.
            persons=PersonsConfig.from_dict(data.get("persons", {})),
        )


def _migrate(data: dict[str, Any], version: int) -> dict[str, Any]:
    """Bring a stored configuration up to the current shape.

    Returns a new dictionary; the caller's is left alone, so a migration that
    goes wrong cannot corrupt what is still on disk.
    """
    if version >= CONFIG_VERSION:
        return data

    migrated = deepcopy(data)

    # Version 2 moved view membership from the view onto the cameras, so that
    # which stream and which controls a camera shows can differ per view.
    if version < 2:
        by_slug = {camera["slug"]: camera for camera in migrated.get("cameras", [])}
        for view in migrated.get("views", []):
            for position, slug in enumerate(view.pop("cameras", [])):
                camera = by_slug.get(slug)
                if camera is None:
                    continue
                camera.setdefault("view_settings", {})[view["id"]] = {
                    "visible": True,
                    "position": position,
                }

    migrated["version"] = CONFIG_VERSION
    return migrated
