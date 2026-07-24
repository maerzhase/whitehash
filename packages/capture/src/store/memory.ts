import type { CaptureStore, StoredCapture } from "./store.js"

export function memoryStore(): CaptureStore & { clear(): void } {
  const entries = new Map<string, StoredCapture>()
  return {
    async head(key) {
      return entries.has(key)
    },
    async get(key) {
      const value = entries.get(key)
      return value ? { ...value, body: value.body.slice() } : null
    },
    async put(key, value) {
      entries.set(key, { ...value, body: value.body.slice() })
    },
    clear() {
      entries.clear()
    },
  }
}
