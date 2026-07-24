/**
 * Normalize raw token metadata JSON (TZIP-21 on Tezos, OpenSea+fxhash on EVM)
 * into whitehash's uniform shape, and detect unrevealed placeholder tokens.
 */
import type {
  ProjectCaptureMode,
  ProjectCaptureSettings,
  ProjectCaptureTriggerMode,
} from "./types.js"

interface RawAttribute {
  name?: unknown
  trait_type?: unknown
  value?: unknown
}

export interface NormalizedMetadata {
  name: string | null
  description: string | null
  iterationHash: string | null
  artifactUri: string | null
  displayUri: string | null
  thumbnailUri: string | null
  generatorUri: string | null
  attributes: { name: string; value: string }[]
  assigned: boolean
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function finiteNumber(value: unknown): number | undefined {
  const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value
  return typeof number === "number" && Number.isFinite(number) ? number : undefined
}

function optionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value
  if (value === "true") return true
  if (value === "false") return false
  return undefined
}

/**
 * Normalize the capture object published in fxhash project metadata.
 * Unknown or malformed fields are ignored; an unsupported/missing mode means
 * the project has no usable capture configuration.
 */
export function normalizeCaptureSettings(raw: unknown): ProjectCaptureSettings | null {
  const metadata = record(raw)
  const source = record(metadata?.["capture"] ?? metadata?.["captureSettings"] ?? raw)
  if (!source) return null

  const modeValue = typeof source["mode"] === "string" ? source["mode"].toUpperCase() : ""
  if (!["CANVAS", "VIEWPORT", "CUSTOM"].includes(modeValue)) return null
  const mode = modeValue as ProjectCaptureMode

  const triggerValue =
    typeof source["triggerMode"] === "string" ? source["triggerMode"].toUpperCase() : ""
  const triggerMode = ["DELAY", "FN_TRIGGER", "FN_TRIGGER_GIF"].includes(triggerValue)
    ? (triggerValue as ProjectCaptureTriggerMode)
    : undefined

  const resolution = record(source["resolution"])
  const x = finiteNumber(resolution?.["x"])
  const y = finiteNumber(resolution?.["y"])
  const normalized: ProjectCaptureSettings = { mode }
  if (triggerMode) normalized.triggerMode = triggerMode
  const gpu = optionalBoolean(source["gpu"])
  if (gpu !== undefined) normalized.gpu = gpu
  if (x !== undefined && y !== undefined) normalized.resolution = { x, y }

  const delay = finiteNumber(source["delay"])
  if (delay !== undefined) {
    normalized.delay = delay
    normalized.triggerMode ??= "DELAY"
  }
  if (typeof source["canvasSelector"] === "string" && source["canvasSelector"]) {
    normalized.canvasSelector = source["canvasSelector"]
  }
  const gif = optionalBoolean(source["gif"])
  if (gif !== undefined) normalized.gif = gif
  for (const key of ["frameCount", "captureInterval", "playbackFps"] as const) {
    const value = finiteNumber(source[key])
    if (value !== undefined) normalized[key] = value
  }
  return normalized
}

/** Known markers of the shared "waiting to be signed" placeholder document. */
const PLACEHOLDER_NAME_RE = /waiting to be signed|\[waiting/i
const PLACEHOLDER_DESC_RE = /waiting to be signed by fxhash/i

/**
 * A token is "assigned" (revealed) when it carries a real iterationHash and is
 * not the shared placeholder. fxhash mints point at a placeholder document
 * until the Signer generates the artwork; those lack `iterationHash` and use a
 * known name/description.
 */
export function isAssigned(meta: Record<string, unknown>): boolean {
  const name = str(meta["name"]) ?? ""
  const description = str(meta["description"]) ?? ""
  if (PLACEHOLDER_NAME_RE.test(name)) return false
  if (PLACEHOLDER_DESC_RE.test(description)) return false
  // iterationHash is written at signing; absence is the strongest signal.
  const hash =
    str(meta["iterationHash"]) ?? str(meta["generationHash"]) ?? str(meta["generatorUri"])
  return hash !== null
}

function normalizeAttributes(raw: unknown): { name: string; value: string }[] {
  if (!Array.isArray(raw)) return []
  const out: { name: string; value: string }[] = []
  for (const item of raw as RawAttribute[]) {
    if (!item || typeof item !== "object") continue
    const name = str(item.name) ?? str(item.trait_type)
    if (name === null) continue
    const value = item.value === null || item.value === undefined ? "" : String(item.value)
    out.push({ name, value })
  }
  return out
}

export function normalizeMetadata(raw: unknown): NormalizedMetadata {
  const meta = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  return {
    name: str(meta["name"]),
    description: str(meta["description"]),
    iterationHash: str(meta["iterationHash"]) ?? str(meta["generationHash"]),
    // Prefer protocol-native artifactUri; never fall back to animation_url
    // (fxhash rewrote onchfs animation_urls to its own proxy).
    artifactUri: str(meta["artifactUri"]),
    displayUri: str(meta["displayUri"]),
    thumbnailUri: str(meta["thumbnailUri"]),
    generatorUri: str(meta["generatorUri"]) ?? str(meta["generativeUri"]),
    attributes: normalizeAttributes(meta["attributes"] ?? meta["features"]),
    assigned: isAssigned(meta),
  }
}
