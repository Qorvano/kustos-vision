// The codec string MediaSource is given has to match the file exactly: a wrong
// one is rejected with a decode error rather than anything useful. These check
// the three bytes are read from the right place.

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasAudioTrack,
  mediaTimeFor,
  placeRun,
  readVideoCodec,
  utcFor,
} from "../src/components/player";
import { CamwatchApi, errorText } from "../src/api";
import { clockText } from "../src/components/player";
import type { HomeAssistant } from "../src/types";
import { readFileSync } from "node:fs";
import { capabilityLabel, kindsForEntity } from "../src/capabilities";

/** A byte run with an avcC box carrying the given profile, flags and level. */
function withAvcC(profile: number, compat: number, level: number): Uint8Array {
  const bytes = [
    0x00, 0x00, 0x00, 0x2f, // box size, as a real file has it
    0x61, 0x76, 0x63, 0x43, // "avcC"
    0x01, // configurationVersion
    profile,
    compat,
    level,
    0xff, 0xe1, // whatever follows, not read
  ];
  return new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, ...bytes]);
}

describe("readVideoCodec", () => {
  it("reads High profile at level 4.0, which is what 1080p cameras send", () => {
    expect(readVideoCodec(withAvcC(0x64, 0x00, 0x28))).toBe("avc1.640028");
  });

  it("reads Main profile at level 3.1", () => {
    expect(readVideoCodec(withAvcC(0x4d, 0x40, 0x1f))).toBe("avc1.4d401f");
  });

  it("reads Baseline profile", () => {
    expect(readVideoCodec(withAvcC(0x42, 0xc0, 0x1e))).toBe("avc1.42c01e");
  });

  it("pads single-digit values, because the string is fixed width", () => {
    expect(readVideoCodec(withAvcC(0x01, 0x02, 0x03))).toBe("avc1.010203");
  });

  it("returns null when there is no avcC box", () => {
    expect(readVideoCodec(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]))).toBeNull();
  });

  it("returns null for an empty buffer rather than throwing", () => {
    expect(readVideoCodec(new Uint8Array())).toBeNull();
  });

  it("does not read past the end of a truncated box", () => {
    // Only the header arrived; the bytes that describe the codec did not.
    const truncated = new Uint8Array([0x61, 0x76, 0x63, 0x43, 0x01]);
    expect(readVideoCodec(truncated)).toBeNull();
  });

  it("finds the box even when it is far into the buffer", () => {
    const padding = new Uint8Array(4096).fill(0x20);
    const combined = new Uint8Array([...padding, ...withAvcC(0x64, 0x00, 0x1f)]);
    expect(readVideoCodec(combined)).toBe("avc1.64001f");
  });
});

describe("hasAudioTrack", () => {
  function withBox(type: string): Uint8Array {
    const bytes = [...type].map((c) => c.charCodeAt(0));
    return new Uint8Array([0, 0, 0, 24, 0x6d, 0x6f, 0x6f, 0x76, ...bytes, 1, 2, 3, 4, 5]);
  }

  it("sees an AAC track", () => {
    expect(hasAudioTrack(withBox("mp4a"))).toBe(true);
  });

  it("reports none for a video-only recording", () => {
    // What the recorder writes when audio is switched off for a camera.
    // Declaring AAC anyway hands MediaSource a type the data does not match.
    expect(hasAudioTrack(withBox("avc1"))).toBe(false);
  });

  it("reports none for an empty buffer rather than throwing", () => {
    expect(hasAudioTrack(new Uint8Array())).toBe(false);
  });
});

