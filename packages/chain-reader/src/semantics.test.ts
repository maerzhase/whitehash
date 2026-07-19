import { describe, expect, it } from "vitest"
import type { ResolverConfig } from "@whitehash/resolve"
import type { WhitehashToken } from "./types.js"
import {
  artworkUrl,
  imageSourceUri,
  liveViewStatus,
  renderArtifactUri,
  tokenKey,
} from "./semantics.js"

const resolver: ResolverConfig = {
  ipfsGateways: ["https://ipfs.io"],
  onchfs: { mode: "proxy", baseUrl: "https://proxy.example" },
}

function token(partial: Partial<WhitehashToken> = {}): WhitehashToken {
  return {
    chain: "tezos:mainnet",
    contract: "KT1",
    tokenId: "1",
    name: null,
    description: null,
    iterationHash: null,
    artifactUri: null,
    displayUri: null,
    thumbnailUri: null,
    generatorUri: null,
    attributes: [],
    assigned: true,
    metadataUri: null,
    raw: null,
    ...partial,
  }
}

describe("renderArtifactUri", () => {
  it("applies the separate gentk v1 seed", () => {
    expect(
      renderArtifactUri(token({ artifactUri: "ipfs://QmGen", iterationHash: "ooJ3bEAP" })),
    ).toBe("ipfs://QmGen?fxhash=ooJ3bEAP")
  })

  it("preserves render state already embedded by newer tokens", () => {
    const uri = "onchfs://abc/?fxhash=0xhash#0xparams"
    expect(renderArtifactUri(token({ artifactUri: uri, iterationHash: "0xhash" }))).toBe(uri)
  })
})

describe("token semantics", () => {
  it("resolves live artwork with the token chain", () => {
    const value = token({
      chain: "eip155:8453",
      artifactUri: "onchfs://abc/?fxhash=0xh",
    })
    expect(artworkUrl(value, resolver)).toBe(
      "https://proxy.example/eip155-8453/abc/?fxhash=0xh",
    )
  })

  it("falls back between image sizes", () => {
    expect(imageSourceUri(token({ displayUri: "ipfs://display" }))).toBe("ipfs://display")
  })

  it("distinguishes an onchfs token that needs a proxy", () => {
    const value = token({ artifactUri: "onchfs://abc" })
    expect(liveViewStatus(value, { ...resolver, onchfs: null })).toEqual({
      kind: "needs-onchfs",
    })
  })

  it("builds a stable cross-chain token key", () => {
    expect(tokenKey(token())).toBe("tezos:mainnet/KT1/1")
  })
})
