// The rules the responsive layout depends on, pinned as source scans - the
// suite runs without a layout engine, so the sources are the evidence.

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

function read(path: string): string {
  return readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
}

function allSources(): { name: string; source: string }[] {
  const out: { name: string; source: string }[] = [];
  for (const dir of ["", "views/", "components/"]) {
    for (const name of readdirSync(new URL(`../src/${dir}`, import.meta.url))) {
      if (!name.endsWith(".ts")) continue;
      out.push({ name: `${dir}${name}`, source: read(`${dir}${name}`) });
    }
  }
  return out;
}

describe("the responsive ground rules hold", () => {
  it("container-type appears in styles.ts only", () => {
    // Inline-size containment makes an element the containing block for
    // fixed descendants and a stacking context, which strands a dropdown
    // popover inside it. Exactly one sanctioned use exists: .table-stack.
    for (const { name, source } of allSources()) {
      if (name === "styles.ts") continue;
      expect(source, name).not.toContain("container-type");
    }
    expect(read("styles.ts")).toContain("container-type");
  });

  it("the live grid treats the configured columns as a ceiling", () => {
    // Regression: an inline grid-template-columns from view.columns beat
    // the stylesheet at every width - three 99px thumbnails on a phone.
    const source = read("views/live.ts");
    expect(source).not.toContain("grid-template-columns: repeat(${");
    expect(source).toContain("--kv-cols-config");
  });

  it("no empty span leans on .grow's 160px floor", () => {
    // The empty pusher is .spacer; .grow is for fields and keeps a floor.
    for (const { name, source } of allSources()) {
      expect(source, name).not.toContain('class="grow"></span>');
    }
  });

  it("fullscreen is only requested behind the feature check", () => {
    const source = read("components/live-stream.ts");
    expect(source).toContain("nativeFullscreenAvailable");
    expect(source).toContain("enterImmersive");
  });
});
