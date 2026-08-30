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
      background: var(--secondary-background-color, #2a2a2a);
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
    .postime {
      position: absolute;
      top: 2px;
      transform: translateX(-50%);
      font-size: 0.7em;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      padding: 1px 5px;
      border-radius: 4px;
      pointer-events: none;
      white-space: nowrap;
      z-index: 1;
    }
    .hours {
      position: relative;
      height: 16px;
      margin-top: 2px;
      font-size: 0.7em;
      color: var(--secondary-text-color);
    }
    .hour {
      position: absolute;
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
      background: var(--card-background-color, #fff);
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

  private renderHours() {
    // A tick per hour as long as they do not crowd each other; on a shorter
    // range the labels would overlap into mush.
    const hours: number[] = [];
    const step = 3600;
    const first = Math.ceil(this.from / step) * step;
    for (let t = first; t <= this.to; t += step) hours.push(t);
    if (hours.length > 24) return nothing;

    return html`
      ${hours.map(
        (t) => html`<div class="tick" style="left:${this.percent(t)}%"></div>`,
      )}
      <div class="hours">
        ${hours.map(
          (t) => html`<span class="hour" style="left:${this.percent(t)}%">
            ${new Date(t * 1000).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>`,
        )}
      </div>
    `;
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
          @pointercancel=${() => (this.dragging = false)}
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
                <div class="postime" style="left:${this.percent(this.position)}%">
                  ${this.formatTime(this.position)}
                </div>`
            : nothing}
          ${this.renderHours()}
        </div>
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
