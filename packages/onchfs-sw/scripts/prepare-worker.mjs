import { readFile, rename, writeFile } from "node:fs/promises"

await rename("dist/worker.global.js", "dist/worker.js")
const source = await readFile("node_modules/onchfs/dist/index.global.js", "utf8")
const browserExport = `if (typeof window !== "undefined") {
    ;
    window.Onchfs = Onchfs;
  }`
if (!source.includes(browserExport)) {
  throw new Error("onchfs global export shape changed")
}
await writeFile(
  "dist/onchfs.global.js",
  source.replace(browserExport, "globalThis.Onchfs = Onchfs;"),
)
