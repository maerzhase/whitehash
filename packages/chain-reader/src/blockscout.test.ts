import { defaultResolverConfig } from "@whitehash/resolve"
import { describe, expect, it, vi } from "vitest"
import {
  discoverEvmCollectionsViaBlockscout,
  getEvmWalletTokensViaBlockscout,
} from "./blockscout.js"
import type { ChainReaderConfig } from "./types.js"

const config: ChainReaderConfig = { resolver: defaultResolverConfig() }

const PC = "0x546bc3cd5ff4b322df8339c6833b99285a6333e5e5f90a88ced57d9de7c345fc"
const COLLECTION = "0xfe38c07c5EF421B301Ba07Fc4C03041c848aF09e"
const OTHER_NFT = "0x1111111111111111111111111111111111111111"

function factoryLogsResponse() {
  return {
    items: [
      {
        topics: [PC, "0x" + "1".padStart(64, "0"), "0x" + COLLECTION.slice(2).padStart(64, "0")],
        block_number: 24792053,
      },
      { topics: ["0xdeadbeef"], block_number: 1 }, // non-ProjectCreated log
    ],
    next_page_params: null,
  }
}

describe("discoverEvmCollectionsViaBlockscout", () => {
  it("extracts collections from ProjectCreated logs only", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify(factoryLogsResponse())),
    ) as unknown as typeof fetch

    const snap = await discoverEvmCollectionsViaBlockscout("eip155:8453", config, fetchImpl)
    expect(snap.collections).toHaveLength(1)
    expect(snap.collections[0]!.address).toBe(COLLECTION)
    expect(snap.collections[0]!.projectId).toBe("1")
    expect(snap.lastScannedBlock).toBe(24792053)
  })
})

describe("getEvmWalletTokensViaBlockscout", () => {
  it("filters to fxhash collections and keeps fresh metadata as-is", async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url)
      if (u.includes("/logs")) return new Response(JSON.stringify(factoryLogsResponse()))
      if (u.includes("/nft"))
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "1",
                token: { address_hash: COLLECTION },
                metadata: {
                  name: "In the Folds #1",
                  iterationHash: "0xabc",
                  artifactUri: "onchfs://6dec/?fxhash=0xabc",
                  displayUri: "ipfs://QmD",
                },
              },
              // an NFT from a non-fxhash contract → filtered out
              { id: "9", token: { address_hash: OTHER_NFT }, metadata: { name: "bored thing" } },
            ],
            next_page_params: null,
          }),
        )
      throw new Error(`unexpected fetch ${u}`)
    }) as unknown as typeof fetch

    const tokens = await getEvmWalletTokensViaBlockscout(
      "0x2ce8641036f22627402bd4b1b7d1ed8a8499b205",
      "eip155:8453",
      config,
      undefined,
      fetchImpl,
    )
    expect(tokens).toHaveLength(1)
    expect(tokens[0]!.name).toBe("In the Folds #1")
    expect(tokens[0]!.assigned).toBe(true)
    // no stale metadata → no chain reads: only blockscout URLs fetched
    const urls = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.map(c =>
      String(c[0]),
    )
    expect(urls.every(u => u.includes("blockscout"))).toBe(true)
  })
})
