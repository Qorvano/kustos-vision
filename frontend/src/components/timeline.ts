// The bar under the player: what exists, where the gaps are, and where you are.
//
// Gaps are drawn rather than smoothed over. A hole means a camera rebooted, the
// network dropped, or Home Assistant restarted, and that is something the
// viewer needs to know before concluding that nothing happened.

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import type { CamwatchApi } from "../api";
import type { TimelineBlock, TimelineSegment } from "../types";

// How long the pointer has to rest on one segment before its preview is
// fetched. A preview costs a signature, and a signature costs a websocket
// round trip; without this pause, dragging the pointer across a day would
// ask for one for every segment it swept over, hundreds of them, for
// pictures nobody ever sees. Short enough that stopping on a spot still
// feels immediate.
const PREVIEW_SETTLE_MS = 120;

@customElement("kustos-vision-timeline")
export class CamwatchTimeline extends LitElement {
  @property({ type: Number }) from = 0;
  @property({ type: Number }) to = 0;
  @property({ attribute: false }) blocks: TimelineBlock[] = [];
  @property({ attribute: false }) segments: TimelineSegment[] = [];
  @property({ type: Number }) position = 0;
  @property() thumbnailUrlBase = "/api/kustos_vision/thumbnail";
  /**
   * The websocket client, used to sign the preview addresses.
   *
   * An `<img>` cannot send an Authorization header, and the thumbnail endpoint
   * requires authentication, so a plain address answers 401 and the preview
   * stays blank. Home Assistant's answer to exactly this is a signed path, and
   * asking for one needs the connection.
   */
  @property({ attribute: false }) api?: CamwatchApi;

  @state() private hover?: { x: number; time: number; segment?: TimelineSegment };
  @state() private dragging = false;
  /** The signed address of the preview, and the segment it belongs to. */
  @state() private preview?: { path: string; url: string };

