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

from dataclasses import dataclass, field, replace
from enum import StrEnum
from typing import Any, Self

from .observations import Observation, ObservationError
from .paths import is_valid_slug
from .recorder import AudioMode

CONFIG_VERSION = 1

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
        if self.entity_id is None and self.action is None:
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

    @property
    def recorded_streams(self) -> tuple[StreamConfig, ...]:
        """The streams that are actually being written to disk."""
        if not self.enabled:
            return ()
        return tuple(s for s in self.streams if s.record)

    def stream(self, key: str) -> StreamConfig | None:
        return next((s for s in self.streams if s.key == key), None)

    def as_dict(self) -> dict[str, Any]:
        return {
            "slug": self.slug,
            "name": self.name,
            "streams": [s.as_dict() for s in self.streams],
            "capabilities": {k: v.as_dict() for k, v in self.capabilities.items()},
            "retention_days": self.retention_days,
            "enabled": self.enabled,
            "area_id": self.area_id,
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
    condition_entity: str | None = None
    """When set, an analysis only runs while this entity is on. This is how
    "only when the alarm is armed" is expressed without an automation."""
    enabled: bool = True

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

    def as_dict(self) -> dict[str, Any]:
        return {
            "camera_slug": self.camera_slug,
            "backend": self.backend.as_dict(),
            "observations": [o.as_dict() for o in self.observations],
            "triggers": list(self.triggers),
            "context": self.context,
            "cooldown_seconds": self.cooldown_seconds,
            "daily_budget": self.daily_budget,
            "condition_entity": self.condition_entity,
            "enabled": self.enabled,
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
            condition_entity=data.get("condition_entity"),
            enabled=bool(data.get("enabled", True)),
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
    cameras: tuple[str, ...] = ()
    """Camera slugs, in the order they are shown."""
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
        if len(self.cameras) != len(set(self.cameras)):
            raise ConfigError(f"view {self.id!r} lists a camera twice")

    def without_camera(self, slug: str) -> Self:
        """Drop a camera from this view, for when it is deleted entirely."""
        return replace(self, cameras=tuple(c for c in self.cameras if c != slug))

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "cameras": list(self.cameras),
            "icon": self.icon,
            "columns": self.columns,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Self:
        return cls(
            id=data["id"],
            name=data["name"],
            cameras=tuple(data.get("cameras", [])),
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
            views=tuple(v.without_camera(slug) for v in self.views),
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
        return replace(self, views=tuple(v for v in self.views if v.id != view_id))

    def with_views(self, views: tuple[ViewConfig, ...]) -> Self:
        """Replace every view at once, which is how reordering is saved."""
        ids = [v.id for v in views]
        if len(ids) != len(set(ids)):
            raise ConfigError("duplicate view ids")
        return replace(self, views=views)

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
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Self:
        version = data.get("version", CONFIG_VERSION)
        if version > CONFIG_VERSION:
            raise ConfigError(
                f"configuration version {version} is newer than this integration "
                f"understands (expected at most {CONFIG_VERSION})"
            )
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
        )
