// The shapes the websocket API sends. Kept in one place so a change to the
// Python side shows up as a type error here rather than as a blank panel.

export interface StreamConfig {
  key: string;
  entity_id: string;
  record: boolean;
  audio: "transcode" | "copy" | "none";
}

export interface CapabilityBinding {
  entity_id?: string;
  action?: string;
  data?: Record<string, unknown>;
}

export interface StreamState {
  stream_key: string;
  running: boolean;
  restarts: number;
  last_error: string | null;
  recent_output: string[];
}

export interface CameraState {
  recording: boolean;
  /** Whether any stream is meant to be recorded. Distinguishes "not supposed
   *  to" from "supposed to but cannot", which the panel must not conflate. */
  wants_recording: boolean;
  paused: boolean;
  used_bytes: number;
  oldest_start: string | null;
  streams: StreamState[];
}

export interface CameraViewSettings {
  visible: boolean;
  stream_key?: string | null;
  capabilities?: string[] | null;
  position: number;
}

export type ControlKind = "button" | "switch" | "select" | "number";

export interface CustomControl {
  key: string;
  name: string;
  kind: ControlKind;
  binding: CapabilityBinding;
}

export interface Camera {
  slug: string;
  name: string;
  streams: StreamConfig[];
  capabilities: Record<string, CapabilityBinding>;
  retention_days: number | null;
  enabled: boolean;
  area_id: string | null;
  view_settings: Record<string, CameraViewSettings>;
  /** Controls beyond the fourteen named slots, defined by the user. */
  controls: CustomControl[];
  state: CameraState;
}

export interface View {
  id: string;
  name: string;
  /** Resolved by the backend, in display order. Read-only: membership is set
   *  on each camera, so that stream and controls can differ per view. */
  cameras: string[];
  icon: string;
  columns: number;
}

export type ObservationType = "boolean" | "text" | "number" | "select";

/** A drawn label on a reference picture: a rectangle plus its text, in
 *  coordinates normalised 0..1 so it survives any resolution. */
export interface ReferenceRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface ReferenceImage {
  asset_id: string;
  caption?: string;
  regions?: ReferenceRegion[];
  /** The copy with the labels burned in - what actually travels to the
   *  model. Empty means nothing was drawn and the original travels. */
  burned_asset_id?: string;
}

export interface Observation {
  key: string;
  type: ObservationType;
  question: string;
  name?: string;
  device_class?: string;
  options?: string[];
  minimum?: number;
  maximum?: number;
  /** A paused question keeps its entity but is no longer asked. */
  enabled?: boolean;
  references?: ReferenceImage[];
}

export interface VisionBackend {
  kind: "ai_task" | "openai";
  entity_id?: string;
  url?: string;
  model?: string;
  api_key?: string;
  timeout_seconds?: number;
  /** A configured endpoint to take url and api_key from at request time;
   *  the direct url stays supported for profiles from before endpoints. */
  endpoint_id?: string;
}

/** One OpenAI-compatible endpoint, entered once and picked everywhere. */
export interface EndpointConfig {
  id: string;
  name: string;
  url: string;
  api_key?: string;
  models?: string[];
}

export interface VisionState {
  values: Record<string, unknown>;
  last_run: string | null;
  last_error: string | null;
  running: boolean;
  analyses_today: number;
}

export interface VisionProfile {
  camera_slug: string;
  backend: VisionBackend;
  observations: Observation[];
  triggers: string[];
  context: string;
  cooldown_seconds: number;
  daily_budget: number;
  enabled: boolean;
  /** Whether this camera's analyses also ask for the configured people. */
  detect_persons?: boolean;
  /** Whether an image entity carries the frame of the latest analysis. */
  frame_sensor?: boolean;
  /** Whether the model is also asked WHERE the reported objects are, and
   *  the boxes are burned into the image entity's picture. */
  mark_objects?: boolean;
  state: VisionState;
}

export interface PersonState {
  present: boolean;
  last_seen: string | null;
  last_camera: string | null;
}

export interface PersonProfile {
  id: string;
  name: string;
  enabled?: boolean;
  references?: ReferenceImage[];
  state?: PersonState;
}

export interface PersonsSnapshot {
  absence_seconds: number;
  people: PersonProfile[];
}

