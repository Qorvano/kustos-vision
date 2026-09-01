// The recordings tab: pick a camera and a day, see what exists, watch it.

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { errorText, type CamwatchApi } from "../api";
import { shared } from "../styles";
import type { Camera, TimelineBlock, TimelineSegment } from "../types";
import "../components/player";
import "../components/select";
import "../components/timeline";

/* Mirrors MAX_EXPORT_SECONDS on the Python side, so the button can say why
   it is disabled instead of letting the request bounce. */
const MAX_EXPORT_HOURS = 25;

/* The stamped export's quality ladder, mirroring STAMP_QUALITY_CRF on the
   Python side. The size shares were measured on daylight HD footage against
   its raw join; encoding time is the same on every step, about as long as
   the material itself. */
const STAMP_QUALITIES = [
  { value: "high", label: "Beste Qualität", share: "etwa 120 %" },
  { value: "balanced", label: "Ausgewogen", share: "etwa 90 %" },
  { value: "compact", label: "Kompakt", share: "etwa 65 %" },
  { value: "small", label: "Klein", share: "etwa 45 %" },
];

/** The local calendar day after the given one, as YYYY-MM-DD. */
function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

@customElement("kustos-vision-recordings")
export class CamwatchRecordings extends LitElement {
  @property({ attribute: false }) api!: CamwatchApi;
  @property({ attribute: false }) cameras: Camera[] = [];
  /** Whether the server's ffmpeg can draw the clock at all. */
  @property({ type: Boolean }) stampAvailable = false;

  @state() private camera = "";
  @state() private stream = "";
  @state() private day = "";
  @state() private days: string[] = [];
  @state() private blocks: TimelineBlock[] = [];
  @state() private segments: TimelineSegment[] = [];
  @state() private position = 0;
  @state() private seekTo = 0;
  @state() private busy = false;
  /** A drag on the timeline is in progress; playback reports pause then. */
  private scrubbing = false;
  @state() private downloading = false;
  /** Burn the recording clock into the download, at transcoding cost. */
  @state() private stampExport = false;
  /** The stamped export's size/quality step; the backend's default. */
  @state() private stampQuality = "balanced";
  @state() private error = "";
  /** The minute-precise range export: date and time held separately. The
      date goes through the panel's own dropdown because the native calendar
      popup opens downward only and gets cut off at the bottom of the page;
      each bound carries its own date so a range may cross midnight. */
  @state() private rangeFromDay = "";
  @state() private rangeFromTime = "";
  @state() private rangeToDay = "";
  @state() private rangeToTime = "";
  /** Which day the range fields were last preset for, see loadDay. */
  private rangeDay = "";

  static override styles = [
    shared,
    css`
      /* The tab has to fit on one screen: picker, picture and timeline all
         visible at once, because scrolling to reach the timeline while
         watching the picture defeats the point of having both. So the view
         takes exactly the height it is given and hands what is left over to
         the player, rather than letting the player's aspect ratio decide how
         tall the page is. On a wide window 16:9 came out taller than the
         window itself. */
      :host {
        display: flex;
        flex-direction: column;
        flex: 1;
        /* Without this a flex child never shrinks below its content, and the
           player's own height would win again. */
        min-height: 0;
      }
      .page {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        padding: 16px;
        box-sizing: border-box;
        gap: 12px;
        /* Not hidden. On a window too short for even the smallest useful
           picture the leftover has to stay reachable; clipping it would hide
           the camera picker or a error message with no way to get at them. */
        overflow: auto;
      }
      /* The picker, the timeline and the download row keep their natural
         height; only the picture grows into what is left. */
      kustos-vision-player {
        flex: 1;
        /* Lets the picture shrink past its own 16:9 shape, which is the whole
           point: the window decides how tall it is, not the aspect ratio. */
        min-height: 0;
        /* But not to nothing. flex-basis 0 plus min-height 0 leaves a flex
           item with no floor at all, so on a short window the picture
           collapsed to zero pixels and even the error overlay inside it went
           with it, leaving no sign that a player was there. A video element
           spends roughly the first forty pixels on its own control bar, so
           below this there is no picture left to look at and scrolling is the
           better answer than a strip. */
        min-height: 160px;
      }
      .page .card {
        margin-bottom: 0;
      }
      /* The two cards under the picture share the width and wrap when it
         runs out. */
      .cards {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        flex-wrap: wrap;
      }
      .cards .card {
        flex: 1 1 320px;
      }
      /* Secondary controls now: each picker keeps a modest width instead
         of stretching across the card. */
      .picker {
        width: 200px;
      }
      /* One range bound: its date dropdown and its time side by side. */
      .rangefields {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .rangefields .rangeday {
        width: 140px;
      }
      .rangefields .rangetime {
        width: 110px;
      }
      label.stamp {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0;
        white-space: nowrap;
      }
    `,
  ];

