// The endpoints card follows the draft rule: edits stay local until
// Speichern, the commit talks to the API in a deterministic order
// (deletions, then changed endpoints), and a new endpoint travels without
// an id so the server derives the identity exactly once.
//
// The component never renders here: Lit defers updates until an element is
// connected, so the methods under test run without a DOM.

import { describe, expect, it } from "vitest";
import { CamwatchSettings } from "../src/views/settings";
import type { CamwatchApi } from "../src/api";
import type { Snapshot } from "../src/types";

type EndpointDraft = {
  id: string;
  name: string;
  url: string;
  api_key: string;
  api_key_set: boolean;
  clear_api_key: boolean;
  models: string[];
};

type SettingsInternals = {
  api: CamwatchApi;
  snapshot: Snapshot;
  error: string;
  endpointsDraft?: EndpointDraft[];
  draftEndpoints(): EndpointDraft[];
  patchEndpoint(index: number, patch: Partial<EndpointDraft>): void;
  addEndpoint(): void;
  endpointsDirty(): boolean;
  commitEndpoints(): Promise<boolean>;
  discoverEndpointModels(index: number): Promise<void>;
  refresh(): Promise<void>;
};

function card(endpoints: object[] = []) {
  const calls: { kind: string; payload?: unknown }[] = [];
  const el = new CamwatchSettings() as unknown as SettingsInternals;
  el.snapshot = { endpoints } as unknown as Snapshot;
  el.api = {
    setEndpoint: async (payload: unknown) => {
      calls.push({ kind: "set", payload });
      return {};
    },
    deleteEndpoint: async (id: string) => {
      calls.push({ kind: "delete", payload: id });
      return {};
    },
    endpointModels: async (url: string) => {
      calls.push({ kind: "models", payload: url });
      return { models: ["gemma4-vision", "qwen-vision"] };
    },
  } as unknown as CamwatchApi;
  (el as unknown as { refresh(): Promise<void> }).refresh = async () => {};
  return { el, calls };
}

const MINI = {
  id: "mini",
  name: "Mac mini",
  url: "http://mini:8080/v1",
  api_key: "",
  api_key_set: false,
  clear_api_key: false,
  models: ["gemma4-vision"],
};

describe("the endpoints card is a draft until saved", () => {
  it("an edit stores nothing by itself", () => {
    const { el, calls } = card([MINI]);
    el.patchEndpoint(0, { url: "http://neu:8080/v1" });
    expect(calls).toEqual([]);
    expect(el.endpointsDirty()).toBe(true);
  });

  it("saving sends deletions and changed endpoints", async () => {
    const { el, calls } = card([
      MINI,
      { id: "alt", name: "Alt", url: "http://alt:1/v1", models: [] },
    ]);
    el.endpointsDraft = [{ ...MINI, name: "Mini neu" }];

    expect(await el.commitEndpoints()).toBe(true);

    expect(calls).toEqual([
      { kind: "delete", payload: "alt" },
      {
        kind: "set",
        payload: {
          endpoint_id: "mini",
          name: "Mini neu",
          url: "http://mini:8080/v1",
          api_key: "",
          models: ["gemma4-vision"],
        },
      },
    ]);
  });

  it("a new endpoint travels without an id", async () => {
    const { el, calls } = card([]);
    el.addEndpoint();
    el.patchEndpoint(0, { name: "Mac mini", url: "http://mini:8080/v1" });
    await el.commitEndpoints();
    expect(calls).toEqual([
      {
        kind: "set",
        payload: {
          name: "Mac mini",
          url: "http://mini:8080/v1",
          api_key: "",
          models: [],
        },
      },
    ]);
  });

  it("an endpoint without name or address refuses to save", async () => {
    const { el, calls } = card([]);
    el.addEndpoint();
    expect(await el.commitEndpoints()).toBe(false);
    expect(el.error).toContain("Namen");
    expect(calls).toEqual([]);
  });

  it("discovery fills the draft models from the endpoint's own answer", async () => {
    const { el } = card([{ ...MINI, models: [] }]);
    await el.discoverEndpointModels(0);
    expect(el.draftEndpoints()[0].models).toEqual([
      "gemma4-vision",
      "qwen-vision",
    ]);
    // Discovered, not stored: the models are part of the draft and travel
    // with the next Speichern.
    expect(el.endpointsDirty()).toBe(true);
  });
});

describe("a stored key never reaches the panel", () => {
  // Regression: the snapshot carried the key itself, so every admin
  // websocket client that asked for the configuration got it in clear text.
  it("the draft only knows that a key is set", () => {
    const { el } = card([{ id: "oa", name: "OpenAI", url: "https://x/v1", api_key_set: true }]);
    const draft = el.draftEndpoints()[0];
    expect(draft.api_key).toBe("");
    expect(draft.api_key_set).toBe(true);
  });

  it("saving with the field left empty keeps the stored key", async () => {
    const { el, calls } = card([{ id: "oa", name: "OpenAI", url: "https://x/v1", api_key_set: true }]);
    el.patchEndpoint(0, { name: "OpenAI neu" });
    await el.commitEndpoints();
    expect(calls).toEqual([
      {
        kind: "set",
        payload: {
          endpoint_id: "oa",
          name: "OpenAI neu",
          url: "https://x/v1",
          api_key: "",
          models: [],
        },
      },
    ]);
  });

  it("dropping the key is an explicit request", async () => {
    const { el, calls } = card([{ id: "oa", name: "OpenAI", url: "https://x/v1", api_key_set: true }]);
    el.patchEndpoint(0, { clear_api_key: true });
    expect(el.endpointsDirty()).toBe(true);
    await el.commitEndpoints();
    expect(calls[0].payload).toMatchObject({ endpoint_id: "oa", api_key: "", clear_api_key: true });
  });
});
