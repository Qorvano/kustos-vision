// The bar under the player: what exists, where the gaps are, and where you are.
//
// Gaps are drawn rather than smoothed over. A hole means a camera rebooted, the
// network dropped, or Home Assistant restarted, and that is something the
// viewer needs to know before concluding that nothing happened.

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import type { TimelineBlock, TimelineSegment } from "../types";

@customElement("camwatch-timeline")
export class CamwatchTimeline extends LitElement {
  @property({ type: Number }) from = 0;
  @property({ type: Number }) to = 0;
  @property({ attribute: false }) blocks: TimelineBlock[] = [];
  @property({ attribute: false }) segments: TimelineSegment[] = [];
  @property({ type: Number }) position = 0;
  @property() thumbnailUrlBase = "/api/camwatch/thumbnail";

  @state() private hover?: { x: number; time: number; segment?: TimelineSegment };

  static override styles = css`
    :host {
      display: block;
      user-select: none;
    }
    .bar {
      position: relative;
      height: 44px;
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

  private get span(): number {
    return Math.max(1, this.to - this.from);
  }

  private percent(time: number): number {
    return ((time - this.from) / this.span) * 100;
  }

  private timeAt(event: MouseEvent): number {
    const bar = event.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    return this.from + ratio * this.span;
  }

  private onMove(event: MouseEvent): void {
    const time = this.timeAt(event);
    const segment = this.segments.find(
      (s) => time >= s.start && time < s.start + s.duration,
    );
    this.hover = { x: this.percent(time), time, segment };
  }

  private onClick(event: MouseEvent): void {
    const time = this.timeAt(event);
    this.dispatchEvent(
      new CustomEvent("seek", { detail: { time }, bubbles: true, composed: true }),
    );
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
        ${this.hover && this.hover.segment?.thumbnail
          ? html`<div class="preview" style="left:${this.hover.x}%">
              <img
                alt=""
                src="${this.thumbnailUrlBase}/${this.hover.segment.path}"
              />
              <div class="time">${this.formatTime(this.hover.time)}</div>
            </div>`
          : this.hover
            ? html`<div class="preview" style="left:${this.hover.x}%">
                <div class="time">${this.formatTime(this.hover.time)}</div>
              </div>`
            : nothing}

        <div
          class="bar"
          @mousemove=${this.onMove}
          @mouseleave=${() => (this.hover = undefined)}
          @click=${this.onClick}
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
            ? html`<div class="playhead" style="left:${this.percent(this.position)}%"></div>`
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
    "camwatch-timeline": CamwatchTimeline;
  }
}
