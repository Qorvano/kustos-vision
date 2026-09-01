// Defining what a camera is analysed for.
//
// The questions are the substance here. Each one becomes both a sensor and a
// field the model has to fill in, so writing a good question is the actual
// work, and the panel is built around making that easy to try and to correct:
// analyse now, see the raw answer, adjust the wording.

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { errorText, type CamwatchApi } from "../api";
import "../components/select";
import {
  guardNavigation,
  registerUnsavedWork,
  unregisterUnsavedWork,
  type UnsavedWork,
} from "../dirty";
import { shared } from "../styles";
import type {
  AiTaskEntity,
  AnalysisRun,
  Camera,
  HomeAssistant,
  Observation,
  ObservationType,
  VisionBackend,
  VisionProfile,
} from "../types";

const TYPES: [ObservationType, string][] = [
  ["boolean", "Ja/Nein"],
  ["text", "Text"],
  ["number", "Anzahl"],
  ["select", "Auswahl"],
];

/** Where the analysed frames are served; the path carries slug + slot name. */
const FRAME_URL_BASE = "/api/kustos_vision/vision-frame";

@customElement("kustos-vision-vision-editor")
export class CamwatchVisionEditor extends LitElement {
  @property({ attribute: false }) api!: CamwatchApi;
  @property({ attribute: false }) camera!: Camera;
  @property({ attribute: false }) profile?: VisionProfile;
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private backend: VisionBackend = { kind: "openai" };
  @state() private observations: Observation[] = [];
  @state() private triggers: string[] = [];
  @state() private addingTrigger = false;
  @state() private context = "";
  @state() private cooldown = 60;
  @state() private budget = 100;
  @state() private enabled = true;

  @state() private aiTasks: AiTaskEntity[] = [];
  @state() private history: AnalysisRun[] = [];
  @state() private frameUrls = new Map<string, string>();
  @state() private lastRun?: { values: Record<string, unknown>; raw: unknown };
  @state() private busy = false;
  @state() private error = "";

  static override styles = [
    shared,
    css`
      /* The analysed frame beside each history row. A fixed height keeps the
         table from jumping while thumbnails load. */
      .framecell img {
        display: block;
        height: 48px;
        border-radius: 4px;
      }
      .framecell .stale {
        display: block;
        font-size: 0.75em;
        color: var(--secondary-text-color);
      }
    `,
  ];

  /** The saved state this editor started from, for spotting unsaved work. */
  private baseline = "";

