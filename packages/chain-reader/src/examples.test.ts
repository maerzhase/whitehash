import { describe, expect, it } from "vitest"
import { CURATED_PROJECT_EXAMPLES, curatedProjectExample } from "./examples.js"

describe("curated project examples", () => {
  it("keeps the requested projects unique and directly loadable", () => {
    expect(CURATED_PROJECT_EXAMPLES).toHaveLength(11)
    expect(new Set(CURATED_PROJECT_EXAMPLES.map(example => example.slug)).size).toBe(11)

    for (const example of CURATED_PROJECT_EXAMPLES) {
      expect(example.ref.type).toBe("project")
      if (example.ref.chain.startsWith("tezos:")) {
        expect(example.ref.id).toMatch(/^v\d+:[0-9]+$/)
      } else {
        expect(example.ref.id).toMatch(/^0x[0-9a-fA-F]{40}$/)
      }
    }
  })

  it("covers every mainnet and both generator storage schemes", () => {
    expect(new Set(CURATED_PROJECT_EXAMPLES.map(example => example.ref.chain))).toEqual(
      new Set(["tezos:mainnet", "eip155:1", "eip155:8453"]),
    )
    expect(new Set(CURATED_PROJECT_EXAMPLES.map(example => example.generatorStorage))).toEqual(
      new Set(["ipfs", "onchfs"]),
    )
    expect(new Set(CURATED_PROJECT_EXAMPLES.map(example => example.captureMode))).toEqual(
      new Set(["canvas", "viewport", "gif"]),
    )
  })

  it("looks up examples without inventing a fallback", () => {
    expect(curatedProjectExample("dragons")?.ref).toEqual({
      type: "project",
      chain: "tezos:mainnet",
      id: "v2:2613",
    })
    expect(curatedProjectExample("dom2")?.ref.chain).toBe("eip155:8453")
    expect(curatedProjectExample("not-a-project")).toBeUndefined()
  })
})