describe("errorText", () => {
  it("reads the message a websocket rejection carries", () => {
    // The client rejects with a plain object, not an Error. Rendering that
    // with String() gives "[object Object]" and the reason never reaches the
    // person who has to act on it.
    expect(errorText({ code: "duplicate", message: "already in use" })).toBe(
      "already in use",
    );
  });

  it("reads a real Error", () => {
    expect(errorText(new Error("kaputt"))).toBe("kaputt");
  });

  it("passes a string through", () => {
    expect(errorText("kaputt")).toBe("kaputt");
  });

  it("falls back to the code when there is no message", () => {
    expect(errorText({ code: "not_found" })).toBe("not_found");
  });

  it("never renders an object as [object Object]", () => {
    expect(errorText({ unexpected: true })).not.toContain("[object Object]");
  });

  it("survives null and undefined", () => {
    expect(typeof errorText(null)).toBe("string");
    expect(typeof errorText(undefined)).toBe("string");
  });
});

describe("capabilityLabel", () => {
  it("gives a readable name for a known slot", () => {
    // The panel showed "ptz_up" where a name belongs.
    expect(capabilityLabel("ptz_up")).toBe("Schwenken hoch");
    expect(capabilityLabel("light_brightness")).toBe("Helligkeit");
  });

  it("tidies an unknown slot rather than hiding it", () => {
    // The backend decides which capabilities exist, so a newer version can
    // offer one this panel has never heard of.
    expect(capabilityLabel("zoom_in")).toBe("Zoom in");
  });

  it("never returns an empty label", () => {
    expect(capabilityLabel("x").length).toBeGreaterThan(0);
  });
});

describe("kindsForEntity", () => {
  it("gives a select only the choice it can perform", () => {
    // Reported from use: a select set to on/off is sent true and false, which
    // it does not accept, and it failed on the first press.
    expect(kindsForEntity("select.person_detection")).toEqual(["select"]);
  });

  it("gives a button only a press", () => {
    expect(kindsForEntity("button.reboot")).toEqual(["button"]);
  });

  it("lets a switch also be a plain button", () => {
    expect(kindsForEntity("switch.privacy")).toEqual(["switch", "button"]);
  });

  it("places no restriction on a domain it does not know", () => {
    // Guessing wrong would block something that works.
    expect(kindsForEntity("vacuum.arielle")).toEqual([]);
    expect(kindsForEntity(undefined)).toEqual([]);
    expect(kindsForEntity("kaputt")).toEqual([]);
  });

  it("matches what the backend accepts", () => {
    // Both sides encode the same table; a drift here means the panel offers
    // something the save then refuses.
    for (const [entity, expected] of [
      ["number.volume", ["number"]],
      ["light.flood", ["switch", "button"]],
      ["input_select.mode", ["select"]],
    ] as const) {
      expect(kindsForEntity(entity)).toEqual(expected);
    }
  });
});

