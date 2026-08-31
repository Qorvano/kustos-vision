// Everything that can be configured, in one place.
//
// The config flow deliberately only asks where recordings go; everything else
// lives here, so there is one place to look for a setting rather than two that
// can disagree.

import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { errorText, formatBytes, type CamwatchApi } from "../api";
import { shared } from "../styles";
import type {
  AvailableCamera,
  Camera,
  HomeAssistant,
  Snapshot,
  StreamState,
  View,
} from "../types";
import "./camera-editor";
import "./vision-editor";

type Section = "cameras" | "vision" | "storage" | "views" | "system";

const SECTIONS: [Section, string][] = [
  ["cameras", "Kameras"],
  ["vision", "Bilderkennung"],
  ["storage", "Speicher"],
  ["views", "Ansichten"],
  ["system", "System"],
];

const GIGABYTE = 1000 * 1000 * 1000;

@customElement("kustos-vision-settings")
export class CamwatchSettings extends LitElement {
  @property({ attribute: false }) api!: CamwatchApi;
  @property({ attribute: false }) snapshot!: Snapshot;
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private section: Section = "cameras";
  @state() private editing?: Camera;
  @state() private adding = false;
  @state() private available: AvailableCamera[] = [];
  @state() private visionFor?: Camera;
  @state() private busy = false;
  @state() private error = "";

  static override styles = shared;

  private async refresh(): Promise<void> {
    this.dispatchEvent(new CustomEvent("changed", { bubbles: true, composed: true }));
  }

  private async run(work: () => Promise<unknown>): Promise<void> {
    this.busy = true;
    this.error = "";
    try {
      await work();
      await this.refresh();
    } catch (err) {
      this.error = errorText(err);
    } finally {
      this.busy = false;
    }
  }

  private async startAdding(): Promise<void> {
    this.error = "";
    try {
      this.available = (await this.api.availableCameras()).cameras;
      this.adding = true;
    } catch (err) {
      this.error = errorText(err);
    }
  }

  // ------------------------------------------------------------------
  // Cameras
  // ------------------------------------------------------------------

  /** The subpage title row: back arrow plus the name, like hass-subpage. */
  private renderSubpageHeader(title: string, back: () => void) {
    return html`<div class="subpage-header">
      <button class="back" title="Zurück" @click=${back}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
          <path
            d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"
          />
        </svg>
      </button>
      <h2>${title}</h2>
    </div>`;
  }

  private renderCameras() {
    if (this.adding || this.editing) {
      return html`${this.renderSubpageHeader(
        this.editing ? `${this.editing.name} bearbeiten` : "Kamera hinzufügen",
        () => {
          this.adding = false;
          this.editing = undefined;
        },
      )}
      <kustos-vision-camera-editor
        .api=${this.api}
        .camera=${this.editing}
        .capabilityKeys=${this.snapshot.capability_keys}
        .available=${this.available}
        .views=${this.snapshot.views}
        .allCameras=${this.snapshot.cameras}
        @reordered=${() => this.refresh()}
        @saved=${() => {
          this.adding = false;
          this.editing = undefined;
          void this.refresh();
        }}
        @cancelled=${() => {
          this.adding = false;
          this.editing = undefined;
        }}
      ></kustos-vision-camera-editor>`;
    }

    return html`
      <div class="card">
        <h2>Kameras</h2>
        ${this.snapshot.cameras.length === 0
          ? html`<p class="hint">
              Noch keine Kamera eingerichtet. kustos_vision schlägt beim Hinzufügen
              vor, welche Streams und Bedienelemente zum Gerät gehören.
            </p>`
          : html`<table>
              <tr>
                <th>Name</th>
                <th>Streams</th>
                <th>Aufbewahrung</th>
                <th>Belegt</th>
                <th>Status</th>
                <th></th>
              </tr>
              ${this.snapshot.cameras.map((camera) => this.renderCameraRow(camera))}
            </table>`}
        <div class="row" style="margin-top:16px">
          <button ?disabled=${this.busy} @click=${this.startAdding}>
            Kamera hinzufügen
          </button>
        </div>
      </div>
    `;
  }

