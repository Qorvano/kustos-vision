// The panel's own dropdown replaced every native <select>, because the
// native popup can neither be styled nor stopped from growing across the
// screen on macOS instead of scrolling. These cover its pure logic and pin
// the migration so a native select cannot quietly return.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { filterOptions, placeDrop } from "../src/components/select";

describe("filterOptions", () => {
  const options = [
    { value: "a", label: "Kamera Vorgarten Move Up" },
    { value: "b", label: "Kamera Vorgarten Siren volume" },
    { value: "c", label: "Kamera Garten RSSI" },
  ];

  it("matches case-insensitively inside the label", () => {
    expect(filterOptions(options, "siren").map((o) => o.value)).toEqual(["b"]);
  });

  it("returns everything for a blank query", () => {
    expect(filterOptions(options, "  ")).toEqual(options);
  });

  it("returns nothing rather than everything for a miss", () => {
    expect(filterOptions(options, "xyz")).toEqual([]);
  });
});

describe("placeDrop", () => {
  const rect = { top: 100, bottom: 130, left: 20, width: 300 };

  it("opens toward the side with more room and caps the height to it", () => {
    const down = placeDrop(rect, { width: 1200, height: 800 }, 8);
    expect(down.up).toBe(false);
    // 800 viewport - 130 field bottom - 8 margin.
    expect(down.maxHeight).toBe(662);

    const up = placeDrop({ ...rect, top: 700, bottom: 730 }, { width: 1200, height: 800 }, 8);
    expect(up.up).toBe(true);
    // 700 field top - 8 margin.
    expect(up.maxHeight).toBe(692);
  });

  it("keeps the panel on the field's width and left edge", () => {
    const placed = placeDrop(rect, { width: 1200, height: 800 }, 8);
    expect(placed.left).toBe(20);
    expect(placed.width).toBe(300);
  });

  it("never returns a negative height", () => {
    expect(
      placeDrop({ top: 4, bottom: 796, left: 0, width: 100 }, { width: 1200, height: 800 }, 8).maxHeight,
    ).toBe(0);
  });
});

describe("no native select is left anywhere in the panel", () => {
  it("views and components render only kustos-vision-select", () => {
    for (const dir of ["views", "components"]) {
      for (const name of readdirSync(new URL(`../src/${dir}`, import.meta.url))) {
        if (name === "select.ts") continue;
        const source = readFileSync(
          new URL(`../src/${dir}/${name}`, import.meta.url),
          "utf8",
        );
        // The native popup is unstylable and macOS grows it across the
        // screen instead of scrolling; every list goes through the shared
        // component so the panel stays one design.
        expect(source, `${dir}/${name}`).not.toContain("<select");
      }
    }
  });
});