// Regression: the recordings tab fetched segments, previews and the export
// with no credentials at all. Home Assistant accepts an Authorization header
// or a signed path and nothing else, so every one of those requests was
// refused. The player reported "Die Aufnahme konnte nicht geladen werden" for
// a recording that was intact, previews stayed blank, and the download link
// led nowhere.
describe("authenticating the file endpoints", () => {
  afterEach(() => {
    // In the test body a failing expectation would skip it and leak the stub
    // into whatever runs next.
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function fakeHass(token?: string, signed = "/signed?authSig=x") {
    const calls: Record<string, unknown>[] = [];
    return {
      calls,
      hass: {
        callWS: async (message: Record<string, unknown>) => {
          calls.push(message);
          return { path: signed };
        },
        auth: token ? { data: { access_token: token } } : undefined,
      } as unknown as HomeAssistant,
    };
  }

  it("sends the access token when it fetches a segment itself", async () => {
    const { hass } = fakeHass("tok");
    const seen: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      seen.push({ url, init });
      return new Response("");
    });

    await new CamwatchApi(hass).authorizedFetch("/api/kustos_vision/segment/a");

    expect(seen[0].url).toBe("/api/kustos_vision/segment/a");
    expect(new Headers(seen[0].init?.headers).get("Authorization")).toBe(
      "Bearer tok",
    );
  });

  it("keeps the caller's own headers, so a range request stays a range request", async () => {
    const { hass } = fakeHass("tok");
    const seen: RequestInit[] = [];
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      seen.push(init ?? {});
      return new Response("");
    });

    await new CamwatchApi(hass).authorizedFetch("/api/kustos_vision/segment/a", {
      headers: { Range: "bytes=0-8191" },
    });

    const headers = new Headers(seen[0].headers);
    expect(headers.get("Range")).toBe("bytes=0-8191");
    expect(headers.get("Authorization")).toBe("Bearer tok");
  });

  it("falls back to a signed address when there is no token to present", async () => {
    const { hass, calls } = fakeHass(undefined, "/api/kustos_vision/segment/a?authSig=s");
    const seen: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      seen.push(url);
      return new Response("");
    });

    await new CamwatchApi(hass).authorizedFetch("/api/kustos_vision/segment/a");

    expect(calls[0].type).toBe("auth/sign_path");
    expect(seen[0]).toBe("/api/kustos_vision/segment/a?authSig=s");
  });

  it("signs a path through Home Assistant and asks for it only once", async () => {
    const { hass, calls } = fakeHass("tok", "/api/kustos_vision/thumbnail/a?authSig=s");
    const api = new CamwatchApi(hass);

    const first = await api.signedUrl("/api/kustos_vision/thumbnail/a");
    const second = await api.signedUrl("/api/kustos_vision/thumbnail/a");

    expect(first).toBe("/api/kustos_vision/thumbnail/a?authSig=s");
    expect(second).toBe(first);
    // Sweeping a timeline returns to the same preview constantly; asking again
    // every time would put a round trip in front of every mouse move.
    expect(calls.filter((c) => c.type === "auth/sign_path")).toHaveLength(1);
  });

  it("signs each address separately, because the signature covers the path", async () => {
    const { hass, calls } = fakeHass("tok");
    const api = new CamwatchApi(hass);

    await api.signedUrl("/api/kustos_vision/thumbnail/a");
    await api.signedUrl("/api/kustos_vision/thumbnail/b");

    expect(calls.filter((c) => c.type === "auth/sign_path")).toHaveLength(2);
    expect(calls.map((c) => c.path)).toEqual([
      "/api/kustos_vision/thumbnail/a",
      "/api/kustos_vision/thumbnail/b",
    ]);
  });

  it("asks for a validity long enough to survive looking at the page", async () => {
    const { hass, calls } = fakeHass("tok");
    await new CamwatchApi(hass).signedUrl("/api/kustos_vision/thumbnail/a");
    // Home Assistant's own default is 30 seconds, which is meant for a link
    // that is fetched at once, not one that waits in the DOM for a hover.
    expect(Number(calls[0].expires)).toBeGreaterThan(30);
  });
});

describe("re-signing an address that is about to expire", () => {
  afterEach(() => vi.useRealTimers());

  it("asks again once the margin before expiry is reached", async () => {
    const calls: Record<string, unknown>[] = [];
    const hass = {
      callWS: async (message: Record<string, unknown>) => {
        calls.push(message);
        return { path: `/signed?authSig=${calls.length}` };
      },
      auth: { data: { access_token: "tok" } },
    } as unknown as HomeAssistant;
    const api = new CamwatchApi(hass);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
    const first = await api.signedUrl("/api/kustos_vision/segment/a");

    // Just inside the window: still the same address, so the browser keeps
    // whatever it has cached under it.
    vi.setSystemTime(new Date("2026-06-15T12:30:00Z"));
    expect(await api.signedUrl("/api/kustos_vision/segment/a")).toBe(first);

    // Past the safety margin. Handing this one out again would let a long
    // download start on a signature that expires while it is running.
    vi.setSystemTime(new Date("2026-06-15T13:00:00Z"));
    const later = await api.signedUrl("/api/kustos_vision/segment/a");

    expect(later).not.toBe(first);
    expect(calls).toHaveLength(2);
  });
});

