import { CaptureError } from "./errors.js"
import {
  CaptureMode,
  CaptureTriggerMode,
  type CaptureSettings,
} from "./types.js"

function requiredNumber(
  value: unknown,
  name: string,
  code: "MISSING_PARAMETERS" | "INVALID_PARAMETERS" | "INVALID_TRIGGER_PARAMETERS",
  roundNumber = false,
): number {
  if (value == null || value === "") {
    throw new CaptureError("MISSING_PARAMETERS", `${name} is required`)
  }
  const parsed =
    typeof value === "number"
      ? roundNumber
        ? Math.round(value)
        : value
      : Number.parseInt(String(value), 10)
  if (Number.isNaN(parsed)) throw new CaptureError(code, `${name} must be a number`)
  return parsed
}

function optionalInteger(value: unknown, name: string): number | undefined {
  if (value == null || value === "") return undefined
  const parsed =
    typeof value === "number" ? Math.round(value) : Number.parseInt(String(value), 10)
  if (Number.isNaN(parsed)) {
    throw new CaptureError("INVALID_PARAMETERS", `${name} must be a number`)
  }
  return parsed
}

function optionalBoolean(value: unknown): boolean | undefined {
  if (value == null || value === "") return undefined
  if (typeof value === "boolean") return value
  if (value === "true" || value === "1") return true
  if (value === "false" || value === "0") return false
  throw new CaptureError("INVALID_PARAMETERS", "gif must be a boolean")
}

export function validateCaptureSettings(input: unknown): CaptureSettings {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new CaptureError("MISSING_PARAMETERS", "Capture settings are required")
  }
  const raw = input as Record<string, unknown>
  const mode = raw.mode
  if (mode == null || mode === "") {
    throw new CaptureError("MISSING_PARAMETERS", "mode is required")
  }
  if (mode !== CaptureMode.VIEWPORT && mode !== CaptureMode.CANVAS) {
    throw new CaptureError("INVALID_PARAMETERS", `Unsupported capture mode: ${String(mode)}`)
  }

  const triggerMode = raw.triggerMode == null || raw.triggerMode === ""
    ? CaptureTriggerMode.DELAY
    : raw.triggerMode
  if (!Object.values(CaptureTriggerMode).includes(triggerMode as CaptureTriggerMode)) {
    throw new CaptureError("INVALID_TRIGGER_PARAMETERS", "Invalid triggerMode")
  }

  const settings: CaptureSettings = {
    mode,
    triggerMode: triggerMode as CaptureTriggerMode,
  }

  if (mode === CaptureMode.VIEWPORT) {
    if (!raw.resolution || typeof raw.resolution !== "object" || Array.isArray(raw.resolution)) {
      throw new CaptureError("MISSING_PARAMETERS", "resolution is required for VIEWPORT")
    }
    const resolution = raw.resolution as Record<string, unknown>
    const x = requiredNumber(resolution.x, "resolution.x", "INVALID_PARAMETERS", true)
    const y = requiredNumber(resolution.y, "resolution.y", "INVALID_PARAMETERS", true)
    if (x < 256 || x > 2048 || y < 256 || y > 2048) {
      throw new CaptureError("INVALID_PARAMETERS", "resolution must be between 256 and 2048")
    }
    settings.resolution = { x, y }
  } else {
    if (typeof raw.canvasSelector !== "string" || raw.canvasSelector.length === 0) {
      throw new CaptureError("MISSING_PARAMETERS", "canvasSelector is required for CANVAS")
    }
    settings.canvasSelector = raw.canvasSelector
  }

  if (triggerMode === CaptureTriggerMode.DELAY) {
    const delay = requiredNumber(raw.delay, "delay", "INVALID_TRIGGER_PARAMETERS")
    if (delay < 0 || delay > 300_000) {
      throw new CaptureError("INVALID_TRIGGER_PARAMETERS", "delay must be between 0 and 300000")
    }
    settings.delay = delay
  }

  const gif = optionalBoolean(raw.gif)
  if (gif !== undefined) settings.gif = gif
  const frameCount = optionalInteger(raw.frameCount, "frameCount")
  const captureInterval = optionalInteger(raw.captureInterval, "captureInterval")
  const playbackFps = optionalInteger(raw.playbackFps, "playbackFps")
  if (frameCount !== undefined) settings.frameCount = frameCount
  if (captureInterval !== undefined) settings.captureInterval = captureInterval
  if (playbackFps !== undefined) settings.playbackFps = playbackFps

  if (settings.gif) {
    if (
      (frameCount ?? 1) < 1 ||
      (captureInterval ?? 0) < 0 ||
      (playbackFps != null && playbackFps <= 0)
    ) {
      throw new CaptureError("INVALID_TRIGGER_PARAMETERS", "Invalid GIF parameters")
    }
  }
  if (triggerMode === CaptureTriggerMode.FN_TRIGGER_GIF) {
    if (settings.gif !== true || settings.playbackFps == null) {
      throw new CaptureError(
        "INVALID_TRIGGER_PARAMETERS",
        "FN_TRIGGER_GIF requires gif=true and playbackFps",
      )
    }
  }

  return settings
}
