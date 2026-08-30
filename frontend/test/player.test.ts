// The codec string MediaSource is given has to match the file exactly: a wrong
// one is rejected with a decode error rather than anything useful. These check
// the three bytes are read from the right place.

import { describe, expect, it } from "vitest";
import { hasAudioTrack, readVideoCodec } from "../src/components/player";
import { errorText } from "../src/api";
import { capabilityLabel } from "../src/capabilities";

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
