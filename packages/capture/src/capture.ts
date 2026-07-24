import type { Browser, Page } from "puppeteer-core"
import { assertUrlAllowed } from "./allowlist.js"
import { isBrowserProvider } from "./browser/provider.js"
import { CaptureError, asCaptureError } from "./errors.js"
import { extractFeatures } from "./features.js"
import { captureCanvas } from "./strategies/canvas.js"
import { captureGif } from "./strategies/gif.js"
import { captureViewport } from "./strategies/viewport.js"
import {
  installTriggerController,
  waitForInitialTrigger,
} from "./triggers.js"
import {
  CaptureMode,
  type CaptureOptions,
  type CaptureResult,
} from "./types.js"
import { validateCaptureSettings } from "./validate.js"

function now(): number {
  return performance.now()
}

function assertOutputLimits(
  image: Buffer,
  width: number,
  height: number,
  options: Pick<CaptureOptions, "maxImageBytes" | "maxDimension">,
): void {
  if (options.maxImageBytes != null && image.byteLength > options.maxImageBytes) {
    throw new CaptureError("INVALID_PARAMETERS", "Capture exceeds maxImageBytes")
  }
  if (
    options.maxDimension != null &&
    (width > options.maxDimension || height > options.maxDimension)
  ) {
    throw new CaptureError("INVALID_PARAMETERS", "Capture exceeds maxDimension")
  }
}

async function navigate(
  page: Page,
  url: string,
  timeout: number,
): Promise<void> {
  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout,
    })
    if (!response || response.status() !== 200) {
      throw new CaptureError(
        "HTTP_ERROR",
        `Artwork returned HTTP ${response?.status() ?? "no response"}`,
      )
    }
  } catch (error) {
    if (error instanceof CaptureError) throw error
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new CaptureError("TIMEOUT", "Artwork navigation timed out", error)
    }
    throw new CaptureError("UNKNOWN", "Artwork navigation failed", error)
  }
}

export async function capture(options: CaptureOptions): Promise<CaptureResult> {
  const settings = validateCaptureSettings(options.settings)
  assertUrlAllowed(options.url, options.allowlist)
  const provider = isBrowserProvider(options.browser) ? options.browser : null
  let browser: Browser | undefined

  try {
    if (provider) browser = await provider.acquire()
    else browser = options.browser as Browser
    const page = await browser.newPage()
    await page.setViewport(
      settings.mode === CaptureMode.VIEWPORT
        ? {
            width: settings.resolution!.x,
            height: settings.resolution!.y,
            deviceScaleFactor: 1,
          }
        : { width: 800, height: 800, deviceScaleFactor: 1 },
    )
    const trigger = await installTriggerController(page)
    try {
      const navigateStart = now()
      await navigate(page, options.url, options.navigationTimeoutMs ?? 200_000)
      const navigateMs = now() - navigateStart

      const triggerStart = now()
      const triggeredBy = await waitForInitialTrigger(
        settings,
        trigger,
        options.maxTriggerWaitMs ?? 300_000,
        options.useFallbackCaptureOnTimeout ?? false,
      )
      const triggerMs = now() - triggerStart

      const captureStart = now()
      let image: Buffer
      let mimeType: "image/png" | "image/gif"
      let width: number
      let height: number
      if (settings.gif) {
        const gif = await captureGif(
          page,
          settings,
          trigger,
          options.maxTriggerWaitMs ?? 300_000,
        )
        image = gif.image
        width = gif.width
        height = gif.height
        mimeType = "image/gif"
      } else if (settings.mode === CaptureMode.VIEWPORT) {
        image = await captureViewport(page)
        width = settings.resolution!.x
        height = settings.resolution!.y
        mimeType = "image/png"
      } else {
        const canvas = await captureCanvas(page, settings.canvasSelector!)
        image = canvas.image
        width = canvas.width
        height = canvas.height
        mimeType = "image/png"
      }
      assertOutputLimits(image, width, height, options)
      const captureMs = now() - captureStart
      const features =
        options.withFeatures === false ? [] : await extractFeatures(page)

      return {
        image,
        mimeType,
        features,
        triggeredBy,
        timing: { navigateMs, triggerMs, captureMs },
      }
    } finally {
      trigger.dispose()
    }
  } catch (error) {
    throw asCaptureError(error)
  } finally {
    if (browser) {
      if (provider) await provider.release(browser)
      else await browser.close()
    }
  }
}
