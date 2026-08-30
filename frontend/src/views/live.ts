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

  static override styles = css`
    :host {
      display: block;
      padding: 16px;
    }
    .grid {
      display: grid;
      gap: 16px;
      /* Zero columns means "fit as many as the width allows", which is what a
         wall display and a phone both want. */
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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

    const style =
      this.view.columns > 0
        ? `grid-template-columns: repeat(${this.view.columns}, 1fr)`
        : "";

    return html`
      <div class="grid" style=${style}>
        ${cameras.map(
          (camera) => html`
            <kustos-vision-camera-tile
              .hass=${this.hass}
              .api=${this.api}
              .camera=${camera}
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
