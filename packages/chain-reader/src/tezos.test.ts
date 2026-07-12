import { describe, expect, it, vi } from "vitest"
import { defaultResolverConfig } from "@whitehash/resolve"
import { getTezosWalletTokens, isTezosAddress } from "./tezos.js"
import type { ChainReaderConfig } from "./types.js"

const config: ChainReaderConfig = { resolver: defaultResolverConfig() }

describe("isTezosAddress", () => {
  it("accepts tz1/tz2/tz3 and KT1", () => {
    expect(isTezosAddress("tz1burnburnburnburnburnburnburjAYjjX")).toBe(true)
    expect(isTezosAddress("tz2J6PEFh5sCu8aVZwvrhWKRuo5UNJMKfEYu")).toBe(true)
    expect(isTezosAddress("KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE")).toBe(true)
  })
  it("rejects EVM and junk", () => {
    expect(isTezosAddress("0x1234")).toBe(false)
    expect(isTezosAddress("hello")).toBe(false)
  })
})

describe("getTezosWalletTokens (mocked TzKT)", () => {
  it("maps balances into normalized tokens and flags placeholders", async () => {
    const balances = [
      {
        account: { address: "tz2Holder" },
        token: {
          contract: { address: "KT1U6EHmNxJTkvaWJ4ThczG4FSDaHC21ssvi" },
          tokenId: "589146",
          metadata: {
            name: "Archaic patterns #1",
            artifactUri: "ipfs://QmGen?fxhash=onrFmn",
            generatorUri: "ipfs://QmGen",
            displayUri: "ipfs://QmDisplay",
            thumbnailUri: "ipfs://QmThumb",
            iterationHash: "onrFmn",
            attributes: [{ name: "Grid size", value: "20 ✖ 20" }],
          },
        },
        balance: "1",
      },
      {
        account: { address: "tz2Holder" },
        token: {
          contract: { address: "KT1EfsNuqwLAWDd3o4pvfUx1CAh5GMdTrRvr" },
          tokenId: "226321",
          metadata: {
            name: "[WAITING TO BE SIGNED]",
            description: "This Gentk is waiting to be signed by Fxhash Signer module",
            artifactUri: "ipfs://QmPlaceholder",
          },
        },
        balance: "1",
      },
    ]

    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url)
      // first page returns both, second page (offset=200) returns empty
      if (u.includes("offset=0")) return new Response(JSON.stringify(balances))
      return new Response(JSON.stringify([]))
    }) as unknown as typeof fetch

    const tokens = await getTezosWalletTokens(
      "tz2J6PEFh5sCu8aVZwvrhWKRuo5UNJMKfEYu",
      "tezos:mainnet",
      config,
      fetchImpl,
    )

    expect(tokens).toHaveLength(2)
    const signed = tokens.find(t => t.tokenId === "589146")!
    expect(signed.assigned).toBe(true)
    expect(signed.iterationHash).toBe("onrFmn")
    expect(signed.artifactUri).toContain("?fxhash=")
    expect(signed.attributes[0]).toEqual({ name: "Grid size", value: "20 ✖ 20" })

    const placeholder = tokens.find(t => t.tokenId === "226321")!
    expect(placeholder.assigned).toBe(false)
  })

  it("rejects non-Tezos addresses", async () => {
    await expect(
      getTezosWalletTokens("0xabc", "tezos:mainnet", config),
    ).rejects.toThrow(/Not a Tezos address/)
  })
})

// Opt-in live integration test: set WHITEHASH_LIVE_TEST=1 to run.
const live = process.env.WHITEHASH_LIVE_TEST === "1" ? describe : describe.skip
live("getTezosWalletTokens (live TzKT)", () => {
  it("finds a real holder's tokens with resolvable artifact", async () => {
    // Find a recent gentk_v2 transfer recipient (likely holds a signed token).
    const res = await fetch(
      "https://api.tzkt.io/v1/tokens/transfers?token.contract=KT1U6EHmNxJTkvaWJ4ThczG4FSDaHC21ssvi&limit=1&sort.desc=id",
    )
    const [transfer] = (await res.json()) as Array<{ to?: { address?: string } }>
    const holder = transfer?.to?.address
    expect(holder).toBeTruthy()

    const tokens = await getTezosWalletTokens(holder!, "tezos:mainnet", config)
    expect(tokens.length).toBeGreaterThan(0)
    // at least the metadata shape is coherent
    for (const t of tokens) {
      expect(t.contract).toMatch(/^KT1/)
      expect(typeof t.tokenId).toBe("string")
    }
  }, 30_000)
})
