import { describe, expect, it } from "vitest"
import {
  CHAIN_DEFINITIONS,
  CHAINS,
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
})
