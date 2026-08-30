// A typed wrapper over the websocket commands.
//
// One function per command, with no logic beyond naming: the panel is a
// projection of the API, so anything that decides something belongs on the
// Python side where it can be tested without a browser.

import type {
  AiTaskEntity,
  AnalysisRun,
  AvailableCamera,
  Camera,
  HomeAssistant,
  Snapshot,
  Suggestion,
  Timeline,
  View,
  VisionProfile,
} from "./types";

const DOMAIN = "kustos_vision";

// How long a signed URL stays valid.
//
// Home Assistant defaults to 30 seconds, which is meant for a URL that is
// handed to the browser and fetched immediately. That is too short here: a
// preview image or a download link sits in the DOM while somebody looks at the
// page and decides, and re-signing on every mouse move would put a websocket
// round trip in front of every hover. An hour covers a normal sitting in front
// of the recordings, and it is short enough that a URL copied out of the
// network tab has stopped working by the time anyone could pass it on.
const SIGNATURE_SECONDS = 3600;

// A signature must still be valid when the request it belongs to finishes, not
// only when it starts. A segment of several dozen megabytes over a slow link
// can take a while, so a signature this close to expiry is replaced rather
// than reused.
const SIGNATURE_MIN_REMAINING_SECONDS = 60;

/**
 * A URL the browser may load on its own.
 *
 * The file endpoints require authentication, and an `<img>`, a `<video src>`
 * or a download link cannot send an Authorization header. Home Assistant
 * solves this with signed paths: the websocket connection asks for a signature
 * over the exact path and query, and the http middleware accepts the request
 * on the strength of it. Signed paths are the only mechanism that works for
 * those three cases, which is why they exist here at all.
 */
interface Signature {
  url: string;
  /** Wall-clock milliseconds after which this must not be handed out again. */
  usableUntil: number;
}

export class CamwatchApi {
  private readonly signatures = new Map<string, Signature>();

  constructor(private hass: HomeAssistant) {}

  getConfig(): Promise<Snapshot> {
    return this.hass.callWS({ type: `${DOMAIN}/config/get` });
  }

  availableCameras(): Promise<{ cameras: AvailableCamera[] }> {
    return this.hass.callWS({ type: `${DOMAIN}/cameras/available` });
  }

  suggest(entityId: string): Promise<Suggestion> {
    return this.hass.callWS({
      type: `${DOMAIN}/camera/suggest`,
      entity_id: entityId,
    });
  }

  /**
   * Save a camera. `replaceExisting` distinguishes editing from adding: without
   * it the command refuses to overwrite a camera that is already there, which
   * is what stops a new camera from silently taking over an existing one's
   * identifier and recording folder.
   */
  setCamera(
    camera: Omit<Camera, "state">,
    replaceExisting = false,
  ): Promise<Snapshot> {
    return this.hass.callWS({
      type: `${DOMAIN}/camera/set`,
      replace_existing: replaceExisting,
      ...camera,
    });
  }

  deleteCamera(slug: string): Promise<Snapshot> {
    return this.hass.callWS({ type: `${DOMAIN}/camera/delete`, slug });
  }

  setViews(views: Omit<View, "cameras">[]): Promise<Snapshot> {
    return this.hass.callWS({ type: `${DOMAIN}/views/set`, views });
  }

  /** Set the order of every camera in one view at once. */
  setViewOrder(viewId: string, cameras: string[]): Promise<Snapshot> {
    return this.hass.callWS({
      type: `${DOMAIN}/view/order`,
      view_id: viewId,
      cameras,
    });
  }

  setStorage(patch: {
    base_path?: string;
    segment_seconds?: number;
    max_total_bytes?: number | null;
    max_gap_seconds?: number;
  }): Promise<Snapshot> {
    return this.hass.callWS({ type: `${DOMAIN}/storage/set`, ...patch });
  }

  trigger(
    slug: string,
    capability: string,
    value?: boolean | number | string,
  ): Promise<void> {
    return this.hass.callWS({
      type: `${DOMAIN}/camera/trigger`,
      slug,
      capability,
      ...(value === undefined ? {} : { value }),
    });
  }

