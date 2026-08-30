// One camera in a view: the live picture, plus whatever controls the user
// actually bound. A capability with nothing bound to it shows no button at
// all, so the panel never offers something that cannot work.

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { CamwatchApi } from "../api";
import type { Camera, HomeAssistant } from "../types";
import "./live-stream";

const PTZ: [string, string][] = [
  ["ptz_up", "▲"],
  ["ptz_left", "◀"],
  ["ptz_right", "▶"],
  ["ptz_down", "▼"],
];

@customElement("kustos-vision-camera-tile")
export class CamwatchCameraTile extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) api!: CamwatchApi;
  @property({ attribute: false }) camera!: Camera;

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
    // Prefer a stream the user did not mark for recording: on a camera with
    // both, that is the substream, and watching it live leaves the main stream
    // to the recorder rather than pulling it twice.
    const streams = this.camera.streams;
    return (streams.find((s) => !s.record) ?? streams[0])?.entity_id;
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

  private bound(capability: string): boolean {
    return capability in this.camera.capabilities;
  }

  private renderButton(capability: string, label: string, value?: boolean | string) {
    if (!this.bound(capability)) return nothing;
    return html`<button
      title=${capability}
      ?disabled=${this.busy !== ""}
      @click=${() => this.run(capability, value)}
    >
      ${label}
    </button>`;
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

      <div class="controls">
        ${PTZ.map(([capability, label]) => this.renderButton(capability, label))}
        ${this.renderButton("light", "Licht an", true)}
        ${this.renderButton("light", "Licht aus", false)}
        ${this.renderButton("siren", "Sirene", true)}
        ${this.renderButton("siren_on", "Sirene an")}
        ${this.renderButton("siren_off", "Sirene aus")}
      </div>
      ${this.error ? html`<div class="error">${this.error}</div>` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kustos-vision-camera-tile": CamwatchCameraTile;
  }
}