  private renderCameraRow(camera: Camera) {
    const recorded = camera.streams.filter((s) => s.record).length;
    const failing = camera.state.streams.filter((s) => !s.running);
    return html`
      <tr>
        <td>${camera.name}</td>
        <td class="muted">${recorded} von ${camera.streams.length}</td>
        <td class="muted">
          ${camera.retention_days === null ? "unbegrenzt" : `${camera.retention_days} Tage`}
        </td>
        <td class="muted">${formatBytes(camera.state.used_bytes)}</td>
        <td>${this.renderRecordingState(camera, failing)}</td>
        <td>
          <div class="row">
            <button
              class="secondary"
              @click=${async () => {
                this.available = (await this.api.availableCameras()).cameras;
                this.editing = camera;
              }}
            >
              Bearbeiten
            </button>
            <button
              class="danger"
              ?disabled=${this.busy}
              @click=${() => this.confirmDelete(camera)}
            >
              Entfernen
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  /** Three states, not two: a camera that is not meant to record is not the
   *  same as one that is meant to and cannot. */
  private renderRecordingState(camera: Camera, failing: StreamState[]) {
    if (!camera.enabled) {
      return html`<span class="muted">deaktiviert</span>`;
    }
    if (!camera.state.wants_recording) {
      return html`<span class="muted">keine Aufzeichnung</span>`;
    }
    if (camera.state.paused) {
      return html`<span class="muted">pausiert</span>`;
    }
    if (camera.state.recording) {
      return html`<span>zeichnet auf</span>`;
    }
    const reason = failing[0]?.last_error;
    return html`<span class="error"
      >steht${reason ? html` (${reason})` : nothing}</span
    >`;
  }

  private confirmDelete(camera: Camera): void {
    // The recordings survive on purpose: removing a camera by accident must
    // not be the same as deleting its history.
    const ok = confirm(
      `${camera.name} entfernen? Die bereits vorhandenen Aufnahmen bleiben erhalten.`,
    );
    if (ok) void this.run(() => this.api.deleteCamera(camera.slug));
  }

  // ------------------------------------------------------------------
  // Vision
  // ------------------------------------------------------------------

  private renderVision() {
    if (this.visionFor) {
      return html`${this.renderSubpageHeader(
        `Bilderkennung für ${this.visionFor.name}`,
        () => (this.visionFor = undefined),
      )}
      <kustos-vision-vision-editor
        .api=${this.api}
        .hass=${this.hass}
        .camera=${this.visionFor}
        .profile=${this.snapshot.vision.find(
          (p) => p.camera_slug === this.visionFor!.slug,
        )}
        @saved=${() => {
          this.visionFor = undefined;
          void this.refresh();
        }}
        @cancelled=${() => (this.visionFor = undefined)}
      ></kustos-vision-vision-editor>`;
    }

    return html`
      <div class="card">
        <h2>Bilderkennung</h2>
        <p class="hint">
          Ein Standbild wird an ein Modell Ihrer Wahl geschickt, sobald ein
          Auslöser meldet. Aus jeder Frage wird ein Sensor, den Automationen
          und Dashboards wie jeden anderen nutzen können. kustos_vision selbst
          erkennt nichts; die Arbeit macht das Modell.
        </p>
        ${this.snapshot.cameras.length === 0
          ? html`<p class="hint">Erst eine Kamera einrichten.</p>`
          : html`<table>
              <tr>
                <th>Kamera</th>
                <th>Fragen</th>
                <th>Heute</th>
                <th>Zustand</th>
                <th></th>
              </tr>
              ${this.snapshot.cameras.map((camera) => this.renderVisionRow(camera))}
            </table>`}
      </div>
    `;
  }

  private renderVisionRow(camera: Camera) {
    const profile = this.snapshot.vision.find((p) => p.camera_slug === camera.slug);
    return html`
      <tr>
        <td>${camera.name}</td>
        <td class="muted">${profile ? profile.observations.length : "-"}</td>
        <td class="muted">
          ${profile
            ? `${profile.state.analyses_today} / ${profile.daily_budget}`
            : "-"}
        </td>
        <td>
          ${!profile
            ? html`<span class="muted">nicht eingerichtet</span>`
            : profile.state.last_error
              ? html`<span class="error">${profile.state.last_error}</span>`
              : !profile.enabled
                ? html`<span class="muted">aus</span>`
                : profile.state.last_run
                  ? html`<span class="muted"
                      >zuletzt ${new Date(profile.state.last_run).toLocaleString()}</span
                    >`
                  : html`<span class="muted">noch keine Analyse</span>`}
        </td>
        <td>
          <button class="secondary" @click=${() => (this.visionFor = camera)}>
            ${profile ? "Bearbeiten" : "Einrichten"}
          </button>
        </td>
      </tr>
    `;
  }

  // ------------------------------------------------------------------
  // Storage
  // ------------------------------------------------------------------

  private renderStorage() {
    const { storage, totals } = this.snapshot;
    const budgetGb =
      storage.max_total_bytes === null ? "" : String(storage.max_total_bytes / GIGABYTE);

    return html`
      <div class="card">
        <h2>Speicher</h2>
        <table>
          <tr>
            <th>Belegt</th>
            <td>${formatBytes(totals.used_bytes)}</td>
          </tr>
          <tr>
            <th>Frei am Ort</th>
            <td>${formatBytes(totals.free_bytes)}</td>
          </tr>
        </table>

        <label>Ort</label>
        <input id="base_path" .value=${storage.base_path} />
        <p class="hint">
          Ein Wechsel verschiebt und löscht nichts: die bereits vorhandenen
          Aufnahmen bleiben unangetastet liegen, nur neue landen am neuen Ort.
          Wenn Sie die alten Aufnahmen behalten möchten, kopieren Sie den
          bisherigen Ordner vorher an die neue Stelle; sie werden dort wieder
          erkannt. Der Ordner muss beschreibbar sein, bei einem Netzlaufwerk
          also eingebunden.
        </p>

        ${totals.over_budget_bytes > 0
          ? html`<p class="error">
              ${formatBytes(totals.over_budget_bytes)} über dem Budget, und mehr
              lässt sich nicht löschen. Das Budget ist kleiner als das, was die
              Kameras zwischen zwei Aufräumläufen schreiben.
            </p>`
          : nothing}

        <h3>Grenzen</h3>
        <div class="row">
          <div class="grow">
            <label>Segmentlänge in Sekunden</label>
            <input
              id="segment"
              type="number"
              min="1"
              .value=${String(storage.segment_seconds)}
            />
          </div>
          <div class="grow">
            <label>Gesamtbudget in GB (leer = automatisch)</label>
            <input id="budget" type="number" min="0" step="0.1" .value=${budgetGb} />
          </div>
        </div>
        <p class="hint">
          Kürzere Segmente lassen die Aufbewahrung feiner arbeiten, erzeugen aber
          mehr Dateien. Das Budget gilt über alle Kameras zusammen; ist es
          überschritten, fällt jeweils die global älteste Aufnahme.
        </p>
        <p class="hint">
          Bleibt das Budget leer, heißt das nicht „unbegrenzt": es gilt dann
          automatisch der Platz, der am Speicherort tatsächlich vorhanden ist,
          abzüglich einer Reserve. Die Aufzeichnung läuft also weiter und
          überschreibt die ältesten Aufnahmen, statt irgendwann an einer vollen
          Platte stehenzubleiben. Ein selbst gesetztes Budget kann diesen Platz
          nicht überschreiten.
        </p>
        <button ?disabled=${this.busy} @click=${this.saveStorage}>Speichern</button>
      </div>
    `;
  }

  private saveStorage(): void {
    const root = this.renderRoot;
    const segment = Number(
      (root.querySelector("#segment") as HTMLInputElement).value,
    );
    const budgetRaw = (root.querySelector("#budget") as HTMLInputElement).value;
    const path = (root.querySelector("#base_path") as HTMLInputElement).value.trim();

    if (path !== this.snapshot.storage.base_path) {
      const ok = confirm(
        `Aufnahmen künftig unter ${path} ablegen?\n\n` +
          `Was bereits unter ${this.snapshot.storage.base_path} liegt, bleibt ` +
          `unverändert dort und verschwindet aus der Übersicht, bis Sie es an ` +
          `den neuen Ort kopieren.`,
      );
      if (!ok) return;
    }

    void this.run(() =>
      this.api.setStorage({
        base_path: path,
        segment_seconds: segment,
        max_total_bytes:
          budgetRaw === "" ? null : Math.round(Number(budgetRaw) * GIGABYTE),
      }),
    );
  }

  // ------------------------------------------------------------------
  // Views
  // ------------------------------------------------------------------

  private renderViews() {
    const views = this.snapshot.views;
    return html`
      <div class="card">
        <h2>Ansichten</h2>
        <p class="hint">
          Jede Ansicht wird zu einem eigenen Reiter. Welche Kameras darin
          erscheinen, legen Sie bei der jeweiligen Kamera fest, zusammen mit
          dem Stream und den Bedienelementen für genau diese Ansicht. Eine neue
          Ansicht startet deshalb leer.
        </p>
        ${views.length === 0
          ? html`<p class="hint">Noch keine Ansicht angelegt.</p>`
          : views.map((view, index) => this.renderViewRow(view, index))}
        <div class="row" style="margin-top:16px">
          <button ?disabled=${this.busy} @click=${this.addView}>
            Ansicht hinzufügen
          </button>
        </div>
      </div>
    `;
  }

  private renderViewRow(view: View, index: number) {
    return html`
      <div class="divided">
        <div class="row">
          <div class="grow">
            <label>Name</label>
            <input
              .value=${view.name}
              @change=${(e: Event) =>
                this.patchView(index, { name: (e.target as HTMLInputElement).value })}
            />
          </div>
          <div class="grow">
            <label>Spalten (0 = automatisch)</label>
            <input
              type="number"
              min="0"
              .value=${String(view.columns)}
              @change=${(e: Event) =>
                this.patchView(index, {
                  columns: Number((e.target as HTMLInputElement).value),
                })}
            />
          </div>
        </div>
        <p class="hint">
          ${view.cameras.length === 0
            ? html`Dieser Ansicht ist noch keine Kamera zugeordnet.`
            : html`Zeigt:
                ${view.cameras
                  .map(
                    (slug) =>
                      this.snapshot.cameras.find((c) => c.slug === slug)?.name ??
                      slug,
                  )
                  .join(", ")}`}
          Welche Kamera hier erscheint, und mit welchem Stream und welchen
          Bedienelementen, wird bei der jeweiligen Kamera festgelegt.
        </p>
        <div class="row" style="margin-top:8px">
          <button
            class="secondary"
            ?disabled=${index === 0}
            @click=${() => this.moveView(index, -1)}
          >
            nach oben
          </button>
          <button
            class="secondary"
            ?disabled=${index === this.snapshot.views.length - 1}
            @click=${() => this.moveView(index, 1)}
          >
            nach unten
          </button>
          <button class="danger" @click=${() => this.removeView(index)}>
            Entfernen
          </button>
        </div>
      </div>
    `;
  }

  private saveViews(views: View[]): void {
    // Membership is resolved by the backend and read-only here.
    void this.run(() =>
      this.api.setViews(
        views.map(({ cameras: _cameras, ...rest }) => rest),
      ),
    );
  }

  private patchView(index: number, patch: Partial<View>): void {
    this.saveViews(
      this.snapshot.views.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
  }

  private moveView(index: number, delta: number): void {
    const views = [...this.snapshot.views];
    const [moved] = views.splice(index, 1);
    views.splice(index + delta, 0, moved);
    this.saveViews(views);
  }

  private removeView(index: number): void {
    this.saveViews(this.snapshot.views.filter((_, i) => i !== index));
  }

  private addView(): void {
    const used = new Set(this.snapshot.views.map((v) => v.id));
    let n = this.snapshot.views.length + 1;
    while (used.has(`ansicht_${n}`)) n += 1;
    this.saveViews([
      ...this.snapshot.views,
      {
        id: `ansicht_${n}`,
        name: `Ansicht ${n}`,
        cameras: [],
        icon: "mdi:cctv",
        columns: 0,
      },
    ]);
  }

  // ------------------------------------------------------------------
  // System
  // ------------------------------------------------------------------

  private renderSystem() {
    const { maintenance, cameras } = this.snapshot;
    return html`
      <div class="card">
        <h2>System</h2>
        <table>
          <tr>
            <th>Letzter Aufräumlauf</th>
            <td class="muted">
              ${maintenance.indexed} indiziert, ${maintenance.thumbnails} Vorschaubilder,
              ${maintenance.deleted} gelöscht
            </td>
          </tr>
          ${maintenance.error
            ? html`<tr>
                <th>Fehler</th>
                <td class="error">${maintenance.error}</td>
              </tr>`
            : nothing}
        </table>

        <h3>Streams</h3>
        ${cameras.length === 0
          ? html`<p class="hint">Keine Kameras eingerichtet.</p>`
          : html`<table>
              <tr>
                <th>Stream</th>
                <th>Läuft</th>
                <th>Neustarts</th>
                <th>Zuletzt gemeldet</th>
              </tr>
              ${cameras.flatMap((camera) =>
                camera.state.streams.map(
                  (stream) => html`
                    <tr>
                      <td>${camera.name} / ${stream.stream_key}</td>
                      <td>${stream.running ? "ja" : "nein"}</td>
                      <td>${stream.restarts}</td>
                      <td class="muted">${stream.last_error ?? "-"}</td>
                    </tr>
                  `,
                ),
              )}
            </table>`}

        <h3>Index</h3>
        <p class="hint">
          Der Index ist ein Verzeichnis über die vorhandenen Aufnahmen. Ihn neu
          aufzubauen ist immer gefahrlos: er kann dabei nur wieder mit den
          Dateien in Übereinstimmung gebracht werden.
        </p>
        <button
          class="secondary"
          ?disabled=${this.busy}
          @click=${() => this.run(() => this.api.rebuildIndex())}
        >
          Index neu aufbauen
        </button>
      </div>
    `;
  }

  // ------------------------------------------------------------------

  override render() {
    return html`
      <div style="padding:16px">
        <div class="subtabs" role="tablist">
          ${SECTIONS.map(
            ([id, label]) => html`
              <button
                role="tab"
                aria-selected=${this.section === id ? "true" : "false"}
                class=${this.section === id ? "active" : ""}
                @click=${() => {
                  this.section = id;
                  this.adding = false;
                  this.editing = undefined;
                  this.visionFor = undefined;
                }}
              >
                ${label}
              </button>
            `,
          )}
        </div>
        ${this.error ? html`<p class="error">${this.error}</p>` : nothing}
        ${this.section === "cameras"
          ? this.renderCameras()
          : this.section === "vision"
            ? this.renderVision()
            : this.section === "storage"
            ? this.renderStorage()
            : this.section === "views"
              ? this.renderViews()
              : this.renderSystem()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kustos-vision-settings": CamwatchSettings;
  }
}
