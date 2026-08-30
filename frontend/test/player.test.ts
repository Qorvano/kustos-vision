// The codec string MediaSource is given has to match the file exactly: a wrong
// one is rejected with a decode error rather than anything useful. These check
// the three bytes are read from the right place.

import { describe, expect, it } from "vitest";
import { readVideoCodec } from "../src/components/player";

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
