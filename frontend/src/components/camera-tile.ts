// One camera in a view: the live picture, plus whatever controls the user
// actually bound. A capability with nothing bound to it shows no button at
// all, so the panel never offers something that cannot work.

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { CamwatchApi } from "../api";
import { capabilityLabel, PTZ_SYMBOLS } from "../capabilities";
import type { Camera, HomeAssistant } from "../types";
import "./live-stream";

/** Capabilities that are a single press, in the order a tile shows them. */
const MOMENTARY = ["ptz_up", "ptz_left", "ptz_right", "ptz_down", "siren_on", "siren_off"];
/** Capabilities that are switched on and off, so they need two buttons. */
const SWITCHABLE = ["light", "siren", "privacy_mode"];

@customElement("kustos-vision-camera-tile")
export class CamwatchCameraTile extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) api!: CamwatchApi;
  @property({ attribute: false }) camera!: Camera;
  @property() viewId = "";

  @state() private busy = "";
  @state() private error = "";

  static override styles = css`
    :host {
      display: block;
      background: var(--card-background-color, #fff);
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
      box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0, 0, 0, 0.15));
    }
    header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      font-weight: 500;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--error-color, #db4437);
      flex: none;
    }
    .dot.recording {
      background: var(--success-color, #43a047);
    }
    .spacer {
      flex: 1;
    }
    .meta {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      font-weight: normal;
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 8px 12px 12px;
    }
    button {
      font: inherit;
      cursor: pointer;
      border: none;
      border-radius: 8px;
      padding: 6px 10px;
      min-width: 36px;
      background: var(--secondary-background-color);
      color: var(--primary-text-color);
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .error {
      padding: 0 12px 10px;
      color: var(--error-color, #db4437);
      font-size: 0.85em;
    }
  `;

  private get liveEntity(): string | undefined {
    const streams = this.camera.streams;
    if (!streams.length) return undefined;

    // What this particular view asked for, if it asked.
    const wanted = this.camera.view_settings?.[this.viewId]?.stream_key;
    if (wanted) {
      const chosen = streams.find((s) => s.key === wanted);
      if (chosen) return chosen.entity_id;
    }

    // Otherwise a stream nobody is recording: on a camera with both that is
    // the substream, and watching it live leaves the main stream to the
    // recorder rather than pulling it from the camera a second time.
    return (streams.find((s) => !s.record) ?? streams[0]).entity_id;
  }

  /** The controls this view wants, limited to those actually bound. */
  private get shownCapabilities(): string[] {
    const chosen = this.camera.view_settings?.[this.viewId]?.capabilities;
    const wanted = chosen ?? Object.keys(this.camera.capabilities);
    return wanted.filter((key) => key in this.camera.capabilities);
  }

  private async run(capability: string, value?: boolean | string): Promise<void> {
    this.busy = capability;
    this.error = "";
    try {
      await this.api.trigger(this.camera.slug, capability, value);
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.busy = "";
    }
  }

  private renderButton(capability: string, label: string, value?: boolean | string) {
    return html`<button
      title=${capabilityLabel(capability)}
      ?disabled=${this.busy !== ""}
      @click=${() => this.run(capability, value)}
    >
      ${label}
    </button>`;
  }

  private renderControls() {
    const shown = this.shownCapabilities;
    if (!shown.length) return nothing;

    const buttons = [];
    for (const key of MOMENTARY) {
      if (!shown.includes(key)) continue;
      buttons.push(this.renderButton(key, PTZ_SYMBOLS[key] ?? capabilityLabel(key)));
    }
    for (const key of SWITCHABLE) {
      if (!shown.includes(key)) continue;
      buttons.push(
        this.renderButton(key, `${capabilityLabel(key)} an`, true),
        this.renderButton(key, `${capabilityLabel(key)} aus`, false),
      );
    }
    return html`<div class="controls">${buttons}</div>`;
  }

  override render() {
    const entity = this.liveEntity;
    const state = this.camera.state;
    const streams = state.streams.filter((s) => s.running).length;

    return html`
      <header>
        <span
          class="dot ${state.recording ? "recording" : ""}"
          title=${state.recording
            ? `${streams} Stream(s) werden aufgezeichnet`
            : state.paused
              ? "Aufzeichnung pausiert"
              : "Aufzeichnung laeuft nicht"}
        ></span>
        <span>${this.camera.name}</span>
        <span class="spacer"></span>
        ${state.paused ? html`<span class="meta">pausiert</span>` : nothing}
      </header>

      ${entity
        ? html`<kustos-vision-live-stream
            .hass=${this.hass}
            .entityId=${entity}
          ></kustos-vision-live-stream>`
        : html`<div class="meta" style="padding:12px">Kein Stream zugeordnet</div>`}

      ${this.renderControls()}
      ${this.error ? html`<div class="error">${this.error}</div>` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kustos-vision-camera-tile": CamwatchCameraTile;
  }
}
