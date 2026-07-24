export const CaptureMode = {
  CANVAS: "CANVAS",
  VIEWPORT: "VIEWPORT",
  CUSTOM: "CUSTOM",
} as const

export type CaptureMode = (typeof CaptureMode)[keyof typeof CaptureMode]

export const CaptureTriggerMode = {
  DELAY: "DELAY",
  FN_TRIGGER: "FN_TRIGGER",
  FN_TRIGGER_GIF: "FN_TRIGGER_GIF",
} as const

export type CaptureTriggerMode = (typeof CaptureTriggerMode)[keyof typeof CaptureTriggerMode]

/** Capture configuration shared by project metadata and the capture engine. */
export interface CaptureSettings {
  mode: CaptureMode
  triggerMode?: CaptureTriggerMode
  gpu?: boolean
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