  private readonly unsaved: UnsavedWork = {
    isDirty: () => JSON.stringify(this.payload()) !== this.baseline,
    save: () => this.save(),
    // Nothing to restore: leaving unmounts the editor and its drafts.
    discard: () => {},
  };

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    unregisterUnsavedWork(this.unsaved);
  }

  override async connectedCallback(): Promise<void> {
    super.connectedCallback();
    if (this.profile) {
      this.backend = { ...this.profile.backend };
      this.observations = this.profile.observations.map((o) => ({ ...o }));
      this.triggers = [...this.profile.triggers];
      this.context = this.profile.context;
      this.cooldown = this.profile.cooldown_seconds;
      this.budget = this.profile.daily_budget;
      this.enabled = this.profile.enabled;
      void this.loadHistory();
    } else {
      // A camera that reports motion is almost always the trigger the user
      // wants, so it is offered pre-selected rather than left empty.
      const motion = this.camera.capabilities["motion_trigger"]?.entity_id;
      if (motion) this.triggers = [motion];
    }
    // The pre-selected trigger proposal is part of the starting point, not
    // an unsaved edit of the person's own.
    this.baseline = JSON.stringify(this.payload());
    registerUnsavedWork(this.unsaved);
    try {
      this.aiTasks = (await this.api.aiTaskEntities()).ai_task;
    } catch {
      this.aiTasks = [];
    }
  }

  /** What save() sends, and the yardstick unsaved work is measured by. */
  private payload() {
    return {
      camera_slug: this.camera.slug,
      backend: this.backend,
      observations: this.observations,
      triggers: this.triggers.filter((t) => t),
      context: this.context,
      cooldown_seconds: this.cooldown,
      daily_budget: this.budget,
      enabled: this.enabled,
    };
  }

  private async loadHistory(): Promise<void> {
    try {
      const history = (await this.api.visionHistory(this.camera.slug)).history;
      // Signed up front so rendering stays synchronous. The endpoint serves
      // with no-cache: a ring slot is reused after twenty runs, and the
      // revalidation is what keeps a stale picture out of a fresh row.
      const urls = new Map<string, string>();
      for (const run of history) {
        if (!run.frame) continue;
        try {
          urls.set(
            run.at,
            await this.api.signedUrl(
              `${FRAME_URL_BASE}/${this.camera.slug}/${run.frame}`,
            ),
          );
        } catch {
          // The row simply shows no picture.
        }
      }
      this.history = history;
      this.frameUrls = urls;
    } catch {
      this.history = [];
      this.frameUrls = new Map();
    }
  }

  /** Every entity the instance has, worded for people, searchable by id. */
  private triggerCandidates(): { value: string; label: string }[] {
    const chosen = new Set(this.triggers);
    return Object.keys(this.hass?.states ?? {})
      .filter((id) => !chosen.has(id))
      .map((id) => ({ value: id, label: this.entityLabel(id) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  private entityLabel(entityId: string): string {
    const name = this.hass?.states?.[entityId]?.attributes?.friendly_name;
    return typeof name === "string" && name
      ? `${name} (${entityId})`
      : entityId;
  }

  private patchObservation(index: number, patch: Partial<Observation>): void {
    this.observations = this.observations.map((o, i) =>
      i === index ? { ...o, ...patch } : o,
    );
  }

  private addObservation(): void {
    let n = this.observations.length + 1;
    const used = new Set(this.observations.map((o) => o.key));
    while (used.has(`frage_${n}`)) n += 1;
    this.observations = [
      ...this.observations,
      { key: `frage_${n}`, type: "boolean", question: "" },
    ];
  }

  private async save(): Promise<boolean> {
    this.busy = true;
    this.error = "";
    try {
      await this.api.setVision(this.payload());
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

  private async analyseNow(): Promise<void> {
    this.busy = true;
    this.error = "";
    this.lastRun = undefined;
    try {
      const result = await this.api.analyseNow(this.camera.slug);
      if (!result.ran) {
        this.error = "Das Tagesbudget ist aufgebraucht oder es läuft bereits eine Analyse.";
      } else {
        this.lastRun = { values: result.values, raw: result.raw };
        if (Object.keys(result.problems).length > 0) {
          this.error = `Nicht verwertbar: ${Object.entries(result.problems)
            .map(([k, v]) => `${k} (${v})`)
            .join(", ")}`;
        }
      }
      await this.loadHistory();
    } catch (err) {
      this.error = errorText(err);
    } finally {
      this.busy = false;
    }
  }

  private renderBackend() {
    const isAiTask = this.backend.kind === "ai_task";
    return html`
      <h3>Modell</h3>
      <label>Anbindung</label>
      <kustos-vision-select
        .options=${[
          { value: "openai", label: "OpenAI-kompatibler Endpunkt" },
          { value: "ai_task", label: "Home Assistant AI Task" },
        ]}
        .value=${isAiTask ? "ai_task" : "openai"}
        @value-changed=${(e: CustomEvent<{ value: string }>) => {
          this.backend = {
            ...this.backend,
            kind: e.detail.value as VisionBackend["kind"],
          };
        }}
      ></kustos-vision-select>

      ${isAiTask
        ? html`
            <label>AI-Task-Entity</label>
            <kustos-vision-select
              .options=${[
                { value: "", label: "Bitte wählen …" },
                ...this.aiTasks.map((t) => ({
                  value: t.entity_id,
                  label: `${t.name}${t.available ? "" : " (nicht verfügbar)"}`,
                })),
              ]}
              .value=${this.backend.entity_id ?? ""}
              @value-changed=${(e: CustomEvent<{ value: string }>) =>
                (this.backend = {
                  ...this.backend,
                  entity_id: e.detail.value,
                })}
            ></kustos-vision-select>
            ${this.aiTasks.length === 0
              ? html`<p class="hint">
                  Keine AI-Task-Entity gefunden, die Bilder annimmt. Dafür muss ein
                  passender Anbieter in Home Assistant eingerichtet sein.
                </p>`
              : nothing}
          `
        : html`
            <div class="fields">
              <div>
                <label>Adresse</label>
                <input
                  placeholder="http://192.168.1.10:8080/v1"
                  .value=${this.backend.url ?? ""}
                  @change=${(e: Event) =>
                    (this.backend = {
                      ...this.backend,
                      url: (e.target as HTMLInputElement).value,
                    })}
                />
              </div>
              <div>
                <label>Modell</label>
                <input
                  .value=${this.backend.model ?? ""}
                  @change=${(e: Event) =>
                    (this.backend = {
                      ...this.backend,
                      model: (e.target as HTMLInputElement).value,
                    })}
                />
              </div>
            </div>
            <label>Schlüssel (bei lokalen Modellen meist leer)</label>
            <input
              type="password"
              .value=${this.backend.api_key ?? ""}
              @change=${(e: Event) =>
                (this.backend = {
                  ...this.backend,
                  api_key: (e.target as HTMLInputElement).value || undefined,
                })}
            />
            <p class="hint">
              Das Modell muss Bilder verarbeiten können. Bei llama.cpp heißt das:
              mit einer mmproj-Datei geladen.
            </p>
          `}
    `;
  }

  private renderObservation(observation: Observation, index: number) {
    return html`
      <div class="divided">
        <div class="fields">
          <div>
            <label>Frage an das Modell</label>
            <input
              placeholder="Liegt ein Paket vor der Haustür?"
              .value=${observation.question}
              @change=${(e: Event) =>
                this.patchObservation(index, {
                  question: (e.target as HTMLInputElement).value,
                })}
            />
          </div>
          <div>
            <label>Antworttyp</label>
            <kustos-vision-select
              .options=${TYPES.map(([value, label]) => ({ value, label }))}
              .value=${observation.type}
              @value-changed=${(e: CustomEvent<{ value: string }>) =>
                this.patchObservation(index, {
                  type: e.detail.value as ObservationType,
                })}
            ></kustos-vision-select>
          </div>
          <div>
            <label>Kennung</label>
            <input
              .value=${observation.key}
              @change=${(e: Event) =>
                this.patchObservation(index, {
                  key: (e.target as HTMLInputElement).value,
                })}
            />
          </div>
          <div>
            <label>Angezeigter Name (leer = aus der Kennung)</label>
            <input
              .value=${observation.name ?? ""}
              @change=${(e: Event) =>
                this.patchObservation(index, {
                  name: (e.target as HTMLInputElement).value || undefined,
                })}
            />
          </div>
        </div>

        ${observation.type === "select"
          ? html`<label>Mögliche Antworten, durch Komma getrennt</label>
              <input
                .value=${(observation.options ?? []).join(", ")}
                @change=${(e: Event) =>
                  this.patchObservation(index, {
                    options: (e.target as HTMLInputElement).value
                      .split(",")
                      .map((o) => o.trim())
                      .filter((o) => o),
                  })}
              />`
          : nothing}
        ${observation.type === "number"
          ? html`<div class="fields">
              <div>
                <label>Kleinster Wert</label>
                <input
                  type="number"
                  .value=${String(observation.minimum ?? 0)}
                  @change=${(e: Event) =>
                    this.patchObservation(index, {
                      minimum: Number((e.target as HTMLInputElement).value),
                    })}
                />
              </div>
              <div>
                <label>Größter Wert</label>
                <input
                  type="number"
                  .value=${String(observation.maximum ?? 100)}
                  @change=${(e: Event) =>
                    this.patchObservation(index, {
                      maximum: Number((e.target as HTMLInputElement).value),
                    })}
                />
              </div>
            </div>`
          : nothing}

        <div class="row" style="margin-top:8px">
          <label style="margin:0">
            <input
              type="checkbox"
              .checked=${observation.enabled ?? true}
              @change=${(e: Event) =>
                this.patchObservation(index, {
                  enabled: (e.target as HTMLInputElement).checked,
                })}
            />
            Aktiv
          </label>
          ${this.lastRun && observation.key in this.lastRun.values
            ? html`<span class="muted">
                Letzte Antwort: <strong>${String(this.lastRun.values[observation.key])}</strong>
              </span>`
            : nothing}
          <span class="spacer"></span>
          <button
            class="danger"
            @click=${() =>
              (this.observations = this.observations.filter((_, i) => i !== index))}
          >
            Frage entfernen
          </button>
        </div>
      </div>
    `;
  }

  private renderHistory() {
    if (this.history.length === 0) return nothing;
    return html`
      <h3>Letzte Analysen</h3>
      <p class="hint">
        Was das Modell tatsächlich geantwortet hat. Eine Frage zu verbessern
        gelingt damit, statt am Wortlaut zu raten.
      </p>
      <div class="table-stack">
        <table>
          <tr class="head">
            <th>Bild</th>
            <th>Zeitpunkt</th>
            <th>Auslöser</th>
            <th>Antwort</th>
            <th>Dauer</th>
          </tr>
          ${this.history.slice(0, 8).map(
            (run) => html`
              <tr>
                <td class="framecell" data-label="Bild">
                  ${this.frameUrls.has(run.at)
                    ? html`<img
                          src=${this.frameUrls.get(run.at)!}
                          alt="Analysiertes Bild"
                        />${run.frame_source === "still"
                          ? html`<span
                              class="stale"
                              title="Kein aktueller Stream-Frame verfügbar; die Kamera-Integration lieferte ein zwischengespeichertes Standbild, das älter sein kann als der Auslöser."
                              >Standbild</span
                            >`
                          : nothing}`
                    : html`<span class="muted">-</span>`}
                </td>
                <td class="muted">${new Date(run.at).toLocaleString()}</td>
                <td class="muted" data-label="Auslöser">${run.trigger}</td>
                <td class=${run.error ? "error" : ""} data-label="Antwort">
                  ${run.error ??
                  Object.entries(run.values)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")}
                </td>
                <td class="muted" data-label="Dauer">
                  ${run.duration === null ? "-" : `${run.duration} s`}
                </td>
              </tr>
            `,
          )}
        </table>
      </div>
    `;
  }

  override render() {
    const state = this.profile?.state;
    return html`
      <div class="card">
        <p class="hint">
          Ein Standbild wird an das gewählte Modell geschickt, sobald ein
          Auslöser meldet. Aus jeder Frage wird ein Sensor.
        </p>

        ${this.renderBackend()}

        <h3>Fragen</h3>
        ${this.observations.length === 0
          ? html`<p class="hint">Noch keine Frage angelegt.</p>`
          : this.observations.map((o, i) => this.renderObservation(o, i))}
        <div class="row" style="margin-top:12px">
          <button class="secondary" @click=${this.addObservation}>
            Frage hinzufügen
          </button>
        </div>

        <h3>Auslöser</h3>
        <p class="hint">
          Entities, deren Einschalten eine Analyse startet. Am besten die
          Personenerkennung der Kamera; reine Bewegungsmelder lösen bei Wind
          und Regen dauernd aus.
        </p>
        ${this.triggers.length === 0
          ? html`<p class="hint">
              Ohne Auslöser läuft die Analyse nur von Hand.
            </p>`
          : this.triggers.map(
              (trigger) => html`<div class="row divided">
                <span class="grow id">${this.entityLabel(trigger)}</span>
                <button
                  class="danger"
                  @click=${() =>
                    (this.triggers = this.triggers.filter(
                      (t) => t !== trigger,
                    ))}
                >
                  Entfernen
                </button>
              </div>`,
            )}
        ${this.addingTrigger
          ? html`<div class="row" style="margin-top:8px">
              <div class="grow">
                <kustos-vision-select
                  search
                  .options=${this.triggerCandidates()}
                  .value=${""}
                  @value-changed=${(e: CustomEvent<{ value: string }>) => {
                    if (e.detail.value) {
                      this.triggers = [...this.triggers, e.detail.value];
                    }
                    this.addingTrigger = false;
                  }}
                ></kustos-vision-select>
              </div>
              <button
                class="secondary"
                @click=${() => (this.addingTrigger = false)}
              >
                Abbrechen
              </button>
            </div>`
          : html`<div class="row" style="margin-top:8px">
              <button
                class="secondary"
                @click=${() => (this.addingTrigger = true)}
              >
                Auslöser hinzufügen
              </button>
            </div>`}

        <h3>Zusätzlicher Zusammenhang</h3>
        <label>Was das Modell nicht sehen kann</label>
        <input
          placeholder="Die Kamera zeigt den Gehweg vor dem Haus."
          .value=${this.context}
          @change=${(e: Event) => (this.context = (e.target as HTMLInputElement).value)}
        />

        <h3>Grenzen</h3>
        <div class="fields">
          <div>
            <label>Mindestabstand in Sekunden</label>
            <input
              type="number"
              min="0"
              .value=${String(this.cooldown)}
              @change=${(e: Event) =>
                (this.cooldown = Number((e.target as HTMLInputElement).value))}
            />
          </div>
          <div>
            <label>Höchstens Analysen pro Tag</label>
            <input
              type="number"
              min="1"
              .value=${String(this.budget)}
              @change=${(e: Event) =>
                (this.budget = Number((e.target as HTMLInputElement).value))}
            />
          </div>
        </div>
        ${state
          ? html`<p class="hint">
              Heute ${state.analyses_today} von ${this.budget} Analysen genutzt.
            </p>`
          : nothing}

        <div class="row" style="margin-top:8px">
          <label style="margin:0">
            <input
              type="checkbox"
              .checked=${this.enabled}
              @change=${(e: Event) =>
                (this.enabled = (e.target as HTMLInputElement).checked)}
            />
            Aktiv
          </label>
        </div>

        ${this.error ? html`<p class="error">${this.error}</p>` : nothing}
        ${this.lastRun?.raw
          ? html`<h3>Rohantwort</h3>
              <pre class="muted" style="overflow:auto;font-size:0.8em">
${JSON.stringify(this.lastRun.raw, null, 2)}</pre
              >`
          : nothing}
        ${this.renderHistory()}

        <div class="row" style="margin-top:16px">
          <button ?disabled=${this.busy || this.observations.length === 0} @click=${this.save}>
            Speichern
          </button>
          ${this.profile
            ? html`<button
                class="secondary"
                ?disabled=${this.busy}
                @click=${this.analyseNow}
              >
                Jetzt analysieren
              </button>`
            : nothing}
          <button
            class="secondary"
            @click=${async () => {
              if (!(await guardNavigation())) return;
              this.dispatchEvent(
                new CustomEvent("cancelled", { bubbles: true, composed: true }),
              );
            }}
          >
            Zurück
          </button>
          ${this.profile
            ? html`<button
                class="danger"
                ?disabled=${this.busy}
                @click=${async () => {
                  if (!confirm("Bilderkennung für diese Kamera entfernen?")) return;
                  await this.api.deleteVision(this.camera.slug);
                  this.dispatchEvent(
                    new CustomEvent("saved", { bubbles: true, composed: true }),
                  );
                }}
              >
                Entfernen
              </button>`
            : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kustos-vision-vision-editor": CamwatchVisionEditor;
  }
}
