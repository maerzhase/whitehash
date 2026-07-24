import { afterEach, describe, expect, it, vi } from "vitest"
import { defaultResolverConfig } from "@whitehash/resolve"
import { getTezosTokenProjectRefs, getToken } from "./token.js"

afterEach(() => vi.unstubAllGlobals())

describe("getToken", () => {
  it("reads a Tezos token through the universal typed-ref API", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              metadata: {
                name: "Example #1",
                iterationHash: "oo1",
                artifactUri: "ipfs://QmArtifact",
              },
            },
          ]),
        ),
    )
    vi.stubGlobal("fetch", fetchImpl)
    const token = await getToken(
      { type: "token", chain: "tezos:mainnet", contract: "KT1Example", tokenId: "1" },
      { resolver: defaultResolverConfig() },
    )
    expect(token).toMatchObject({ name: "Example #1", assigned: true, tokenId: "1" })
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it("recovers issuer project candidates from gentk token_data", async () => {
    const token = {
      chain: "tezos:mainnet" as const,
      contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
      tokenId: "16333",
      name: "contrapuntos #136",
      description: null,
      iterationHash: "oo1",
      artifactUri: null,
      displayUri: null,
      thumbnailUri: null,
      generatorUri: null,
      attributes: [],
      assigned: true,
      metadataUri: null,
      raw: null,
    }
    const fetchMock = vi.fn(
      async (_url: string | URL | Request) =>
        new Response(
          JSON.stringify({
            value: { issuer_id: "65", iteration: "136" },
          }),
        ),
    )
    const refs = await getTezosTokenProjectRefs(
      token,
      { resolver: defaultResolverConfig() },
      fetchMock as unknown as typeof fetch,
    )

    expect(refs.map(ref => ref.id)).toEqual(["v0:65", "v1:65", "v2:65", "v3:65"])
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/bigmaps/token_data/keys/16333")
  })
})