  /**
   * Fetch a file endpoint with the credentials the panel already has.
   *
   * Used where the code does the fetching itself and can therefore set a
   * header. That is better than a signed URL in two ways: the address stays
   * the same between calls, so the browser cache can do its job when the
   * viewer seeks back over footage it already has, and nothing can expire
   * halfway through a long playback.
   */
  async authorizedFetch(url: string, init?: RequestInit): Promise<Response> {
    const token = this.hass.auth?.data?.access_token;
    if (!token) {
      // No token to present. Signing works over the websocket connection,
      // which is authenticated by other means, so this still succeeds.
      return fetch(await this.signedUrl(url), init);
    }
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  }

  /**
   * Sign a path so the browser can load it without a header.
   *
   * Signatures are kept until they are close to expiring. Handing out the same
   * address for the same file lets the browser cache it, which matters for
   * preview images: sweeping along the timeline would otherwise refetch a
   * picture the browser is already holding.
   */
  async signedUrl(url: string): Promise<string> {
    const cached = this.signatures.get(url);
    const now = Date.now();
    if (cached && cached.usableUntil > now) return cached.url;

    const { path } = await this.hass.callWS<{ path: string }>({
      type: "auth/sign_path",
      path: url,
      expires: SIGNATURE_SECONDS,
    });
    this.signatures.set(url, {
      url: path,
      usableUntil:
        now + (SIGNATURE_SECONDS - SIGNATURE_MIN_REMAINING_SECONDS) * 1000,
    });
    return path;
  }

  recordingDays(camera: string): Promise<{ days: string[] }> {
    return this.hass.callWS({ type: `${DOMAIN}/recordings/days`, camera });
  }

  timeline(
    camera: string,
    from: number,
    to: number,
    stream?: string,
  ): Promise<Timeline> {
    return this.hass.callWS({
      type: `${DOMAIN}/recordings/timeline`,
      camera,
      from,
      to,
      ...(stream ? { stream } : {}),
    });
  }

  setVision(profile: Omit<VisionProfile, "state">): Promise<Snapshot> {
    return this.hass.callWS({ type: `${DOMAIN}/vision/set`, ...profile });
  }

  deleteVision(cameraSlug: string): Promise<Snapshot> {
    return this.hass.callWS({
      type: `${DOMAIN}/vision/delete`,
      camera_slug: cameraSlug,
    });
  }

  analyseNow(cameraSlug: string): Promise<{
    ran: boolean;
    values: Record<string, unknown>;
    problems: Record<string, string>;
    raw?: unknown;
    duration?: number;
  }> {
    return this.hass.callWS({
      type: `${DOMAIN}/vision/analyse`,
      camera_slug: cameraSlug,
    });
  }

  visionHistory(cameraSlug: string): Promise<{ history: AnalysisRun[] }> {
    return this.hass.callWS({
      type: `${DOMAIN}/vision/history`,
      camera_slug: cameraSlug,
    });
  }

  aiTaskEntities(): Promise<{ ai_task: AiTaskEntity[] }> {
    return this.hass.callWS({ type: `${DOMAIN}/vision/backends` });
  }

  rebuildIndex(): Promise<Snapshot> {
    return this.hass.callWS({ type: `${DOMAIN}/index/rebuild` });
  }
}

/**
 * Turn whatever a failed call threw into something worth showing.
 *
 * The websocket client rejects with a plain `{code, message}` object rather
 * than an Error, so the usual `err instanceof Error ? err.message : String(err)`
 * renders it as "[object Object]" and the reason the call was refused never
 * reaches the person who has to act on it.
 */
export function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const record = err as { message?: unknown; error?: unknown; code?: unknown };
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;
    if (typeof record.code === "string") return record.code;
    // Something unforeseen. Its contents beat "[object Object]", which tells
    // the reader nothing at all about what went wrong.
    try {
      return JSON.stringify(err);
    } catch {
      return "Unbekannter Fehler";
    }
  }
  return err === undefined || err === null ? "Unbekannter Fehler" : String(err);
}

/** Human-readable byte count, for storage figures. */
export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "unbekannt";
  const units = ["B", "kB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}
