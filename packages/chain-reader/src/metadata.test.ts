import { describe, expect, it } from "vitest"
import { isAssigned, normalizeMetadata } from "./metadata.js"

// Real signed gentk_v2 #589146 metadata (TzKT, July 2026).
const signed = {
  name: "Archaic patterns #1",
  tags: ["fxhash"],
  symbol: "GENTK",
  version: "0.2",
  decimals: 0,
  attributes: [
    { name: "Grid size", value: "20 ✖ 20" },
    { name: "Unique cell", value: false },
    { name: "Cell border", value: true },
  ],
  displayUri: "ipfs://QmDisplay",
  artifactUri: "ipfs://QmGen?fxhash=onrFmnGDiJyxtweVHqDJv844R9xjNwuFVaGE3cDEUVF3R4k3Lva",
  description: "an artwork",
  generatorUri: "ipfs://QmGen",
  thumbnailUri: "ipfs://QmThumb",
  iterationHash: "onrFmnGDiJyxtweVHqDJv844R9xjNwuFVaGE3cDEUVF3R4k3Lva",
  authenticityHash: "abc",
}

// Real placeholder (TzKT, July 2026).
const placeholder = {
  name: "[WAITING TO BE SIGNED]",
  symbol: "GENTK",
  decimals: 0,
  displayUri: "ipfs://QmYwSwa5hP4346GqD7hAjutwJSmeYTdiLQ7Wec2C7Cez1D",
  artifactUri: "ipfs://QmdGV3UqJqX4v5x9nFcDYeekCEAm3SDXUG5SHdjKQKn4Pe",
  description: "This Gentk is waiting to be signed by Fxhash Signer module",
  thumbnailUri: "ipfs://QmbvEAn7FLMeYBDroYwBP8qWc3d3VVWbk19tTB83LCMB5S",
}

// EVM-shape attributes (OpenSea trait_type).
const evmShape = {
  name: "Piece #5",
  iterationHash: "0xdeadbeef",
  generatorUri: "onchfs://0xabc",
  artifactUri: "onchfs://0xabc/?fxhash=0xdeadbeef&fxiteration=5",
  displayUri: "ipfs://QmD",
  thumbnailUri: "ipfs://QmT",
  attributes: [
    { trait_type: "Palette", value: "warm" },
    { trait_type: "Density", value: 42 },
  ],
}

describe("isAssigned", () => {
  it("true for a signed token", () => expect(isAssigned(signed)).toBe(true))
  it("false for the placeholder by name", () => expect(isAssigned(placeholder)).toBe(false))
  it("false for placeholder even if name changed but description matches", () => {
    expect(
      isAssigned({ ...placeholder, name: "Untitled" }),
    ).toBe(false)
  })
  it("false when no hash present", () => expect(isAssigned({ name: "x" })).toBe(false))
})

describe("normalizeMetadata", () => {
  it("normalizes a signed Tezos token", () => {
    const n = normalizeMetadata(signed)
    expect(n.name).toBe("Archaic patterns #1")
    expect(n.iterationHash).toBe("onrFmnGDiJyxtweVHqDJv844R9xjNwuFVaGE3cDEUVF3R4k3Lva")
    expect(n.artifactUri).toContain("?fxhash=")
    expect(n.generatorUri).toBe("ipfs://QmGen")
    expect(n.assigned).toBe(true)
    expect(n.attributes).toEqual([
      { name: "Grid size", value: "20 ✖ 20" },
      { name: "Unique cell", value: "false" },
      { name: "Cell border", value: "true" },
    ])
  })

  it("normalizes the placeholder as unassigned", () => {
    const n = normalizeMetadata(placeholder)
    expect(n.assigned).toBe(false)
    expect(n.iterationHash).toBeNull()
    expect(n.generatorUri).toBeNull()
  })

  it("folds EVM trait_type attributes into name/value", () => {
    const n = normalizeMetadata(evmShape)
    expect(n.attributes).toEqual([
      { name: "Palette", value: "warm" },
      { name: "Density", value: "42" },
    ])
    expect(n.assigned).toBe(true)
    expect(n.generatorUri).toBe("onchfs://0xabc")
  })

  it("handles null/garbage input", () => {
    expect(normalizeMetadata(null).assigned).toBe(false)
    expect(normalizeMetadata(undefined).attributes).toEqual([])
    expect(normalizeMetadata("nope").name).toBeNull()
  })
})
