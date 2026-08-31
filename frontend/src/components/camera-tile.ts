// One camera in a view: the live picture, plus whatever controls the user
// actually bound. A capability with nothing bound to it shows no button at
// all, so the panel never offers something that cannot work.

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { errorText, type CamwatchApi } from "../api";
import { capabilityLabel, PTZ_SYMBOLS } from "../capabilities";
import { shared } from "../styles";
import type { Camera, CustomControl, HomeAssistant } from "../types";
import "./live-stream";
import "./select";

/** Capabilities that are a single press, in the order a tile shows them. */
const MOMENTARY = ["ptz_up", "ptz_left", "ptz_right", "ptz_down", "siren_on", "siren_off"];
/** Capabilities that are switched on and off, so they need two buttons. */
const SWITCHABLE = ["light", "siren", "privacy_mode"];

@customElement("kustos-vision-camera-tile")
export class CamwatchCameraTile extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) api!: CamwatchApi;
  @property({ attribute: false }) camera!: Camera;
  @property() viewId = "";

  @state() private busy = "";
  @state() private error = "";

  static override styles = [
    shared,
    css`
      :host {
        display: block;
        /* shared's :host serves full-page views and sets min-height: 100%;
           a tile is a grid item and must size to its content. */
        min-height: 0;
        background: var(
          --ha-card-background,
          var(--card-background-color, Canvas)
        );
        border-radius: var(--kv-radius-card);
        border: var(--ha-card-border-width, 1px) solid
          var(--ha-card-border-color, var(--divider-color, ButtonBorder));
        box-shadow: var(--ha-card-box-shadow, none);
        overflow: hidden;
      }
      header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        font-weight: 500;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--error-color, #db4437);
        flex: none;
      }
      .dot.recording {
        background: var(--success-color, #43a047);
      }
      /* Grey, not red: nothing is wrong, nothing is meant to be recorded. */
      .dot.idle {
        background: var(--disabled-text-color, #888);
      }
      .spacer {
        flex: 1;
      }
      .meta {
        font-size: 0.8em;
        color: var(--secondary-text-color);
        font-weight: normal;
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 8px 12px 12px;
      }
      label.inline {
        /* shared's label is block with a top margin, which would break the
           control row apart. */
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin: 0;
        font-size: 0.85em;
        color: var(--secondary-text-color);
      }
      label.inline select,
      label.inline input {
        /* shared makes fields fill their row; tile controls stay compact. */
        width: auto;
        max-width: 130px;
        padding: 4px 8px;
      }
      label.inline select {
        /* Room for the shared chevron on the compact size. */
        padding-right: 28px;
      }
      label.inline kustos-vision-select {
        width: auto;
        min-width: 90px;
        max-width: 130px;
      }
      .error {
        /* shared only supplies the colour. */
        padding: 0 12px 10px;
        font-size: 0.85em;
      }
    `,
  ];

  private get liveEntity(): string | undefined {
    const streams = this.camera.streams;
    if (!streams.length) return undefined;

    // What this particular view asked for, if it asked.
    const wanted = this.camera.view_settings?.[this.viewId]?.stream_key;
    if (wanted) {
      const chosen = streams.find((s) => s.key === wanted);
      if (chosen) return chosen.entity_id;
    }

    // Otherwise a stream nobody is recording: on a camera with both that is
    // the substream, and watching it live leaves the main stream to the
    // recorder rather than pulling it from the camera a second time.
    return (streams.find((s) => !s.record) ?? streams[0]).entity_id;
  }

  /** The controls this view wants, limited to those actually bound. */
  private get shownCapabilities(): string[] {
    const chosen = this.camera.view_settings?.[this.viewId]?.capabilities;
    const wanted = chosen ?? Object.keys(this.camera.capabilities);
    return wanted.filter((key) => key in this.camera.capabilities);
  }

  private async run(
    capability: string,
    value?: boolean | string | number,
  ): Promise<void> {
    this.busy = capability;
    this.error = "";
    try {
      await this.api.trigger(this.camera.slug, capability, value);
    } catch (err) {
      this.error = errorText(err);
    } finally {
      this.busy = "";
    }
  }

  private renderButton(capability: string, label: string, value?: boolean | string) {
    return html`<button
      class="secondary compact"
      title=${capabilityLabel(capability)}
      ?disabled=${this.busy !== ""}
      @click=${() => this.run(capability, value)}
    >
      ${label}
    </button>`;
  }

  /** Custom controls this view shows, in the order they were defined. */
  private get shownControls(): CustomControl[] {
    const chosen = this.camera.view_settings?.[this.viewId]?.capabilities;
    const controls = this.camera.controls ?? [];
    if (!chosen) return controls;
    const wanted = new Set(chosen);
    return controls.filter((c) => wanted.has(c.key));
  }

  /** The live state of the entity behind a control, for its options and range. */
  private entityState(control: CustomControl) {
    const entityId = control.binding.entity_id;
    return entityId ? this.hass?.states?.[entityId] : undefined;
  }

  private renderCustom(control: CustomControl) {
    const state = this.entityState(control);
    switch (control.kind) {
      case "switch":
        return html`
          ${this.renderButton(control.key, `${control.name} an`, true)}
          ${this.renderButton(control.key, `${control.name} aus`, false)}
        `;
      case "select": {
        const options = (state?.attributes?.options as string[]) ?? [];
        if (!options.length) {
          return html`<span class="meta">${control.name}: keine Optionen</span>`;
        }
        return html`<label class="inline">
          ${control.name}
          <kustos-vision-select
            compact
            .options=${options.map((option) => ({
              value: option,
              label: option,
            }))}
            .value=${state?.state ?? ""}
            ?disabled=${this.busy !== ""}
            @value-changed=${(e: CustomEvent<{ value: string }>) =>
              this.run(control.key, e.detail.value)}
          ></kustos-vision-select>
        </label>`;
      }
      case "number":
        return html`<label class="inline">
          ${control.name}
          <input
            type="number"
            min=${String(state?.attributes?.min ?? "")}
            max=${String(state?.attributes?.max ?? "")}
            .value=${state?.state ?? ""}
            ?disabled=${this.busy !== ""}
            @change=${(e: Event) =>
              this.run(control.key, Number((e.target as HTMLInputElement).value))}
          />
        </label>`;
      default:
        return this.renderButton(control.key, control.name);
    }
  }

  private renderControls() {
    const shown = this.shownCapabilities;
    const custom = this.shownControls;
    if (!shown.length && !custom.length) return nothing;

    const buttons = [];
    for (const key of MOMENTARY) {
      if (!shown.includes(key)) continue;
      buttons.push(this.renderButton(key, PTZ_SYMBOLS[key] ?? capabilityLabel(key)));
    }
    for (const key of SWITCHABLE) {
      if (!shown.includes(key)) continue;
      buttons.push(
        this.renderButton(key, `${capabilityLabel(key)} an`, true),
        this.renderButton(key, `${capabilityLabel(key)} aus`, false),
      );
    }
    return html`<div class="controls">
      ${buttons}${custom.map((control) => this.renderCustom(control))}
    </div>`;
  }

  override render() {
    const entity = this.liveEntity;
    const state = this.camera.state;
    const streams = state.streams.filter((s) => s.running).length;

    return html`
      <header>
        <span
          class="dot ${state.recording ? "recording" : ""} ${
            state.wants_recording ? "" : "idle"
          }"
          title=${
            state.recording
              ? `${streams} Stream(s) werden aufgezeichnet`
              : !state.wants_recording
                ? "Für diese Kamera ist keine Aufzeichnung eingerichtet"
                : state.paused
                  ? "Aufzeichnung pausiert"
                  : "Aufzeichnung läuft nicht"
          }
        ></span>
        <span>${this.camera.name}</span>
        <span class="spacer"></span>
        ${state.paused ? html`<span class="meta">pausiert</span>` : nothing}
      </header>

      ${entity
        ? html`<kustos-vision-live-stream
            .hass=${this.hass}
            .entityId=${entity}
          ></kustos-vision-live-stream>`
        : html`<div class="meta" style="padding:12px">Kein Stream zugeordnet</div>`}

      ${this.renderControls()}
      ${this.error ? html`<div class="error">${this.error}</div>` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kustos-vision-camera-tile": CamwatchCameraTile;
  }
}
