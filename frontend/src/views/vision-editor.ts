// Defining what a camera is analysed for.
//
// The questions are the substance here. Each one becomes both a sensor and a
// field the model has to fill in, so writing a good question is the actual
// work, and the panel is built around making that easy to try and to correct:
// analyse now, see the raw answer, adjust the wording.

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { errorText, type CamwatchApi } from "../api";
import "../components/annotate-dialog";
import type { CamwatchAnnotateDialog } from "../components/annotate-dialog";
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
  EndpointConfig,
  HomeAssistant,
  Observation,
  ObservationType,
  ReferenceImage,
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

/** Mirrors the backend cap (core/references.py): every extra image costs the
 *  model a tile budget, and an overflowing request fails wholesale. */
const MAX_REFERENCES_PER_OBSERVATION = 2;

/** Select value standing for a profile that still carries its own URL from
 *  before endpoints existed. Kept selectable so nothing breaks on open;
 *  picking a real endpoint replaces it for good. */
const DIRECT_ENTRY = "__direct__";

@customElement("kustos-vision-vision-editor")
export class CamwatchVisionEditor extends LitElement {
  @property({ attribute: false }) api!: CamwatchApi;
  @property({ attribute: false }) camera!: Camera;
  @property({ attribute: false }) profile?: VisionProfile;
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) endpoints: EndpointConfig[] = [];

  @state() private backend: VisionBackend = { kind: "openai" };
  @state() private observations: Observation[] = [];
  @state() private triggers: string[] = [];
  @state() private addingTrigger = false;
  @state() private context = "";
  @state() private cooldown = 60;
  @state() private budget = 100;
  @state() private enabled = true;
  @state() private detectPersons = false;
  @state() private frameSensor = false;
  @state() private markObjects = false;
  @state() private marksModel = "";

  /** Asset id of the pinned normal-scene picture; empty = none. Named apart
   *  from `baseline` below, which is this editor's dirty-tracking snapshot. */
  @state() private sceneBaseline = "";

  @state() private aiTasks: AiTaskEntity[] = [];
  @state() private history: AnalysisRun[] = [];
  @state() private frameUrls = new Map<string, string>();
  @state() private referenceUrls = new Map<string, string>();
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
      .refrow {
        align-items: center;
      }
      .refthumb {
        display: block;
        height: 64px;
        border-radius: 4px;
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
      this.detectPersons = this.profile.detect_persons ?? false;
      this.frameSensor = this.profile.frame_sensor ?? false;
      this.markObjects = this.profile.mark_objects ?? false;
      this.marksModel = this.profile.marks_model ?? "";
      this.sceneBaseline = this.profile.baseline ?? "";
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

  /** A profile that would have nothing to analyse cannot be saved.

      Regression: this used to demand at least one question, which locked
      the Speichern button for a camera that should ONLY recognise persons -
      while the navigation guard's save happily stored exactly that. */
  private saveBlocked(): boolean {
    return this.observations.length === 0 && !this.detectPersons;
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
      detect_persons: this.detectPersons,
      frame_sensor: this.frameSensor,
      mark_objects: this.markObjects,
      marks_model: this.marksModel,
      baseline: this.sceneBaseline,
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

  // ------------------------------------------------------------------
  // Reference pictures
  // ------------------------------------------------------------------

  /** A displayable URL for a stored picture, signed lazily on first use. */
  private referenceUrl(assetId: string): string | undefined {
    const known = this.referenceUrls.get(assetId);
    if (known !== undefined) return known || undefined;
    this.referenceUrls.set(assetId, ""); // marks the signing as in flight
    void this.api
      .referenceUrl(assetId)
      .then((url) => {
        this.referenceUrls = new Map(this.referenceUrls).set(assetId, url);
      })
      .catch(() => {
        // The thumbnail simply stays empty.
      });
    return undefined;
  }

  /** Append an uploaded or captured picture to one question, unsaved. */
  private async appendReference(index: number, assetId: string): Promise<void> {
    const existing = this.observations[index].references ?? [];
    if (existing.length >= MAX_REFERENCES_PER_OBSERVATION) return;
    this.patchObservation(index, {
      references: [...existing, { asset_id: assetId, caption: "" }],
    });
    // A reference without a label is the half of the feature that does not
    // work - put the cursor where the label goes. (Disconnected, updates are
    // deferred and updateComplete would never settle - and there is nothing
    // to focus anyway.)
    if (!this.isConnected) return;
    await this.updateComplete;
    const captions = this.renderRoot.querySelectorAll<HTMLInputElement>(
      `input[data-caption-for="${index}"]`,
    );
    captions[captions.length - 1]?.focus();
  }

  private patchReference(
    index: number,
    refIndex: number,
    patch: Partial<ReferenceImage>,
  ): void {
    const references = (this.observations[index].references ?? []).map(
      (reference, i) => (i === refIndex ? { ...reference, ...patch } : reference),
    );
    this.patchObservation(index, { references });
  }

  private removeReference(index: number, refIndex: number): void {
    // Only the configuration changes here; the stored file is the orphan
    // sweep's business once the profile is saved, so cancelling the edit
    // cannot strand a picture the config still names.
    const references = (this.observations[index].references ?? []).filter(
      (_, i) => i !== refIndex,
    );
    this.patchObservation(index, { references });
  }

  private async uploadReferenceFile(
    index: number,
    input: HTMLInputElement,
  ): Promise<void> {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    this.busy = true;
    this.error = "";
    try {
      const { asset_id } = await this.api.uploadReference(file);
      await this.appendReference(index, asset_id);
    } catch (err) {
      this.error = errorText(err);
    } finally {
      this.busy = false;
    }
  }

  private async captureReferenceNow(index: number): Promise<void> {
    this.busy = true;
    this.error = "";
    try {
      const { asset_id } = await this.api.captureReference(this.camera.slug);
      await this.appendReference(index, asset_id);
    } catch (err) {
      this.error = errorText(err);
    } finally {
      this.busy = false;
    }
  }

  /** Pin the camera's picture of THIS moment as its normal scene. Capture
   *  only, no upload: a photo from anywhere else would differ from the live
   *  frames everywhere, and "what differs" is the whole point. */
  private async captureSceneBaseline(): Promise<void> {
    this.busy = true;
    this.error = "";
    try {
      const { asset_id } = await this.api.captureReference(this.camera.slug);
      this.sceneBaseline = asset_id;
    } catch (err) {
      this.error = errorText(err);
    } finally {
      this.busy = false;
    }
  }

  /** Open the drawing tool on the ORIGINAL picture; store the regions and
   *  upload the burned copy the model will actually see. */
  private async annotateReference(index: number, refIndex: number): Promise<void> {
    const reference = this.observations[index].references?.[refIndex];
    const dialog = this.renderRoot.querySelector<CamwatchAnnotateDialog>(
      "kustos-vision-annotate-dialog",
    );
    if (!reference || !dialog) return;
    this.error = "";
    try {
      const src = await this.api.referenceUrl(reference.asset_id);
      const result = await dialog.edit(src, reference.regions ?? []);
      if (result === null) return;
      if (result.burned && result.regions.length > 0) {
        const { asset_id } = await this.api.uploadReference(result.burned);
        this.patchReference(index, refIndex, {
          regions: result.regions,
          burned_asset_id: asset_id,
        });
      } else {
        // Everything erased: the original travels again.
        this.patchReference(index, refIndex, {
          regions: [],
          burned_asset_id: "",
        });
      }
    } catch (err) {
      this.error = errorText(err);
    }
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
        : this.renderOpenAiBackend()}
    `;
  }

  /** Endpoint and model come from lists; the free-text trio (URL, model,
   *  key) survives only for a profile saved before endpoints existed. */
  private renderOpenAiBackend() {
    const legacy = !this.backend.endpoint_id && !!this.backend.url;
    const direct = legacy || (!this.backend.endpoint_id && this.endpoints.length === 0);
    const chosen = this.endpoints.find(
      (e) => e.id === this.backend.endpoint_id,
    );

    if (this.endpoints.length === 0 && !legacy) {
      return html`<p class="hint">
        Noch kein Endpunkt angelegt. Endpunkte verwalten Sie auf der
        Übersichtsseite der Bilderkennung unter „Modell-Endpunkte"; danach
        wählen Sie hier nur noch Endpunkt und Modell aus.
      </p>`;
    }

    const models = chosen?.models ?? [];
    const model = this.backend.model ?? "";
    const modelOptions = [
      // A saved model the endpoint no longer lists stays selectable, so
      // opening the editor never silently rewrites a working profile.
      ...(model && !models.includes(model)
        ? [{ value: model, label: `${model} (nicht in der Modell-Liste)` }]
        : []),
      ...models.map((m) => ({ value: m, label: m })),
    ];

    return html`
      <div class="fields">
        <div>
          <label>Endpunkt</label>
          <kustos-vision-select
            .options=${[
              ...(this.backend.endpoint_id || legacy
                ? []
                : [{ value: "", label: "Bitte wählen …" }]),
              ...(legacy
                ? [
                    {
                      value: DIRECT_ENTRY,
                      label: `Direkteingabe: ${this.backend.url}`,
                    },
                  ]
                : []),
              ...this.endpoints.map((e) => ({
                value: e.id,
                label: `${e.name} (${e.url})`,
              })),
            ]}
            .value=${this.backend.endpoint_id || (legacy ? DIRECT_ENTRY : "")}
            @value-changed=${(e: CustomEvent<{ value: string }>) => {
              const value = e.detail.value;
              if (value === DIRECT_ENTRY || value === "") return;
              const endpoint = this.endpoints.find((ep) => ep.id === value);
              this.backend = {
                ...this.backend,
                endpoint_id: value,
                // The endpoint owns the connection from here on.
                url: undefined,
                api_key: undefined,
                model:
                  this.backend.model &&
                  endpoint?.models?.includes(this.backend.model)
                    ? this.backend.model
                    : (endpoint?.models?.[0] ?? this.backend.model),
              };
            }}
          ></kustos-vision-select>
        </div>
        <div>
          <label>Modell</label>
          ${direct
            ? html`<input
                .value=${model}
                @change=${(e: Event) =>
                  (this.backend = {
                    ...this.backend,
                    model: (e.target as HTMLInputElement).value,
                  })}
              />`
            : html`<kustos-vision-select
                .options=${modelOptions.length
                  ? modelOptions
                  : [{ value: "", label: "Keine Modelle am Endpunkt hinterlegt" }]}
                .value=${model}
                @value-changed=${(e: CustomEvent<{ value: string }>) =>
                  (this.backend = { ...this.backend, model: e.detail.value })}
              ></kustos-vision-select>`}
        </div>
      </div>
      ${direct && legacy
        ? html`<label>Schlüssel (bei lokalen Modellen meist leer)</label>
            <input
              type="password"
              .value=${this.backend.api_key ?? ""}
              @change=${(e: Event) =>
                (this.backend = {
                  ...this.backend,
                  api_key: (e.target as HTMLInputElement).value || undefined,
                })}
            />`
        : nothing}
      ${!direct && models.length === 0
        ? html`<p class="hint">
            Für diesen Endpunkt sind noch keine Modelle hinterlegt. Auf der
            Übersichtsseite unter „Modell-Endpunkte" lassen sie sich
            automatisch ermitteln oder von Hand eintragen.
          </p>`
        : nothing}
      <div class="fields">
        <div>
          <label>Zeitlimit in Sekunden</label>
          <input
            type="number"
            min="1"
            .value=${String(this.backend.timeout_seconds ?? 120)}
            @change=${(e: Event) =>
              (this.backend = {
                ...this.backend,
                timeout_seconds:
                  Number((e.target as HTMLInputElement).value) || 120,
              })}
          />
        </div>
      </div>
      <p class="hint">
        Wie lange auf die Antwort des Modells gewartet wird. Muss ein Server
        wie llama-swap das Modell erst laden, zählt auch die Ladezeit mit;
        für Modellwechsel-Tests lohnt ein großzügiger Wert.
      </p>
      <p class="hint">
        Das Modell muss Bilder verarbeiten können. Bei llama.cpp heißt das:
        mit einer mmproj-Datei geladen.
      </p>
    `;
  }

  /** Who locates the objects: the main model in one request, or a second
   *  grounding model at the same endpoint (the split flow). */
  private renderMarksModel() {
    const chosen = this.endpoints.find(
      (e) => e.id === this.backend.endpoint_id,
    );
    const models = chosen?.models ?? [];
    const current = this.marksModel;
    return html`
      <div class="fields">
        <div>
          <label>Modell für die Positionen</label>
          ${models.length > 0
            ? html`<kustos-vision-select
                .options=${[
                  { value: "", label: "Hauptmodell (eine Anfrage)" },
                  ...(current && !models.includes(current)
                    ? [
                        {
                          value: current,
                          label: `${current} (nicht in der Modell-Liste)`,
                        },
                      ]
                    : []),
                  ...models.map((m) => ({ value: m, label: m })),
                ]}
                .value=${current}
                @value-changed=${(e: CustomEvent<{ value: string }>) =>
                  (this.marksModel = e.detail.value)}
              ></kustos-vision-select>`
            : html`<input
                placeholder="leer = Hauptmodell"
                .value=${current}
                @change=${(e: Event) =>
                  (this.marksModel = (e.target as HTMLInputElement).value)}
              />`}
        </div>
      </div>
      <p class="hint">
        Leer erledigt das Hauptmodell alles in einer Anfrage, richtig für
        starke Modelle oder wenn nur eines zur Verfügung steht. Mit einem
        eigenen Positions-Modell benennt das Hauptmodell nur noch, was es
        erkennt, und das zweite Modell verortet genau diese Namen, sinnvoll,
        wenn ein kleines Grounding-Modell die Boxen deutlich präziser setzt.
      </p>
    `;
  }

  private renderObservation(observation: Observation, index: number) {
    return html`
      <div class="divided">
        <label>Frage an das Modell</label>
        <textarea
          rows="2"
          placeholder="Liegt ein Paket vor der Haustür?"
          .value=${observation.question}
          @change=${(e: Event) =>
            this.patchObservation(index, {
              question: (e.target as HTMLTextAreaElement).value,
            })}
        ></textarea>
        <div class="fields">
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

        ${this.renderReferences(observation, index)}

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

  private renderReferences(observation: Observation, index: number) {
    const references = observation.references ?? [];
    const full = references.length >= MAX_REFERENCES_PER_OBSERVATION;
    return html`
      <details class="expander" ?open=${references.length > 0}>
        <summary>Referenzbilder (${references.length})</summary>
        <div class="expander-body">
          <p class="hint">
            Bilder, die dem Modell zeigen, was gemeint ist, zum Beispiel ein
            Foto des Hinterhofs mit allen Mülltonnen. Sie werden bei jeder
            Analyse mitgeschickt, sind aber ausdrücklich kein Beleg dafür,
            dass etwas gerade zu sehen ist.
          </p>
          ${references.map(
            (reference, refIndex) => html`
              <div class="row refrow">
                ${this.referenceUrl(reference.burned_asset_id || reference.asset_id)
                  ? html`<img
                      class="refthumb"
                      src=${this.referenceUrl(
                        reference.burned_asset_id || reference.asset_id,
                      )!}
                      alt="Referenzbild"
                    />`
                  : html`<span class="muted">Bild wird geladen …</span>`}
                <div class="grow">
                  <label>Beschreibung (was ist was?)</label>
                  <input
                    data-caption-for=${index}
                    .value=${reference.caption ?? ""}
                    placeholder="Links die gelbe Tonne, rechts die schwarze."
                    @change=${(e: Event) =>
                      this.patchReference(index, refIndex, {
                        caption: (e.target as HTMLInputElement).value,
                      })}
                  />
                </div>
                <button
                  class="secondary compact"
                  ?disabled=${this.busy}
                  @click=${() => this.annotateReference(index, refIndex)}
                >
                  ${(reference.regions?.length ?? 0) > 0
                    ? `Beschriften (${reference.regions!.length})`
                    : "Beschriften"}
                </button>
                <button
                  class="danger compact"
                  ?disabled=${this.busy}
                  @click=${() => this.removeReference(index, refIndex)}
                >
                  Entfernen
                </button>
              </div>
            `,
          )}
          <div class="row" style="margin-top:8px">
            <button
              class="secondary"
              ?disabled=${this.busy || full}
              @click=${() =>
                this.renderRoot
                  .querySelector<HTMLInputElement>(
                    `input[data-upload-for="${index}"]`,
                  )
                  ?.click()}
            >
              Bild hochladen
            </button>
            <input
              type="file"
              accept="image/jpeg,image/png"
              hidden
              data-upload-for=${index}
              @change=${(e: Event) =>
                this.uploadReferenceFile(index, e.target as HTMLInputElement)}
            />
            <button
              class="secondary"
              ?disabled=${this.busy || full}
              @click=${() => this.captureReferenceNow(index)}
            >
              Aktuelles Kamerabild übernehmen
            </button>
            ${full
              ? html`<span class="muted">
                  Höchstens ${MAX_REFERENCES_PER_OBSERVATION} Bilder je Frage:
                  jedes weitere Bild verkleinert den Platz, den das Modell für
                  die eigentliche Analyse hat.
                </span>`
              : nothing}
          </div>
        </div>
      </details>
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
        <textarea
          rows="3"
          placeholder="Die Kamera zeigt den Gehweg vor dem Haus."
          .value=${this.context}
          @change=${(e: Event) =>
            (this.context = (e.target as HTMLTextAreaElement).value)}
        ></textarea>

        <label style="margin-top:8px">Referenzbild der Normalszene</label>
        <div class="row refrow">
          ${this.sceneBaseline
            ? html`${this.referenceUrl(this.sceneBaseline)
                  ? html`<img
                      class="refthumb"
                      src=${this.referenceUrl(this.sceneBaseline)!}
                      alt="Normalszene"
                    />`
                  : html`<span class="muted">Bild wird geladen …</span>`}
                <button
                  class="danger compact"
                  ?disabled=${this.busy}
                  @click=${() => (this.sceneBaseline = "")}
                >
                  Entfernen
                </button>`
            : nothing}
          <button
            class="secondary"
            ?disabled=${this.busy}
            @click=${() => this.captureSceneBaseline()}
          >
            ${this.sceneBaseline
              ? "Neu aus aktuellem Kamerabild übernehmen"
              : "Aktuelles Kamerabild übernehmen"}
          </button>
        </div>
        <p class="hint">
          Ein Bild dieser Kamera, das die Szene ohne Besonderheiten zeigt. Es
          wird bei jeder Analyse mitgeschickt: Was vom Referenzbild abweicht,
          also neu, verschwunden oder verschoben ist, bekommt bei der
          Objekterkennung Vorrang. Übernehmen Sie es in einem Moment, in dem
          nichts Ungewöhnliches zu sehen ist.
        </p>

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
              .checked=${this.detectPersons}
              @change=${(e: Event) =>
                (this.detectPersons = (e.target as HTMLInputElement).checked)}
            />
            Personenerkennung
          </label>
        </div>
        <p class="hint">
          Fragt bei jeder Analyse dieser Kamera zusätzlich, ob eine der
          angelegten Personen zu sehen ist. Die Personen und ihre Fotos
          verwalten Sie auf der Übersichtsseite der Bilderkennung.
        </p>

        <div class="row" style="margin-top:8px">
          <label style="margin:0">
            <input
              type="checkbox"
              .checked=${this.frameSensor}
              @change=${(e: Event) =>
                (this.frameSensor = (e.target as HTMLInputElement).checked)}
            />
            Bild-Entität
          </label>
        </div>
        <p class="hint">
          Stellt das Bild der jeweils letzten Analyse als Bild-Entität an der
          Kamera bereit. Damit können Automationen den analysierten Screenshot
          zum Beispiel an eine Push-Benachrichtigung anhängen.
        </p>

        ${this.frameSensor
          ? html`
              <div class="row" style="margin-top:8px">
                <label style="margin:0">
                  <input
                    type="checkbox"
                    .checked=${this.markObjects}
                    @change=${(e: Event) =>
                      (this.markObjects = (e.target as HTMLInputElement).checked)}
                  />
                  Erkannte Objekte markieren
                </label>
              </div>
              <p class="hint">
                Fragt das Modell zusätzlich, wo die gemeldeten Objekte im Bild
                liegen, und zeichnet farbige, beschriftete Rahmen in das Bild
                der Bild-Entität. Wie treffsicher die Positionen sind, hängt
                vom Modell ab; die Antworten der Sensoren bleiben davon
                unberührt.
              </p>
              ${this.markObjects ? this.renderMarksModel() : nothing}
            `
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

        ${this.saveBlocked() && !this.busy
          ? html`<p class="hint">
              Ohne Frage und ohne Personenerkennung gäbe es nichts zu
              analysieren. Legen Sie eine Frage an oder schalten Sie die
              Personenerkennung ein.
            </p>`
          : nothing}
        <div class="row" style="margin-top:16px">
          <button ?disabled=${this.busy || this.saveBlocked()} @click=${this.save}>
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
      <kustos-vision-annotate-dialog></kustos-vision-annotate-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kustos-vision-vision-editor": CamwatchVisionEditor;
  }
}
