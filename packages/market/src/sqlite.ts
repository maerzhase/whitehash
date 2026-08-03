/**
 * SQLite export of a market index via sql.js (pure WebAssembly — no native
 * dependency, loadable in Node and browsers alike).
 *
 * The database is relational for external tooling (`events`, `orders`,
 * `stats`) and self-contained for whitehash consumers: `meta.index_json`
 * holds the complete JSON artifact, so `readMarketSqlite` round-trips without
 * reassembling rows.
 */
import initSqlJs, { type SqlJsConfig } from "sql.js"
import { deriveOrders } from "./stats.js"
import { parseMarketIndex, type MarketIndex } from "./market-index.js"

const SCHEMA = `
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE events (
  source_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  chain TEXT NOT NULL,
  marketplace TEXT,
  contract TEXT NOT NULL,
  token_id TEXT,
  order_id TEXT,
  price TEXT,
  seller TEXT,
  buyer TEXT,
  sale_kind TEXT,
  timestamp TEXT NOT NULL,
  level INTEGER NOT NULL,
  op_hash TEXT NOT NULL,
  PRIMARY KEY (source_id, kind)
);
CREATE INDEX events_by_token ON events (contract, token_id);
CREATE INDEX events_by_level ON events (level);
CREATE TABLE orders (
  order_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  contract TEXT NOT NULL,
  token_id TEXT,
  price TEXT,
  seller TEXT,
  buyer TEXT,
  status TEXT NOT NULL,
  created_at TEXT,
  accepted_at TEXT,
  cancelled_at TEXT
);
CREATE TABLE stats (key TEXT PRIMARY KEY, value TEXT);
`

export interface MarketSqliteOptions {
  /** Passed to sql.js init (e.g. `locateFile` for browser WASM hosting). */
  sqlJs?: SqlJsConfig
}

/** Serialize a market index into SQLite file bytes. */
export async function buildMarketSqlite(
  index: MarketIndex,
  options: MarketSqliteOptions = {},
): Promise<Uint8Array> {
  const SQL = await initSqlJs(options.sqlJs)
  const db = new SQL.Database()
  try {
    db.run(SCHEMA)
    db.run("INSERT INTO meta VALUES ('format', ?), ('generated_at', ?), ('index_json', ?)", [
      index.format,
      index.generatedAt,
      JSON.stringify(index),
    ])

    const insertEvent = db.prepare(
      "INSERT OR REPLACE INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
    for (const event of index.events) {
      insertEvent.run([
        event.sourceId,
        event.kind,
        event.chain,
        event.marketplace,
        event.contract,
        event.tokenId,
        event.orderId,
        event.price,
        event.seller,
        event.buyer,
        event.saleKind,
        event.timestamp,
        event.level,
        event.opHash,
      ])
    }
    insertEvent.free()

    const insertOrder = db.prepare("INSERT OR REPLACE INTO orders VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    for (const order of deriveOrders(index.events).values()) {
      insertOrder.run([
        order.orderId,
        order.kind,
        order.contract,
        order.tokenId,
        order.price,
        order.seller,
        order.buyer,
        order.status,
        order.createdAt,
        order.acceptedAt,
        order.cancelledAt,
      ])
    }
    insertOrder.free()

    for (const [key, value] of Object.entries(index.stats)) {
      db.run("INSERT INTO stats VALUES (?, ?)", [
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      ])
    }

    return db.export()
  } finally {
    db.close()
  }
}

/** Load and validate a market index from SQLite file bytes. */
export async function readMarketSqlite(
  bytes: Uint8Array,
  options: MarketSqliteOptions = {},
): Promise<MarketIndex> {
  const SQL = await initSqlJs(options.sqlJs)
  const db = new SQL.Database(bytes)
  try {
    const result = db.exec("SELECT value FROM meta WHERE key = 'index_json'")
    const json = result[0]?.values[0]?.[0]
    if (typeof json !== "string") {
      throw new Error("Not a whitehash market SQLite artifact (missing meta.index_json)")
    }
    return parseMarketIndex(JSON.parse(json))
  } finally {
    db.close()
  }
}
