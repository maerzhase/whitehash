import type { ConsoleMessage, Page } from "puppeteer-core"
import { CaptureError } from "./errors.js"
import { type CaptureSettings, CaptureTriggerMode, type CaptureTriggerSource } from "./types.js"

type Signal = "event" | "console"
type Waiter = (signal: Signal) => void

export interface TriggerController {
  next(timeoutMs: number): Promise<Signal>
  dispose(): void
}

export async function installTriggerController(page: Page): Promise<TriggerController> {
  const queued: Signal[] = []
  const waiters: Waiter[] = []
  const push = (signal: Signal) => {
    const waiter = waiters.shift()
    if (waiter) waiter(signal)
    else queued.push(signal)
  }
  const bindingName = `__whitehashPreview_${Math.random().toString(36).slice(2)}`
  await page.exposeFunction(bindingName, () => push("event"))
  await page.evaluateOnNewDocument((name: string) => {
    window.addEventListener("fxhash-preview", () => {
      const binding = (window as unknown as Record<string, (() => void) | undefined>)[name]
      binding?.()
    })
  }, bindingName)

  const onConsole = (message: ConsoleMessage) => {
    if (message.text() === "FXPREVIEW") push("console")
  }
  page.on("console", onConsole)

  return {
    next(timeoutMs) {
      const signal = queued.shift()
      if (signal) return Promise.resolve(signal)
      return new Promise<Signal>((resolve, reject) => {
        let waiter: Waiter
        const timer = setTimeout(() => {
          const index = waiters.indexOf(waiter)
          if (index >= 0) waiters.splice(index, 1)
          reject(new CaptureError("TIMEOUT", "Artwork did not trigger fxpreview() in time"))
        }, timeoutMs)
        waiter = value => {
          clearTimeout(timer)
          resolve(value)
        }
        waiters.push(waiter)
      })
    },
    dispose() {
      page.off("console", onConsole)
    },
  }
}

export async function waitForInitialTrigger(
  settings: CaptureSettings,
  controller: TriggerController,
  maxWaitMs: number,
  fallback: boolean,
): Promise<CaptureTriggerSource> {
  if (settings.triggerMode === CaptureTriggerMode.DELAY) {
    await new Promise(resolve => setTimeout(resolve, settings.delay ?? 0))
    return "delay"
  }
  try {
    return await controller.next(maxWaitMs)
  } catch (error) {
    if (error instanceof CaptureError && error.code === "TIMEOUT" && fallback) {
      return "timeout-fallback"
    }
    throw error
  }
}
