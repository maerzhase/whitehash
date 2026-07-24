import type { Page } from "puppeteer-core"
import type { CaptureFeature } from "./types.js"

export function filterFeatures(value: unknown): CaptureFeature[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return []
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) return []
  return Object.entries(value)
    .filter((entry): entry is [string, string | number | boolean] => {
      const type = typeof entry[1]
      return type === "string" || type === "number" || type === "boolean"
    })
    .map(([name, featureValue]) => ({ name, value: featureValue }))
}

export async function extractFeatures(page: Page): Promise<CaptureFeature[]> {
  try {
    const raw = await page.evaluate(() => {
      const global = window as unknown as {
        $fx?: { _features?: unknown }
        $fxhashFeatures?: unknown
      }
      if (global.$fx?._features) return JSON.stringify(global.$fx._features)
      return JSON.stringify(global.$fxhashFeatures)
    })
    if (raw == null) return []
    return filterFeatures(JSON.parse(raw))
  } catch {
    return []
  }
}
