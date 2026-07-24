import type { Page } from "puppeteer-core"
import { CaptureError } from "../errors.js"

export interface CanvasCapture {
  image: Buffer
  width: number
  height: number
}

export async function captureCanvas(page: Page, selector: string): Promise<CanvasCapture> {
  try {
    const value = await page.$eval(selector, element => {
      if (element.tagName !== "CANVAS") return null
      const canvas = element as HTMLCanvasElement
      return {
        dataUrl: canvas.toDataURL("image/png"),
        width: canvas.width,
        height: canvas.height,
      }
    })
    if (!value?.dataUrl.startsWith("data:image/png;base64,")) {
      throw new Error("Selector did not resolve to a PNG canvas")
    }
    return {
      image: Buffer.from(value.dataUrl.slice("data:image/png;base64,".length), "base64"),
      width: value.width,
      height: value.height,
    }
  } catch (error) {
    throw new CaptureError("CANVAS_CAPTURE_FAILED", "Unable to capture canvas", error)
  }
}
