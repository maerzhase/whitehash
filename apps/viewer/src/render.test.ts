import { describe, expect, it } from "vitest"
import type { WhitehashToken } from "@whitehash/chain-reader"
import type { ResolverConfig } from "@whitehash/resolve"
import { artworkUrl, renderArtifactUri } from "./render.js"

const resolver: ResolverConfig = {
  ipfsGateways: ["https://ipfs.io"],
  onchfsProxy: "https://proxy.example",
}

function token(partial: Partial<WhitehashToken>): WhitehashToken {
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
  it("appends fxhash for gentk v1 (bare artifactUri + separate iterationHash)", () => {
    const t = token({
      artifactUri: "ipfs://QmGen",
      iterationHash: "ooJ3bEAPXGub",
    })
    expect(renderArtifactUri(t)).toBe("ipfs://QmGen?fxhash=ooJ3bEAPXGub")
  })

  it("leaves v2/v3 artifactUri untouched (already has query)", () => {
    const t = token({
      artifactUri: "ipfs://QmGen?fxhash=onrFmn",
      iterationHash: "onrFmn",
    })
    expect(renderArtifactUri(t)).toBe("ipfs://QmGen?fxhash=onrFmn")
  })

  it("leaves EVM onchfs artifactUri (query + fragment) untouched", () => {
    const t = token({
      chain: "eip155:8453",
      artifactUri: "onchfs://abc/?fxhash=0xhash&fxiteration=1",
      iterationHash: "0xhash",
    })
    expect(renderArtifactUri(t)).toBe("onchfs://abc/?fxhash=0xhash&fxiteration=1")
  })

  it("does not append when there is no hash", () => {
    const t = token({ artifactUri: "ipfs://QmGen" })
    expect(renderArtifactUri(t)).toBe("ipfs://QmGen")
  })

  it("returns null when there is no artifact", () => {
    expect(renderArtifactUri(token({}))).toBeNull()
  })
})

describe("artworkUrl", () => {
  it("resolves a v1 token to a gateway URL carrying the seed", () => {
    const t = token({ artifactUri: "ipfs://QmGen", iterationHash: "ooJ3b" })
    expect(artworkUrl(t, resolver)).toBe("https://ipfs.io/ipfs/QmGen?fxhash=ooJ3b")
  })

  it("routes an EVM onchfs artifact through the proxy with the chain slug", () => {
    const t = token({
      chain: "eip155:8453",
      artifactUri: "onchfs://abc/?fxhash=0xh",
      iterationHash: "0xh",
    })
    expect(artworkUrl(t, resolver)).toBe("https://proxy.example/eip155-8453/abc/?fxhash=0xh")
  })
})
