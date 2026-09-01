// A user-defined tab: the cameras it lists, laid out in a grid.

import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { CamwatchApi } from "../api";
import type { Camera, HomeAssistant, View } from "../types";
import "../components/camera-tile";

@customElement("kustos-vision-live-view")
export class CamwatchLiveView extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) api!: CamwatchApi;
  @property({ attribute: false }) view!: View;
  @property({ attribute: false }) cameras: Camera[] = [];
  @property({ type: Boolean }) narrow = false;

  static override styles = css`
    :host {
      display: block;
      /* A phone has no 16px to spare on each side; a monitor does. */
      padding: min(16px, 3vw);
    }
    .grid {
      display: grid;
      --kv-gap: min(16px, 3vw);
      /* The count the view asked for, or a number that simply means "as
         many as fit". */
      --kv-cols: var(--kv-cols-config, 24);
      /* Below this a tile is a thumbnail: the controls under the picture
         start clipping and the name no longer fits beside the dot. The
         view-less default keeps the old 320px, so a wall display is laid
         out exactly as before. */
      --kv-tile-floor: 320px;
      gap: var(--kv-gap);
      /* The configured count is a ceiling, not an order: the track floor
         drops a column rather than shrink a picture to 99px. On a monitor
         the two agree and the wall looks exactly as it was configured. */
      grid-template-columns: repeat(
        auto-fill,
        minmax(
          max(
            var(--kv-tile-floor),
            (100% - (var(--kv-cols) - 1) * var(--kv-gap)) / var(--kv-cols)
          ),
          1fr
        )
      );
    }
    .grid > * {
      min-width: 0;
    }
    /* A phone lying on its side: the screen is short, so two pictures side
       by side are the most that still shows anything. */
    @media (orientation: landscape) and (max-height: 500px) {
      .grid {
        --kv-cols: min(2, var(--kv-cols-config, 24));
      }
    }
    .empty {
      color: var(--secondary-text-color);
      padding: 32px 8px;
      text-align: center;
      line-height: 1.5;
    }
  `;

  private get shown(): Camera[] {
    const byId = new Map(this.cameras.map((c) => [c.slug, c]));
    return this.view.cameras
      .map((slug) => byId.get(slug))
      .filter((c): c is Camera => c !== undefined);
  }

  override render() {
    const cameras = this.shown;
    if (cameras.length === 0) {
      return html`<div class="empty">
        Dieser Ansicht ist noch keine Kamera zugeordnet.<br />
        Unter Einstellungen, Ansichten lässt sich das ändern.
      </div>`;
    }

    // The configured count travels as a custom property so the stylesheet
    // can treat it as a ceiling; with a count set, the tile floor relaxes
    // so the person's choice wins wherever it is physically viable.
    const style =
      this.view.columns > 0
        ? `--kv-cols-config:${this.view.columns};--kv-tile-floor:240px`
        : "";

    return html`
      <div class="grid" style=${style}>
        ${cameras.map(
          (camera) => html`
            <kustos-vision-camera-tile
              .hass=${this.hass}
              .api=${this.api}
              .camera=${camera}
              .viewId=${this.view.id}
              ?narrow=${this.narrow}
            ></kustos-vision-camera-tile>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "kustos-vision-live-view": CamwatchLiveView;
  }
}
