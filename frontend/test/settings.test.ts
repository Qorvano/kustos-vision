// Regression: editing a view stored the whole list on every change event.
// A change event fires when its field loses focus, and focus is lost by
// clicking anywhere else, so switching tabs quietly saved edits nobody had
// asked to save. The view list is a draft now: edits stay local until the
// Speichern button, and the navigation guard asks about the rest.
//
// The component never renders here: Lit defers updates until an element is
// connected, so the methods under test run without a DOM.

import { describe, expect, it } from "vitest";
import { CamwatchSettings } from "../src/views/settings";
import type { CamwatchApi } from "../src/api";
import type { Snapshot, View } from "../src/types";

type SettingsInternals = {
  api: CamwatchApi;
  snapshot: Snapshot;
  viewsDraft?: View[];
  viewDrag?: { fromIndex: number; currentIndex: number };
  patchView(index: number, patch: Partial<View>): void;
  viewsDirty(): boolean;
  commitViews(): Promise<boolean>;
  onViewDragEnd(): void;
};

function settings(viewCount = 1): { el: SettingsInternals; stored: unknown[][] } {
  const stored: unknown[][] = [];
  const el = new CamwatchSettings() as unknown as SettingsInternals;
  const views = [
    { id: "alle", name: "Alle", icon: "mdi:cctv", columns: 3, cameras: ["a"] },
    { id: "wand", name: "Wand", icon: "mdi:cctv", columns: 0, cameras: [] },
    { id: "flur", name: "Flur", icon: "mdi:cctv", columns: 0, cameras: [] },
  ].slice(0, viewCount);
  el.snapshot = { views } as unknown as Snapshot;
  el.api = {
    setViews: async (views: unknown[]) => {
      stored.push(views);
      return {};
    },
  } as unknown as CamwatchApi;
  return { el, stored };
}

describe("the view list is a draft until it is saved", () => {
  it("an edit stores nothing by itself any more", () => {
    const { el, stored } = settings();

    el.patchView(0, { name: "Umbenannt" });

    expect(stored).toEqual([]);
    expect(el.viewsDirty()).toBe(true);
    expect(el.viewsDraft?.[0].name).toBe("Umbenannt");
  });

  it("an edit that changes nothing is not unsaved work", () => {
    const { el } = settings();

    el.patchView(0, { name: "Alle" });

    expect(el.viewsDirty()).toBe(false);
  });

  it("a drag reorders the draft and stores nothing by itself", () => {
    const { el, stored } = settings(3);
    el.viewDrag = { fromIndex: 0, currentIndex: 2 };

    el.onViewDragEnd();

    expect(stored).toEqual([]);
    expect(el.viewsDraft?.map((v) => v.id)).toEqual(["wand", "flur", "alle"]);
    expect(el.viewsDirty()).toBe(true);
  });

  it("saving stores the draft once, without the resolved cameras", async () => {
    const { el, stored } = settings();
    el.patchView(0, { name: "Umbenannt" });

    expect(await el.commitViews()).toBe(true);

    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual([
      { id: "alle", name: "Umbenannt", icon: "mdi:cctv", columns: 3 },
    ]);
    expect(el.viewsDraft).toBeUndefined();
  });
});
