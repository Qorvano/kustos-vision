// The shared drag geometry: the drop position from where the rows actually
// are - rows wrap on a phone, so no uniform height may be assumed.

import { describe, expect, it } from "vitest";
import { dropIndexAt } from "../src/drag";

const rows = [
  { top: 0, bottom: 40 },
  { top: 40, bottom: 120 }, // a wrapped row, twice as tall
  { top: 120, bottom: 160 },
];

describe("dropIndexAt", () => {
  it("picks the row containing the pointer, whatever its height", () => {
    expect(dropIndexAt(rows, 20, 0)).toBe(0);
    expect(dropIndexAt(rows, 100, 0)).toBe(1);
    expect(dropIndexAt(rows, 150, 0)).toBe(2);
  });

  it("clamps above the first and below the last row", () => {
    expect(dropIndexAt(rows, -50, 1)).toBe(0);
    expect(dropIndexAt(rows, 500, 1)).toBe(2);
  });

  it("keeps the current index when there is nothing to hit", () => {
    expect(dropIndexAt([], 100, 4)).toBe(4);
  });
});
