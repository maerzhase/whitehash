import { describe, expect, it } from "vitest"
import type { MarketEvent } from "./events.js"
import { computeMarketStats, deriveOrders, medianSorted, percentChange } from "./stats.js"

const AS_OF = "2026-08-02T00:00:00.000Z"
const at = Date.parse(AS_OF)
const daysAgo = (days: number) => new Date(at - days * 24 * 60 * 60 * 1000).toISOString()

let sourceCounter = 0
function event(partial: Partial<MarketEvent>): MarketEvent {
  sourceCounter += 1
  return {
    kind: "listing",
    chain: "tezos:mainnet",
    marketplace: "fxhash-tezos-v2",
    contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
    tokenId: "1",
    orderId: null,
    price: null,
    seller: null,
    buyer: null,
    saleKind: null,
    timestamp: AS_OF,
    level: sourceCounter,
    opHash: `op${sourceCounter}`,
    sourceId: String(sourceCounter),
    ...partial,
  }
}

const listing = (orderId: string, price: string, timestamp: string) =>
  event({ kind: "listing", orderId, price, timestamp })
const accept = (orderId: string, price: string, timestamp: string) =>
  event({ kind: "listing_accept", orderId, price, timestamp, saleKind: "secondary" })
const cancel = (orderId: string, timestamp: string) =>
  event({ kind: "listing_cancel", orderId, timestamp })

describe("medianSorted", () => {
  it("returns null for empty input", () => {
    expect(medianSorted([])).toBe(null)
  })
  it("returns the middle element for odd lengths", () => {
    expect(medianSorted([1n, 5n, 9n])).toBe(5n)
  })
  it("truncates the average for even lengths", () => {
    expect(medianSorted([1n, 4n])).toBe(2n)
  })
})

describe("percentChange", () => {
  it("returns two-decimal percent", () => {
    expect(percentChange(200n, 500n)).toBe(150)
    expect(percentChange(300n, 500n)).toBeCloseTo(66.66, 2)
  })
  it("is null when either side is zero or null", () => {
    expect(percentChange(0n, 5n)).toBe(null)
    expect(percentChange(5n, 0n)).toBe(null)
    expect(percentChange(null, 5n)).toBe(null)
  })
})

describe("computeMarketStats", () => {
  const events: MarketEvent[] = [
    // L1: active since 100 days, 5 XTZ.
    listing("L1", "5000000", daysAgo(100)),
    // L2: 2 XTZ, listed 10 days ago, sold 5 days ago.
    listing("L2", "2000000", daysAgo(10)),
    accept("L2", "2000000", daysAgo(5)),
    // L3: 3 XTZ, listed 2 days ago, cancelled an hour ago.
    listing("L3", "3000000", daysAgo(2)),
    cancel("L3", daysAgo(1 / 24)),
    // Primary mint 50 days ago.
    event({
      kind: "mint",
      marketplace: null,
      price: "1000000",
      saleKind: "primary",
      timestamp: daysAgo(50),
    }),
    // Offer accepted 12 hours ago.
    event({
      kind: "offer_accept",
      orderId: "O1",
      price: "4000000",
      saleKind: "secondary",
      timestamp: daysAgo(0.5),
    }),
  ]
  const stats = computeMarketStats(events, { asOf: AS_OF, listingsAvailable: true })

  it("uses only currently active listings for floor/median/listed", () => {
    expect(stats.floor).toBe("5000000")
    expect(stats.median).toBe("5000000")
    expect(stats.listed).toBe(1)
  })

  it("computes floor changes against historical active sets", () => {
    // 24h ago L3 (3 XTZ) was still active; 7d ago L2 (2 XTZ) was active.
    expect(stats.floorChange24h).toBeCloseTo(66.66, 1)
    expect(stats.floorChange7d).toBe(150)
    expect(stats.floorChange30d).toBe(0)
  })

  it("buckets volumes cumulatively by span and sale kind", () => {
    expect(stats.volume.secondary["24h"]).toEqual({ sales: 1, volume: "4000000" })
    expect(stats.volume.secondary["7d"]).toEqual({ sales: 2, volume: "6000000" })
    expect(stats.volume.primary.all).toEqual({ sales: 1, volume: "1000000" })
    expect(stats.volume.total.all).toEqual({ sales: 3, volume: "7000000" })
  })

  it("compares each span against the span immediately before it", () => {
    expect(stats.volumeChange24h).toBe(null) // previous 24h had no sales
    expect(stats.volumeChange7d).toBe(null)
    expect(stats.volumeChange30d).toBe(500) // 6 XTZ vs the mint-only 1 XTZ before
  })

  it("tracks secondary sale extremes in native units", () => {
    expect(stats.highestSale).toBe("4000000")
    expect(stats.lowestSale).toBe("2000000")
  })

  it("produces a daily series from the first event to asOf", () => {
    expect(stats.daily).toHaveLength(101)
    expect(stats.daily[0]?.date).toBe(daysAgo(100).slice(0, 10))
    const saleDay = stats.daily.find(day => day.date === daysAgo(5).slice(0, 10))
    expect(saleDay).toEqual({
      date: daysAgo(5).slice(0, 10),
      floor: "5000000", // L2 sold that day, so only L1 is active at day end
      volume: "2000000",
      sales: 1,
    })
  })

  it("nulls listing stats when listings are unavailable", () => {
    const evm = computeMarketStats(events, { asOf: AS_OF, listingsAvailable: false })
    expect(evm.floor).toBe(null)
    expect(evm.listed).toBe(0)
    expect(evm.floorChange24h).toBe(null)
    expect(evm.volume.total.all.volume).toBe("7000000")
  })
})

describe("deriveOrders", () => {
  it("replays lifecycles including closes of unseen creations", () => {
    const orders = deriveOrders([
      listing("L1", "5000000", daysAgo(10)),
      cancel("L1", daysAgo(9)),
      accept("L-unseen", "7000000", daysAgo(1)),
    ])
    expect(orders.get("L1")?.status).toBe("cancelled")
    const unseen = orders.get("L-unseen")
    expect(unseen?.status).toBe("accepted")
    expect(unseen?.createdAt).toBe(null)
    expect(unseen?.price).toBe("7000000")
  })
})
