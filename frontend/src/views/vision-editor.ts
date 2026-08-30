// Defining what a camera is analysed for.
//
// The questions are the substance here. Each one becomes both a sensor and a
// field the model has to fill in, so writing a good question is the actual
// work, and the panel is built around making that easy to try and to correct:
// analyse now, see the raw answer, adjust the wording.

import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { CamwatchApi } from "../api";
import { shared } from "../styles";
import type {
  AiTaskEntity,
  AnalysisRun,
  Camera,
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

@customElement("kustos-vision-vision-editor")
export class CamwatchVisionEditor extends LitElement {
  @property({ attribute: false }) api!: CamwatchApi;
  @property({ attribute: false }) camera!: Camera;
  @property({ attribute: false }) profile?: VisionProfile;

  @state() private backend: VisionBackend = { kind: "openai" };
  @state() private observations: Observation[] = [];
  @state() private triggers: string[] = [];
  @state() private context = "";
  @state() private cooldown = 60;
  @state() private budget = 100;
  @state() private condition = "";
  @state() private enabled = true;

  @state() private aiTasks: AiTaskEntity[] = [];
  @state() private history: AnalysisRun[] = [];
  @state() private lastRun?: { values: Record<string, unknown>; raw: unknown };
  @state() private busy = false;
  @state() private error = "";

  static override styles = shared;

  override async connectedCallback(): Promise<void> {
    super.connectedCallback();
    if (this.profile) {
      this.backend = { ...this.profile.backend };
      this.observations = this.profile.observations.map((o) => ({ ...o }));
      this.triggers = [...this.profile.triggers];
      this.context = this.profile.context;
      this.cooldown = this.profile.cooldown_seconds;
      this.budget = this.profile.daily_budget;
      this.condition = this.profile.condition_entity ?? "";
      this.enabled = this.profile.enabled;
      void this.loadHistory();
    } else {
      // A camera that reports motion is almost always the trigger the user
      // wants, so it is offered pre-selected rather than left empty.
      const motion = this.camera.capabilities["motion_trigger"]?.entity_id;
      if (motion) this.triggers = [motion];
    }
    try {
      this.aiTasks = (await this.api.aiTaskEntities()).ai_task;
    } catch {
      this.aiTasks = [];
    }
  }

  private async loadHistory(): Promise<void> {
    try {
      this.history = (await this.api.visionHistory(this.camera.slug)).history;
    } catch {
      this.history = [];
    }
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

  private async save(): Promise<void> {
    this.busy = true;
    this.error = "";
    try {
      await this.api.setVision({
        camera_slug: this.camera.slug,
        backend: this.backend,
        observations: this.observations,
        triggers: this.triggers.filter((t) => t),
        context: this.context,
        cooldown_seconds: this.cooldown,
        daily_budget: this.budget,
        condition_entity: this.condition || null,
        enabled: this.enabled,
      });
      this.dispatchEvent(new CustomEvent("saved", { bubbles: true, composed: true }));
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
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
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.busy = false;
    }
  }

  private renderBackend() {
    const isAiTask = this.backend.kind === "ai_task";
    return html`
      <h3>Modell</h3>
      <label>Anbindung</label>
      <select
        @change=${(e: Event) => {
          const kind = (e.target as HTMLSelectElement).value as VisionBackend["kind"];
          this.backend = { ...this.backend, kind };
        }}
      >
        <option value="openai" ?selected=${!isAiTask}>
          OpenAI-kompatibler Endpunkt
        </option>
        <option value="ai_task" ?selected=${isAiTask}>Home Assistant AI Task</option>
      </select>

      ${isAiTask
        ? html`
            <label>AI-Task-Entity</label>
            <select
              @change=${(e: Event) =>
                (this.backend = {
                  ...this.backend,
                  entity_id: (e.target as HTMLSelectElement).value,
                })}
            >
              <option value="">Bitte wählen …</option>
              ${this.aiTasks.map(
                (t) => html`<option
                  value=${t.entity_id}
                  ?selected=${this.backend.entity_id === t.entity_id}
                >
                  ${t.name}${t.available ? "" : " (nicht verfügbar)"}
                </option>`,
              )}
            </select>
            ${this.aiTasks.length === 0
              ? html`<p class="hint">
                  Keine AI-Task-Entity gefunden, die Bilder annimmt. Dafür muss ein
                  passender Anbieter in Home Assistant eingerichtet sein.
                </p>`
              : nothing}
          `
        : html`
            <div class="row">
              <div class="grow">
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
              <div class="grow">
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
      <div style="border-bottom:1px solid var(--divider-color,#eee);padding:12px 0">
        <div class="row">
          <div class="grow">
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
            <select
              @change=${(e: Event) =>
                this.patchObservation(index, {
                  type: (e.target as HTMLSelectElement).value as ObservationType,
                })}
            >
              ${TYPES.map(
                ([value, label]) => html`<option
                  value=${value}
                  ?selected=${observation.type === value}
                >
                  ${label}
                </option>`,
              )}
            </select>
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
          ? html`<div class="row">
              <div class="grow">
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
              <div class="grow">
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
          ${this.lastRun && observation.key in this.lastRun.values
            ? html`<span class="muted">
                Letzte Antwort: <strong>${String(this.lastRun.values[observation.key])}</strong>
              </span>`
            : nothing}
          <span class="grow"></span>
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
      <table>
        <tr>
          <th>Zeitpunkt</th>
          <th>Auslöser</th>
          <th>Antwort</th>
          <th>Dauer</th>
        </tr>
        ${this.history.slice(0, 8).map(
          (run) => html`
            <tr>
              <td class="muted">${new Date(run.at).toLocaleString()}</td>
              <td class="muted">${run.trigger}</td>
              <td class=${run.error ? "error" : ""}>
                ${run.error ??
                Object.entries(run.values)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")}
              </td>
              <td class="muted">${run.duration === null ? "-" : `${run.duration} s`}</td>
            </tr>
          `,
        )}
      </table>
    `;
  }

  override render() {
    const state = this.profile?.state;
    return html`
      <div class="card">
        <h2>Bilderkennung für ${this.camera.name}</h2>
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
        <label>Entities, die eine Analyse starten (durch Komma getrennt)</label>
        <input
          placeholder="binary_sensor.kamera_person_detection"
          .value=${this.triggers.join(", ")}
          @change=${(e: Event) =>
            (this.triggers = (e.target as HTMLInputElement).value
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t))}
        />
        <p class="hint">
          Am besten die Personenerkennung der Kamera. Reine Bewegungsmelder
          lösen bei Wind und Regen dauernd aus.
        </p>

        <h3>Zusätzlicher Zusammenhang</h3>
        <label>Was das Modell nicht sehen kann</label>
        <input
          placeholder="Die Kamera zeigt den Gehweg vor dem Haus."
          .value=${this.context}
          @change=${(e: Event) => (this.context = (e.target as HTMLInputElement).value)}
        />

        <h3>Grenzen</h3>
        <div class="row">
          <div class="grow">
            <label>Mindestabstand in Sekunden</label>
            <input
              type="number"
              min="0"
              .value=${String(this.cooldown)}
              @change=${(e: Event) =>
                (this.cooldown = Number((e.target as HTMLInputElement).value))}
            />
          </div>
          <div class="grow">
            <label>Höchstens Analysen pro Tag</label>
            <input
              type="number"
              min="1"
              .value=${String(this.budget)}
              @change=${(e: Event) =>
                (this.budget = Number((e.target as HTMLInputElement).value))}
            />
          </div>
          <div class="grow">
            <label>Nur wenn diese Entity an ist (optional)</label>
            <input
              placeholder="alarm_control_panel.zuhause"
              .value=${this.condition}
              @change=${(e: Event) =>
                (this.condition = (e.target as HTMLInputElement).value)}
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
            @click=${() =>
              this.dispatchEvent(
                new CustomEvent("cancelled", { bubbles: true, composed: true }),
              )}
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
