// Regression: the day's first segment usually starts BEFORE midnight - it
// merely overlaps the day - and the initial cursor position was taken from
// it verbatim. A position before the timeline's own zero fails its range
// check and is simply not drawn, so the recordings tab opened with no
// cursor at all, on every device, until the first tap into the bar.
//
// The component never renders here: Lit defers updates until an element is
// connected, so the method under test runs without a DOM.

import { describe, expect, it } from "vitest";
import { CamwatchRecordings } from "../src/views/recordings";
import type { CamwatchApi } from "../src/api";
import type { Camera } from "../src/types";

type RecordingsInternals = {
  api: CamwatchApi;
  cameras: Camera[];
  camera: string;
  day: string;
  position: number;
  seekTo: number;
  bounds: [number, number];
  loadDay(): Promise<void>;
};

function recordings(firstSegmentStart: (from: number) => number) {
  const el = new CamwatchRecordings() as unknown as RecordingsInternals;
  el.camera = "vorgarten";
  el.day = "2026-09-01";
  el.api = {
    timeline: async (_c: string, from: number) => ({
      blocks: [],
      segments: [
        {
          path: "a.mp4",
          stream_key: "hd",
          start: firstSegmentStart(from),
          duration: 300,
          size: 1,
          thumbnail: false,
        },
      ],
    }),
  } as unknown as CamwatchApi;
  return el;
}

describe("the initial cursor stays on the timeline", () => {
  it("clamps a first segment from before midnight to the day's start", async () => {
    const el = recordings((from) => from - 39); // 23:59:21 the day before
    await el.loadDay();
    expect(el.position).toBe(el.bounds[0]);
    expect(el.seekTo).toBe(el.bounds[0]);
  });

  it("keeps a first segment that starts inside the day", async () => {
    const el = recordings((from) => from + 70);
    await el.loadDay();
    expect(el.position).toBe(el.bounds[0] + 70);
  });
});
