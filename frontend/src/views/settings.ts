// Everything that can be configured, in one place.
//
// The config flow deliberately only asks where recordings go; everything else
// lives here, so there is one place to look for a setting rather than two that
// can disagree.

import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { errorText, formatBytes, type CamwatchApi } from "../api";
import {
  guardNavigation,
  registerUnsavedWork,
  unregisterUnsavedWork,
  type UnsavedWork,
} from "../dirty";
import { dropIndexAt, edgeAutoscroll, scrollParentOf } from "../drag";
import { FlipList } from "../flip";
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
  /** Edits to the view list that are not stored yet, see renderViews. */
  @state() private viewsDraft?: View[];
  /** A view row travelling with the pointer, see onViewDragStart. */
  @state() private viewDrag?: { fromIndex: number; currentIndex: number };

  static override styles = shared;

  /** Plays the glide when the view list reorders under a drag. */
  private readonly viewFlip = new FlipList();

  private viewRows(): NodeListOf<Element> {
    return this.renderRoot.querySelectorAll(".view-row");
  }

  override updated(): void {
    this.viewFlip.play(this.viewRows());
  }

  /** The unsaved work this page itself holds: the view-list draft and the
      storage fields. The editors it opens register on their own. */
  private readonly unsavedSections: UnsavedWork = {
    isDirty: () => this.viewsDirty() || this.storageDirty(),
    save: async () => {
      if (this.viewsDirty() && !(await this.commitViews())) return false;
      if (this.storageDirty() && !(await this.saveStorage())) return false;
      return true;
    },
    discard: () => {
      this.viewsDraft = undefined;
      this.resetStorageInputs();
    },
  };

  override connectedCallback(): void {
    super.connectedCallback();
    registerUnsavedWork(this.unsavedSections);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    unregisterUnsavedWork(this.unsavedSections);
  }

  private async refresh(): Promise<void> {
    this.dispatchEvent(new CustomEvent("changed", { bubbles: true, composed: true }));
  }

  private async run(work: () => Promise<unknown>): Promise<boolean> {
    this.busy = true;
    this.error = "";
    try {
      await work();
      await this.refresh();
      return true;
    } catch (err) {
      this.error = errorText(err);
      return false;
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
        async () => {
          if (!(await guardNavigation())) return;
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
          : html`<div class="table-stack">
              <table>
                <tr class="head">
                  <th>Name</th>
                  <th>Streams</th>
                  <th>Aufbewahrung</th>
                  <th>Belegt</th>
                  <th>Status</th>
                  <th></th>
                </tr>
                ${this.snapshot.cameras.map((camera) =>
                  this.renderCameraRow(camera),
                )}
              </table>
            </div>`}
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
        <td class="muted" data-label="Streams">
          ${recorded} von ${camera.streams.length}
        </td>
        <td class="muted" data-label="Aufbewahrung">
          ${camera.retention_days === null ? "unbegrenzt" : `${camera.retention_days} Tage`}
        </td>
        <td class="muted" data-label="Belegt">
          ${formatBytes(camera.state.used_bytes)}
        </td>
        <td data-label="Status">${this.renderRecordingState(camera, failing)}</td>
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
        async () => {
          if (!(await guardNavigation())) return;
          this.visionFor = undefined;
        },
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
          : html`<div class="table-stack">
              <table>
                <tr class="head">
                  <th>Kamera</th>
                  <th>Fragen</th>
                  <th>Heute</th>
                  <th>Zustand</th>
                  <th></th>
                </tr>
                ${this.snapshot.cameras.map((camera) =>
                  this.renderVisionRow(camera),
                )}
              </table>
            </div>`}
      </div>
    `;
  }

  private renderVisionRow(camera: Camera) {
    const profile = this.snapshot.vision.find((p) => p.camera_slug === camera.slug);
    return html`
      <tr>
        <td>${camera.name}</td>
        <td class="muted" data-label="Fragen">
          ${profile ? profile.observations.length : "-"}
        </td>
        <td class="muted" data-label="Heute">
          ${profile
            ? `${profile.state.analyses_today} / ${profile.daily_budget}`
            : "-"}
        </td>
        <td data-label="Zustand">
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
        <div class="fields">
          <div>
            <label>Segmentlänge in Sekunden</label>
            <input
              id="segment"
              type="number"
              min="1"
              .value=${String(storage.segment_seconds)}
            />
          </div>
          <div>
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

  private storageInput(id: string): HTMLInputElement | null {
    return this.renderRoot.querySelector(`#${id}`);
  }

  /** Whether the storage fields differ from what is stored. False whenever
      the section is not on screen, because then nothing can have changed. */
  private storageDirty(): boolean {
    const path = this.storageInput("base_path");
    const segment = this.storageInput("segment");
    const budget = this.storageInput("budget");
    if (!path || !segment || !budget) return false;
    const { storage } = this.snapshot;
    const budgetNow =
      storage.max_total_bytes === null ? null : storage.max_total_bytes / GIGABYTE;
    const budgetTyped = budget.value.trim() === "" ? null : Number(budget.value);
    return (
      path.value.trim() !== storage.base_path ||
      Number(segment.value) !== storage.segment_seconds ||
      budgetTyped !== budgetNow
    );
  }

  private resetStorageInputs(): void {
    const { storage } = this.snapshot;
    const path = this.storageInput("base_path");
    if (path) path.value = storage.base_path;
    const segment = this.storageInput("segment");
    if (segment) segment.value = String(storage.segment_seconds);
    const budget = this.storageInput("budget");
    if (budget) {
      budget.value =
        storage.max_total_bytes === null
          ? ""
          : String(storage.max_total_bytes / GIGABYTE);
    }
  }

  private async saveStorage(): Promise<boolean> {
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
      if (!ok) return false;
    }

    return this.run(() =>
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

  /** The view list as currently edited; the draft until it is stored. */
  private draftViews(): View[] {
    return this.viewsDraft ?? this.snapshot.views;
  }

  private viewsDirty(): boolean {
    if (!this.viewsDraft) return false;
    const strip = (views: View[]) =>
      views.map(({ cameras: _cameras, ...rest }) => rest);
    return (
      JSON.stringify(strip(this.viewsDraft)) !==
      JSON.stringify(strip(this.snapshot.views))
    );
  }

  private async commitViews(): Promise<boolean> {
    const draft = this.viewsDraft;
    if (!draft) return true;
    const ok = await this.run(() =>
      this.api.setViews(draft.map(({ cameras: _cameras, ...rest }) => rest)),
    );
    if (ok) this.viewsDraft = undefined;
    return ok;
  }

  private renderViews() {
    const views = this.viewsWithPreview();
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
          : repeat(
              views,
              (view) => view.id,
              (view, index) => this.renderViewRow(view, index),
            )}
        <div class="row" style="margin-top:16px">
          <button
            ?disabled=${this.busy || !this.viewsDirty()}
            @click=${() => void this.commitViews()}
          >
            Speichern
          </button>
          <button class="secondary" ?disabled=${this.busy} @click=${this.addView}>
            Ansicht hinzufügen
          </button>
          ${this.viewsDirty()
            ? html`<button
                class="secondary"
                @click=${() => (this.viewsDraft = undefined)}
              >
                Verwerfen
              </button>`
            : nothing}
        </div>
      </div>
    `;
  }

  private renderViewRow(view: View, index: number) {
    return html`
      <div
        class="divided view-row ${this.viewDrag?.currentIndex === index
          ? "dragging-lift"
          : ""}"
        data-key=${view.id}
      >
        <div class="fields">
          <div>
            <label>Name</label>
            <input
              .value=${view.name}
              @change=${(e: Event) =>
                this.patchView(index, { name: (e.target as HTMLInputElement).value })}
            />
          </div>
          <div>
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
          <button class="danger" @click=${() => this.removeView(index)}>
            Entfernen
          </button>
          <span class="spacer"></span>
          <span
            class="drag-handle"
            role="button"
            aria-label="Ziehen zum Verschieben"
            title="Ziehen zum Verschieben"
            @pointerdown=${(e: PointerEvent) => this.onViewDragStart(index, e)}
            @pointermove=${(e: PointerEvent) => this.onViewDragMove(e)}
            @pointerup=${() => this.onViewDragEnd()}
            @pointercancel=${() => (this.viewDrag = undefined)}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M4 9h16v2H4zM4 13h16v2H4z" />
            </svg>
          </span>
        </div>
      </div>
    `;
  }

  // Every edit lands in the draft; only the Speichern button stores it.
  // Storing on every change meant a click on another tab quietly saved,
  // because leaving the field fires its change event first.

  private patchView(index: number, patch: Partial<View>): void {
    this.viewsDraft = this.draftViews().map((v, i) =>
      i === index ? { ...v, ...patch } : v,
    );
  }

  private removeView(index: number): void {
    this.viewsDraft = this.draftViews().filter((_, i) => i !== index);
  }

  /** The list as shown: the draft, rearranged live while a row is dragged. */
  private viewsWithPreview(): View[] {
    const views = [...this.draftViews()];
    const drag = this.viewDrag;
    if (!drag) return views;
    const [moved] = views.splice(drag.fromIndex, 1);
    views.splice(drag.currentIndex, 0, moved);
    return views;
  }

  private onViewDragStart(index: number, event: PointerEvent): void {
    if (this.busy) return;
    const handle = event.currentTarget as HTMLElement;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    this.viewDrag = { fromIndex: index, currentIndex: index };
  }

  private onViewDragMove(event: PointerEvent): void {
    const drag = this.viewDrag;
    if (!drag) return;
    // View rows are not the same height - their hints wrap differently -
    // so the drop position comes from the actual row rectangles.
    const rects = Array.from(this.viewRows(), (row) =>
      row.getBoundingClientRect(),
    );
    const index = dropIndexAt(rects, event.clientY, drag.currentIndex);
    const scroller = scrollParentOf(this);
    if (scroller) edgeAutoscroll(scroller, event.clientY);
    if (index !== drag.currentIndex) {
      // Remember where every row sits, so the re-render can glide them.
      this.viewFlip.snapshot(this.viewRows());
      this.viewDrag = { ...drag, currentIndex: index };
    }
  }

  private onViewDragEnd(): void {
    const drag = this.viewDrag;
    this.viewDrag = undefined;
    if (!drag || drag.fromIndex === drag.currentIndex) return;
    // Into the draft, not into storage: the order is saved with the rest
    // of the list when Speichern is pressed.
    const views = [...this.draftViews()];
    const [moved] = views.splice(drag.fromIndex, 1);
    views.splice(drag.currentIndex, 0, moved);
    this.viewsDraft = views;
  }

  private addView(): void {
    const views = this.draftViews();
    const used = new Set(views.map((v) => v.id));
    let n = views.length + 1;
    while (used.has(`ansicht_${n}`)) n += 1;
    this.viewsDraft = [
      ...views,
      {
        id: `ansicht_${n}`,
        name: `Ansicht ${n}`,
        cameras: [],
        icon: "mdi:cctv",
        columns: 0,
      },
    ];
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
          : html`<div class="table-stack">
              <table>
                <tr class="head">
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
                        <td data-label="Läuft">
                          ${stream.running ? "ja" : "nein"}
                        </td>
                        <td data-label="Neustarts">${stream.restarts}</td>
                        <td class="muted" data-label="Zuletzt gemeldet">
                          ${stream.last_error ?? "-"}
                        </td>
                      </tr>
                    `,
                  ),
                )}
              </table>
            </div>`}

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
                @click=${async () => {
                  if (this.section === id) return;
                  if (!(await guardNavigation())) return;
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
