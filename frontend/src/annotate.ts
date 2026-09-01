// The geometry of drawn labels on a reference picture.
//
// Regions live in coordinates normalised 0..1 so they survive any
// resolution: the dialog draws them over a scaled-down canvas, the burn
// renders them onto the full-size copy, and both go through the same
// drawRegions so what the user sees is exactly what the model gets.

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

/** What an edit session produces: the editable regions, and the burned copy
 *  that actually travels to the model (null when nothing is drawn). */
export interface AnnotateResult {
  regions: Region[];
  burned: Blob | null;
}

// Stroke width as a fraction of the longer image edge: thick enough to
// survive the model-side downscale to ~1000 px, thin enough to cover little
// of the scene it is pointing at.
export const STROKE_FRACTION = 1 / 300;

// Label text height as a fraction of the longer edge, readable after the
// same downscale.
export const LABEL_FONT_FRACTION = 1 / 32;

// A box smaller than this fraction of an edge is an accidental tap, and its
// label could never be read once burned.
export const MIN_REGION_FRACTION = 0.02;

// Fixed, not themed: a canvas cannot read CSS variables, and the burned copy
// has to look identical everywhere. Signal red with white text, the highest
// contrast against typical camera footage.
export const ANNOTATION_COLOR = "#e53935";

// High enough that burning is visually lossless next to the camera's own
// compression; the file is stored once and sent with every analysis.
export const BURN_JPEG_QUALITY = 0.9;

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** A rectangle from two corners in any order, clamped into the picture. */
export function normalizeRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number; w: number; h: number } {
  const left = clamp01(Math.min(x1, x2));
  const top = clamp01(Math.min(y1, y2));
  const right = clamp01(Math.max(x1, x2));
  const bottom = clamp01(Math.max(y1, y2));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

export function isUsableRegion(region: {
  w: number;
  h: number;
}): boolean {
  return region.w >= MIN_REGION_FRACTION && region.h >= MIN_REGION_FRACTION;
}

/** The topmost region under a point - the last drawn wins, mirroring the
 *  paint order - or -1 when the point hits none. */
export function hitRegion(
  regions: readonly Region[],
  x: number,
  y: number,
): number {
  for (let i = regions.length - 1; i >= 0; i -= 1) {
    const region = regions[i];
    if (
      x >= region.x &&
      x <= region.x + region.w &&
      y >= region.y &&
      y <= region.y + region.h
    ) {
      return i;
    }
  }
  return -1;
}

/** Shift a region by a delta, kept fully inside the picture. */
export function moveRegion(region: Region, dx: number, dy: number): Region {
  return {
    ...region,
    x: Math.min(Math.max(region.x + dx, 0), 1 - region.w),
    y: Math.min(Math.max(region.y + dy, 0), 1 - region.h),
  };
}

/** Paint the regions onto a context of the given pixel size.

    One function for the on-screen preview and the burn, so the two cannot
    diverge: what the user sees is what the model gets. */
export function drawRegions(
  ctx: CanvasRenderingContext2D,
  regions: readonly Region[],
  width: number,
  height: number,
  selected = -1,
): void {
  const longEdge = Math.max(width, height);
  const stroke = Math.max(2, longEdge * STROKE_FRACTION);
  const fontPx = Math.max(12, longEdge * LABEL_FONT_FRACTION);
  regions.forEach((region, index) => {
    const x = region.x * width;
    const y = region.y * height;
    const w = region.w * width;
    const h = region.h * height;

    ctx.lineWidth = stroke;
    ctx.strokeStyle = ANNOTATION_COLOR;
    ctx.setLineDash([]);
    ctx.strokeRect(x, y, w, h);
    if (index === selected) {
      // Preview only - the burn never passes a selection.
      ctx.lineWidth = Math.max(1, stroke / 2);
      ctx.strokeStyle = "#ffffff";
      ctx.setLineDash([stroke * 2, stroke * 2]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }

    if (!region.label) return;
    ctx.font = `bold ${fontPx}px sans-serif`;
    const pad = fontPx * 0.35;
    const plaqueHeight = fontPx + 2 * pad;
    const plaqueWidth = ctx.measureText(region.label).width + 2 * pad;
    // Above the box when there is room, inside its top edge otherwise.
    const plaqueY = y >= plaqueHeight ? y - plaqueHeight : y;
    ctx.fillStyle = ANNOTATION_COLOR;
    ctx.fillRect(x, plaqueY, plaqueWidth, plaqueHeight);
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(region.label, x + pad, plaqueY + plaqueHeight / 2);
  });
}
