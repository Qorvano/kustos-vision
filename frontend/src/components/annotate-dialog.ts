// Drawing labelled boxes onto a reference picture.
//
// The dialog edits the ORIGINAL picture plus its normalised regions; on
// "Übernehmen" it burns both into a full-resolution copy. Preview and burn
// share drawRegions, so what the user sees is exactly what the model gets.
// The caller stores the regions (editable later) and uploads the burned copy.

import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  BURN_JPEG_QUALITY,
  drawRegions,
  hitRegion,
  isUsableRegion,
  moveRegion,
  normalizeRect,
  type AnnotateResult,
  type Region,
} from "../annotate";
import { shared } from "../styles";

type Drag =
  | { mode: "draw"; startX: number; startY: number }
  | { mode: "move"; startX: number; startY: number; index: number; origin: Region };

@customElement("kustos-vision-annotate-dialog")
export class CamwatchAnnotateDialog extends LitElement {
  @state() private open = false;
  @state() private regions: Region[] = [];
  @state() private selected = -1;
  @state() private draft: Region | null = null;
  @state() private error = "";

  private image?: HTMLImageElement;
  private resolve?: (result: AnnotateResult | null) => void;
  private drag?: Drag;

  static override styles = [
    shared,
    css`
      :host {
        min-height: 0;
        background: none;
      }
      .scrim {
        position: fixed;
        inset: 0;
        z-index: 110;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.5);
      }
      .box {
        background: var(
          --ha-card-background,
          var(--card-background-color, Canvas)
        );
        color: var(--primary-text-color, CanvasText);
        border-radius: var(--kv-radius-card);
        border: 1px solid var(--divider-color, ButtonBorder);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        max-width: min(960px, calc(100vw - 32px));
        max-height: calc(100dvh - 32px);
        overflow: auto;
        padding: 16px 20px;
        box-sizing: border-box;
      }
      h2 {
        margin: 0 0 4px;
        font-size: 20px;
        font-weight: 400;
      }
      canvas {
        display: block;
        max-width: 100%;
        /* Leaves room for the label rows and buttons on a laptop screen. */
        max-height: 60dvh;
        border-radius: 4px;
        touch-action: none;
        cursor: crosshair;
      }
      .labels .row {
        align-items: center;
        margin-top: 8px;
      }
      .swatch {
        width: 12px;
        height: 12px;
        border-radius: 2px;
        background: #e53935;
        flex: none;
      }
      .buttons {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 16px;
      }
    `,
  ];

