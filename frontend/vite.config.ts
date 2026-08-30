import { defineConfig } from "vite";

// Home Assistant loads exactly one module for a custom panel, so the build has
// to produce a single self-contained file with no code splitting and no
// separate CSS. The output lands inside the integration because HACS ships
// whatever is committed and never runs a build.
export default defineConfig({
  build: {
    outDir: "../custom_components/camwatch/frontend/dist",
    emptyOutDir: true,
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
