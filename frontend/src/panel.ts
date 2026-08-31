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
import { BUILD_TAG, BUILT_VERSION, type HomeAssistant, type Snapshot } from "./types";
import "./views/live";
import "./views/recordings";
import "./views/settings";

const RECORDINGS_TAB = "__recordings";
const SETTINGS_TAB = "__settings";

// A side effect on purpose: without a use, the build tag would be
// tree-shaken out of the bundle, and the server extracts exactly this
// literal from the file to tell the panel which bundle it is serving.
(globalThis as { kustosVisionBuild?: string }).kustosVisionBuild = BUILD_TAG;

@customElement("kustos-vision-panel")
export class CamwatchPanel extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Boolean, reflect: true }) narrow = false;

  @state() private snapshot?: Snapshot;
  @state() private active = "";
  @state() private error = "";
  @state() private reconnecting = false;
  @state() private reconnectError = "";

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
      .header {
        flex: none;
        background: var(--app-header-background-color, var(--primary-color));
        color: var(--app-header-text-color, var(--text-primary-color, #fff));
      }
      .toolbar {
        height: var(--header-height, 56px);
        display: flex;
        align-items: center;
        padding: 0 16px;
        box-sizing: border-box;
      }
      .toolbar .title {
        font-size: 20px;
        font-weight: 400;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tabs {
        display: flex;
        overflow-x: auto;
        /* Home Assistant's tab strips scroll without showing a bar; one
           right under the tabs would compete with the selection underline. */
        scrollbar-width: none;
      }
      .tabs::-webkit-scrollbar {
        display: none;
      }
      .tabs button {
        height: 48px;
        min-height: 0;
        min-width: 90px;
        padding: 0 16px;
        background: none;
        border: none;
        border-radius: 0;
        color: inherit;
        font-size: 14px;
        white-space: nowrap;
        opacity: 0.7;
        /* The selection mark Home Assistant uses: a bar, never a fill. */
        border-bottom: 2px solid transparent;
        transition: opacity 120ms ease-in-out;
      }
      .tabs button:hover:not(:disabled) {
        opacity: 1;
        box-shadow: none;
      }
      .tabs button.active {
        opacity: 1;
        /* The chain hass-tabs-subpage itself resolves for its selection
           bar, with one more link so a header without any text colour set
           still shows a bar. */
        border-bottom-color: var(
          --app-header-selection-bar-color,
          var(--app-header-text-color, var(--text-primary-color, #fff))
        );
      }
      .tabs button:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: -4px;
      }
      :host([narrow]) .toolbar {
        padding: 0 12px;
      }
      :host([narrow]) .tabs button {
        min-width: 0;
        padding: 0 12px;
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
      .body > kustos-vision-settings {
        /* Home Assistant caps and centres its settings content; a
           full-width form on a wide monitor is a line length nobody reads.
           The live views deliberately stay full width, a camera wall wants
           every pixel. width:100% matters: with only the auto margins, a
           column flex child shrinks to fit-content instead of stretching. */
        width: 100%;
        max-width: var(--kv-content-max-width, 1040px);
        margin: 0 auto;
      }
      .stale {
        position: relative;
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        padding: 12px 16px;
        /* How ha-alert colours a warning: the accent laid over the surface
           at low opacity instead of used as the background, so the text
           keeps the theme's own colour and stays readable on light and
           dark alike. */
        background: var(
          --ha-card-background,
          var(--card-background-color, Canvas)
        );
        color: var(--primary-text-color, CanvasText);
        border-left: 4px solid var(--warning-color, #ffa600);
        font-size: 0.9em;
      }
      .stale::before {
        content: "";
        position: absolute;
        inset: 0;
        background: var(--warning-color, #ffa600);
        opacity: 0.12;
        pointer-events: none;
      }
      .stale > * {
        position: relative;
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
  /**
   * Say so when nothing is being recorded because the location is gone.
   *
   * The integration loads anyway in that state, precisely so this banner and
   * the settings behind it exist: the location can only be changed here.
   */
  private renderStorageNotice(snapshot: Snapshot) {
    if (!snapshot.storage_error) return nothing;
    return html`<div class="stale">
      <span>
        Der Aufnahmeort ist nicht beschreibbar, die Aufzeichnung ist pausiert:
        ${snapshot.storage_error}. Sie startet von selbst, sobald der Ort
        wieder verfügbar ist; ändern lässt er sich unter Einstellungen,
        Speicher.
      </span>
      ${snapshot.storage_reconnect_available
        ? html`<button
            class="secondary"
            ?disabled=${this.reconnecting}
            @click=${this.reconnectStorage}
          >
            ${this.reconnecting
              ? "Verbinde neu …"
              : "Speicher neu verbinden"}
          </button>`
        : nothing}
      ${this.reconnectError
        ? html`<span>${this.reconnectError}</span>`
        : nothing}
    </div>`;
  }

  /**
   * The retry HAOS itself never makes.
   *
   * Network mounts are attempted exactly once at boot; when that race is
   * lost, the Supervisor covers the mount point with a read-only placeholder
   * and waits for a manual reload. This button is that reload, placed where
   * the person is already looking at the consequence.
   */
  private async reconnectStorage(): Promise<void> {
    if (!this.api) return;
    this.reconnecting = true;
    this.reconnectError = "";
    try {
      this.snapshot = await this.api.reconnectStorage();
    } catch (err) {
      this.reconnectError = errorText(err);
    } finally {
      this.reconnecting = false;
    }
  }

  private renderStaleNotice(snapshot: Snapshot) {
    if (snapshot.build?.restart_pending) {
      return html`<div class="stale">
        <span>
          Kustos Vision wurde aktualisiert. Bis Home Assistant neu gestartet
          wird, liefert es weiterhin die vorherige Oberfläche aus.
        </span>
      </div>`;
    }
    // Compared against the bundle on disk, never against the integration
    // version: a Python-only release moves the version while the bundle
    // legitimately stays the same, and that comparison nagged every tab to
    // reload forever (measured on 0.6.3).
    const served = snapshot.build?.bundle_version;
    if (served && BUILT_VERSION && served !== BUILT_VERSION) {
      return html`<div class="stale">
        <span>
          Diese Seite zeigt noch die Oberfläche aus Version ${BUILT_VERSION},
          ausgeliefert wird ${served}. Der Browser hält eine ältere
          Oberfläche fest.
        </span>
        <button class="secondary" @click=${() => location.reload()}>
          Neu laden
        </button>
      </div>`;
    }
    return nothing;
  }

  /** The identity above everything, shown even while loading or broken. */
  private renderHeader() {
    return html`<div class="header">
      <div class="toolbar"><div class="title">Kustos Vision</div></div>
      ${this.snapshot ? this.renderTabs(this.snapshot) : nothing}
    </div>`;
  }

  private renderTabs(snapshot: Snapshot) {
    return html`<div class="tabs" role="tablist">
      ${snapshot.views.map(
        (v) => html`
          <button
            role="tab"
            aria-selected=${v.id === this.active ? "true" : "false"}
            class=${v.id === this.active ? "active" : ""}
            @click=${() => (this.active = v.id)}
          >
            ${v.name}
          </button>
        `,
      )}
      <button
        role="tab"
        aria-selected=${this.active === RECORDINGS_TAB ? "true" : "false"}
        class=${this.active === RECORDINGS_TAB ? "active" : ""}
        @click=${() => (this.active = RECORDINGS_TAB)}
      >
        Aufnahmen
      </button>
      <button
        role="tab"
        aria-selected=${this.active === SETTINGS_TAB ? "true" : "false"}
        class=${this.active === SETTINGS_TAB ? "active" : ""}
        @click=${() => (this.active = SETTINGS_TAB)}
      >
        Einstellungen
      </button>
    </div>`;
  }

  override render() {
    return html`
      ${this.renderHeader()}
      ${this.snapshot ? this.renderStaleNotice(this.snapshot) : nothing}
      ${this.snapshot ? this.renderStorageNotice(this.snapshot) : nothing}
      ${this.renderBody()}
    `;
  }

  private renderBody() {
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
      <div class="body">
        ${this.active === RECORDINGS_TAB
          ? html`<kustos-vision-recordings
              .api=${this.api}
              .cameras=${snapshot.cameras}
              .stampAvailable=${snapshot.build?.stamp_available ?? false}
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
