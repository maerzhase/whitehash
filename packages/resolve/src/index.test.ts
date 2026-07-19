import { describe, expect, it, vi } from "vitest"
import {
  createResolver,
  fetchWithGatewayFallback,
  resolveUri,
  resolveUriAll,
  type ResolverConfig,
} from "./index.js"

const config: ResolverConfig = {
  ipfsGateways: ["https://ipfs.io", "https://dweb.link"],
  onchfsProxy: "https://proxy.example",
}

const noProxy: ResolverConfig = {
  ipfsGateways: ["https://ipfs.io"],
  onchfsProxy: null,
}

const CID = "QmYwSwaXj3M89rpUb1uYbfAT9x5x9zZ8bmcU3JHrYNqR4T"

describe("resolveUri", () => {
  const cases: Array<[string, string, string | null]> = [
    // pass-through
    ["data URI", "data:application/json;base64,eyJhIjoxfQ==", "data:application/json;base64,eyJhIjoxfQ=="],
    ["blob URI", "blob:https://x/abc", "blob:https://x/abc"],
    ["https URL", "https://cdn.example/x.png", "https://cdn.example/x.png"],
    ["http URL", "http://cdn.example/x.png", "http://cdn.example/x.png"],
    // ipfs plain
    ["ipfs:// plain", `ipfs://${CID}`, `https://ipfs.io/ipfs/${CID}`],
    ["ipfs://ipfs namespace", `ipfs://ipfs/${CID}`, `https://ipfs.io/ipfs/${CID}`],
    ["absolute /ipfs path", `/ipfs/${CID}`, `https://ipfs.io/ipfs/${CID}`],
    ["bare CID", CID, `https://ipfs.io/ipfs/${CID}`],
    // ipfs with path
    ["ipfs:// with path", `ipfs://${CID}/1/metadata.json`, `https://ipfs.io/ipfs/${CID}/1/metadata.json`],
    // ipfs with query (v1-era artifact: query directly on CID)
    ["ipfs:// with query on CID", `ipfs://${CID}?fxhash=ooABCD`, `https://ipfs.io/ipfs/${CID}?fxhash=ooABCD`],
    // ipfs with path + query + fragment (modern artifact URI)
    [
      "ipfs:// artifact w/ path,query,fragment",
      `ipfs://${CID}/?fxhash=ooABCD&fxiteration=1&fxminter=tz1abc&fxchain=tezos#0xdeadbeef`,
      `https://ipfs.io/ipfs/${CID}/?fxhash=ooABCD&fxiteration=1&fxminter=tz1abc&fxchain=tezos#0xdeadbeef`,
    ],
    // onchfs
    ["onchfs://", `onchfs://${CID}/index.html`, `https://proxy.example/${CID}/index.html`],
    // temp unsupported
    ["temp:// unsupported", `temp://${CID}`, null],
  ]

  it.each(cases)("%s", (_label, input, expected) => {
    expect(resolveUri(input, config)).toBe(expected)
  })

  it("returns null for onchfs:// without a proxy", () => {
    expect(resolveUri(`onchfs://${CID}`, noProxy)).toBeNull()
  })

  it("preserves fragment for onchfs URIs", () => {
    expect(resolveUri(`onchfs://${CID}/?fxhash=x#0xff`, config)).toBe(
      `https://proxy.example/${CID}/?fxhash=x#0xff`
    )
  })

  it("prefixes the chain slug for onchfs when a chain is given", () => {
    expect(
      resolveUri(`onchfs://abc/index.html`, config, { chain: "eip155:8453" })
    ).toBe(`https://proxy.example/eip155-8453/abc/index.html`)
    expect(
      resolveUri(`onchfs://abc/index.html`, config, { chain: "tezos:mainnet" })
    ).toBe(`https://proxy.example/tezos-mainnet/abc/index.html`)
  })

  it("ignores the chain hint for non-onchfs URIs", () => {
    expect(resolveUri(`ipfs://${CID}`, config, { chain: "eip155:1" })).toBe(
      `https://ipfs.io/ipfs/${CID}`
    )
  })

  it("returns null for empty / whitespace input", () => {
    expect(resolveUri("", config)).toBeNull()
    expect(resolveUri("   ", config)).toBeNull()
  })

  it("trims surrounding whitespace", () => {
    expect(resolveUri(`  ipfs://${CID}  `, config)).toBe(`https://ipfs.io/ipfs/${CID}`)
  })

  it("returns null for unknown schemes", () => {
    expect(resolveUri("ftp://host/file", config)).toBeNull()
  })
})

describe("resolveUriAll", () => {
  it("returns one URL per gateway for ipfs://", () => {
    expect(resolveUriAll(`ipfs://${CID}`, config)).toEqual([
      `https://ipfs.io/ipfs/${CID}`,
      `https://dweb.link/ipfs/${CID}`,
    ])
  })

  it("returns one URL per gateway for a bare CID with query", () => {
    expect(resolveUriAll(`${CID}?fxhash=x`, config)).toEqual([
      `https://ipfs.io/ipfs/${CID}?fxhash=x`,
      `https://dweb.link/ipfs/${CID}?fxhash=x`,
    ])
  })

  it("accepts gateway roots that already end in /ipfs", () => {
    expect(resolveUriAll(`ipfs://${CID}`, {
      ...config,
      ipfsGateways: ["https://ipfs.io/ipfs/", "https://dweb.link/ipfs"],
    })).toEqual([
      `https://ipfs.io/ipfs/${CID}`,
      `https://dweb.link/ipfs/${CID}`,
    ])
  })

  it("returns a single element for pass-through URIs", () => {
    expect(resolveUriAll("https://x/y", config)).toEqual(["https://x/y"])
  })

  it("returns empty for unresolvable URIs", () => {
    expect(resolveUriAll(`temp://${CID}`, config)).toEqual([])
    expect(resolveUriAll(`onchfs://${CID}`, noProxy)).toEqual([])
  })
})

describe("fetchWithGatewayFallback", () => {
  it("falls back to the next gateway when the first fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 502 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }))

    const res = await fetchWithGatewayFallback(`ipfs://${CID}`, config, { fetchImpl })
    expect(res.status).toBe(200)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls[0]![0]).toBe(`https://ipfs.io/ipfs/${CID}`)
    expect(fetchImpl.mock.calls[1]![0]).toBe(`https://dweb.link/ipfs/${CID}`)
  })

  it("throws when every gateway fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("nope", { status: 500 }))
    await expect(
      fetchWithGatewayFallback(`ipfs://${CID}`, config, { fetchImpl })
    ).rejects.toThrow(/all 2 gateway/)
  })

  it("throws for unresolvable URIs", async () => {
    await expect(fetchWithGatewayFallback(`temp://${CID}`, config)).rejects.toThrow(
      /cannot resolve/
    )
  })
})

describe("createResolver", () => {
  it("binds config", () => {
    const r = createResolver(config)
    expect(r.resolveUri(`ipfs://${CID}`)).toBe(`https://ipfs.io/ipfs/${CID}`)
  })
})
