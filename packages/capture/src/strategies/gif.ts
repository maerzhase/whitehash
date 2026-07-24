import type { Page } from "puppeteer-core"
import { CaptureError } from "../errors.js"
import type { TriggerController } from "../triggers.js"
import { CaptureMode, type CaptureSettings, CaptureTriggerMode } from "../types.js"

interface RgbaFrame {
  pixels: Uint8Array
  width: number
  height: number
}

async function viewportFrame(page: Page, width: number, height: number): Promise<RgbaFrame> {
  const base64 = await page.screenshot({ type: "png", encoding: "base64" })
  const pixels = await page.evaluate(
    async (dataUrl: string, frameWidth: number, frameHeight: number) => {
      const image = new Image()
      image.src = dataUrl
      await image.decode()
      const canvas = document.createElement("canvas")
      canvas.width = frameWidth
      canvas.height = frameHeight
      const context = canvas.getContext("2d")
      if (!context) throw new Error("2D canvas is unavailable")
      context.drawImage(image, 0, 0)
      return Array.from(context.getImageData(0, 0, frameWidth, frameHeight).data)
    },
    `data:image/png;base64,${base64}`,
    width,
    height,
  )
  return { pixels: Uint8Array.from(pixels), width, height }
}

async function canvasFrame(page: Page, selector: string): Promise<RgbaFrame> {
  try {
    const frame = await page.$eval(selector, async element => {
      if (element.tagName !== "CANVAS") return null
      const canvas = element as HTMLCanvasElement
      const image = new Image()
      image.src = canvas.toDataURL("image/png")
      await image.decode()
      const copy = document.createElement("canvas")
      copy.width = canvas.width
      copy.height = canvas.height
      const context = copy.getContext("2d")
      if (!context) throw new Error("Canvas does not expose a 2D context")
      context.drawImage(image, 0, 0)
      return {
        pixels: Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data),
        width: canvas.width,
        height: canvas.height,
      }
    })
    if (!frame) throw new Error("Selector is not a canvas")
    return { ...frame, pixels: Uint8Array.from(frame.pixels) }
  } catch (error) {
    throw new CaptureError("CANVAS_CAPTURE_FAILED", "Unable to capture GIF canvas frame", error)
  }
}

export async function captureGif(
  page: Page,
  settings: CaptureSettings,
  trigger: TriggerController,
  maxTriggerWaitMs: number,
): Promise<{ image: Buffer; width: number; height: number }> {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc")
  const frameCount = settings.frameCount ?? 1
  const interval = settings.captureInterval ?? 0
  const fps = settings.playbackFps ?? 10
  const frames: RgbaFrame[] = []

  for (let index = 0; index < frameCount; index += 1) {
    if (index > 0) {
      if (settings.triggerMode === CaptureTriggerMode.FN_TRIGGER_GIF) {
        await trigger.next(maxTriggerWaitMs)
      } else if (interval > 0) {
        await new Promise(resolve => setTimeout(resolve, interval))
      }
    }
    frames.push(
      settings.mode === CaptureMode.VIEWPORT
        ? await viewportFrame(page, settings.resolution!.x, settings.resolution!.y)
        : await canvasFrame(page, settings.canvasSelector!),
    )
  }

  const first = frames[0]
  if (!first) throw new CaptureError("UNKNOWN", "GIF requires at least one frame")
  if (frames.some(frame => frame.width !== first.width || frame.height !== first.height)) {
    throw new CaptureError("INVALID_PARAMETERS", "All GIF frames must have equal dimensions")
  }

  const gif = GIFEncoder()
  for (const [index, frame] of frames.entries()) {
    const palette = quantize(frame.pixels, 256)
    const indexed = applyPalette(frame.pixels, palette)
    gif.writeFrame(indexed, frame.width, frame.height, {
      palette,
      delay: Math.round(1000 / fps),
      repeat: index === 0 ? 0 : undefined,
    })
  }
  gif.finish()
  return {
    image: Buffer.from(gif.bytes()),
    width: first.width,
    height: first.height,
  }
}
