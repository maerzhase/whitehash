import { describe, expect, it } from "vitest"
import {
  CHAINS,
  CHAIN_DEFINITIONS,
  chainDefinition,
  chainFromSlug,
  resolveChainId,
} from "./index.js"

describe("shared chain catalog", () => {
  it("keeps IDs, slugs, and aliases in one consistent catalog", () => {
    expect(CHAIN_DEFINITIONS.map(chain => chain.id)).toEqual(CHAINS)
    for (const chain of CHAIN_DEFINITIONS) {
      expect(chainFromSlug(chain.slug)).toBe(chainDefinition(chain.id))
      expect(resolveChainId(chain.id)).toBe(chain.id)
      for (const alias of chain.aliases) expect(resolveChainId(alias)).toBe(chain.id)
    }
  })
  it("uses current public Tezos RPC defaults", () => {
    const tezos = CHAIN_DEFINITIONS.find(chain => chain.id === "tezos:mainnet")!
    expect(tezos.defaultRpcs).toEqual([
      "https://tezos-mainnet.octez.io",
      "https://rpc.tzkt.io/mainnet",
      "https://rpc.tzbeta.net",
    ])
  })
})
