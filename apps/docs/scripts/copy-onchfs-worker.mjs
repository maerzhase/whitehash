import { copyFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const packageDist = resolve(docsRoot, "../../packages/onchfs-sw/dist")
const publicDir = resolve(docsRoot, "public")

await mkdir(publicDir, { recursive: true })
await Promise.all([
  copyFile(resolve(packageDist, "worker.js"), resolve(publicDir, "onchfs-sw.js")),
  copyFile(resolve(packageDist, "onchfs.global.js"), resolve(publicDir, "onchfs.global.js")),
])
