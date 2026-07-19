import { afterEach, describe, expect, it, vi } from "vitest"
import { defaultResolverConfig } from "@whitehash/resolve"
import { getToken } from "./token.js"

afterEach(() => vi.unstubAllGlobals())

describe("getToken", () => {
  it("reads a Tezos token through the universal typed-ref API", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([{
      metadata: { name: "Example #1", iterationHash: "oo1", artifactUri: "ipfs://QmArtifact" },
    }])))
    vi.stubGlobal("fetch", fetchImpl)
    const token = await getToken(
      { type: "token", chain: "tezos:mainnet", contract: "KT1Example", tokenId: "1" },
      { resolver: defaultResolverConfig() },
    )
    expect(token).toMatchObject({ name: "Example #1", assigned: true, tokenId: "1" })
    expect(fetchImpl).toHaveBeenCalledOnce()
  })
})
