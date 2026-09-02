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
  ReferenceImage,
  Snapshot,
  Suggestion,
  Timeline,
  View,
  VisionProfile,
} from "./types";

const DOMAIN = "kustos_vision";

/** The byte layout of a fragmented segment, from the server's box walk. */
export interface FragmentMap {
  init_end: number;
  data_end: number;
  fragments: { offset: number; start: number }[];
}

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
  private readonly fragmentMaps = new Map<string, Promise<FragmentMap>>();

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
    const auth = this.hass.auth;
    if (!auth?.data?.access_token) {
      // No token to present. Signing works over the websocket connection,
      // which is authenticated by other means, so this still succeeds.
      return fetch(await this.signedUrl(url), init);
    }
    // An access token only lives for a fraction of a sitting, and nothing
    // else on this page keeps it fresh: the websocket authenticated once and
    // never presents it again. A panel left open longer than the token's
    // lifetime sent the stale token with every file request from then on,
    // and every recording answered 401.
    if (auth.expired) await this.refreshAccessToken();
    const response = await this.tokenFetch(url, init);
    if (response.status === 401 && auth.refreshAccessToken) {
      // Expired between the check above and the server looking at it, or the
      // two clocks disagree about when. One refresh and one retry settle
      // both; a second 401 is a real refusal and goes to the caller as such.
      await this.refreshAccessToken();
      return this.tokenFetch(url, init);
    }
    return response;
  }

  /** The fetch itself, with whatever token the auth object holds right now. */
  private tokenFetch(url: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    headers.set(
      "Authorization",
      `Bearer ${this.hass.auth?.data?.access_token ?? ""}`,
    );
    return fetch(url, { ...init, headers });
  }

  /** The refresh in flight, so parallel fetches share it, see below. */
  private refreshing?: Promise<void>;

  /**
   * Renew the access token, once, no matter how many requests need it.
   *
   * A seek fires the init and data fetches together; without the shared
   * promise each of them would trade the refresh token in separately.
   */
  private refreshAccessToken(): Promise<void> {
    this.refreshing ??= Promise.resolve(this.hass.auth?.refreshAccessToken?.())
      .catch(() => {
        // A failed renewal is not this request's error to report. The fetch
        // that follows carries the old token, and its status says what is
        // actually wrong: 401 for a dead session, nothing at all when the
        // token was still good after all.
      })
      .finally(() => {
        this.refreshing = undefined;
      });
    return this.refreshing;
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

  setEndpoint(endpoint: {
    endpoint_id?: string;
    name: string;
    url: string;
    api_key: string;
    models: string[];
  }): Promise<Snapshot> {
    return this.hass.callWS({ type: `${DOMAIN}/endpoint/set`, ...endpoint });
  }

  deleteEndpoint(endpointId: string): Promise<Snapshot> {
    return this.hass.callWS({
      type: `${DOMAIN}/endpoint/delete`,
      endpoint_id: endpointId,
    });
  }

  /** Ask an endpoint for its models (server-side, past any CORS). */
  endpointModels(url: string, apiKey: string): Promise<{ models: string[] }> {
    return this.hass.callWS({
      type: `${DOMAIN}/endpoint/models`,
      url,
      api_key: apiKey,
    });
  }

  /** One tiny completion against one model, so a typo fails here and not
   *  silently at the next motion event. */
  testEndpoint(
    url: string,
    model: string,
    apiKey: string,
  ): Promise<{ ok: boolean; duration: number }> {
    return this.hass.callWS({
      type: `${DOMAIN}/endpoint/test`,
      url,
      model,
      api_key: apiKey,
    });
  }

  setPerson(person: {
    person_id?: string;
    name: string;
    enabled: boolean;
    references: ReferenceImage[];
  }): Promise<Snapshot> {
    return this.hass.callWS({ type: `${DOMAIN}/persons/set`, ...person });
  }

  deletePerson(personId: string): Promise<Snapshot> {
    return this.hass.callWS({
      type: `${DOMAIN}/persons/delete`,
      person_id: personId,
    });
  }

  setPersonsOptions(absenceSeconds: number): Promise<Snapshot> {
    return this.hass.callWS({
      type: `${DOMAIN}/persons/options`,
      absence_seconds: absenceSeconds,
    });
  }

  /** Upload a reference picture. The body is FormData and the Content-Type
   *  is deliberately not set: the browser has to add the multipart boundary,
   *  and a hand-set header would overwrite it with one that has none, which
   *  the server then cannot parse. */
  async uploadReference(
    file: Blob,
  ): Promise<{ asset_id: string; content_type: string; bytes: number }> {
    const body = new FormData();
    body.append("file", file, "referenz");
    const response = await this.authorizedFetch(`/api/${DOMAIN}/reference`, {
      method: "POST",
      body,
    });
    if (!response.ok) {
      throw new Error((await response.text()) || `HTTP ${response.status}`);
    }
    return response.json();
  }

  /** Take a frame from the camera right now and store it as a reference. */
  captureReference(
    cameraSlug: string,
  ): Promise<{ asset_id: string; content_type: string }> {
    return this.hass.callWS({
      type: `${DOMAIN}/reference/capture`,
      camera_slug: cameraSlug,
    });
  }

  deleteReference(assetId: string): Promise<{ deleted: boolean }> {
    return this.hass.callWS({
      type: `${DOMAIN}/reference/delete`,
      asset_id: assetId,
    });
  }

  /** A displayable URL for a stored reference picture. */
  referenceUrl(assetId: string): Promise<string> {
    return this.signedUrl(`/api/${DOMAIN}/reference/${assetId}`);
  }

  /** Ask the Supervisor to reconnect the mount behind the recordings. */
  reconnectStorage(): Promise<Snapshot> {
    return this.hass.callWS({ type: `${DOMAIN}/storage/reconnect` });
  }

  /**
   * The byte map of one segment, so playback can start mid-file.
   *
   * Cached per path: finished segments never change, and a seek that hops
   * around one file must not walk its boxes on the server every time.
   */
  fragments(path: string): Promise<FragmentMap> {
    const cached = this.fragmentMaps.get(path);
    if (cached) return cached;
    const promise = this.hass
      .callWS<FragmentMap>({ type: `${DOMAIN}/recordings/fragments`, path })
      .catch((err) => {
        // A failed lookup must not poison the cache.
        this.fragmentMaps.delete(path);
        throw err;
      });
    this.fragmentMaps.set(path, promise);
    return promise;
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
