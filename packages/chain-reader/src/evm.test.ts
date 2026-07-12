import { describe, expect, it } from "vitest"
import { defaultResolverConfig } from "@whitehash/resolve"
import { getEvmWalletTokens, isEvmAddress } from "./evm.js"
import type { ChainReaderConfig } from "./types.js"

describe("isEvmAddress", () => {
  it("accepts checksummed and lowercase 0x addresses", () => {
    expect(isEvmAddress("0x2ce8641036f22627402bd4b1b7d1ed8a8499b205")).toBe(true)
    expect(isEvmAddress("0x2ce8641036f22627402bD4b1B7d1ed8A8499b205")).toBe(true)
  })
  it("rejects Tezos and junk", () => {
    expect(isEvmAddress("KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE")).toBe(false)
    expect(isEvmAddress("0x123")).toBe(false)
  })
})

// Opt-in live integration test against a known Base holder, bounded with
// `maxBlock` so it stays a handful of RPC calls. Set WHITEHASH_LIVE_TEST=1.
const live = process.env.WHITEHASH_LIVE_TEST === "1" ? describe : describe.skip
live("getEvmWalletTokens (live Base)", () => {
  // "In the Folds" — collection 0xfe38... on Base, holder owns iterations 1-3,
  // minted shortly after the collection was created at block 24792053.
  const COLLECTION = "0xfe38c07c5ef421b301ba07fc4c03041c848af09e"
  const CREATED = 24792053
  const HOLDER = "0x2ce8641036f22627402bd4b1b7d1ed8a8499b205"

  const config: ChainReaderConfig = {
    resolver: defaultResolverConfig(),
    evm: {
      maxBlock: CREATED + 9000,
      snapshot: {
        chainId: "eip155:8453",
        lastScannedBlock: CREATED - 1,
        collections: [{ address: COLLECTION, projectId: "?", createdAtBlock: CREATED }],
      },
    },
  }

  it("reads owned tokens with resolvable metadata", async () => {
    const tokens = await getEvmWalletTokens(HOLDER, "eip155:8453", config)
    expect(tokens.length).toBeGreaterThanOrEqual(1)
    for (const t of tokens) {
      expect(t.contract.toLowerCase()).toBe(COLLECTION)
      expect(t.assigned).toBe(true)
      expect(t.iterationHash).toMatch(/^0x[0-9a-f]+$/i)
      expect(t.artifactUri).toMatch(/^(ipfs|onchfs):\/\//)
    }
  }, 60_000)
})
