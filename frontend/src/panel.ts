// The panel shell: tab bar, routing, and the one snapshot everything renders
// from.
//
// Nothing here decides anything. Every question is answered by the websocket
// API, which is why removing this whole directory costs presentation and not
// capability.

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { CamwatchApi } from "./api";
import { shared } from "./styles";
import type { HomeAssistant, Snapshot } from "./types";
import "./views/live";
import "./views/recordings";
import "./views/settings";

const RECORDINGS_TAB = "__recordings";
const SETTINGS_TAB = "__settings";

@customElement("camwatch-panel")
export class CamwatchPanel extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Boolean, reflect: true }) narrow = false;

  @state() private snapshot?: Snapshot;
  @state() private active = "";
  @state() private error = "";

  private api?: CamwatchApi;

  static override styles = [
    shared,
    css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100vh;
      }
      .tabs {
        display: flex;
        gap: 4px;
        padding: 8px 12px;
        overflow-x: auto;
        background: var(--app-header-background-color, var(--primary-color));
        color: var(--app-header-text-color, #fff);
      }
      .tabs button {
        background: transparent;
        color: inherit;
        border-radius: 8px;
        white-space: nowrap;
        opacity: 0.75;
      }
      .tabs button.active {
        background: rgba(255, 255, 255, 0.18);
        opacity: 1;
      }
      .body {
        flex: 1;
        overflow: auto;
      }
      .notice {
        padding: 32px 16px;
        text-align: center;
        line-height: 1.6;
        color: var(--secondary-text-color);
      }
    `,
  ];

  override connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has("hass") && this.hass && !this.api) {
      this.api = new CamwatchApi(this.hass);
      void this.load();
    }
  }

  private async load(): Promise<void> {
    if (!this.hass) return;
    this.api ??= new CamwatchApi(this.hass);
    try {
      this.snapshot = await this.api.getConfig();
      this.error = "";
      // Land on the first view, or on the settings when there is none yet,
      // which is exactly where a fresh installation needs to go.
      if (!this.active) {
        this.active = this.snapshot.views[0]?.id ?? SETTINGS_TAB;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.error = message;
    }
  }

  override render() {
    if (this.error) {
      return html`<div class="notice">
        camwatch ist nicht eingerichtet oder nicht erreichbar.<br />
        <span class="muted">${this.error}</span>
      </div>`;
    }
    if (!this.snapshot || !this.api) {
      return html`<div class="notice">Wird geladen …</div>`;
    }

    const snapshot = this.snapshot;
    const view = snapshot.views.find((v) => v.id === this.active);

    return html`
      <div class="tabs">
        ${snapshot.views.map(
          (v) => html`
            <button
              class=${v.id === this.active ? "active" : ""}
              @click=${() => (this.active = v.id)}
            >
              ${v.name}
            </button>
          `,
        )}
        <button
          class=${this.active === RECORDINGS_TAB ? "active" : ""}
          @click=${() => (this.active = RECORDINGS_TAB)}
        >
          Aufnahmen
        </button>
        <button
          class=${this.active === SETTINGS_TAB ? "active" : ""}
          @click=${() => (this.active = SETTINGS_TAB)}
        >
          Einstellungen
        </button>
      </div>

      <div class="body">
        ${this.active === RECORDINGS_TAB
          ? html`<camwatch-recordings
              .api=${this.api}
              .cameras=${snapshot.cameras}
            ></camwatch-recordings>`
          : this.active === SETTINGS_TAB
          ? html`<camwatch-settings
              .api=${this.api}
              .snapshot=${snapshot}
              @changed=${() => this.load()}
            ></camwatch-settings>`
          : view
            ? html`<camwatch-live-view
                .hass=${this.hass}
                .api=${this.api}
                .view=${view}
                .cameras=${snapshot.cameras}
              ></camwatch-live-view>`
            : html`<div class="notice">
                Noch keine Ansicht angelegt.<br />
                Unter Einstellungen, Ansichten lässt sich eine erstellen.
              </div>${nothing}`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "camwatch-panel": CamwatchPanel;
  }
}
