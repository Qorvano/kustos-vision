// The recordings tab: pick a camera and a day, see what exists, watch it.

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { errorText, type CamwatchApi } from "../api";
import { shared } from "../styles";
import type { Camera, TimelineBlock, TimelineSegment } from "../types";
import "../components/player";
import "../components/timeline";

@customElement("kustos-vision-recordings")
export class CamwatchRecordings extends LitElement {
  @property({ attribute: false }) api!: CamwatchApi;
  @property({ attribute: false }) cameras: Camera[] = [];

  @state() private camera = "";
  @state() private stream = "";
  @state() private day = "";
  @state() private days: string[] = [];
  @state() private blocks: TimelineBlock[] = [];
  @state() private segments: TimelineSegment[] = [];
  @state() private position = 0;
  @state() private seekTo = 0;
  @state() private busy = false;
  @state() private downloading = false;
  @state() private error = "";

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
    const params = new URLSearchParams({
      camera: this.camera,
      from: String(from),
      to: String(to),
    });
    if (this.stream) params.set("stream", this.stream);
    return `/api/kustos_vision/export?${params.toString()}`;
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
        <div class="card">
          <div class="row">
            <div class="grow">
              <label>Kamera</label>
              <select
                @change=${(e: Event) =>
                  this.selectCamera((e.target as HTMLSelectElement).value)}
              >
                ${this.cameras.map(
                  (c) => html`<option value=${c.slug} ?selected=${c.slug === this.camera}>
                    ${c.name}
                  </option>`,
                )}
              </select>
            </div>
            <div class="grow">
              <label>Tag</label>
              <select
                @change=${(e: Event) => {
                  this.day = (e.target as HTMLSelectElement).value;
                  void this.loadDay();
                }}
              >
                ${this.days.length === 0
                  ? html`<option>keine Aufnahmen</option>`
                  : this.days.map(
                      (d) => html`<option value=${d} ?selected=${d === this.day}>
                        ${d}
                      </option>`,
                    )}
              </select>
            </div>
            ${keys.length > 1
              ? html`<div class="grow">
                  <label>Stream</label>
                  <select
                    @change=${(e: Event) => {
                      this.stream = (e.target as HTMLSelectElement).value;
                      void this.loadDay();
                    }}
                  >
                    <option value="">alle</option>
                    ${keys.map(
                      (k) => html`<option value=${k} ?selected=${k === this.stream}>
                        ${k}
                      </option>`,
                    )}
                  </select>
                </div>`
              : nothing}
          </div>
          ${this.error ? html`<p class="error">${this.error}</p>` : nothing}
        </div>

        <kustos-vision-player
          .api=${this.api}
          .segments=${this.segments}
          .seekTo=${this.seekTo}
        ></kustos-vision-player>

        <div>
          <kustos-vision-timeline
            .api=${this.api}
            .from=${this.bounds[0]}
            .to=${this.bounds[1]}
            .blocks=${this.blocks}
            .segments=${this.segments}
            .position=${this.position}
            @seek=${(e: CustomEvent<{ time: number }>) => {
              this.position = e.detail.time;
              this.seekTo = e.detail.time;
            }}
          ></kustos-vision-timeline>
        </div>

        ${this.segments.length > 0
          ? html`<div class="row">
              <button
                class="secondary"
                ?disabled=${this.busy || this.downloading}
                @click=${this.download}
              >
                Diesen Tag herunterladen
              </button>
              <span class="muted">
                Die Segmente werden ohne Neukodierung zusammengefügt.
              </span>
            </div>`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kustos-vision-recordings": CamwatchRecordings;
  }
}
