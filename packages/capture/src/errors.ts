export const CAPTURE_ERROR_CODES = [
  "UNKNOWN",
  "HTTP_ERROR",
  "MISSING_PARAMETERS",
  "INVALID_TRIGGER_PARAMETERS",
  "INVALID_PARAMETERS",
  "UNSUPPORTED_URL",
  "CANVAS_CAPTURE_FAILED",
  "TIMEOUT",
  "EXTRACT_FEATURES_FAILED",
] as const

export type CaptureErrorCode = (typeof CAPTURE_ERROR_CODES)[number]

export class CaptureError extends Error {
  readonly code: CaptureErrorCode
  override readonly cause?: unknown

  constructor(code: CaptureErrorCode, message: string = code, cause?: unknown) {
    super(message)
    this.name = "CaptureError"
    this.code = code
    this.cause = cause
  }
}

export function asCaptureError(error: unknown): CaptureError {
  return error instanceof CaptureError
    ? error
    : new CaptureError("UNKNOWN", "Capture failed", error)
}
