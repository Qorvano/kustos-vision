// The timeline's width-aware pieces: label density that thins out instead
// of overprinting, and a preview that stops sliding at the bar's ends.

import { describe, expect, it } from "vitest";
import { clampPreviewLeft, labelStep } from "../src/components/timeline";

describe("labelStep", () => {
  it("keeps today's density at a dashboard's width", () => {
    // 25 hour marks across ~900px used to label every second one; the
    // width-aware step must reproduce that, or the desktop changes.
    expect(labelStep(25, 900)).toBe(3);
  });

  it("thins out on a phone instead of overprinting", () => {
    expect(labelStep(25, 360)).toBe(5);
  });

  it("never asks for a zero step", () => {
    expect(labelStep(2, 10)).toBeGreaterThanOrEqual(1);
    expect(labelStep(0, 900)).toBeGreaterThanOrEqual(1);
  });
});

describe("clampPreviewLeft", () => {
  it("stops at the left end of the bar", () => {
    expect(clampPreviewLeft(0, 320, 168)).toBe(88);
  });

  it("stops at the right end of the bar", () => {
    expect(clampPreviewLeft(320, 320, 168)).toBe(232);
  });

  it("slides freely in the middle", () => {
    expect(clampPreviewLeft(160, 320, 168)).toBe(160);
  });

  it("collapses to the centre when the bar is narrower than the preview", () => {
    expect(clampPreviewLeft(10, 100, 168)).toBe(50);
  });
});
