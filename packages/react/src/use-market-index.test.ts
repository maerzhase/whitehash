import { describe, expect, it, vi } from "vitest"
import { buildMarketIndex } from "@whitehash/market"
import { loadMarketIndex } from "./use-market-index.js"

const index = buildMarketIndex({
  project: {
    chain: "tezos:mainnet",
    id: "v2:2464",
    name: "Finesse Generator",
    description: null,
    displayUri: null,
    thumbnailUri: null,
    editions: 50,
    minted: 50,
    captureSettings: null,
  },
  events: [],
  cursors: { "tezos:mainnet": { height: 100 } },
  generatedAt: "2026-08-03T00:00:00.000Z",
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

describe("loadMarketIndex", () => {
  it("returns the validated artifact", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(index)) as unknown as typeof fetch
    await expect(loadMarketIndex("https://example.test/market.json", fetchImpl)).resolves.toEqual(
      index,
    )
  })

  it("reports the status when the artifact is unreachable", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 404)) as unknown as typeof fetch
    await expect(loadMarketIndex("https://example.test/missing.json", fetchImpl)).rejects.toThrow(
      /HTTP 404/,
    )
  })

  it("rejects a payload that is not a market index", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ format: "something-else" })) as unknown as typeof fetch
    await expect(loadMarketIndex("https://example.test/other.json", fetchImpl)).rejects.toThrow(
      /format/,
    )
  })
})
