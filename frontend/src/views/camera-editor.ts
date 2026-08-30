// Adding and editing a camera.
//
// Adding starts from a Home Assistant camera entity, and kustos_vision proposes the
// rest: the other streams of the same device, and which of its entities drive
// pan, tilt, light and so on. Every proposal is editable, because the proposal
// is a heuristic and the assignment is the truth.

import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { CamwatchApi } from "../api";
import type {
  AvailableCamera,
  CapabilityBinding,
  Camera,
  StreamConfig,
  Suggestion,
} from "../types";
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

  @state() private slug = "";
  @state() private name = "";
  @state() private streams: StreamConfig[] = [];
  @state() private capabilities: Record<string, CapabilityBinding> = {};
  @state() private retentionDays: number | null = null;
  @state() private enabled = true;
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
    }
  }

  private async pick(entityId: string): Promise<void> {
    if (!entityId) return;
    this.busy = true;
    this.error = "";
    try {
      const suggestion: Suggestion = await this.api.suggest(entityId);
      this.name = suggestion.name;
      this.slug = slugify(suggestion.name);
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
      this.error = err instanceof Error ? err.message : String(err);
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
      await this.api.setCamera({
        slug: this.slug,
        name: this.name,
        streams: this.streams,
        capabilities: this.capabilities,
        retention_days: this.retentionDays,
        enabled: this.enabled,
        area_id: this.camera?.area_id ?? null,
      });
      this.dispatchEvent(new CustomEvent("saved", { bubbles: true, composed: true }));
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.busy = false;
    }
  }

  private renderPicker() {
    if (this.camera) return nothing;
    return html`
      <label>Kamera in Home Assistant</label>
      <select
        @change=${(e: Event) => this.pick((e.target as HTMLSelectElement).value)}
      >
        <option value="">Bitte wählen …</option>
        ${this.available.map(
          (c) => html`<option value=${c.entity_id}>
            ${c.name ?? c.entity_id}${c.available ? "" : " (nicht verfügbar)"}
          </option>`,
        )}
      </select>
      <p class="hint">
        kustos_vision schlägt danach Streams und Bedienelemente vor, die zum selben
        Gerät gehören. Alles davon lässt sich ändern.
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
          Was hier zugeordnet ist, erscheint als Schaltfläche auf der Kachel.
          Leer lassen heißt: keine Schaltfläche.
        </p>
        <table>
          ${this.capabilityKeys.map(
            (key) => html`
              <tr>
                <th>${key}</th>
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
