import type { Browser } from "puppeteer-core"
import { describe, expect, it } from "vitest"
import { createCaptureHandler } from "./handler.js"
import { memoryLock } from "./lock/memory.js"
import { memoryStore } from "./store/memory.js"
import { CaptureMode, type CaptureResult } from "./types.js"

const result: CaptureResult = {
  image: Buffer.from("one render"),
  mimeType: "image/png",
  features: [],
  triggeredBy: "delay",
  timing: { navigateMs: 0, triggerMs: 0, captureMs: 0 },
}

describe("createCaptureHandler", () => {
  it("deduplicates concurrent captures and serves the cached result", async () => {
    let calls = 0
    const handler = createCaptureHandler({
      browser: {} as Browser,
      store: memoryStore(),
      lock: memoryLock(),
      waiterPollMs: 1,
      resolve: () => ({
        key: "captures/v1/token.png",
        url: "https://art.example/token",
        settings: {
          mode: CaptureMode.VIEWPORT,
          resolution: { x: 256, y: 256 },
          delay: 0,
        },
      }),
      captureFn: async () => {
        calls += 1
        await new Promise(resolve => setTimeout(resolve, 10))
        return result
      },
    })
    const [first, second] = await Promise.all([
      handler(new Request("https://api.example/capture")),
      handler(new Request("https://api.example/capture")),
    ])
    expect(calls).toBe(1)
    expect(await first.text()).toBe("one render")
    expect(await second.text()).toBe("one render")
  })

  it("supports HEAD and error status mapping", async () => {
    const handler = createCaptureHandler({
      browser: {} as Browser,
      resolve: () => ({
        key: "x",
        url: "https://art.example",
        settings: {},
      }),
      captureFn: async () => {
        throw Object.assign(new Error("bad"), { code: "INVALID_PARAMETERS" })
      },
    })
    // Non-CaptureError values intentionally degrade to UNKNOWN.
    expect((await handler(new Request("https://api.example", { method: "HEAD" }))).status).toBe(502)
    expect((await handler(new Request("https://api.example", { method: "POST" }))).status).toBe(405)
  })
})
