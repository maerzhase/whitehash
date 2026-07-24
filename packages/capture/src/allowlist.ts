import { CaptureError } from "./errors.js"

export function assertUrlAllowed(url: string, allowlist?: readonly string[]): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch (error) {
    throw new CaptureError("INVALID_PARAMETERS", "url must be absolute", error)
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new CaptureError("UNSUPPORTED_URL", "Only HTTP(S) artwork URLs are supported")
  }
  if (allowlist && !allowlist.some(prefix => url.startsWith(prefix))) {
    throw new CaptureError("UNSUPPORTED_URL", "URL is not in the configured allowlist")
  }
}