  /** Open the editor for one picture. Resolves with the regions and the
   *  burned copy, or null when the person cancelled. */
  async edit(src: string, regions: Region[]): Promise<AnnotateResult | null> {
    this.resolve?.(null);
    this.image = await loadImage(src);
    this.regions = regions.map((region) => ({ ...region }));
    this.selected = -1;
    this.draft = null;
    this.error = "";
    this.open = true;
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  private close(result: AnnotateResult | null): void {
    this.open = false;
    this.resolve?.(result);
    this.resolve = undefined;
  }

  private async finish(): Promise<void> {
    const kept = this.regions.filter(isUsableRegion);
    if (kept.length === 0) {
      this.close({ regions: [], burned: null });
      return;
    }
    try {
      this.close({ regions: kept, burned: await this.burn(kept) });
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  /** The full-resolution copy with the labels rendered in. */
  private async burn(regions: Region[]): Promise<Blob> {
    const image = this.image!;
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas nicht verfügbar");
    ctx.drawImage(image, 0, 0);
    drawRegions(ctx, regions, canvas.width, canvas.height);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("Das Bild konnte nicht erzeugt werden")),
        "image/jpeg",
        BURN_JPEG_QUALITY,
      );
    });
  }

  // ------------------------------------------------------------------
  // Canvas
  // ------------------------------------------------------------------

  private canvas(): HTMLCanvasElement | null {
    return this.renderRoot.querySelector("canvas");
  }

  protected override updated(): void {
    if (this.open) this.paint();
  }

  private paint(): void {
    const canvas = this.canvas();
    const image = this.image;
    if (!canvas || !image) return;
    // Natural resolution, scaled by CSS: pointer maths goes through the
    // bounding rect, and preview pixels match the burn exactly.
    if (canvas.width !== image.naturalWidth) {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, 0, 0);
    const all = this.draft ? [...this.regions, this.draft] : this.regions;
    drawRegions(ctx, all, canvas.width, canvas.height, this.selected);
  }

  private toNormalized(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas()!.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }

  private onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.canvas()?.setPointerCapture(event.pointerId);
    const { x, y } = this.toNormalized(event);
    const hit = hitRegion(this.regions, x, y);
    if (hit >= 0) {
      this.selected = hit;
      this.drag = {
        mode: "move",
        startX: x,
        startY: y,
        index: hit,
        origin: this.regions[hit],
      };
    } else {
      this.selected = -1;
      this.drag = { mode: "draw", startX: x, startY: y };
    }
    this.paint();
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.drag) return;
    const { x, y } = this.toNormalized(event);
    if (this.drag.mode === "draw") {
      this.draft = {
        ...normalizeRect(this.drag.startX, this.drag.startY, x, y),
        label: "",
      };
    } else {
      const { index, origin, startX, startY } = this.drag;
      const moved = moveRegion(origin, x - startX, y - startY);
      this.regions = this.regions.map((region, i) =>
        i === index ? moved : region,
      );
    }
    this.paint();
  }

  private async onPointerUp(): Promise<void> {
    const drag = this.drag;
    this.drag = undefined;
    if (!drag) return;
    if (drag.mode === "draw") {
      const draft = this.draft;
      this.draft = null;
      // A tap or a tiny drag is a deselect, not an invisible box.
      if (draft && isUsableRegion(draft)) {
        this.regions = [...this.regions, draft];
        this.selected = this.regions.length - 1;
        await this.updateComplete;
        const inputs =
          this.renderRoot.querySelectorAll<HTMLInputElement>(".labels input");
        inputs[inputs.length - 1]?.focus();
      }
    }
    this.paint();
  }

  private removeRegion(index: number): void {
    this.regions = this.regions.filter((_, i) => i !== index);
    this.selected = -1;
  }

  private onKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close(null);
    }
  }

  override render() {
    if (!this.open) return nothing;
    return html`<div class="scrim" @keydown=${this.onKeydown}>
      <div class="box" role="dialog" aria-modal="true">
        <h2>Elemente beschriften</h2>
        <p class="hint">
          Ziehen Sie mit Maus oder Finger einen Rahmen um ein Element und
          benennen Sie es. Die Beschriftung wird in die Kopie eingebrannt, die
          das Modell erhält; das Original bleibt unverändert.
        </p>
        <canvas
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.onPointerUp}
          @pointercancel=${this.onPointerUp}
        ></canvas>
        <div class="labels">
          ${this.regions.map(
            (region, index) => html`
              <div class="row">
                <span class="swatch"></span>
                <div class="grow">
                  <input
                    placeholder="Was ist in diesem Rahmen zu sehen?"
                    .value=${region.label}
                    @focus=${() => {
                      this.selected = index;
                      this.paint();
                    }}
                    @input=${(e: Event) => {
                      this.regions = this.regions.map((r, i) =>
                        i === index
                          ? { ...r, label: (e.target as HTMLInputElement).value }
                          : r,
                      );
                      this.paint();
                    }}
                  />
                </div>
                <button
                  class="danger compact"
                  @click=${() => this.removeRegion(index)}
                >
                  Entfernen
                </button>
              </div>
            `,
          )}
        </div>
        ${this.error ? html`<p class="error">${this.error}</p>` : nothing}
        <div class="buttons">
          <button class="secondary" @click=${() => this.close(null)}>
            Abbrechen
          </button>
          <button @click=${() => this.finish()}>Übernehmen</button>
        </div>
      </div>
    </div>`;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Das Referenzbild konnte nicht geladen werden"));
    image.src = src;
  });
}

declare global {
  interface HTMLElementTagNameMap {
    "kustos-vision-annotate-dialog": CamwatchAnnotateDialog;
  }
}
