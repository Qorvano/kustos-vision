// The drawing tool's geometry: normalised, order-independent, clamped, and
// honest about what is too small to be a deliberate box.

import { describe, expect, it } from "vitest";
import {
  MIN_REGION_FRACTION,
  hitRegion,
  isUsableRegion,
  moveRegion,
  normalizeRect,
  type Region,
} from "../src/annotate";

function region(x: number, y: number, w: number, h: number): Region {
  return { x, y, w, h, label: "" };
}

describe("normalizeRect", () => {
  it("accepts corners in any order", () => {
    expect(normalizeRect(0.8, 0.7, 0.2, 0.1)).toEqual(
      normalizeRect(0.2, 0.1, 0.8, 0.7),
    );
  });

  it("clamps a drag that left the picture", () => {
    const r = normalizeRect(0.9, 0.9, 1.4, 1.2);
    expect(r.x + r.w).toBeLessThanOrEqual(1);
    expect(r.y + r.h).toBeLessThanOrEqual(1);
  });
});

describe("isUsableRegion", () => {
  it("a tap-sized box is an accident, not a label", () => {
    const tiny = MIN_REGION_FRACTION / 2;
    expect(isUsableRegion(region(0.5, 0.5, tiny, tiny))).toBe(false);
    expect(
      isUsableRegion(region(0.5, 0.5, MIN_REGION_FRACTION, MIN_REGION_FRACTION)),
    ).toBe(true);
  });
});

describe("hitRegion", () => {
  it("finds the topmost of overlapping boxes, mirroring the paint order", () => {
    const regions = [region(0.1, 0.1, 0.5, 0.5), region(0.3, 0.3, 0.5, 0.5)];
    expect(hitRegion(regions, 0.4, 0.4)).toBe(1);
    expect(hitRegion(regions, 0.15, 0.15)).toBe(0);
    expect(hitRegion(regions, 0.95, 0.95)).toBe(-1);
  });
});

describe("moveRegion", () => {
  it("keeps the box fully inside the picture", () => {
    const moved = moveRegion(region(0.8, 0.8, 0.15, 0.15), 0.5, 0.5);
    expect(moved.x + moved.w).toBeLessThanOrEqual(1);
    expect(moved.y + moved.h).toBeLessThanOrEqual(1);
    const back = moveRegion(region(0.0, 0.0, 0.15, 0.15), -0.5, -0.5);
    expect(back.x).toBe(0);
    expect(back.y).toBe(0);
  });
});
