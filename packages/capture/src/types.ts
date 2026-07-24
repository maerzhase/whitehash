import type { Browser } from "puppeteer-core"
import type { BrowserProvider } from "./browser/provider.js"

export enum CaptureMode {
  CANVAS = "CANVAS",
  VIEWPORT = "VIEWPORT",
  CUSTOM = "CUSTOM",
}

export enum CaptureTriggerMode {
  DELAY = "DELAY",
  FN_TRIGGER = "FN_TRIGGER",
  FN_TRIGGER_GIF = "FN_TRIGGER_GIF",
}

export interface CaptureSettings {
  mode: CaptureMode
  triggerMode?: CaptureTriggerMode
  resolution?: { x: number; y: number }
  delay?: number
  canvasSelector?: string
  gif?: boolean
  frameCount?: number
  captureInterval?: number
  playbackFps?: number
}

export type WireCaptureSettings = {
  [K in keyof CaptureSettings]?: K extends "resolution"
    ? { x: number | string; y: number | string }
    : CaptureSettings[K] | string
}

export interface CaptureFeature {
  name: string
  value: string | number | boolean
}

export type CaptureTriggerSource =
  | "delay"
  | "event"
  | "console"
  | "timeout-fallback"

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
