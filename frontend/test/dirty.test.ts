// The navigation guard: nothing leaves unsaved work silently, nothing saves
// just because focus moved, and a guard that cannot ask never traps anyone.

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  guardNavigation,
  hasUnsavedWork,
  registerUnsavedWork,
  setUnsavedPrompter,
  unregisterUnsavedWork,
  type UnsavedWork,
} from "../src/dirty";

function work(dirty: boolean, saveResult = true) {
  const w = {
    saves: 0,
    discards: 0,
    isDirty: () => dirty,
    save: async () => {
      w.saves += 1;
      return saveResult;
    },
    discard: () => {
      w.discards += 1;
    },
  };
  return w;
}

const registered: UnsavedWork[] = [];
function register(w: UnsavedWork): void {
  registerUnsavedWork(w);
  registered.push(w);
}

afterEach(() => {
  for (const w of registered.splice(0)) unregisterUnsavedWork(w);
  setUnsavedPrompter(undefined);
});

describe("guardNavigation", () => {
  it("lets clean navigation through without asking", async () => {
    const prompter = vi.fn();
    setUnsavedPrompter(prompter);
    register(work(false));

    expect(await guardNavigation()).toBe(true);
    expect(prompter).not.toHaveBeenCalled();
  });

  it("cancel stays put and touches nothing", async () => {
    setUnsavedPrompter(async () => "cancel");
    const w = work(true);
    register(w);

    expect(await guardNavigation()).toBe(false);
    expect(w.saves).toBe(0);
    expect(w.discards).toBe(0);
  });

  it("save persists the work and then navigates", async () => {
    setUnsavedPrompter(async () => "save");
    const w = work(true);
    register(w);

    expect(await guardNavigation()).toBe(true);
    expect(w.saves).toBe(1);
  });

  it("a failed save blocks navigation so the error stays visible", async () => {
    setUnsavedPrompter(async () => "save");
    register(work(true, false));

    expect(await guardNavigation()).toBe(false);
  });

  it("discard throws the work away and navigates", async () => {
    setUnsavedPrompter(async () => "discard");
    const w = work(true);
    register(w);

    expect(await guardNavigation()).toBe(true);
    expect(w.discards).toBe(1);
    expect(w.saves).toBe(0);
  });

  it("covers every dirty registration, not only the last", async () => {
    setUnsavedPrompter(async () => "save");
    const a = work(true);
    const b = work(true);
    register(a);
    register(b);

    expect(await guardNavigation()).toBe(true);
    expect(a.saves).toBe(1);
    expect(b.saves).toBe(1);
  });

  it("without a prompter it never traps the person", async () => {
    register(work(true));
    expect(await guardNavigation()).toBe(true);
  });
});

describe("hasUnsavedWork", () => {
  it("reflects the registrations", () => {
    expect(hasUnsavedWork()).toBe(false);
    register(work(true));
    expect(hasUnsavedWork()).toBe(true);
  });
});
