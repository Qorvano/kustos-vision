// Adding and editing a camera.
//
// Adding starts from a Home Assistant camera entity, and kustos_vision proposes the
// rest: the other streams of the same device, and which of its entities drive
// pan, tilt, light and so on. Every proposal is editable, because the proposal
// is a heuristic and the assignment is the truth.

import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
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
import { capabilityLabel } from "../capabilities";
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

  static override styles = shared;

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

  private async save(): Promise<void> {
    this.busy = true;
    this.error = "";
    try {
      await this.api.setCamera(
        {
          slug: this.slug,
          name: this.name,
          streams: this.streams,
          capabilities: this.capabilities,
          retention_days: this.retentionDays,
          enabled: this.enabled,
          area_id: this.camera?.area_id ?? null,
          view_settings: this.viewSettings,
          controls: this.controls,
        },
        // Editing an existing camera is the only case allowed to replace one.
        this.camera !== undefined,
      );
      this.dispatchEvent(new CustomEvent("saved", { bubbles: true, composed: true }));
    } catch (err) {
      this.error = errorText(err);
    } finally {
      this.busy = false;
    }
  }

  private patchView(viewId: string, patch: Partial<CameraViewSettings>): void {
    const current = this.viewSettings[viewId] ?? { visible: false, position: 0 };
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

  private async moveInView(view: View, index: number, delta: number): Promise<void> {
    const order = this.membersOf(view).map((m) => m.slug);
    const [moved] = order.splice(index, 1);
    order.splice(index + delta, 0, moved);
    this.busy = true;
    this.error = "";
    try {
      await this.api.setViewOrder(view.id, order);
      this.dispatchEvent(
        new CustomEvent("reordered", { bubbles: true, composed: true }),
      );
    } catch (err) {
      this.error = errorText(err);
    } finally {
      this.busy = false;
    }
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

  private renderControlRow(control: CustomControl, index: number) {
    const kinds: [ControlKind, string][] = [
      ["button", "Knopf"],
      ["switch", "An/Aus"],
      ["select", "Auswahl"],
      ["number", "Wert"],
    ];
    return html`
      <div style="border-bottom:1px solid var(--divider-color,#eee);padding:12px 0">
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
            <select
              @change=${(e: Event) =>
                this.patchControl(index, {
                  binding: { entity_id: (e.target as HTMLSelectElement).value },
                })}
            >
              <option value="">Bitte wählen …</option>
              ${this.candidates.map(
                (c) => html`<option
                  value=${c.entity_id}
                  ?selected=${control.binding.entity_id === c.entity_id}
                >
                  ${c.name || c.entity_id}
                </option>`,
              )}
            </select>
          </div>
          <div>
            <label>Bedienart</label>
            <select
              @change=${(e: Event) =>
                this.patchControl(index, {
                  kind: (e.target as HTMLSelectElement).value as ControlKind,
                })}
            >
              ${kinds.map(
                ([value, label]) => html`<option
                  value=${value}
                  ?selected=${control.kind === value}
                >
                  ${label}
                </option>`,
              )}
            </select>
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
          <span class="grow"></span>
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
    const members = this.membersOf(view);
    const chosen = settings?.capabilities ?? null;
    const bound = [
      ...Object.keys(this.capabilities),
      ...this.controls.map((c) => c.key),
    ];

    return html`
      <div style="border-bottom:1px solid var(--divider-color,#eee);padding:12px 0">
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
                  <select
                    @change=${(e: Event) =>
                      this.patchView(view.id, {
                        stream_key: (e.target as HTMLSelectElement).value || null,
                      })}
                  >
                    <option value="" ?selected=${!settings?.stream_key}>
                      automatisch (der nicht aufgezeichnete)
                    </option>
                    ${this.streams.map(
                      (stream) => html`<option
                        value=${stream.key}
                        ?selected=${settings?.stream_key === stream.key}
                      >
                        ${stream.key}
                      </option>`,
                    )}
                  </select>
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
              <table>
                ${members.map(
                  (member, index) => html`
                    <tr>
                      <td class=${member.slug === this.slug ? "" : "muted"}>
                        ${index + 1}. ${member.name}
                      </td>
                      <td style="width:1%;white-space:nowrap">
                        <button
                          class="secondary"
                          ?disabled=${index === 0 || this.busy || !this.camera}
                          @click=${() => this.moveInView(view, index, -1)}
                        >
                          ↑
                        </button>
                        <button
                          class="secondary"
                          ?disabled=${index === members.length - 1 ||
                          this.busy ||
                          !this.camera}
                          @click=${() => this.moveInView(view, index, 1)}
                        >
                          ↓
                        </button>
                      </td>
                    </tr>
                  `,
                )}
              </table>
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
      <select
        @change=${(e: Event) => {
          const target = e.target as HTMLSelectElement;
          void this.pick(target.value);
          target.value = "";
        }}
      >
        <option value="">
          ${editing ? "unverändert lassen" : "Bitte wählen …"}
        </option>
        ${this.available.map(
          (c) => html`<option
            value=${c.entity_id}
            ?disabled=${c.in_use && !editing}
          >
            ${c.name ?? c.entity_id}${this.pickerSuffix(c)}
          </option>`,
        )}
      </select>
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
        <h2>${this.camera ? `${this.camera.name} bearbeiten` : "Kamera hinzufügen"}</h2>
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
                      <select
                        @change=${(e: Event) =>
                          this.updateStream(index, {
                            audio: (e.target as HTMLSelectElement)
                              .value as StreamConfig["audio"],
                          })}
                      >
                        <option value="transcode" ?selected=${stream.audio === "transcode"}>
                          umwandeln
                        </option>
                        <option value="copy" ?selected=${stream.audio === "copy"}>
                          kopieren
                        </option>
                        <option value="none" ?selected=${stream.audio === "none"}>
                          ohne
                        </option>
                      </select>
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

        <h3>Bedienelemente</h3>
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
                  <select @change=${(e: Event) =>
                    this.setCapability(key, (e.target as HTMLSelectElement).value)}>
                    <option value="">nicht zugeordnet</option>
                    ${options.map(
                      (c) => html`<option
                        value=${c.entity_id}
                        ?selected=${this.capabilities[key]?.entity_id === c.entity_id}
                      >
                        ${c.name}
                      </option>`,
                    )}
                  </select>
                </td>
              </tr>
            `,
          )}
        </table>

        <h3>Eigene Bedienelemente</h3>
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

        <h3>Ansichten</h3>
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

        ${this.error ? html`<p class="error">${this.error}</p>` : nothing}

        <div class="row" style="margin-top:16px">
          <button ?disabled=${this.busy || !this.slug || !this.name} @click=${this.save}>
            Speichern
          </button>
          <button
            class="secondary"
            @click=${() =>
              this.dispatchEvent(
                new CustomEvent("cancelled", { bubbles: true, composed: true }),
              )}
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
