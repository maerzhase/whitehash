import { describe, expect, it } from "vitest"
import type { MarketEvent } from "./events.js"
import { buildMarketIndex, parseMarketIndex, updateMarketIndex } from "./market-index.js"

const PROJECT = {
  chain: "tezos:mainnet" as const,
  id: "v2:13944",
  name: "Test Project",
  description: null,
  displayUri: null,
  thumbnailUri: null,
  editions: 256,
  minted: 256,
  captureSettings: null,
}

function event(
  partial: Partial<MarketEvent> & Pick<MarketEvent, "sourceId" | "level">,
): MarketEvent {
  return {
    kind: "listing",
    chain: "tezos:mainnet",
    marketplace: "fxhash-tezos-v2",
    contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
    tokenId: "1",
    orderId: "fxhash-tezos-v2:listing:1",
    price: "1000000",
    seller: "tz1seller",
    buyer: null,
    saleKind: null,
    timestamp: "2024-01-01T00:00:00.000Z",
    opHash: "op",
    ...partial,
  }
}

describe("buildMarketIndex / parseMarketIndex", () => {
  it("round-trips through JSON", () => {
    const index = buildMarketIndex({
      project: PROJECT,
      events: [event({ sourceId: "2", level: 20 }), event({ sourceId: "1", level: 10 })],
      cursors: { "tezos:mainnet": { level: 1000 } },
      generatedAt: "2024-06-01T00:00:00.000Z",
    })
    expect(index.events.map(e => e.sourceId)).toEqual(["1", "2"])
    expect(index.stats.asOf).toBe("2024-06-01T00:00:00.000Z")
    expect(parseMarketIndex(JSON.parse(JSON.stringify(index)))).toEqual(index)
  })

  it("rejects malformed stats and unparseable event timestamps", () => {
    const index = buildMarketIndex({
      project: PROJECT,
      events: [event({ sourceId: "1", level: 10 })],
      cursors: {},
    })
    const brokenBuckets = JSON.parse(JSON.stringify(index))
    brokenBuckets.stats.volume.total["24h"].volume = 12 // number, not decimal string
    expect(() => parseMarketIndex(brokenBuckets)).toThrow(/stats/)

    const brokenDaily = JSON.parse(JSON.stringify(index))
    brokenDaily.stats.daily = [{ date: "2024-01-01" }]
    expect(() => parseMarketIndex(brokenDaily)).toThrow(/stats/)

    const brokenTimestamp = JSON.parse(JSON.stringify(index))
    brokenTimestamp.events[0].timestamp = "not a date"
    expect(() => parseMarketIndex(brokenTimestamp)).toThrow(/Invalid market event/)
  })

  it("rejects unknown formats, invalid events, and unsorted events", () => {
    const index = buildMarketIndex({
      project: PROJECT,
      events: [event({ sourceId: "1", level: 10 })],
      cursors: {},
    })
    expect(() => parseMarketIndex({ ...index, format: "nope" })).toThrow(/format/)
    expect(() =>
      parseMarketIndex({ ...index, events: [{ ...index.events[0], kind: "bogus" }] }),
    ).toThrow(/Invalid market event/)
    const shuffled = {
      ...index,
      events: [event({ sourceId: "2", level: 20 }), event({ sourceId: "1", level: 10 })],
    }
    expect(() => parseMarketIndex(JSON.parse(JSON.stringify(shuffled)))).toThrow(/sorted/)
  })
})

describe("updateMarketIndex", () => {
  it("merges new events, dedupes on source identity, and advances cursors", () => {
    const initial = buildMarketIndex({
      project: PROJECT,
      events: [event({ sourceId: "1", level: 10 })],
      cursors: { "tezos:mainnet": { level: 100 } },
      generatedAt: "2024-06-01T00:00:00.000Z",
    })
    const updated = updateMarketIndex(initial, {
      events: [
        event({ sourceId: "1", level: 10 }), // duplicate
        event({
          sourceId: "2",
          level: 50,
          kind: "listing_accept",
          buyer: "tz1buyer",
          saleKind: "secondary",
          timestamp: "2024-02-01T00:00:00.000Z",
        }),
      ],
      cursors: { "tezos:mainnet": { level: 200 } },
      generatedAt: "2024-06-02T00:00:00.000Z",
    })
    expect(updated.events).toHaveLength(2)
    expect(updated.cursors["tezos:mainnet"]).toEqual({ level: 200 })
    expect(updated.stats.volume.secondary.all).toEqual({ sales: 1, volume: "1000000" })
    expect(updated.stats.listed).toBe(0) // the only listing sold
    expect(updated.stats.listingsAvailable).toBe(true) // derived from the Tezos chain
  })
})
