// The panel shell: tab bar, routing, and the one snapshot everything renders
// from.
//
// Nothing here decides anything. Every question is answered by the websocket
// API, which is why removing this whole directory costs presentation and not
// capability.

// Keep this first: it must run before any component registers itself.
import "./version-guard";

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { CamwatchApi, errorText } from "./api";
import { shared } from "./styles";
import { BUILT_VERSION, type HomeAssistant, type Snapshot } from "./types";
import "./views/live";
import "./views/recordings";
import "./views/settings";

const RECORDINGS_TAB = "__recordings";
const SETTINGS_TAB = "__settings";

@customElement("kustos-vision-panel")
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
        /* Home Assistant hangs a custom panel straight into ha-panel-custom
           and puts no toolbar of its own above it, so the panel owns the full
           height beside the sidebar. It does pad that element by the device's
           safe-area insets, which come off the top here: without that the
           panel is exactly the inset too tall and the whole page scrolls by
           that much. The plain vh line is the fallback for browsers without
           dvh, which follows the address bar on a phone. */
        height: 100vh;
        height: calc(
          100dvh - var(--safe-area-inset-top, 0px) -
            var(--safe-area-inset-bottom, 0px)
        );
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
        /* A flex child does not shrink below its content without this, so a
           long tab would push the panel past the window instead of scrolling
           inside it. */
        min-height: 0;
        display: flex;
        flex-direction: column;
        /* Kept for the tabs that are meant to scroll: the live view shows as
           many cameras as there are, and the settings are a long form. Only
           the recordings tab opts out by filling the height exactly. */
        overflow: auto;
      }
      /* These two keep their natural height and let .body scroll, which is
         what they did before .body became a flex container. Only the
         recordings view asks to be stretched. */
      .body > kustos-vision-live-view,
      .body > kustos-vision-settings {
        flex: 0 0 auto;
      }
      .stale {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        padding: 10px 16px;
        background: var(--warning-color, #ffa600);
        color: #000;
        font-size: 0.9em;
      }
      .stale button {
        background: rgba(0, 0, 0, 0.75);
        color: #fff;
        padding: 6px 12px;
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
      const message = errorText(err);
      this.error = message;
    }
  }

  /**
   * Say so when what is on screen is not what is installed.
   *
   * Both cases below are invisible without this. Everything looks like the
   * update worked, the change is simply not there, and the only way to find
   * out is to know how browser caches and panel registration behave. Neither
   * is something anybody should have to know to see their own settings.
   */
  private renderStaleNotice(snapshot: Snapshot) {
    const installed = snapshot.build?.version;
    if (snapshot.build?.restart_pending) {
      return html`<div class="stale">
        <span>
          Kustos Vision wurde aktualisiert. Bis Home Assistant neu gestartet
          wird, liefert es weiterhin die vorherige Oberfläche aus.
        </span>
      </div>`;
    }
    if (installed && BUILT_VERSION && installed !== BUILT_VERSION) {
      return html`<div class="stale">
        <span>
          Diese Seite zeigt noch Version ${BUILT_VERSION}, installiert ist
          ${installed}. Der Browser hält eine ältere Oberfläche fest.
        </span>
        <button @click=${() => location.reload()}>Neu laden</button>
      </div>`;
    }
    return nothing;
  }

  override render() {
    if (this.error) {
      return html`<div class="notice">
        kustos_vision ist nicht eingerichtet oder nicht erreichbar.<br />
        <span class="muted">${this.error}</span>
      </div>`;
    }
    if (!this.snapshot || !this.api) {
      return html`<div class="notice">Wird geladen …</div>`;
    }

    const snapshot = this.snapshot;
    const view = snapshot.views.find((v) => v.id === this.active);

    return html`
      ${this.renderStaleNotice(snapshot)}
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
          ? html`<kustos-vision-recordings
              .api=${this.api}
              .cameras=${snapshot.cameras}
            ></kustos-vision-recordings>`
          : this.active === SETTINGS_TAB
          ? html`<kustos-vision-settings
              .api=${this.api}
              .snapshot=${snapshot}
              @changed=${() => this.load()}
            ></kustos-vision-settings>`
          : view
            ? html`<kustos-vision-live-view
                .hass=${this.hass}
                .api=${this.api}
                .view=${view}
                .cameras=${snapshot.cameras}
              ></kustos-vision-live-view>`
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
    "kustos-vision-panel": CamwatchPanel;
  }
}
