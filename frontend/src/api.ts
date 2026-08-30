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

const DOMAIN = "camwatch";

export class CamwatchApi {
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

  setCamera(camera: Omit<Camera, "state">): Promise<Snapshot> {
    return this.hass.callWS({ type: `${DOMAIN}/camera/set`, ...camera });
  }

  deleteCamera(slug: string): Promise<Snapshot> {
    return this.hass.callWS({ type: `${DOMAIN}/camera/delete`, slug });
  }

  setViews(views: View[]): Promise<Snapshot> {
    return this.hass.callWS({ type: `${DOMAIN}/views/set`, views });
  }

  setStorage(patch: {
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
