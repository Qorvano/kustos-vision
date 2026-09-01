// The persons card follows the draft rule the views card established: edits
// stay local until Speichern, nothing is stored per change event, and the
// commit talks to the API in a deterministic order (deletions, upserts,
// then the shared Abklingzeit).
//
// The component never renders here: Lit defers updates until an element is
// connected, so the methods under test run without a DOM.

import { describe, expect, it } from "vitest";
import { CamwatchSettings } from "../src/views/settings";
import type { CamwatchApi } from "../src/api";
import type { Snapshot } from "../src/types";

type PersonDraft = {
  id: string;
  name: string;
  enabled: boolean;
  references: { asset_id: string }[];
};

type SettingsInternals = {
  api: CamwatchApi;
  snapshot: Snapshot;
  error: string;
  personsDraft?: PersonDraft[];
  absenceInput?: string;
  draftPersons(): PersonDraft[];
  patchPerson(index: number, patch: Partial<PersonDraft>): void;
  addPerson(): void;
  addPersonPhoto(index: number, assetId: string): Promise<void>;
  removePersonPhoto(index: number, refIndex: number): Promise<void>;
  personsDirty(): boolean;
  commitPersons(): Promise<boolean>;
  refresh(): Promise<void>;
};

function card(people: object[] = [], absence = 600) {
  const calls: { kind: string; payload?: unknown }[] = [];
  const el = new CamwatchSettings() as unknown as SettingsInternals;
  el.snapshot = {
    persons: { absence_seconds: absence, people },
  } as unknown as Snapshot;
  el.api = {
    setPerson: async (payload: unknown) => {
      calls.push({ kind: "set", payload });
      return {};
    },
    deletePerson: async (id: string) => {
      calls.push({ kind: "delete", payload: id });
      return {};
    },
    setPersonsOptions: async (seconds: number) => {
      calls.push({ kind: "options", payload: seconds });
      return {};
    },
  } as unknown as CamwatchApi;
  // refresh() dispatches an event nobody listens to off-DOM.
  (el as unknown as { refresh(): Promise<void> }).refresh = async () => {};
  return { el, calls };
}

const DUSTIN = { id: "dustin", name: "Dustin", enabled: true, references: [] };

describe("the persons card is a draft until saved", () => {
  it("an edit stores nothing by itself", () => {
    const { el, calls } = card([DUSTIN]);
    el.patchPerson(0, { name: "D." });
    expect(calls).toEqual([]);
    expect(el.personsDirty()).toBe(true);
  });

  it("an unchanged card is not unsaved work", () => {
    const { el } = card([DUSTIN]);
    expect(el.personsDirty()).toBe(false);
    el.patchPerson(0, { name: "Dustin" });
    expect(el.personsDirty()).toBe(false);
  });

  it("saving sends deletions, changed people and the Abklingzeit", async () => {
    const { el, calls } = card([
      DUSTIN,
      { id: "gast", name: "Gast", enabled: true, references: [] },
    ]);
    el.personsDraft = [{ ...DUSTIN, name: "D." }];
    el.absenceInput = "120";

    expect(await el.commitPersons()).toBe(true);

    expect(calls).toEqual([
      { kind: "delete", payload: "gast" },
      {
        kind: "set",
        payload: {
          person_id: "dustin",
          name: "D.",
          enabled: true,
          references: [],
        },
      },
      { kind: "options", payload: 120 },
    ]);
  });

  it("an unchanged person is not re-sent", async () => {
    const { el, calls } = card([DUSTIN]);
    el.personsDraft = [{ ...DUSTIN }];
    await el.commitPersons();
    expect(calls).toEqual([]);
  });

  it("a new person travels without an id, which the server derives", async () => {
    const { el, calls } = card([]);
    el.addPerson();
    el.patchPerson(0, { name: "Petra" });
    await el.commitPersons();
    expect(calls).toEqual([
      {
        kind: "set",
        payload: { name: "Petra", enabled: true, references: [] },
      },
    ]);
  });

  it("a nameless person refuses to save with a German sentence", async () => {
    const { el, calls } = card([]);
    el.addPerson();
    expect(await el.commitPersons()).toBe(false);
    expect(el.error).toContain("Namen");
    expect(calls).toEqual([]);
  });

  it("the Abklingzeit is clamped to whole non-negative seconds", async () => {
    const { el, calls } = card([]);
    el.absenceInput = "-5";
    await el.commitPersons();
    expect(calls).toEqual([{ kind: "options", payload: 0 }]);
  });
});

describe("photos of an existing person persist on the spot", () => {
  // Regression: photos lived only in the draft until Speichern, and a draft
  // discarded on navigation silently lost them - the person stood in the
  // config without any reference picture while the panel had shown the
  // photo attached. Adding a photo is an explicit action, so it stores
  // immediately, like a drag&drop reorder does.
  it("adding a photo saves it immediately, with the SAVED name", async () => {
    const { el, calls } = card([DUSTIN]);
    // An unsaved rename sits in the draft; the photo save must not
    // quietly persist it.
    el.patchPerson(0, { name: "D." });

    await el.addPersonPhoto(0, "a".repeat(32));

    expect(calls).toEqual([
      {
        kind: "set",
        payload: {
          person_id: "dustin",
          name: "Dustin",
          enabled: true,
          references: [{ asset_id: "a".repeat(32) }],
        },
      },
    ]);
    expect(el.draftPersons()[0].references).toEqual([
      { asset_id: "a".repeat(32) },
    ]);
  });

  it("removing a photo saves immediately too", async () => {
    const { el, calls } = card([
      { ...DUSTIN, references: [{ asset_id: "a".repeat(32) }] },
    ]);
    await el.removePersonPhoto(0, 0);
    expect(calls).toEqual([
      {
        kind: "set",
        payload: {
          person_id: "dustin",
          name: "Dustin",
          enabled: true,
          references: [],
        },
      },
    ]);
  });

  it("a photo for a person not saved yet stays in the draft", async () => {
    const { el, calls } = card([]);
    el.addPerson();
    await el.addPersonPhoto(0, "c".repeat(32));
    expect(calls).toEqual([]);
    expect(el.draftPersons()[0].references).toEqual([
      { asset_id: "c".repeat(32) },
    ]);
  });
});
