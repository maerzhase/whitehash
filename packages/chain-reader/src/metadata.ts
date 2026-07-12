/**
 * Normalize raw token metadata JSON (TZIP-21 on Tezos, OpenSea+fxhash on EVM)
 * into whitehash's uniform shape, and detect unrevealed placeholder tokens.
 * See PLAN.md §3.4/§3.5.
 */

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
    const value =
      item.value === null || item.value === undefined ? "" : String(item.value)
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
    // (fxhash rewrote onchfs animation_urls to its own proxy — PLAN §3.5).
    artifactUri: str(meta["artifactUri"]),
    displayUri: str(meta["displayUri"]),
    thumbnailUri: str(meta["thumbnailUri"]),
    generatorUri: str(meta["generatorUri"]) ?? str(meta["generativeUri"]),
    attributes: normalizeAttributes(meta["attributes"] ?? meta["features"]),
    assigned: isAssigned(meta),
  }
}
