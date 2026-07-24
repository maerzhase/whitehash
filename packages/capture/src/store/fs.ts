import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { dirname, resolve, sep } from "node:path"
import type { CaptureStore } from "./store.js"

export interface FsStoreOptions {
  root: string
  publicBaseUrl?: string
}

function safePath(root: string, key: string): string {
  const absoluteRoot = resolve(root)
  const candidate = resolve(absoluteRoot, key)
  if (candidate !== absoluteRoot && !candidate.startsWith(`${absoluteRoot}${sep}`)) {
    throw new Error("Capture store key escapes the configured root")
  }
  return candidate
}

export function fsStore(options: FsStoreOptions): CaptureStore {
  const metadataPath = (key: string) => `${safePath(options.root, key)}.metadata.json`
  return {
    async head(key) {
      try {
        await stat(safePath(options.root, key))
        return true
      } catch {
        return false
      }
    },
    async get(key) {
      try {
        const [body, metadata] = await Promise.all([
          readFile(safePath(options.root, key)),
          readFile(metadataPath(key), "utf8").then(value => JSON.parse(value) as {
            mimeType: string
            metadata?: Record<string, string>
          }),
        ])
        return { body, ...metadata }
      } catch {
        return null
      }
    },
    async put(key, value) {
      const path = safePath(options.root, key)
      await mkdir(dirname(path), { recursive: true })
      await Promise.all([
        writeFile(path, value.body),
        writeFile(
          metadataPath(key),
          JSON.stringify({ mimeType: value.mimeType, metadata: value.metadata }),
        ),
      ])
    },
    publicUrl: options.publicBaseUrl
      ? key => `${options.publicBaseUrl!.replace(/\/+$/, "")}/${key}`
      : undefined,
  }
}