  override updated(changed: Map<string, unknown>): void {
    if (changed.has("cameras") && !this.camera && this.cameras.length > 0) {
      this.selectCamera(this.cameras[0].slug);
    }
  }

  private get bounds(): [number, number] {
    if (!this.day) return [0, 0];
    // A local calendar day, which is what the picker offered and what the
    // viewer is thinking in. On the two days a year the clock changes, this is
    // 23 or 25 hours long, and the bar is right either way.
    const start = new Date(`${this.day}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return [start.getTime() / 1000, end.getTime() / 1000];
  }

  private async selectCamera(slug: string): Promise<void> {
    this.camera = slug;
    this.stream = "";
    this.error = "";
    this.busy = true;
    try {
      const { days } = await this.api.recordingDays(slug);
      this.days = days;
      this.day = days[days.length - 1] ?? "";
      await this.loadDay();
    } catch (err) {
      this.error = errorText(err);
    } finally {
      this.busy = false;
    }
  }

  private async loadDay(): Promise<void> {
    if (!this.camera || !this.day) {
      this.blocks = [];
      this.segments = [];
      return;
    }
    if (this.rangeDay !== this.day) {
      // A fresh day presets the range to that whole day; from there the
      // fields are the user's, including a Bis on the following day.
      this.rangeDay = this.day;
      this.rangeFromDay = this.day;
      this.rangeFromTime = "00:00";
      this.rangeToDay = nextDay(this.day);
      this.rangeToTime = "00:00";
    }
    const [from, to] = this.bounds;
    this.busy = true;
    this.error = "";
    try {
      const result = await this.api.timeline(
        this.camera,
        from,
        to,
        this.stream || undefined,
      );
      this.blocks = result.blocks;
      this.segments = result.segments;
      this.position = result.segments[0]?.start ?? from;
      this.seekTo = this.position;
    } catch (err) {
      this.error = errorText(err);
    } finally {
      this.busy = false;
    }
  }

  private get streamKeys(): string[] {
    const camera = this.cameras.find((c) => c.slug === this.camera);
    return camera ? camera.streams.map((s) => s.key) : [];
  }

  private exportUrl(): string {
    const [from, to] = this.bounds;
    return this.exportUrlFor(from, to);
  }

  private exportUrlFor(from: number, to: number): string {
    const params = new URLSearchParams({
      camera: this.camera,
      from: String(from),
      to: String(to),
    });
    if (this.stream) params.set("stream", this.stream);
    if (this.stampExport && this.stampAvailable) {
      params.set("stamp", "1");
      params.set("quality", this.stampQuality);
    }
    return `/api/kustos_vision/export?${params.toString()}`;
  }

  /** The days a range may end on: every recorded day plus the day after
      each, so an end at midnight sharp past the last footage stays
      pickable. Newest first, like the day picker. */
  private rangeToDays(): string[] {
    const days = new Set<string>();
    for (const day of this.days) {
      days.add(day);
      days.add(nextDay(day));
    }
    return [...days].sort().reverse();
  }

  /** The chosen range as epoch seconds, or nothing while a field is empty. */
  private rangeBounds(): [number, number] | undefined {
    if (
      !this.rangeFromDay ||
      !this.rangeFromTime ||
      !this.rangeToDay ||
      !this.rangeToTime
    ) {
      return undefined;
    }
    const from =
      new Date(`${this.rangeFromDay}T${this.rangeFromTime}:00`).getTime() / 1000;
    const to =
      new Date(`${this.rangeToDay}T${this.rangeToTime}:00`).getTime() / 1000;
    if (Number.isNaN(from) || Number.isNaN(to)) return undefined;
    return [from, to];
  }

  /** Why the range cannot be downloaded, or nothing when it can. */
  private rangeProblem(): string | undefined {
    const bounds = this.rangeBounds();
    if (!bounds) return "Von und Bis brauchen jeweils Datum und Uhrzeit.";
    const [from, to] = bounds;
    if (to <= from) return "Bis muss nach Von liegen.";
    if (to - from > MAX_EXPORT_HOURS * 3600) {
      return `Ein Export deckt höchstens ${MAX_EXPORT_HOURS} Stunden ab.`;
    }
    return undefined;
  }

  private async downloadRange(): Promise<void> {
    const bounds = this.rangeBounds();
    if (!bounds) return;
    this.downloading = true;
    this.error = "";
    try {
      const url = await this.api.signedUrl(this.exportUrlFor(...bounds));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "";
      anchor.style.display = "none";
      this.renderRoot.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      this.error = errorText(err);
    } finally {
      this.downloading = false;
    }
  }

  /**
   * Hand the browser a download it can actually fetch.
   *
   * A plain link would go out without credentials and be refused, because the
   * export endpoint requires authentication and an anchor cannot send a
   * header. Signing the address first is Home Assistant's own answer to this,
   * and letting the browser do the transfer keeps a recording of several
   * gigabytes out of the page's memory.
   */
  private async download(): Promise<void> {
    this.downloading = true;
    this.error = "";
    try {
      const url = await this.api.signedUrl(this.exportUrl());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "";
      anchor.style.display = "none";
      this.renderRoot.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      this.error = errorText(err);
    } finally {
      this.downloading = false;
    }
  }

  override render() {
    if (this.cameras.length === 0) {
      return html`<div style="padding:32px" class="muted">
        Noch keine Kamera eingerichtet.
      </div>`;
    }

    const keys = this.streamKeys;
    return html`
      <div class="page">
        <kustos-vision-player
          .api=${this.api}
          .segments=${this.segments}
          .seekTo=${this.seekTo}
          @positionchange=${(e: CustomEvent<{ time: number }>) => {
            // While a finger drags the cursor, the running video keeps
            // reporting its own clock; letting that through made the cursor
            // flick back and forth between the two several times a second.
            if (this.scrubbing) return;
            // A tick from a run being torn down carries the old day's
            // clock and would strand the cursor outside the timeline.
            const [from, to] = this.bounds;
            if (e.detail.time < from || e.detail.time > to) return;
            this.position = e.detail.time;
          }}
        ></kustos-vision-player>

        <div>
          <kustos-vision-timeline
            .api=${this.api}
            .from=${this.bounds[0]}
            .to=${this.bounds[1]}
            .blocks=${this.blocks}
            .segments=${this.segments}
            .position=${this.position}
            @scrub=${(e: CustomEvent<{ time: number }>) => {
              this.scrubbing = true;
              this.position = e.detail.time;
            }}
            @scrubend=${() => {
              this.scrubbing = false;
            }}
            @seek=${(e: CustomEvent<{ time: number }>) => {
              this.scrubbing = false;
              this.position = e.detail.time;
              this.seekTo = e.detail.time;
            }}
          ></kustos-vision-timeline>
        </div>

        <div class="cards">
          <div class="card">
            <h2>Auswahl</h2>
            <div class="row">
              <div class="picker">
                <label>Kamera</label>
                <kustos-vision-select
                  compact
                  .options=${this.cameras.map((c) => ({
                    value: c.slug,
                    label: c.name,
                  }))}
                  .value=${this.camera}
                  @value-changed=${(e: CustomEvent<{ value: string }>) =>
                    this.selectCamera(e.detail.value)}
                ></kustos-vision-select>
              </div>
              <div class="picker">
                <label>Tag</label>
                <kustos-vision-select
                  compact
                  .options=${this.days.length === 0
                    ? [{ value: "", label: "keine Aufnahmen" }]
                    : this.days.map((d) => ({ value: d, label: d }))}
                  .value=${this.days.length === 0 ? "" : this.day}
                  @value-changed=${(e: CustomEvent<{ value: string }>) => {
                    if (!e.detail.value) return;
                    this.day = e.detail.value;
                    void this.loadDay();
                  }}
                ></kustos-vision-select>
              </div>
              ${keys.length > 1
                ? html`<div class="picker">
                    <label>Stream</label>
                    <kustos-vision-select
                      compact
                      .options=${[
                        { value: "", label: "alle" },
                        ...keys.map((k) => ({ value: k, label: k })),
                      ]}
                      .value=${this.stream}
                      @value-changed=${(e: CustomEvent<{ value: string }>) => {
                        this.stream = e.detail.value;
                        void this.loadDay();
                      }}
                    ></kustos-vision-select>
                  </div>`
                : nothing}
            </div>
            ${this.error ? html`<p class="error">${this.error}</p>` : nothing}
          </div>

          <div class="card">
            <h2>Download</h2>
            <div class="row">
              <button
                class="secondary"
                ?disabled=${this.busy ||
                this.downloading ||
                this.segments.length === 0}
                @click=${this.download}
              >
                Diesen Tag herunterladen
              </button>
              <label class="stamp" title=${this.stampAvailable
                ? "Aufnahmezeit sichtbar ins Bild schreiben"
                : "Das ffmpeg dieser Installation kann keinen Text zeichnen"}>
                <input
                  type="checkbox"
                  ?disabled=${!this.stampAvailable}
                  .checked=${this.stampExport && this.stampAvailable}
                  @change=${(e: Event) => {
                    this.stampExport = (e.target as HTMLInputElement).checked;
                  }}
                />
                Zeitstempel einbrennen
              </label>
              ${this.stampExport && this.stampAvailable
                ? html`<div class="picker">
                    <label>Qualität</label>
                    <kustos-vision-select
                      compact
                      .options=${STAMP_QUALITIES.map(({ value, label }) => ({
                        value,
                        label,
                      }))}
                      .value=${this.stampQuality}
                      @value-changed=${(e: CustomEvent<{ value: string }>) =>
                        (this.stampQuality = e.detail.value)}
                    ></kustos-vision-select>
                  </div>`
                : nothing}
            </div>
            <p class="hint">
              ${this.segments.length === 0
                ? "Für den gewählten Tag ist nichts aufgezeichnet."
                : this.stampExport && this.stampAvailable
                  ? `Das Video wird neu kodiert und die Aufnahmezeit ins Bild geschrieben; das dauert etwa so lange wie das Material selbst. Erwartete Größe bei „${
                      STAMP_QUALITIES.find(
                        (q) => q.value === this.stampQuality,
                      )?.label ?? this.stampQuality
                    }": ${
                      STAMP_QUALITIES.find(
                        (q) => q.value === this.stampQuality,
                      )?.share ?? "?"
                    } des Roh-Downloads (gemessen an HD-Tagmaterial).` +
                    (this.stream === "" && this.streamKeys.length > 1
                      ? " Eingebrannt wird der Stream mit dem meisten Material; in der Auswahl lässt sich ein bestimmter wählen."
                      : "")
                  : "Die Segmente werden ohne Neukodierung zusammengefügt."}
            </p>

            <div class="row" style="margin-top:12px">
              <div>
                <label>Von</label>
                <div class="rangefields">
                  <kustos-vision-select
                    compact
                    class="rangeday"
                    .options=${this.days.map((d) => ({ value: d, label: d }))}
                    .value=${this.rangeFromDay}
                    @value-changed=${(e: CustomEvent<{ value: string }>) =>
                      (this.rangeFromDay = e.detail.value)}
                  ></kustos-vision-select>
                  <input
                    class="rangetime"
                    type="time"
                    step="60"
                    .value=${this.rangeFromTime}
                    @change=${(e: Event) =>
                      (this.rangeFromTime = (e.target as HTMLInputElement).value)}
                  />
                </div>
              </div>
              <div>
                <label>Bis</label>
                <div class="rangefields">
                  <kustos-vision-select
                    compact
                    class="rangeday"
                    .options=${this.rangeToDays().map((d) => ({
                      value: d,
                      label: d,
                    }))}
                    .value=${this.rangeToDay}
                    @value-changed=${(e: CustomEvent<{ value: string }>) =>
                      (this.rangeToDay = e.detail.value)}
                  ></kustos-vision-select>
                  <input
                    class="rangetime"
                    type="time"
                    step="60"
                    .value=${this.rangeToTime}
                    @change=${(e: Event) =>
                      (this.rangeToTime = (e.target as HTMLInputElement).value)}
                  />
                </div>
              </div>
              <button
                class="secondary"
                ?disabled=${this.busy ||
                this.downloading ||
                this.rangeProblem() !== undefined}
                @click=${this.downloadRange}
              >
                Zeitraum herunterladen
              </button>
            </div>
            ${this.rangeProblem() !== undefined
              ? html`<p class="error">${this.rangeProblem()}</p>`
              : html`<p class="hint">
                  Minutengenau und auch über Mitternacht hinweg; der Schnitt
                  beginnt am Schlüsselbild direkt vor der gewählten Minute,
                  damit nichts fehlt. Der Zeitstempel-Schalter gilt auch hier.
                </p>`}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kustos-vision-recordings": CamwatchRecordings;
  }
}
