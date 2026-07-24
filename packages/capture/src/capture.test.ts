import { EventEmitter } from "node:events"
import type { Browser, ConsoleMessage, Page } from "puppeteer-core"
import { describe, expect, it } from "vitest"
import { capture } from "./capture.js"
import { CaptureError } from "./errors.js"
import { CaptureMode, CaptureTriggerMode } from "./types.js"

class FakePage extends EventEmitter {
  binding?: () => void
  status = 200
  screenshotBytes = Buffer.from("png")
  gotoError?: Error
  viewport?: { width: number; height: number; deviceScaleFactor?: number }
  trigger: "event" | "console" | "none" = "none"
  canvas: { dataUrl: string; width: number; height: number } | null = {
    dataUrl: `data:image/png;base64,${Buffer.from("canvas").toString("base64")}`,
    width: 1024,
    height: 512,
  }

  async exposeFunction(_name: string, callback: () => void) {
    this.binding = callback
  }
  async evaluateOnNewDocument() {}
  async setViewport(viewport: typeof this.viewport) {
    this.viewport = viewport
  }
  async goto() {
    if (this.gotoError) throw this.gotoError
    if (this.trigger === "event") this.binding?.()
    if (this.trigger === "console") {
      this.emit("console", { text: () => "FXPREVIEW" } as ConsoleMessage)
    }
    return { status: () => this.status }
  }
  async screenshot() {
    return this.screenshotBytes
  }
  async $eval() {
    if (!this.canvas) throw new Error("missing selector")
    return this.canvas
  }
  async evaluate() {
    return JSON.stringify({
      Color: "cyan",
      Count: 3,
      Nested: { dropped: true },
    })
  }
}

function fakeBrowser(page: FakePage) {
  let closed = false
  return {
    browser: {
      newPage: async () => page as unknown as Page,
      close: async () => {
        closed = true
      },
    } as unknown as Browser,
    isClosed: () => closed,
  }
}

describe("capture", () => {
  it.each(["event", "console"] as const)(
    "handles an immediate %s fxpreview signal installed before navigation",
    async trigger => {
      const page = new FakePage()
      page.trigger = trigger
      const browser = fakeBrowser(page)
      const result = await capture({
        url: "https://art.example/token",
        settings: {
          mode: CaptureMode.VIEWPORT,
          resolution: { x: 256, y: 300 },
          triggerMode: CaptureTriggerMode.FN_TRIGGER,
        },
        browser: browser.browser,
        maxTriggerWaitMs: 10,
      })
      expect(result.triggeredBy).toBe(trigger)
      expect(result.image).toEqual(Buffer.from("png"))
      expect(result.features).toEqual([
        { name: "Color", value: "cyan" },
        { name: "Count", value: 3 },
      ])
      expect(page.viewport).toEqual({ width: 256, height: 300, deviceScaleFactor: 1 })
      expect(browser.isClosed()).toBe(true)
    },
  )

  it("captures the intrinsic canvas resolution", async () => {
    const page = new FakePage()
    const result = await capture({
      url: "https://art.example/token",
      settings: {
        mode: CaptureMode.CANVAS,
        canvasSelector: "#art",
        delay: 0,
      },
      browser: fakeBrowser(page).browser,
      maxDimension: 1024,
    })
    expect(result.image).toEqual(Buffer.from("canvas"))
    expect(page.viewport).toEqual({ width: 800, height: 800, deviceScaleFactor: 1 })
  })

  it("falls back after a bounded trigger timeout when configured", async () => {
    const page = new FakePage()
    const result = await capture({
      url: "https://art.example/token",
      settings: {
        mode: CaptureMode.VIEWPORT,
        resolution: { x: 256, y: 256 },
        triggerMode: CaptureTriggerMode.FN_TRIGGER,
      },
      browser: fakeBrowser(page).browser,
      maxTriggerWaitMs: 1,
      useFallbackCaptureOnTimeout: true,
    })
    expect(result.triggeredBy).toBe("timeout-fallback")
  })

  it("distinguishes navigation and trigger timeouts", async () => {
    const navigationPage = new FakePage()
    navigationPage.gotoError = Object.assign(new Error("late"), { name: "TimeoutError" })
    await expect(
      capture({
        url: "https://art.example/token",
        settings: {
          mode: CaptureMode.VIEWPORT,
          resolution: { x: 256, y: 256 },
          delay: 0,
        },
        browser: fakeBrowser(navigationPage).browser,
      }),
    ).rejects.toMatchObject({ code: "TIMEOUT" })

    await expect(
      capture({
        url: "https://art.example/token",
        settings: {
          mode: CaptureMode.VIEWPORT,
          resolution: { x: 256, y: 256 },
          triggerMode: CaptureTriggerMode.FN_TRIGGER,
        },
        browser: fakeBrowser(new FakePage()).browser,
        maxTriggerWaitMs: 1,
      }),
    ).rejects.toMatchObject({ code: "TIMEOUT" })
  })

  it("maps non-200 responses and missing canvases to stable errors", async () => {
    const page = new FakePage()
    page.status = 503
    await expect(
      capture({
        url: "https://art.example/token",
        settings: {
          mode: CaptureMode.VIEWPORT,
          resolution: { x: 256, y: 256 },
          delay: 0,
        },
        browser: fakeBrowser(page).browser,
      }),
    ).rejects.toMatchObject({ code: "HTTP_ERROR" })

    const canvasPage = new FakePage()
    canvasPage.canvas = null
    await expect(
      capture({
        url: "https://art.example/token",
        settings: { mode: CaptureMode.CANVAS, canvasSelector: "canvas", delay: 0 },
        browser: fakeBrowser(canvasPage).browser,
      }),
    ).rejects.toMatchObject({ code: "CANVAS_CAPTURE_FAILED" } satisfies Partial<CaptureError>)
  })

  it("enforces a URL prefix allowlist", async () => {
    await expect(
      capture({
        url: "https://untrusted.example/art",
        allowlist: ["https://art.example/"],
        settings: {
          mode: CaptureMode.VIEWPORT,
          resolution: { x: 256, y: 256 },
          delay: 0,
        },
        browser: fakeBrowser(new FakePage()).browser,
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_URL" })
  })

  it("enforces optional output byte and dimension guards", async () => {
    await expect(
      capture({
        url: "https://art.example/token",
        settings: {
          mode: CaptureMode.VIEWPORT,
          resolution: { x: 256, y: 256 },
          delay: 0,
        },
        browser: fakeBrowser(new FakePage()).browser,
        maxImageBytes: 2,
      }),
    ).rejects.toMatchObject({ code: "INVALID_PARAMETERS" })
  })
})
