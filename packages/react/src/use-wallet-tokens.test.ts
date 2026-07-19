import { describe, expect, it, vi } from "vitest"
import { createWhitehashClient, type WhitehashToken } from "@whitehash/chain-reader"
import type { WhitehashCache } from "./cache.js"
import { loadWalletChain } from "./use-wallet-tokens.js"

const cachedToken: WhitehashToken = {
  chain: "tezos:mainnet",
  contract: "KT1Cached",
  tokenId: "1",
  name: "Cached",
  description: null,
  iterationHash: "ooCached",
  artifactUri: "ipfs://QmCached",
  displayUri: null,
  thumbnailUri: null,
  generatorUri: null,
  attributes: [],
  assigned: true,
  metadataUri: null,
  raw: null,
}

const liveToken: WhitehashToken = {
  ...cachedToken,
  contract: "KT1Live",
  name: "Live",
}

describe("loadWalletChain", () => {
  it("emits a mock-cache result before returning and persisting the live read", async () => {
    const cache: WhitehashCache = {
      getWalletTokens: vi.fn(async () => ({ tokens: [cachedToken], cachedAt: 1 })),
      setWalletTokens: vi.fn(async () => undefined),
      deleteWalletTokens: vi.fn(async () => undefined),
    }
    const client = createWhitehashClient({
      resolver: { ipfsGateways: ["https://ipfs.io"], onchfsProxy: null },
    })
    client.getWalletTokens = vi.fn(async () => [liveToken])
    const cachedResults: WhitehashToken[][] = []

    const tokens = await loadWalletChain({
      address: "tz1c3hFmjFSwunjLHECnYyjr42KRt5YiHrGX",
      chain: "tezos:mainnet",
      forceRefresh: false,
      client,
      cache,
      onCached: cached => cachedResults.push(cached),
    })

    expect(cachedResults).toEqual([[cachedToken]])
    expect(tokens).toEqual([liveToken])
    expect(cache.setWalletTokens).toHaveBeenCalledWith(
      "tezos:mainnet",
      "tz1c3hFmjFSwunjLHECnYyjr42KRt5YiHrGX",
      [liveToken],
    )
  })
})
