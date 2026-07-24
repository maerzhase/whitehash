import type { Browser } from "puppeteer-core"
import {
  CaptureMode,
  CaptureTriggerMode,
  type ArtworkAttribute,
  type CaptureSettings,
  type WireCaptureSettings,
} from "@whitehash/core"
import type { BrowserProvider } from "./browser/provider.js"

export { CaptureMode, CaptureTriggerMode, type CaptureSettings, type WireCaptureSettings }

export type CaptureFeature = ArtworkAttribute<string | number | boolean>

export type CaptureTriggerSource = "delay" | "event" | "console" | "timeout-fallback"

export interface CaptureResult {
  image: Buffer
  mimeType: "image/png" | "image/gif"
  features: CaptureFeature[]
  triggeredBy: CaptureTriggerSource
  timing: {
    navigateMs: number
    triggerMs: number
    captureMs: number
  }
}

export interface CaptureOptions {
  url: string
  settings: CaptureSettings | WireCaptureSettings | Record<string, unknown>
  browser: BrowserProvider | Browser
  withFeatures?: boolean
  maxTriggerWaitMs?: number
  navigationTimeoutMs?: number
  useFallbackCaptureOnTimeout?: boolean
  allowlist?: string[]
  maxImageBytes?: number
  maxDimension?: number
}
