import initSqlJs from "sql.js"
import { describe, expect, it } from "vitest"
import type { MarketEvent } from "./events.js"
import { buildMarketIndex } from "./market-index.js"
import { buildMarketSqlite, readMarketSqlite } from "./sqlite.js"

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

const EVENTS: MarketEvent[] = [
  {
    kind: "listing",
    chain: "tezos:mainnet",
    marketplace: "fxhash-tezos-v2",
    contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
    tokenId: "42",
    orderId: "fxhash-tezos-v2:listing:7",
    price: "1000000",
    seller: "tz1seller",
    buyer: null,
    saleKind: null,
    timestamp: "2024-01-01T00:00:00.000Z",
    level: 10,
    opHash: "opListing",
    sourceId: "1",
  },
  {
    kind: "listing_accept",
    chain: "tezos:mainnet",
    marketplace: "fxhash-tezos-v2",
    contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
    tokenId: "42",
    orderId: "fxhash-tezos-v2:listing:7",
    price: "1000000",
    seller: "tz1seller",
    buyer: "tz1buyer",
    saleKind: "secondary",
    timestamp: "2024-02-01T00:00:00.000Z",
    level: 20,
    opHash: "opAccept",
    sourceId: "2",
  },
]

describe("SQLite artifact", () => {
  it("round-trips a market index through file bytes", async () => {
    const index = buildMarketIndex({
      project: PROJECT,
      events: EVENTS,
      cursors: { "tezos:mainnet": { height: 100 } },
      generatedAt: "2024-06-01T00:00:00.000Z",
    })
    const bytes = await buildMarketSqlite(index)
    expect(bytes.length).toBeGreaterThan(0)
    expect(await readMarketSqlite(bytes)).toEqual(index)
  })

  it("exposes queryable relational tables", async () => {
    const index = buildMarketIndex({
      project: PROJECT,
      events: EVENTS,
      cursors: {},
      generatedAt: "2024-06-01T00:00:00.000Z",
    })
    const SQL = await initSqlJs()
    const db = new SQL.Database(await buildMarketSqlite(index))
    try {
      expect(db.exec("SELECT COUNT(*) FROM events")[0]?.values[0]?.[0]).toBe(2)
      const order = db.exec(
        "SELECT status, buyer FROM orders WHERE order_id = 'fxhash-tezos-v2:listing:7'",
      )
      expect(order[0]?.values[0]).toEqual(["accepted", "tz1buyer"])
      const floor = db.exec("SELECT value FROM stats WHERE key = 'listed'")
      expect(floor[0]?.values[0]?.[0]).toBe("0")
    } finally {
      db.close()
    }
  })

  it("rejects foreign SQLite files", async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    db.run("CREATE TABLE meta (key TEXT, value TEXT)")
    const bytes = db.export()
    db.close()
    await expect(readMarketSqlite(bytes)).rejects.toThrow(/market SQLite artifact/)
  })
})
