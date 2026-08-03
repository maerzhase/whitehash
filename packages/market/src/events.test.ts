import { describe, expect, it } from "vitest"
import { compareMarketEvents, type MarketEvent } from "./events.js"

function event(level: number, sourceId: string): MarketEvent {
  return {
    kind: "sale",
    chain: "eip155:8453",
    marketplace: "seaport",
    contract: "0x1111111111111111111111111111111111111111",
    tokenId: "1",
    orderId: null,
    price: "1",
    seller: null,
    buyer: null,
    saleKind: "secondary",
    timestamp: "2024-01-01T00:00:00.000Z",
    level,
    opHash: "0xtx",
    sourceId,
  }
}

describe("compareMarketEvents", () => {
  it("orders by level first", () => {
    expect(compareMarketEvents(event(1, "9"), event(2, "1"))).toBeLessThan(0)
  })

  it("orders numeric TzKT operation ids numerically", () => {
    expect(compareMarketEvents(event(1, "9"), event(1, "10"))).toBeLessThan(0)
  })

  it("orders EVM block-logIndex source ids segment-wise numerically", () => {
    // Lexicographic comparison would put "100-10" before "100-5".
    expect(compareMarketEvents(event(1, "100-5"), event(1, "100-10"))).toBeLessThan(0)
    expect(compareMarketEvents(event(1, "100-10"), event(1, "100-10"))).toBe(0)
  })
})
