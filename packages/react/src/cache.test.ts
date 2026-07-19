import { describe, expect, it } from "vitest"
import { createMemoryCache } from "./cache.js"

describe("createMemoryCache", () => {
  it("implements the pluggable wallet-cache contract", async () => {
    const cache = createMemoryCache()
    await cache.setWalletTokens("tezos:mainnet", "tz1ABC", [])
    const cached = await cache.getWalletTokens("tezos:mainnet", "tz1abc")
    expect(cached?.tokens).toEqual([])
    expect(cached?.cachedAt).toEqual(expect.any(Number))
    await cache.deleteWalletTokens("tezos:mainnet", "tz1abc")
    await expect(cache.getWalletTokens("tezos:mainnet", "tz1abc")).resolves.toBeUndefined()
  })
})
