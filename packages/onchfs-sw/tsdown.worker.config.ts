import { defineConfig } from "tsdown"

export default defineConfig({
  clean: false,
  deps: {
    alwaysBundle: ["@whitehash/core"],
  },
  entry: "src/worker.ts",
  fixedExtension: false,
  format: "iife",
  minify: true,
  outDir: "dist",
  platform: "browser",
})
