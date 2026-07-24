import { describe, expect, it } from "vitest"
import { CaptureError } from "./errors.js"
import { CaptureMode, CaptureTriggerMode } from "./types.js"
import { validateCaptureSettings } from "./validate.js"

function codeFor(input: unknown): string | undefined {
  try {
    validateCaptureSettings(input)
  } catch (error) {
    return (error as CaptureError).code
  }
}

describe("validateCaptureSettings", () => {
  it("coerces and rounds viewport wire values", () => {
    expect(
      validateCaptureSettings({
        mode: "VIEWPORT",
        resolution: { x: 255.6, y: "2048px" },
        delay: "0",
      }),
    ).toEqual({
      mode: CaptureMode.VIEWPORT,
      triggerMode: CaptureTriggerMode.DELAY,
      resolution: { x: 256, y: 2048 },
      delay: 0,
    })
  })

  it.each([
    [{ mode: "VIEWPORT", resolution: { x: 255, y: 256 }, delay: 0 }, "INVALID_PARAMETERS"],
    [{ mode: "VIEWPORT", resolution: { x: 2049, y: 256 }, delay: 0 }, "INVALID_PARAMETERS"],
    [{ mode: "VIEWPORT", resolution: { x: "no", y: 256 }, delay: 0 }, "INVALID_PARAMETERS"],
    [{ mode: "VIEWPORT", delay: 0 }, "MISSING_PARAMETERS"],
    [{ mode: "CANVAS", delay: 0 }, "MISSING_PARAMETERS"],
    [{ mode: "CANVAS", canvasSelector: "canvas", delay: -1 }, "INVALID_TRIGGER_PARAMETERS"],
    [{ mode: "CANVAS", canvasSelector: "canvas", delay: 300_001 }, "INVALID_TRIGGER_PARAMETERS"],
    [{ mode: "CUSTOM", delay: 0 }, "INVALID_PARAMETERS"],
    [{ mode: "CANVAS", canvasSelector: "canvas" }, "MISSING_PARAMETERS"],
  ])("rejects invalid settings %#", (input, expected) => {
    expect(codeFor(input)).toBe(expected)
  })

  it("accepts exact resolution and delay bounds", () => {
    expect(
      validateCaptureSettings({
        mode: "VIEWPORT",
        resolution: { x: 256, y: 2048 },
        delay: 300_000,
      }),
    ).toMatchObject({ delay: 300_000, resolution: { x: 256, y: 2048 } })
  })

  it("preserves programmatic fractional delays and allows a default GIF fps", () => {
    expect(
      validateCaptureSettings({
        mode: "CANVAS",
        canvasSelector: "canvas",
        delay: 0.5,
        gif: true,
      }),
    ).toMatchObject({ delay: 0.5, gif: true })
  })

  it("validates FN_TRIGGER_GIF wire parameters", () => {
    expect(
      validateCaptureSettings({
        mode: "CANVAS",
        canvasSelector: "#art",
        triggerMode: "FN_TRIGGER_GIF",
        gif: "true",
        playbackFps: "24",
        frameCount: "3",
      }),
    ).toMatchObject({ gif: true, playbackFps: 24, frameCount: 3 })
    expect(
      codeFor({
        mode: "CANVAS",
        canvasSelector: "#art",
        triggerMode: "FN_TRIGGER_GIF",
      }),
    ).toBe("INVALID_TRIGGER_PARAMETERS")
  })
})
