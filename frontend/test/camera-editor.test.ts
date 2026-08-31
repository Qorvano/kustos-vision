// Regression: the camera editor's save sends the camera's whole
// view_settings back, position included. The position it held was the one
// loaded when the editor opened, or 0 for a membership ticked just now,
// while the arrow buttons store the new order on the spot through
// view/order. Saving then overwrote that order, and the camera jumped to
// the front of the view no matter where it had just been placed.
//
// The editor never renders here: Lit defers all updates until an element is
// connected, so the methods under test run without a DOM.

import { describe, expect, it } from "vitest";
import { CamwatchCameraEditor } from "../src/views/camera-editor";
import type { CamwatchApi } from "../src/api";
import type { CameraViewSettings, View } from "../src/types";

type EditorInternals = {
  slug: string;
  api: CamwatchApi;
  views: View[];
  viewSettings: Record<string, CameraViewSettings>;
  patchView(viewId: string, patch: Partial<CameraViewSettings>): void;
  moveInView(view: View, index: number, delta: number): Promise<void>;
};

function editor(cameras: string[]): EditorInternals {
  const el = new CamwatchCameraEditor() as unknown as EditorInternals;
  el.slug = "kamera_neu";
  el.views = [{ id: "alle", name: "Alle", cameras } as unknown as View];
  return el;
}

describe("the editor keeps its positions in step with the stored order", () => {
  it("seeds a fresh membership behind the cameras the view already has", () => {
    const el = editor(["a", "b", "c"]);
    el.viewSettings = {};

    el.patchView("alle", { visible: true });

    // Three cameras hold positions before this one; the member list shows
    // the newcomer last, so the saved position has to say the same.
    expect(el.viewSettings["alle"].position).toBe(3);
  });

  it("leaves the position of an existing membership alone", () => {
    const el = editor(["a", "kamera_neu", "b"]);
    el.viewSettings = { alle: { visible: true, position: 1 } };

    el.patchView("alle", { stream_key: "sd" });

    expect(el.viewSettings["alle"].position).toBe(1);
  });

  it("adopts the position an arrow move just stored", async () => {
    const el = editor(["kamera_neu", "a", "b", "c"]);
    el.viewSettings = { alle: { visible: true, position: 0 } };
    const orders: string[][] = [];
    el.api = {
      setViewOrder: async (_viewId: string, cameras: string[]) => {
        orders.push(cameras);
      },
    } as unknown as CamwatchApi;

    await el.moveInView(el.views[0], 0, 1);

    expect(orders).toEqual([["a", "kamera_neu", "b", "c"]]);
    // What save() will write matches what view/order just stored.
    expect(el.viewSettings["alle"].position).toBe(1);
  });
});