  private settleTimer?: ReturnType<typeof setTimeout>;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.clearSettle();
  }

  private clearSettle(): void {
    if (this.settleTimer !== undefined) clearTimeout(this.settleTimer);
    this.settleTimer = undefined;
  }

  /**
   * Fetch the preview address once the pointer has come to rest.
   *
   * Signing is cached per address by the api client, so coming back to a
   * segment costs nothing and the browser can reuse the picture it already
   * holds.
   */
  private schedulePreview(segment: TimelineSegment | undefined): void {
    if (!segment?.thumbnail || !this.api) {
      this.clearSettle();
      this.preview = undefined;
      return;
    }
    if (this.preview?.path === segment.path) {
      // Already showing the right picture. Anything still on its way belongs
      // to a segment the pointer has left behind.
      this.clearSettle();
      return;
    }
    this.clearSettle();
    const wanted = segment.path;
    this.settleTimer = setTimeout(() => {
      void this.api
        ?.signedUrl(`${this.thumbnailUrlBase}/${wanted}`)
        .then((url) => {
          // The pointer may have moved on while the signature was in flight.
          if (this.hover?.segment?.path === wanted) {
            this.preview = { path: wanted, url };
          }
        })
        .catch(() => {
          // A preview is a convenience. Failing to sign one is not worth
          // interrupting somebody who is looking for a moment in the footage.
          this.preview = undefined;
        });
    }, PREVIEW_SETTLE_MS);
  }

  static override styles = css`
    :host {
      display: block;
      user-select: none;
    }
    .bar {
      position: relative;
      height: 44px;
      touch-action: none;
      background: var(--secondary-background-color, ButtonFace);
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
    }
    .block {
      position: absolute;
      top: 0;
      bottom: 0;
      background: var(--primary-color);
      opacity: 0.75;
    }
    .playhead {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--error-color, #db4437);
      pointer-events: none;
    }
    .head {
      position: absolute;
      top: 0;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: none;
      z-index: 1;
    }
    .head .flag {
      background: var(--error-color, #db4437);
      color: var(--text-primary-color, #fff);
      font-size: 0.7em;
      padding: 1px 5px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .head .arrow {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid var(--error-color, #db4437);
    }
    .scale {
      position: relative;
      height: 20px;
      margin-top: 4px;
      font-size: 0.7em;
      color: var(--secondary-text-color);
    }
    .scale .mark {
      position: absolute;
      top: 0;
      width: 1px;
      height: 5px;
      background: currentColor;
      opacity: 0.5;
    }
    .scale .mark.major {
      height: 8px;
      opacity: 1;
    }
    .scale .lbl {
      position: absolute;
      top: 9px;
      transform: translateX(-50%);
      white-space: nowrap;
    }
    .tick {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      background: rgba(128, 128, 128, 0.35);
      pointer-events: none;
    }
    .preview {
      position: absolute;
      bottom: 52px;
      transform: translateX(-50%);
      background: var(--ha-card-background, var(--card-background-color, Canvas));
      border-radius: 8px;
      padding: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      pointer-events: none;
      z-index: 2;
    }
    .preview img {
      display: block;
      width: 160px;
      border-radius: 4px;
    }
    .preview .time {
      text-align: center;
      font-size: 0.75em;
      padding: 2px 0 0;
      color: var(--primary-text-color);
    }
    .wrap {
      position: relative;
    }
    .empty {
      padding: 12px;
      text-align: center;
      color: var(--secondary-text-color);
      font-size: 0.85em;
    }
  `;

  override updated(changed: Map<string, unknown>): void {
    if (changed.has("segments")) {
      // Picking another day or another stream replaces everything the bar
      // shows. Without this the preview under a pointer that has not moved
      // would still be the one from before, because it is matched by path and
      // the stale hover still names the old one.
      this.clearSettle();
      this.hover = undefined;
      this.preview = undefined;
    }
  }

  private get span(): number {
    return Math.max(1, this.to - this.from);
  }

  private percent(time: number): number {
    return ((time - this.from) / this.span) * 100;
  }

  private timeAt(event: PointerEvent): number {
    const bar = event.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    return this.from + ratio * this.span;
  }

  private emit(name: "seek" | "scrub", time: number): void {
    this.dispatchEvent(
      new CustomEvent(name, { detail: { time }, bubbles: true, composed: true }),
    );
  }

  private onPointerDown(event: PointerEvent): void {
    // Capturing keeps the drag alive when the pointer leaves the bar, which
    // it always does on a bar this narrow.
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.dragging = true;
    this.onPointerMove(event);
  }

  private onPointerMove(event: PointerEvent): void {
    const time = this.timeAt(event);
    const segment = this.segments.find(
      (s) => time >= s.start && time < s.start + s.duration,
    );
    this.hover = { x: this.percent(time), time, segment };
    this.schedulePreview(segment);
    // While dragging, the cursor follows the pointer immediately; the video
    // itself only moves on release, because seeking it live on every pixel
    // would tear down and refetch footage dozens of times per swipe.
    if (this.dragging) this.emit("scrub", time);
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.emit("seek", this.timeAt(event));
  }

  private formatTime(utc: number): string {
    return new Date(utc * 1000).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  private hourMarks(): number[] {
    const step = 3600;
    const first = Math.ceil(this.from / step) * step;
    const marks: number[] = [];
    for (let t = first; t <= this.to; t += step) marks.push(t);
    // A day is at most 25 of them; anything denser means the range is not a
    // day and this scale is the wrong instrument.
    return marks.length > 26 ? [] : marks;
  }

  private renderGrid() {
    return this.hourMarks().map(
      (t) => html`<div class="tick" style="left:${this.percent(t)}%"></div>`,
    );
  }

  private renderScale() {
    const marks = this.hourMarks();
    if (marks.length < 2) return nothing;
    // Every mark gets a stroke, but only some get numbers: a dozen labels is
    // what stays readable across the widths a dashboard is used at, so a
    // full day labels every second hour.
    const labelEvery = Math.ceil(marks.length / 12);
    return html`<div class="scale">
      ${marks.map(
        (t, i) => html`<div
            class="mark ${i % labelEvery === 0 ? "major" : ""}"
            style="left:${this.percent(t)}%"
          ></div>
          ${i % labelEvery === 0
            ? html`<span class="lbl" style="left:${this.percent(t)}%">
                ${new Date(t * 1000).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>`
            : nothing}`,
      )}
    </div>`;
  }

  override render() {
    if (this.to <= this.from) return nothing;

    return html`
      <div class="wrap">
        ${this.hover
          ? html`<div class="preview" style="left:${this.hover.x}%">
              ${this.preview && this.preview.path === this.hover.segment?.path
                ? html`<img alt="" src=${this.preview.url} />`
                : nothing}
              <div class="time">${this.formatTime(this.hover.time)}</div>
            </div>`
          : nothing}

        <div
          class="bar"
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.onPointerUp}
          @pointercancel=${() => {
            this.dragging = false;
            // The view above suppresses playback updates while a scrub is
            // active; a cancelled drag has to lift that too, or the cursor
            // never follows the playback again.
            this.dispatchEvent(
              new CustomEvent("scrubend", { bubbles: true, composed: true }),
            );
          }}
          @pointerleave=${() => {
            if (this.dragging) return;
            this.hover = undefined;
            this.clearSettle();
            this.preview = undefined;
          }}
        >
          ${this.blocks.map(
            (block) => html`<div
              class="block"
              title="${this.formatTime(block.start)} bis ${this.formatTime(block.end)}"
              style="left:${this.percent(block.start)}%;width:${
                this.percent(block.end) - this.percent(block.start)
              }%"
            ></div>`,
          )}
          ${this.position >= this.from && this.position <= this.to
            ? html`<div class="playhead" style="left:${this.percent(this.position)}%"></div>
                <div class="head" style="left:${this.percent(this.position)}%">
                  <div class="flag">${this.formatTime(this.position)}</div>
                  <div class="arrow"></div>
                </div>`
            : nothing}
          ${this.renderGrid()}
        </div>
        ${this.renderScale()}
        ${this.blocks.length === 0
          ? html`<div class="empty">An diesem Tag wurde nichts aufgezeichnet.</div>`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kustos-vision-timeline": CamwatchTimeline;
  }
}
