// Adding and editing a camera.
//
// Adding starts from a Home Assistant camera entity, and kustos_vision proposes the
// rest: the other streams of the same device, and which of its entities drive
// pan, tilt, light and so on. Every proposal is editable, because the proposal
// is a heuristic and the assignment is the truth.

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { errorText, type CamwatchApi } from "../api";
import type {
  AvailableCamera,
  CameraViewSettings,
  ControlKind,
  CustomControl,
  CapabilityBinding,
  Camera,
  StreamConfig,
  Suggestion,
  View,
} from "../types";
import { capabilityLabel, KIND_LABELS, kindsForEntity } from "../capabilities";
import "../components/select";
import {
  guardNavigation,
  registerUnsavedWork,
  unregisterUnsavedWork,
  type UnsavedWork,
} from "../dirty";
import { FlipList } from "../flip";
import { shared } from "../styles";

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  // The slug becomes a directory name, so it has to start with a letter or
  // digit and cannot be empty.
  return /^[a-z0-9]/.test(slug) ? slug : `kamera_${slug}`;
}

@customElement("kustos-vision-camera-editor")
export class CamwatchCameraEditor extends LitElement {
  @property({ attribute: false }) api!: CamwatchApi;
  @property({ attribute: false }) camera?: Camera;
  @property({ attribute: false }) capabilityKeys: string[] = [];
  @property({ attribute: false }) available: AvailableCamera[] = [];
  @property({ attribute: false }) views: View[] = [];
  @property({ attribute: false }) allCameras: Camera[] = [];

  @state() private slug = "";
  @state() private name = "";
  @state() private streams: StreamConfig[] = [];
  @state() private capabilities: Record<string, CapabilityBinding> = {};
  @state() private retentionDays: number | null = null;
  @state() private enabled = true;
  @state() private viewSettings: Record<string, CameraViewSettings> = {};
  @state() private controls: CustomControl[] = [];
  @state() private candidates: { entity_id: string; name: string }[] = [];
  @state() private busy = false;
  @state() private error = "";

  static override styles = [
    shared,
    css`
      .member-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 6px 12px;
        border-bottom: 1px solid var(--divider-color, ButtonBorder);
      }
    `,
  ];

  /** Plays the glide when the member list reorders under a drag. */
  private readonly memberFlip = new FlipList();

  private memberRows(): NodeListOf<Element> {
    return this.renderRoot.querySelectorAll(".member-row");
  }

  override updated(): void {
    this.memberFlip.play(this.memberRows());
  }

  /** The saved state this editor started from, for spotting unsaved work. */
  private baseline = "";

