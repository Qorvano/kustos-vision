// The recordings tab: pick a camera and a day, see what exists, watch it.

import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { CamwatchApi } from "../api";
import { shared } from "../styles";
import type { Camera, TimelineBlock, TimelineSegment } from "../types";
import "../components/player";
import "../components/timeline";

@customElement("camwatch-recordings")
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
  @state() private error = "";

  static override styles = shared;

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
      this.error = err instanceof Error ? err.message : String(err);
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
      this.error = err instanceof Error ? err.message : String(err);
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
    return `/api/camwatch/export?${params.toString()}`;
  }

  override render() {
    if (this.cameras.length === 0) {
      return html`<div style="padding:32px" class="muted">
        Noch keine Kamera eingerichtet.
      </div>`;
    }

    const keys = this.streamKeys;
    return html`
      <div style="padding:16px">
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

        <camwatch-player
          .segments=${this.segments}
          .seekTo=${this.seekTo}
        ></camwatch-player>

        <div style="margin-top:12px">
          <camwatch-timeline
            .from=${this.bounds[0]}
            .to=${this.bounds[1]}
            .blocks=${this.blocks}
            .segments=${this.segments}
            .position=${this.position}
            @seek=${(e: CustomEvent<{ time: number }>) => {
              this.position = e.detail.time;
              this.seekTo = e.detail.time;
            }}
          ></camwatch-timeline>
        </div>

        ${this.segments.length > 0
          ? html`<div class="row" style="margin-top:16px">
              <a href=${this.exportUrl()} download>
                <button class="secondary" ?disabled=${this.busy}>
                  Diesen Tag herunterladen
                </button>
              </a>
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
    "camwatch-recordings": CamwatchRecordings;
  }
}
