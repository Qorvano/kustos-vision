// Regression for the reference upload: the request body is FormData, and the
// Content-Type header must NOT be set by hand. The browser adds the
// multipart boundary to the header it generates; a hand-set header would
// overwrite it with one that has no boundary, and the server could not parse
// the body at all.

import { afterEach, describe, expect, it, vi } from "vitest";
import { CamwatchApi } from "../src/api";
import type { HomeAssistant } from "../src/types";

function apiWithToken(): CamwatchApi {
  const hass = {
    auth: { data: { access_token: "token" }, expired: false },
    callWS: vi.fn(),
  } as unknown as HomeAssistant;
  return new CamwatchApi(hass);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("uploadReference", () => {
  it("sends FormData and leaves the Content-Type to the browser", async () => {
    const seen: { init?: RequestInit } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        seen.init = init;
        return new Response(
          JSON.stringify({
            asset_id: "a".repeat(32),
            content_type: "image/jpeg",
            bytes: 3,
          }),
          { status: 200 },
        );
      }),
    );

    const api = apiWithToken();
    const result = await api.uploadReference(new Blob([new Uint8Array(3)]));

    expect(result.asset_id).toBe("a".repeat(32));
    expect(seen.init?.method).toBe("POST");
    expect(seen.init?.body).toBeInstanceOf(FormData);
    const headers = new Headers(seen.init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer token");
    expect(headers.get("Content-Type")).toBeNull();
  });

  it("surfaces the server's German refusal as the error text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("Nur JPEG- und PNG-Bilder werden akzeptiert.", {
            status: 400,
          }),
      ),
    );

    const api = apiWithToken();
    await expect(api.uploadReference(new Blob([""]))).rejects.toThrow(
      "Nur JPEG- und PNG-Bilder",
    );
  });
});
