import { readFile } from "node:fs/promises"
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { capture, CaptureMode, CaptureTriggerMode } from "../src/index.js"
import { findLocalChrome, localProvider } from "../src/browser/local.js"

const runIntegration = process.env.WHITEHASH_CAPTURE_INTEGRATION === "1"
const fixturePath = fileURLToPath(new URL("./fixtures/artwork/index.html", import.meta.url))

describe.runIf(runIntegration)("real Chromium capture fixture", () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const fixture = await readFile(fixturePath)
    server = createServer((request, response) => {
      if (request.url?.startsWith("/error")) {
        response.writeHead(503).end("unavailable")
      } else {
        response.writeHead(200, { "Content-Type": "text/html" }).end(fixture)
      }
    })
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve())),
    )
  })

  it.each(["event", "console"] as const)(
    "captures the immediate %s trigger and v3 features",
    async trigger => {
      const result = await capture({
        url: `${baseUrl}/?trigger=${trigger}`,
        allowlist: [baseUrl],
        browser: localProvider({
          executablePath: findLocalChrome(),
          userDataDir: `/tmp/whitehash-capture-${trigger}`,
        }),
        settings: {
          mode: CaptureMode.CANVAS,
          canvasSelector: "#art",
          triggerMode: CaptureTriggerMode.FN_TRIGGER,
        },
        maxTriggerWaitMs: 1_000,
      })
      expect(result.image.subarray(1, 4).toString()).toBe("PNG")
      expect(result.features).toEqual([
        { name: "Color", value: "teal" },
        { name: "Count", value: 2 },
      ])
    },
    15_000,
  )

  it("uses timeout fallback and rejects non-200 pages", async () => {
    const browser = localProvider({ executablePath: findLocalChrome() })
    await expect(
      capture({
        url: `${baseUrl}/error`,
        browser,
        settings: {
          mode: CaptureMode.VIEWPORT,
          resolution: { x: 256, y: 256 },
          delay: 0,
        },
      }),
    ).rejects.toMatchObject({ code: "HTTP_ERROR" })

    const fallback = await capture({
      url: baseUrl,
      browser,
      settings: {
        mode: CaptureMode.VIEWPORT,
        resolution: { x: 256, y: 256 },
        triggerMode: CaptureTriggerMode.FN_TRIGGER,
      },
      maxTriggerWaitMs: 10,
      useFallbackCaptureOnTimeout: true,
    })
    expect(fallback.triggeredBy).toBe("timeout-fallback")
  }, 15_000)

  it("encodes multiple viewport frames as a GIF", async () => {
    const result = await capture({
      url: baseUrl,
      browser: localProvider({ executablePath: findLocalChrome() }),
      settings: {
        mode: CaptureMode.VIEWPORT,
        resolution: { x: 256, y: 256 },
        delay: 0,
        gif: true,
        frameCount: 2,
        captureInterval: 10,
      },
    })
    const { default: sharp } = await import("sharp")
    expect(result.mimeType).toBe("image/gif")
    expect(result.image.subarray(0, 6).toString()).toBe("GIF89a")
    expect((await sharp(result.image, { animated: true }).metadata()).pages).toBe(2)
  }, 15_000)
})