// Regression: the panel sent whatever access token the auth object held, with
// no renewal anywhere. Home Assistant's tokens outlive a websocket connection
// but not a sitting, and nothing else on the page keeps them fresh, so a
// recordings tab open longer than the token's lifetime got a black picture
// and "HTTP 401" for every segment until the whole page was reloaded.
describe("renewing an expired access token", () => {
  afterEach(() => vi.unstubAllGlobals());

  /** An auth object shaped like the frontend's, renewing on request. */
  function agingAuth(renewal = { works: true }) {
    return {
      refreshes: 0,
      data: { access_token: "stale" },
      expired: false,
      async refreshAccessToken() {
        this.refreshes += 1;
        await Promise.resolve();
        if (renewal.works) {
          this.data = { access_token: "fresh" };
          this.expired = false;
        }
      },
    };
  }

  function hassWith(auth: unknown): HomeAssistant {
    return {
      callWS: async () => ({ path: "/signed?authSig=x" }),
      auth,
    } as unknown as HomeAssistant;
  }

  it("renews a token it knows to be expired before asking the server", async () => {
    const auth = agingAuth();
    auth.expired = true;
    const seen: string[] = [];
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      seen.push(new Headers(init?.headers).get("Authorization") ?? "");
      return new Response("");
    });

    const response = await new CamwatchApi(hassWith(auth)).authorizedFetch(
      "/api/kustos_vision/segment/a",
    );

    expect(response.ok).toBe(true);
    expect(auth.refreshes).toBe(1);
    // The stale token never went out at all.
    expect(seen).toEqual(["Bearer fresh"]);
  });

  it("renews and retries once when the server refuses the token anyway", async () => {
    // `expired` still says no: the token died between the check and the
    // server looking at it, which a fixed lifetime makes inevitable.
    const auth = agingAuth();
    const seen: string[] = [];
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      const bearer = new Headers(init?.headers).get("Authorization") ?? "";
      seen.push(bearer);
      return new Response("", { status: bearer === "Bearer fresh" ? 200 : 401 });
    });

    const response = await new CamwatchApi(hassWith(auth)).authorizedFetch(
      "/api/kustos_vision/segment/a",
    );

    expect(response.status).toBe(200);
    expect(auth.refreshes).toBe(1);
    expect(seen).toEqual(["Bearer stale", "Bearer fresh"]);
  });

  it("hands a repeated 401 to the caller instead of retrying forever", async () => {
    const auth = agingAuth({ works: false });
    let fetches = 0;
    vi.stubGlobal("fetch", async () => {
      fetches += 1;
      return new Response("", { status: 401 });
    });

    const response = await new CamwatchApi(hassWith(auth)).authorizedFetch(
      "/api/kustos_vision/segment/a",
    );

    // The refusal reaches the player, whose message names the status; a
    // retry loop here would sit on a black picture fetching forever.
    expect(response.status).toBe(401);
    expect(fetches).toBe(2);
    expect(auth.refreshes).toBe(1);
  });

  it("shares one renewal between parallel fetches", async () => {
    // A seek fires the init and the data fetch together; each trading the
    // refresh token in separately would be two round trips for one click.
    const auth = agingAuth();
    auth.expired = true;
    vi.stubGlobal("fetch", async () => new Response(""));

    const api = new CamwatchApi(hassWith(auth));
    await Promise.all([
      api.authorizedFetch("/api/kustos_vision/segment/a"),
      api.authorizedFetch("/api/kustos_vision/segment/b"),
    ]);

    expect(auth.refreshes).toBe(1);
  });
});

