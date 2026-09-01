// The reference pictures ride inside the observations, so they are part of
// the save payload and of the unsaved-work baseline automatically - the
// regression to pin here is exactly that: adding a photo counts as unsaved
// work, and no upload writes into the profile on its own.
//
// The editor never renders here: Lit defers all updates until an element is
// connected, so the methods under test run without a DOM.

import { describe, expect, it, vi } from "vitest";
import { CamwatchVisionEditor } from "../src/views/vision-editor";
import type { CamwatchApi } from "../src/api";
import type { Observation } from "../src/types";

type EditorInternals = {
  api: CamwatchApi;
  camera: { slug: string };
  detectPersons: boolean;
  saveBlocked(): boolean;
  observations: Observation[];
  baseline: string;
  unsaved: { isDirty(): boolean };
  payload(): { observations: Observation[] };
  appendReference(index: number, assetId: string): Promise<void>;
  patchReference(index: number, refIndex: number, patch: object): void;
  removeReference(index: number, refIndex: number): void;
};

function editor(observations: Observation[]): EditorInternals {
  const el = new CamwatchVisionEditor() as unknown as EditorInternals;
  el.camera = { slug: "beispiel" };
  el.observations = observations;
  return el;
}

const QUESTION: Observation = {
  key: "tonne",
  type: "boolean",
  question: "Ist die gelbe Tonne zu sehen?",
};

describe("saving is blocked only when there is nothing to analyse", () => {
  // Regression: the Speichern button demanded at least one question, which
  // locked it for a camera that should ONLY recognise persons - while the
  // navigation guard's save happily stored exactly that configuration.
  it("a person-only profile can be saved", () => {
    const el = editor([]);
    el.detectPersons = true;
    expect(el.saveBlocked()).toBe(false);
  });

  it("no questions and no person detection is nothing to analyse", () => {
    const el = editor([]);
    el.detectPersons = false;
    expect(el.saveBlocked()).toBe(true);
  });

  it("a question alone is enough", () => {
    const el = editor([{ ...QUESTION }]);
    el.detectPersons = false;
    expect(el.saveBlocked()).toBe(false);
  });
});

describe("reference pictures are unsaved work until saved", () => {
  it("adding a photo makes the editor dirty", async () => {
    const el = editor([{ ...QUESTION }]);
    el.baseline = JSON.stringify(el.payload());

    await el.appendReference(0, "a".repeat(32));

    expect(el.unsaved.isDirty()).toBe(true);
    expect(el.payload().observations[0].references).toEqual([
      { asset_id: "a".repeat(32), caption: "" },
    ]);
  });

  it("refuses a third picture, mirroring the backend cap", async () => {
    const el = editor([
      {
        ...QUESTION,
        references: [
          { asset_id: "a".repeat(32) },
          { asset_id: "b".repeat(32) },
        ],
      },
    ]);
    await el.appendReference(0, "c".repeat(32));
    expect(el.payload().observations[0].references).toHaveLength(2);
  });

  it("a caption edit reaches the payload", () => {
    const el = editor([
      { ...QUESTION, references: [{ asset_id: "a".repeat(32), caption: "" }] },
    ]);
    el.patchReference(0, 0, { caption: "Links die gelbe Tonne." });
    expect(el.payload().observations[0].references?.[0].caption).toBe(
      "Links die gelbe Tonne.",
    );
  });

  it("removing a picture touches only the configuration", () => {
    // The stored file is the orphan sweep's business after saving; deleting
    // it here would strand the config if the user cancels the edit.
    const api = { deleteReference: vi.fn() };
    const el = editor([
      { ...QUESTION, references: [{ asset_id: "a".repeat(32) }] },
    ]);
    el.api = api as unknown as CamwatchApi;

    el.removeReference(0, 0);

    expect(el.payload().observations[0].references).toEqual([]);
    expect(api.deleteReference).not.toHaveBeenCalled();
  });
});