  private readonly unsaved: UnsavedWork = {
    isDirty: () => JSON.stringify(this.payload()) !== this.baseline,
    save: () => this.save(),
    // Nothing to restore: leaving unmounts the editor and its drafts.
    discard: () => {},
  };

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.camera) {
      this.slug = this.camera.slug;
      this.name = this.camera.name;
      this.streams = this.camera.streams.map((s) => ({ ...s }));
      this.capabilities = structuredClone(this.camera.capabilities);
      this.retentionDays = this.camera.retention_days;
      this.enabled = this.camera.enabled;
      this.viewSettings = structuredClone(this.camera.view_settings ?? {});
      this.controls = structuredClone(this.camera.controls ?? []);
      // The candidate list is what custom controls are built from, and
      // editing starts without one. Fetch it from this camera's own
      // device so the section works straight away.
      void this.loadCandidates();
    }
    this.baseline = JSON.stringify(this.payload());
    registerUnsavedWork(this.unsaved);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    unregisterUnsavedWork(this.unsaved);
  }

  /** Fetch the sibling entities of this camera's device, without changing
   *  anything about the camera itself. */
  private async loadCandidates(): Promise<void> {
    const first = this.streams[0]?.entity_id;
    if (!first) return;
    try {
      this.candidates = (await this.api.suggest(first)).candidates;
    } catch {
      // Not fatal: the section simply stays empty and says so.
      this.candidates = [];
    }
  }

  private async pick(entityId: string): Promise<void> {
    if (!entityId) return;
    this.busy = true;
    this.error = "";
    try {
      const suggestion: Suggestion = await this.api.suggest(entityId);
      // Editing keeps the identifier and the name: the identifier is the
      // recording folder and changing it would strand everything recorded so
      // far, and the name is the user's, not the device's. Only what the
      // camera actually is gets replaced.
      if (!this.camera) {
        this.name = suggestion.name;
        this.slug = slugify(suggestion.name);
      }
      this.streams = suggestion.streams.map((s) => ({
        key: s.key,
        entity_id: s.entity_id,
        // Only one stream is recorded by default. Recording every stream of
        // every camera on the first save would be a surprising amount of disk.
        record: s.key === "sd" || suggestion.streams.length === 1,
        audio: "transcode",
      }));
      this.capabilities = Object.fromEntries(
        Object.entries(suggestion.capabilities).map(([key, entity]) => [
          key,
          { entity_id: entity },
        ]),
      );
      this.candidates = suggestion.candidates;
    } catch (err) {
      this.error = errorText(err);
    } finally {
      this.busy = false;
    }
  }

  private updateStream(index: number, patch: Partial<StreamConfig>): void {
    this.streams = this.streams.map((s, i) =>
      i === index ? { ...s, ...patch } : s,
    );
  }

  private setCapability(key: string, entityId: string): void {
    const next = { ...this.capabilities };
    if (entityId) next[key] = { entity_id: entityId };
    else delete next[key];
    this.capabilities = next;
  }

  /** What save() sends, and the yardstick unsaved work is measured by. */
  private payload() {
    return {
      slug: this.slug,
      name: this.name,
      streams: this.streams,
      capabilities: this.capabilities,
      retention_days: this.retentionDays,
      enabled: this.enabled,
      area_id: this.camera?.area_id ?? null,
      view_settings: this.viewSettings,
      controls: this.controls,
    };
  }

  private async save(): Promise<boolean> {
    this.busy = true;
    this.error = "";
    try {
      await this.api.setCamera(
        this.payload(),
        // Editing an existing camera is the only case allowed to replace one.
        this.camera !== undefined,
      );
      this.baseline = JSON.stringify(this.payload());
      this.dispatchEvent(new CustomEvent("saved", { bubbles: true, composed: true }));
      return true;
    } catch (err) {
      this.error = errorText(err);
      return false;
    } finally {
      this.busy = false;
    }
  }

  private patchView(viewId: string, patch: Partial<CameraViewSettings>): void {
    // A membership created here starts behind every camera the view already
    // has, which is where the member list below shows it. Seeding position 0
    // instead sent the camera to the front of the view on save, no matter
    // where the person had just put it.
    const behindOthers =
      this.views
        .find((v) => v.id === viewId)
        ?.cameras.filter((slug) => slug !== this.slug).length ?? 0;
    const current = this.viewSettings[viewId] ?? {
      visible: false,
      position: behindOthers,
    };
    this.viewSettings = { ...this.viewSettings, [viewId]: { ...current, ...patch } };
  }

  /** Cameras currently in a view, in display order, including this one. */
  private membersOf(view: View): { slug: string; name: string }[] {
    const others = view.cameras
      .filter((slug) => slug !== this.slug)
      .map((slug) => ({
        slug,
        name: this.allCameras.find((c) => c.slug === slug)?.name ?? slug,
      }));
    const mine = this.viewSettings[view.id]?.visible;
    if (!mine) return others;
    if (view.cameras.includes(this.slug)) {
      return view.cameras.map((slug) => ({
        slug,
        name:
          slug === this.slug
            ? this.name || this.slug
            : (this.allCameras.find((c) => c.slug === slug)?.name ?? slug),
      }));
    }
    // Newly ticked and not saved yet, so the backend has not placed it.
    return [...others, { slug: this.slug, name: this.name || this.slug }];
  }

  private async applyOrder(view: View, order: string[]): Promise<void> {
    this.busy = true;
    this.error = "";
    try {
      await this.api.setViewOrder(view.id, order);
      // The local copy has to follow. Saving the camera writes its whole
      // view_settings back, so a position left at its opening value would
      // overwrite the order just stored and the camera jumped to wherever
      // the stale number said, usually the front.
      const position = order.indexOf(this.slug);
      if (position >= 0 && this.viewSettings[view.id]) {
        this.patchView(view.id, { position });
        // The order is stored on the spot, so the new position is part of
        // the saved state, never of the unsaved work.
        const base = JSON.parse(this.baseline) as {
          view_settings?: Record<string, { position?: number }>;
        };
        if (base.view_settings?.[view.id]) {
          base.view_settings[view.id].position = position;
          this.baseline = JSON.stringify(base);
        }
      }
      this.dispatchEvent(
        new CustomEvent("reordered", { bubbles: true, composed: true }),
      );
    } catch (err) {
      this.error = errorText(err);
    } finally {
      this.busy = false;
    }
  }

  /**
   * Sorting by pointer, the way Home Assistant's drag grips behave.
   *
   * Rows are the same height, so the drop position follows from how many
   * row heights the pointer has travelled; the height is measured from the
   * grabbed row, never assumed. The move is previewed while dragging and
   * stored once on release, through the same path the arrow buttons used.
   */
  private dragging?: {
    viewId: string;
    slug: string;
    startIndex: number;
    currentIndex: number;
    startY: number;
    rowHeight: number;
    order: string[];
  };

  private onDragStart(view: View, index: number, event: PointerEvent): void {
    if (this.busy || !this.camera) return;
    const handle = event.currentTarget as HTMLElement;
    const row = handle.closest(".member-row");
    if (!row) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    const order = this.membersOf(view).map((m) => m.slug);
    this.dragging = {
      viewId: view.id,
      slug: order[index],
      startIndex: index,
      currentIndex: index,
      startY: event.clientY,
      rowHeight: row.getBoundingClientRect().height,
      order,
    };
    this.requestUpdate();
  }

  private onDragMove(event: PointerEvent): void {
    const drag = this.dragging;
    if (!drag || drag.rowHeight <= 0) return;
    const travelled = Math.round((event.clientY - drag.startY) / drag.rowHeight);
    const index = Math.min(
      Math.max(drag.startIndex + travelled, 0),
      drag.order.length - 1,
    );
    if (index !== drag.currentIndex) {
      // Remember where every row sits, so the re-render can glide them.
      this.memberFlip.snapshot(this.memberRows());
      this.dragging = { ...drag, currentIndex: index };
      this.requestUpdate();
    }
  }

  private async onDragEnd(view: View): Promise<void> {
    const drag = this.dragging;
    this.dragging = undefined;
    this.requestUpdate();
    if (!drag || drag.currentIndex === drag.startIndex) return;
    await this.applyOrder(view, this.orderedSlugs(drag));
  }

  private orderedSlugs(drag: NonNullable<typeof this.dragging>): string[] {
    const order = [...drag.order];
    const [moved] = order.splice(drag.startIndex, 1);
    order.splice(drag.currentIndex, 0, moved);
    return order;
  }

  /** The member list, rearranged live while a row is being dragged. */
  private orderedMembers(view: View): { slug: string; name: string }[] {
    const members = this.membersOf(view);
    const drag = this.dragging;
    if (!drag || drag.viewId !== view.id) return members;
    const bySlug = new Map(members.map((m) => [m.slug, m]));
    return this.orderedSlugs(drag)
      .map((slug) => bySlug.get(slug))
      .filter((m): m is { slug: string; name: string } => m !== undefined);
  }

  private patchControl(index: number, patch: Partial<CustomControl>): void {
    this.controls = this.controls.map((c, i) =>
      i === index ? { ...c, ...patch } : c,
    );
  }

  private addControl(): void {
    let n = this.controls.length + 1;
    const used = new Set([
      ...this.controls.map((c) => c.key),
      ...Object.keys(this.capabilities),
    ]);
    while (used.has(`bedienelement_${n}`)) n += 1;
    this.controls = [
      ...this.controls,
      {
        key: `bedienelement_${n}`,
        name: "",
        kind: "button",
        binding: { entity_id: "" },
      },
    ];
  }

  /** Why saving is blocked, or undefined when it is not. */
  private get incompleteControl(): string | undefined {
    for (const control of this.controls) {
      if (!control.binding.entity_id && !control.binding.action) {
        return `Bedienelement "${control.name || control.key}" hat keine Entity`;
      }
      if (!control.name.trim()) {
        return `Ein Bedienelement hat keine Beschriftung`;
      }
    }
    return undefined;
  }

  private renderControlRow(control: CustomControl, index: number) {
    // Only what this entity can actually do. Offering the rest and letting
    // the save fail is a worse way to say the same thing.
    const possible = kindsForEntity(control.binding.entity_id);
    const kinds: ControlKind[] = possible.length
      ? possible
      : ["button", "switch", "select", "number"];
    const chosenEntity = control.binding.entity_id;
    return html`
      <div class="divided">
        <div class="row">
          <div class="grow">
            <label>Beschriftung</label>
            <input
              placeholder="Zoom rein"
              .value=${control.name}
              @change=${(e: Event) =>
                this.patchControl(index, {
                  name: (e.target as HTMLInputElement).value,
                })}
            />
          </div>
          <div class="grow">
            <label>Entity</label>
            <kustos-vision-select
              search
              .options=${[
                { value: "", label: "Bitte wählen …" },
                ...this.candidates.map((c) => ({
                  value: c.entity_id,
                  label: c.name || c.entity_id,
                })),
              ]}
              .value=${chosenEntity}
              @value-changed=${(e: CustomEvent<{ value: string }>) => {
                const entityId = e.detail.value;
                // The kind that was set may be impossible for the new entity,
                // so it moves to what this one can do rather than staying
                // behind and failing on save.
                const [first] = kindsForEntity(entityId);
                this.patchControl(index, {
                  binding: { entity_id: entityId },
                  ...(first ? { kind: first } : {}),
                });
              }}
            ></kustos-vision-select>
          </div>
          <div>
            <label>Bedienart</label>
            <kustos-vision-select
              .options=${kinds.map((value) => ({
                value,
                label: KIND_LABELS[value],
              }))}
              .value=${control.kind}
              @value-changed=${(e: CustomEvent<{ value: string }>) =>
                this.patchControl(index, {
                  kind: e.detail.value as ControlKind,
                })}
            ></kustos-vision-select>
          </div>
          <div>
            <label>Kennung</label>
            <input
              .value=${control.key}
              @change=${(e: Event) =>
                this.patchControl(index, {
                  key: (e.target as HTMLInputElement).value,
                })}
            />
          </div>
        </div>
        <div class="row" style="margin-top:8px">
          <span class="spacer"></span>
          <button
            class="danger"
            @click=${() =>
              (this.controls = this.controls.filter((_, i) => i !== index))}
          >
            Entfernen
          </button>
        </div>
      </div>
    `;
  }

  private renderViewBlock(view: View) {
    const settings = this.viewSettings[view.id];
    const shown = settings?.visible ?? false;
    const members = this.orderedMembers(view);
    const chosen = settings?.capabilities ?? null;
    const bound = [
      ...Object.keys(this.capabilities),
      ...this.controls.map((c) => c.key),
    ];

    return html`
      <div class="divided">
        <label style="margin:0">
          <input
            type="checkbox"
            .checked=${shown}
            @change=${(e: Event) =>
              this.patchView(view.id, {
                visible: (e.target as HTMLInputElement).checked,
              })}
          />
          <strong>${view.name}</strong>
        </label>

        ${!shown
          ? nothing
          : html`
              <div class="row">
                <div class="grow">
                  <label>Angezeigter Stream</label>
                  <kustos-vision-select
                    .options=${[
                      {
                        value: "",
                        label: "automatisch (der nicht aufgezeichnete)",
                      },
                      ...this.streams.map((stream) => ({
                        value: stream.key,
                        label: stream.key,
                      })),
                    ]}
                    .value=${settings?.stream_key ?? ""}
                    @value-changed=${(e: CustomEvent<{ value: string }>) =>
                      this.patchView(view.id, {
                        stream_key: e.detail.value || null,
                      })}
                  ></kustos-vision-select>
                </div>
              </div>

              <label>Bedienelemente in dieser Ansicht</label>
              ${bound.length === 0
                ? html`<p class="hint">Dieser Kamera ist nichts zugeordnet.</p>`
                : html`<div class="row">
                      ${bound.map(
                        (key) => html`<label style="margin:0">
                          <input
                            type="checkbox"
                            .checked=${chosen === null || chosen.includes(key)}
                            @change=${(e: Event) => {
                              const on = (e.target as HTMLInputElement).checked;
                              // null means "all", so the first change has to
                              // turn it into an explicit list before removing
                              // anything from it.
                              const next = new Set(chosen ?? bound);
                              if (on) next.add(key);
                              else next.delete(key);
                              this.patchView(view.id, {
                                capabilities: bound.filter((k) => next.has(k)),
                              });
                            }}
                          />
                          ${this.controls.find((c) => c.key === key)?.name ||
                          capabilityLabel(key)}
                        </label>`,
                      )}
                    </div>
                    <div class="row" style="margin-top:6px">
                      <button
                        class="secondary"
                        @click=${() =>
                          this.patchView(view.id, { capabilities: null })}
                      >
                        alle
                      </button>
                      <button
                        class="secondary"
                        @click=${() =>
                          this.patchView(view.id, { capabilities: [] })}
                      >
                        keines
                      </button>
                    </div>`}

              <label>Reihenfolge in dieser Ansicht</label>
              <p class="hint">
                Gilt für alle Kameras der Ansicht und wird sofort gespeichert,
                weil sie die anderen Kameras mit betrifft.
              </p>
              <div class="members">
                ${repeat(
                  members,
                  (member) => `${view.id}:${member.slug}`,
                  (member, index) => html`
                    <div
                      class="member-row ${this.dragging?.viewId === view.id &&
                      this.dragging.slug === member.slug
                        ? "dragging-lift"
                        : ""}"
                      data-key="${view.id}:${member.slug}"
                    >
                      <span class=${member.slug === this.slug ? "" : "muted"}>
                        ${index + 1}. ${member.name}
                      </span>
                      <span class="spacer"></span>
                      ${this.camera
                        ? html`<span
                            class="drag-handle"
                            title="Ziehen zum Verschieben"
                            @pointerdown=${(e: PointerEvent) =>
                              this.onDragStart(view, index, e)}
                            @pointermove=${(e: PointerEvent) =>
                              this.onDragMove(e)}
                            @pointerup=${() => this.onDragEnd(view)}
                            @pointercancel=${() => {
                              this.dragging = undefined;
                              this.requestUpdate();
                            }}
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
                          </span>`
                        : nothing}
                    </div>
                  `,
                )}
              </div>
              ${!this.camera
                ? html`<p class="hint">
                    Die Reihenfolge lässt sich einstellen, sobald die Kamera
                    gespeichert ist.
                  </p>`
                : nothing}
            `}
      </div>
    `;
  }

  /** What to append to a picker entry: stream count, reachability, and
   *  whether it is already taken. */
  private pickerSuffix(entry: AvailableCamera): string {
    const parts: string[] = [];
    if (entry.streams.length > 1) parts.push(`${entry.streams.length} Streams`);
    if (!entry.available) parts.push("nicht erreichbar");
    if (entry.in_use) parts.push("bereits eingerichtet");
    return parts.length ? ` (${parts.join(", ")})` : "";
  }

  private renderPicker() {
    const editing = this.camera !== undefined;
    return html`
      <label>
        ${editing ? "Andere Kamera zuordnen" : "Kamera in Home Assistant"}
      </label>
      <kustos-vision-select
        search
        .options=${[
          { value: "", label: editing ? "unverändert lassen" : "Bitte wählen …" },
          ...this.available.map((c) => ({
            value: c.entity_id,
            label: `${c.name ?? c.entity_id}${this.pickerSuffix(c)}`,
            disabled: c.in_use && !editing,
          })),
        ]}
        .value=${""}
        @value-changed=${(e: CustomEvent<{ value: string }>) => {
          if (e.detail.value) void this.pick(e.detail.value);
        }}
      ></kustos-vision-select>
      <p class="hint">
        ${editing
          ? html`Ersetzt Streams und Bedienelemente durch die des gewählten
              Geräts, damit sich ein Vertippen beim Anlegen korrigieren lässt,
              ohne die Kamera zu löschen. Kennung und Name bleiben, denn die
              Kennung ist der Ordner der bisherigen Aufnahmen.`
          : html`Jede Kamera erscheint einmal, mit allen ihren Streams.
              Welche davon aufgezeichnet werden, wählen Sie gleich darunter.`}
      </p>
    `;
  }

  override render() {
    const options = this.candidates.length
      ? this.candidates
      : Object.values(this.capabilities)
          .filter((b) => b.entity_id)
          .map((b) => ({ entity_id: b.entity_id!, name: b.entity_id! }));

    return html`
      <div class="card">
        ${this.renderPicker()}

        <div class="row">
          <div class="grow">
            <label>Name</label>
            <input
              .value=${this.name}
              @input=${(e: Event) => (this.name = (e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="grow">
            <label>Kennung (wird zum Ordnernamen)</label>
            <input
              .value=${this.slug}
              ?disabled=${this.camera !== undefined}
              @input=${(e: Event) => (this.slug = (e.target as HTMLInputElement).value)}
            />
          </div>
        </div>

        <h3>Streams</h3>
        ${this.streams.length === 0
          ? html`<p class="hint">Noch keine Streams.</p>`
          : html`<table>
              <tr>
                <th>Kennung</th>
                <th>Entity</th>
                <th>Aufzeichnen</th>
                <th>Ton</th>
              </tr>
              ${this.streams.map(
                (stream, index) => html`
                  <tr>
                    <td>
                      <input
                        .value=${stream.key}
                        @input=${(e: Event) =>
                          this.updateStream(index, {
                            key: (e.target as HTMLInputElement).value,
                          })}
                      />
                    </td>
                    <td class="muted">${stream.entity_id}</td>
                    <td>
                      <input
                        type="checkbox"
                        .checked=${stream.record}
                        @change=${(e: Event) =>
                          this.updateStream(index, {
                            record: (e.target as HTMLInputElement).checked,
                          })}
                      />
                    </td>
                    <td>
                      <kustos-vision-select
                        .options=${[
                          { value: "transcode", label: "umwandeln" },
                          { value: "copy", label: "kopieren" },
                          { value: "none", label: "ohne" },
                        ]}
                        .value=${stream.audio}
                        @value-changed=${(e: CustomEvent<{ value: string }>) =>
                          this.updateStream(index, {
                            audio: e.detail.value as StreamConfig["audio"],
                          })}
                      ></kustos-vision-select>
                    </td>
                  </tr>
                `,
              )}
            </table>
            <p class="hint">
              "Umwandeln" funktioniert mit jeder Kamera. "Kopieren" spart etwas
              Rechenzeit, geht aber nur, wenn die Kamera bereits AAC sendet.
            </p>`}

        <h3>Aufbewahrung</h3>
        <div class="row">
          <div class="grow">
            <label>Tage (leer = nur das Gesamtbudget begrenzt)</label>
            <input
              type="number"
              min="1"
              .value=${this.retentionDays === null ? "" : String(this.retentionDays)}
              @input=${(e: Event) => {
                const raw = (e.target as HTMLInputElement).value;
                this.retentionDays = raw === "" ? null : Number(raw);
              }}
            />
          </div>
          <div>
            <label>Aktiv</label>
            <input
              type="checkbox"
              .checked=${this.enabled}
              @change=${(e: Event) =>
                (this.enabled = (e.target as HTMLInputElement).checked)}
            />
          </div>
        </div>

        <details class="expander">
          <summary>Bedienelemente</summary>
          <div class="expander-body">
        <p class="hint">
          Was hier zugeordnet ist, kann auf der Kachel erscheinen. Pro Ansicht
          lässt sich unten auswählen, welche davon dort gezeigt werden.
        </p>
        <table>
          ${this.capabilityKeys.map(
            (key) => html`
              <tr>
                <th>${capabilityLabel(key)}</th>
                <td>
                  <kustos-vision-select
                    search
                    .options=${[
                      { value: "", label: "nicht zugeordnet" },
                      ...options.map((c) => ({
                        value: c.entity_id,
                        label: c.name,
                      })),
                    ]}
                    .value=${this.capabilities[key]?.entity_id ?? ""}
                    @value-changed=${(e: CustomEvent<{ value: string }>) =>
                      this.setCapability(key, e.detail.value)}
                  ></kustos-vision-select>
                </td>
              </tr>
            `,
          )}
        </table>
          </div>
        </details>

        <details class="expander">
          <summary>Eigene Bedienelemente</summary>
          <div class="expander-body">
        <p class="hint">
          Für alles, was die vierzehn vorgegebenen Plätze nicht abdecken: Zoom,
          Wischer, Empfindlichkeit, Sirenenlautstärke und was Ihre Kamera sonst
          noch anbietet. Jedes davon erscheint danach genauso in den Ansichten
          wie die vorgegebenen.
        </p>
        ${this.controls.map((control, index) =>
          this.renderControlRow(control, index),
        )}
        <div class="row" style="margin-top:12px">
          <button
            class="secondary"
            ?disabled=${this.candidates.length === 0}
            @click=${this.addControl}
          >
            Bedienelement hinzufügen
          </button>
          ${this.candidates.length === 0
            ? html`<span class="muted"
                >Erst eine Kamera auswählen, dann stehen ihre Entities zur
                Wahl.</span
              >`
            : nothing}
        </div>
          </div>
        </details>

        <details class="expander">
          <summary>Ansichten</summary>
          <div class="expander-body">
        ${this.views.length === 0
          ? html`<p class="hint">
              Noch keine Ansicht angelegt. Unter Einstellungen, Ansichten lässt
              sich eine erstellen.
            </p>`
          : html`<p class="hint">
                Pro Ansicht lässt sich getrennt festlegen, ob und wie diese
                Kamera dort erscheint. So kann dieselbe Kamera in einer
                Bedienansicht mit allen Schaltflächen stehen und in einer
                Wandansicht nur als Bild.
              </p>
              ${this.views.map((view) => this.renderViewBlock(view))}`}
          </div>
        </details>

        ${this.error ? html`<p class="error">${this.error}</p>` : nothing}

        <div class="row" style="margin-top:16px">
          <button
            ?disabled=${this.busy ||
            !this.slug ||
            !this.name ||
            this.incompleteControl !== undefined}
            title=${this.incompleteControl ?? ""}
            @click=${this.save}
          >
            Speichern
          </button>
          <button
            class="secondary"
            @click=${async () => {
              if (!(await guardNavigation())) return;
              this.dispatchEvent(
                new CustomEvent("cancelled", { bubbles: true, composed: true }),
              );
            }}
          >
            Abbrechen
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kustos-vision-camera-editor": CamwatchCameraEditor;
  }
}