export interface AnalysisRun {
  at: string;
  trigger: string;
  values: Record<string, unknown>;
  problems: Record<string, string>;
  raw: unknown;
  duration: number | null;
  error: string | null;
  /** Ring-slot file name of the exact frame the model saw, when one was kept.
   *  Optional: histories recorded by an older backend do not carry it. */
  frame?: string | null;
  /** "stream" = decoded at trigger time; "still" = the camera integration's
   *  cached snapshot, which may be minutes older than the trigger. */
  frame_source?: string | null;
}

export interface AiTaskEntity {
  entity_id: string;
  name: string;
  available: boolean;
}

export interface Storage {
  base_path: string;
  segment_seconds: number;
  max_total_bytes: number | null;
  max_gap_seconds: number;
}

/** Declared by the build, see vite.config.ts. */
declare const __KUSTOS_VISION_VERSION__: string;
export const BUILT_VERSION = __KUSTOS_VISION_VERSION__;

/**
 * The greppable literal the server extracts from the served bundle, so the
 * stale-tab banner can compare running bundle against served bundle. Injected
 * whole by the build; assigned to the page in panel.ts so it survives
 * tree-shaking and is visible in devtools.
 */
declare const __KUSTOS_VISION_BUILD_TAG__: string;
export const BUILD_TAG = __KUSTOS_VISION_BUILD_TAG__;

export interface Snapshot {
  storage: Storage;
  /** Why the recording location cannot be used right now, or null. */
  storage_error?: string | null;
  /** The broken location lives on a Supervisor mount that can be reloaded. */
  storage_reconnect_available?: boolean;
  cameras: Camera[];
  views: View[];
  vision: VisionProfile[];
  persons: PersonsSnapshot;
  endpoints: EndpointConfig[];
  capability_keys: string[];
  totals: {
    used_bytes: number;
    free_bytes: number | null;
    over_budget_bytes: number;
  };
  build: {
    /** The version that is installed, as the manifest states it. */
    version: string;
    /** The server's ffmpeg can burn a clock into exports (drawtext). */
    stamp_available: boolean;
    /** The built front-end on disk is no longer the one being served. */
    restart_pending: boolean;
    /**
     * The version the bundle on disk was built from, or null. The stale-tab
     * banner compares against this, never against `version`: a Python-only
     * release moves `version` while the bundle legitimately stays the same.
     */
    bundle_version?: string | null;
  };
  maintenance: {
    indexed: number;
    deleted: number;
    thumbnails: number;
    error: string | null;
  };
}

export interface TimelineBlock {
  stream_key: string;
  start: number;
  end: number;
  segments: number;
}

export interface TimelineSegment {
  path: string;
  stream_key: string;
  start: number;
  duration: number;
  size: number;
  thumbnail: boolean;
}

export interface Timeline {
  blocks: TimelineBlock[];
  segments: TimelineSegment[];
}

export interface AvailableCamera {
  /** A representative entity of the camera; the suggestion starts from it. */
  entity_id: string;
  name: string | null;
  device_id: string | null;
  area_id: string | null;
  available: boolean;
  /** Every camera entity of this device, so the picker can say how many
   *  streams it brings without listing them as separate cameras. */
  streams: { entity_id: string; name: string | null }[];
  /** Already recorded by a camera in Kustos Vision. */
  in_use: boolean;
}

export interface Suggestion {
  name: string;
  area_id: string | null;
  streams: { key: string; entity_id: string }[];
  capabilities: Record<string, string>;
  candidates: { entity_id: string; name: string; domain: string }[];
}

// The slice of Home Assistant's frontend object a custom panel is handed.
export interface HomeAssistant {
  callWS<T>(message: Record<string, unknown>): Promise<T>;
  connection: {
    subscribeEvents<T>(
      callback: (event: T) => void,
      eventType: string,
    ): Promise<() => Promise<void>>;
  };
  states: Record<string, { state: string; attributes: Record<string, unknown> }>;
  /** Absent in contexts that never authenticated; the file endpoints
   *  fall back to a signed path there. */
  auth?: {
    data?: { access_token?: string };
    /** Whether the token above is past its lifetime, judged by the auth
     *  code that owns it. */
    expired?: boolean;
    /** Trade the refresh token for a fresh access token; replaces `data`. */
    refreshAccessToken?: () => Promise<void>;
  };
  hassUrl(path?: string): string;
  language: string;
  themes: unknown;
  user?: { is_admin: boolean };
}
