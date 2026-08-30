import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

// The version the bundle was built from, taken from the manifest so it is
// never written down twice. The panel compares it against the version the
// integration reports at run time: if a browser is still holding an older
// bundle, the two differ and it can say so instead of quietly showing
// yesterday's panel.
const version = JSON.parse(
  readFileSync("../custom_components/kustos_vision/manifest.json", "utf8"),
).version;

// Home Assistant loads exactly one module for a custom panel, so the build has
// to produce a single self-contained file with no code splitting and no
// separate CSS. The output lands inside the integration because HACS ships
// whatever is committed and never runs a build.
export default defineConfig({
  define: { __KUSTOS_VISION_VERSION__: JSON.stringify(version) },
  build: {
    outDir: "../custom_components/kustos_vision/frontend/dist",
    // The build writes exactly one file under a fixed name, so wiping the
    // directory first gains nothing. It also fails outright when the output
    // sits on a network share that still holds a lock on the previous file.
    emptyOutDir: false,
    target: "es2022",
    lib: {
      entry: "src/panel.ts",
      formats: ["es"],
      fileName: () => "panel.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