// The tests above exercise CamwatchApi directly. That leaves the thing that
// actually broke untested: the three places that have to go through it. None
// of them can be driven here, because playback needs MediaSource and hovering
// needs a laid-out box, neither of which exists outside a browser. So the
// sources are read instead. It is a coarse check, but it fails on exactly the
// change that caused the original bug, which is what it is for.
describe("no file endpoint is reached without credentials", () => {
  const read = (name: string) =>
    readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8");

  it("the player never calls fetch directly", () => {
    const source = read("components/player.ts");
    // Only through the api, which puts the credentials on.
    expect(source).toContain("this.api.authorizedFetch(");
    const bare = source.match(/(?<![.\w])fetch\(/g) ?? [];
    expect(bare).toHaveLength(0);
  });

  it("the timeline builds its preview address from a signed one", () => {
    const source = read("components/timeline.ts");
    expect(source).toContain("signedUrl(");
    // An <img> cannot send a header, so the raw base must never reach src.
    expect(source).not.toMatch(/src="?\$\{this\.thumbnailUrlBase\}/);
  });

  it("the download goes through a signed address", () => {
    const source = read("views/recordings.ts");
    expect(source).toContain("signedUrl(this.exportUrl())");
    // A plain link would go out without credentials and be refused.
    expect(source).not.toMatch(/href=\$\{this\.exportUrl\(\)\}/);
  });

  it("both components are actually handed the api", () => {
    const source = read("views/recordings.ts");
    for (const tag of ["kustos-vision-player", "kustos-vision-timeline"]) {
      const opening = source.slice(source.indexOf(`<${tag}`));
      expect(opening.slice(0, opening.indexOf(">"))).toContain(".api=${this.api}");
    }
  });
});

// Regression: a reload left the old picture running. teardown() dropped the
// MediaSource but never touched the element, which kept playing its buffered
// footage; load() then re-anchored `placed` for the new run, and the old
// element's timeupdates mapped the old media clock onto the new timeline.
// When the reload after a scrub failed (an expired token, see above), the
// cursor ran at the scrubbed-to moment while the picture showed material from
// hours earlier. Driving real playback needs MediaSource, so the source is
// read instead, the same way the credentials checks above do it.
describe("a reload takes the old playback down with it", () => {
  const source = readFileSync(
    new URL("../src/components/player.ts", import.meta.url),
    "utf8",
  );

  it("teardown detaches the element, not only the fields", () => {
    const teardown = source.slice(
      source.indexOf("private teardown("),
      source.indexOf("private async load("),
    );
    expect(teardown).toContain("video.pause()");
    expect(teardown).toContain('video.removeAttribute("src")');
    expect(teardown).toContain("video.load()");
  });

  it("load reads the resume intent before teardown stops the element", () => {
    const load = source.slice(source.indexOf("private async load("));
    const pausedRead = load.indexOf(".paused");
    const teardownCall = load.indexOf("this.teardown()");
    expect(pausedRead).toBeGreaterThan(-1);
    expect(teardownCall).toBeGreaterThan(-1);
    expect(pausedRead).toBeLessThan(teardownCall);
  });
});

// Regression: the media timeline used to map real time directly, so a pause
// in recording became minutes of seekable nothing. A day with ten minutes of
// footage around a gap read as a quarter hour of running time, and seeking
// into the hole stalled the element for good. And with every stream of the
// camera in one list, a run could feed two different encodings into one
// SourceBuffer.
describe("placing a run of segments on the media timeline", () => {
  const sd = (start: number, duration: number) => ({
    path: `sd-${start}`,
    start,
    duration,
    stream_key: "sd",
  });
  const hd = (start: number, duration: number) => ({
    path: `hd-${start}`,
    start,
    duration,
    stream_key: "hd",
  });

  it("lays segments end to end with the gaps removed", () => {
    // The measured shape of a real evening: a clip, a pause, two more clips.
    const placed = placeRun([sd(0, 300), sd(774, 42), sd(816, 85)], 0);
    expect(placed.map((p) => p.mediaStart)).toEqual([0, 300, 342]);
  });

  it("keeps a run to one stream even when the other overlaps it", () => {
    const placed = placeRun(
      [sd(0, 300), hd(0, 300), sd(300, 300), hd(300, 300)],
      10,
    );
    expect(new Set(placed.map((p) => p.segment.stream_key)).size).toBe(1);
    expect(placed).toHaveLength(2);
  });

  it("stays on the preferred stream when it also covers the moment", () => {
    const placed = placeRun([sd(0, 300), hd(0, 300)], 10, "sd");
    expect(placed[0].segment.stream_key).toBe("sd");
  });

  it("switches stream when only the other one has footage there", () => {
    // SD ended in the evening, HD took over: clicking into the HD part must
    // play HD, not jump to some later SD clip.
    const placed = placeRun([sd(0, 300), hd(1000, 300)], 1100, "sd");
    expect(placed[0].segment.stream_key).toBe("hd");
  });

  it("starts at the next recording when the moment falls into a gap", () => {
    const placed = placeRun([sd(0, 300), sd(1000, 300)], 500);
    expect(placed[0].segment.start).toBe(1000);
    expect(placed[0].mediaStart).toBe(0);
  });

  it("is empty after the last recording", () => {
    expect(placeRun([sd(0, 300)], 1000)).toEqual([]);
  });
});

describe("mapping between real time and the media timeline", () => {
  const placed = placeRun(
    [
      { path: "a", start: 100, duration: 300 },
      { path: "b", start: 900, duration: 300 },
    ],
    0,
  );

  it("maps a moment inside a segment", () => {
    expect(mediaTimeFor(placed, 250)).toBe(150);
    expect(mediaTimeFor(placed, 1000)).toBe(400);
  });

  it("snaps a moment inside the gap to the segment after it", () => {
    expect(mediaTimeFor(placed, 600)).toBe(300);
  });

  it("round-trips", () => {
    expect(utcFor(placed, mediaTimeFor(placed, 1000))).toBe(1000);
    expect(utcFor(placed, 0)).toBe(100);
    expect(utcFor(placed, 450)).toBe(1050);
  });

  it("clamps beyond the end", () => {
    expect(mediaTimeFor(placed, 5000)).toBe(600);
    expect(utcFor(placed, 5000)).toBe(1200);
  });
});

// Regression guards for the two invisible failure modes around updates. Both
// are source scans, because the behaviour needs a real page: a stale tab
// importing a second bundle version, and the service worker's cache rules.
describe("surviving an update", () => {
  const read = (name: string) =>
    readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8");

  it("the entry module runs the version guard before anything defines", () => {
    const source = read("panel.ts");
    const firstImport = source.indexOf("import");
    expect(source.indexOf('import "./version-guard"')).toBe(firstImport);
  });

  it("the guard reloads a page an older bundle owns, at most once", () => {
    const source = read("version-guard.ts");
    expect(source).toContain('customElements.get("kustos-vision-panel")');
    expect(source).toContain("location.reload()");
    expect(source).toContain("sessionStorage");
  });

  it("the player reports its position so the timeline can follow", () => {
    expect(read("components/player.ts")).toContain('"positionchange"');
  });

  it("the stale banner compares bundles, never the integration version", () => {
    // Regression for 0.6.3: comparing against build.version made every tab
    // nag to reload forever after a Python-only release, and reloading could
    // never help because the served bundle WAS the newest.
    const source = read("panel.ts");
    expect(source).toContain("snapshot.build?.bundle_version");
    expect(source).not.toMatch(/installed\s*!==\s*BUILT_VERSION/);
    // The build tag must survive into the bundle for the server to extract.
    expect(source).toContain("kustosVisionBuild = BUILD_TAG");
  });
});

describe("scrubbing", () => {
  const read = (name: string) =>
    readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8");

  it("playback reports do not fight the finger", () => {
    // Regression: while dragging, the running video kept reporting its own
    // clock and the cursor flicked between the two several times a second.
    const source = read("views/recordings.ts");
    expect(source).toMatch(/if \(this\.scrubbing\) return;/);
    expect(source).toContain("@scrubend=");
  });

  it("a stale playback report cannot strand the cursor off the day", () => {
    // Regression: a tick from the run being torn down during a day switch
    // carried the old day's clock, and the cursor vanished until the next
    // click into the timeline.
    const source = read("views/recordings.ts");
    expect(source).toMatch(
      /if \(e\.detail\.time < from \|\| e\.detail\.time > to\) return;/,
    );
  });

  it("a cancelled drag lifts the suppression again", () => {
    expect(read("components/timeline.ts")).toContain('"scrubend"');
  });

  it("a restarted run resumes playing on its own", () => {
    // Regression: Safari kept the controls on "playing" while nothing moved
    // after the source was swapped underneath a running video.
    const source = read("components/player.ts");
    expect(source).toContain("startup.resume");
    expect(source).toMatch(/video\.play\(\)/);
  });
});

describe("the corner clock", () => {
  const read = (name: string) =>
    readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8");

  it("renders a second-exact time", () => {
    const text = clockText(Date.UTC(2026, 5, 15, 12, 30, 45) / 1000);
    expect(text).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    expect(text).toMatch(/2026/);
  });

  it("both pictures carry one", () => {
    expect(read("components/player.ts")).toContain('class="clock"');
    expect(read("components/live-stream.ts")).toContain('class="clock"');
  });

  it("the download can ask for the burnt-in clock", () => {
    const source = read("views/recordings.ts");
    expect(source).toContain('params.set("stamp", "1")');
    expect(source).toContain("Zeitstempel einbrennen");
  });
});

describe("the storage banner", () => {
  const read = (name: string) =>
    readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8");

  it("offers the reconnect the supervisor never retries by itself", () => {
    const source = read("panel.ts");
    expect(source).toContain("storage_reconnect_available");
    expect(source).toContain("Speicher neu verbinden");
    expect(source).toContain("reconnectStorage()");
  });

  it("the api client carries the command", () => {
    expect(read("api.ts")).toContain("storage/reconnect");
  });
});

describe("streaming the segments", () => {
  const source = readFileSync(
    new URL("../src/components/player.ts", import.meta.url),
    "utf8",
  );

  it("appends while the bytes arrive instead of after the download", () => {
    // Regression: the whole fifty-megabyte segment was downloaded before the
    // first append, which kept the screen black for the entire transfer
    // after every timeline click.
    expect(source).toContain(".getReader()");
  });

  it("never resets a buffer nothing was appended to", () => {
    // Regression: a pending play() on a freshly opened, still empty source
    // came back as "Media failed to decode" when the reset raced it.
    expect(source).toMatch(/if \(this\.accepted > 0\) this\.buffer\.abort\(\)/);
  });

  it("nudges a stalled element after data arrives", () => {
    expect(source).toContain("nudgePlayback");
  });
});

describe("surviving a refused frame", () => {
  const source = readFileSync(
    new URL("../src/components/player.ts", import.meta.url),
    "utf8",
  );

  it("a media error skips ahead instead of ending the viewing", () => {
    // Real recordings contain frames both engines refuse (camera stalls with
    // multi-second packet durations); dying there froze the player at, for
    // example, 08:48:33 with "Media failed to decode".
    expect(source).toContain("RECOVERY_SKIP_SECONDS");
    expect(source).toMatch(/recoveries \+= 1/);
    expect(source).toContain("MAX_RECOVERIES");
  });

  it("a fresh click starts with a fresh recovery budget", () => {
    expect(source).toMatch(/this\.recoveries = 0;\s*\n\s*this\.jump/);
  });
});

describe("seeking by fragments", () => {
  const read = (name: string) =>
    readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8");

  it("a mid-segment click fetches from the right fragment", () => {
    // Regression: playback into the middle of a 170 MB daylight segment
    // downloaded the whole prefix before the first played frame.
    const source = read("components/player.ts");
    expect(source).toContain("fetchRanged");
    expect(source).toMatch(/Range: `bytes=\$\{from\.offset\}/);
  });

  it("the range never includes a torn tail", () => {
    expect(read("components/player.ts")).toContain("map.data_end - 1");
  });


  it("a range answered with the whole file falls back instead", () => {
    // A proxy that strips Range answers 200; reading 158 MB as the init
    // segment is not an option.
    expect(read("components/player.ts")).toContain("status !== 206");
  });

  it("fragment maps are cached per path", () => {
    expect(read("api.ts")).toContain("fragmentMaps");
  });
});
