import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { memoryLock } from "./lock/memory.js"
import { fsStore } from "./store/fs.js"
import { memoryStore } from "./store/memory.js"

const temporaryRoots: string[] = []

afterEach(async () => {
  vi.useRealTimers()
  await Promise.all(
    temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })),
  )
})

describe("capture stores", () => {
  it("keeps memory entries isolated from caller mutations", async () => {
    const store = memoryStore()
    const body = new Uint8Array([1, 2, 3])

    await store.put("capture.png", { body, mimeType: "image/png" })
    body[0] = 9

    const first = await store.get("capture.png")
    expect(first?.body).toEqual(new Uint8Array([1, 2, 3]))

    first!.body[1] = 8
    await expect(store.get("capture.png")).resolves.toMatchObject({
      body: new Uint8Array([1, 2, 3]),
      mimeType: "image/png",
    })

    store.clear()
    await expect(store.head("capture.png")).resolves.toBe(false)
  })

  it("round-trips nested files and metadata through the filesystem", async () => {
    const root = await mkdtemp(join(tmpdir(), "whitehash-store-"))
    temporaryRoots.push(root)
    const store = fsStore({
      root,
      publicBaseUrl: "https://cdn.example/captures/",
    })

    await store.put("tokens/42.png", {
      body: new Uint8Array([137, 80, 78, 71]),
      mimeType: "image/png",
      metadata: { token: "42" },
    })

    await expect(store.head("tokens/42.png")).resolves.toBe(true)
    await expect(store.get("tokens/42.png")).resolves.toEqual({
      body: Buffer.from([137, 80, 78, 71]),
      mimeType: "image/png",
      metadata: { token: "42" },
    })
    expect(store.publicUrl?.("tokens/42.png")).toBe("https://cdn.example/captures/tokens/42.png")
  })

  it("prevents filesystem keys from escaping the configured root", async () => {
    const root = await mkdtemp(join(tmpdir(), "whitehash-store-"))
    temporaryRoots.push(root)
    const store = fsStore({ root })

    await expect(
      store.put("../outside.png", {
        body: new Uint8Array([1]),
        mimeType: "image/png",
      }),
    ).rejects.toThrow("escapes the configured root")
    await expect(store.head("../outside.png")).resolves.toBe(false)
    await expect(store.get("../outside.png")).resolves.toBeNull()
  })
})

describe("memoryLock", () => {
  it("excludes concurrent holders and permits acquisition after expiry", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-24T12:00:00Z"))
    const lock = memoryLock()

    const first = await lock.acquire("token-42", 1_000)
    expect(first).not.toBeNull()
    await expect(lock.acquire("token-42", 1_000)).resolves.toBeNull()

    vi.advanceTimersByTime(1_001)
    const second = await lock.acquire("token-42", 1_000)
    expect(second).not.toBeNull()
    expect(second?.token).not.toBe(first?.token)

    await lock.release(first!)
    await expect(lock.acquire("token-42", 1_000)).resolves.toBeNull()

    await lock.release(second!)
    await expect(lock.acquire("token-42", 1_000)).resolves.not.toBeNull()
  })
})
