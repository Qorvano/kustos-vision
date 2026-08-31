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
  name: string;
  api: CamwatchApi;
  views: View[];
  viewSettings: Record<string, CameraViewSettings>;
  baseline: string;
  unsaved: { isDirty(): boolean };
  payload(): unknown;
  patchView(viewId: string, patch: Partial<CameraViewSettings>): void;
  applyOrder(view: View, order: string[]): Promise<void>;
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

  it("an edited field counts as unsaved work", () => {
    const el = editor(["a"]);
    el.baseline = JSON.stringify(el.payload());

    expect(el.unsaved.isDirty()).toBe(false);
    el.name = "Neuer Name";
    expect(el.unsaved.isDirty()).toBe(true);
  });

  it("a stored reorder does not count as unsaved work", async () => {
    // The order is saved the moment it is dragged, so it must not make the
    // navigation guard ask about it afterwards.
    const el = editor(["kamera_neu", "a"]);
    el.viewSettings = { alle: { visible: true, position: 0 } };
    el.api = {
      setViewOrder: async () => {},
    } as unknown as CamwatchApi;
    el.baseline = JSON.stringify(el.payload());

    await el.applyOrder(el.views[0], ["a", "kamera_neu"]);

    expect(el.viewSettings["alle"].position).toBe(1);
    expect(el.unsaved.isDirty()).toBe(false);
  });

  it("adopts the position a reorder just stored", async () => {
    const el = editor(["kamera_neu", "a", "b", "c"]);
    el.viewSettings = { alle: { visible: true, position: 0 } };
    const orders: string[][] = [];
    el.api = {
      setViewOrder: async (_viewId: string, cameras: string[]) => {
        orders.push(cameras);
      },
    } as unknown as CamwatchApi;

    await el.applyOrder(el.views[0], ["a", "kamera_neu", "b", "c"]);

    expect(orders).toEqual([["a", "kamera_neu", "b", "c"]]);
    // What save() will write matches what view/order just stored.
    expect(el.viewSettings["alle"].position).toBe(1);
  });
});
