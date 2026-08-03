import { parseMarketIndex, readMarketSqlite, type MarketIndex } from "@whitehash/market"
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url"

const SQLITE_MAGIC = "SQLite format 3"

function looksLikeSqlite(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.slice(0, SQLITE_MAGIC.length)) === SQLITE_MAGIC
}

async function fromBytes(bytes: Uint8Array): Promise<MarketIndex> {
  if (looksLikeSqlite(bytes)) {
    return readMarketSqlite(bytes, { sqlJs: { locateFile: () => sqlWasmUrl } })
  }
  return parseMarketIndex(JSON.parse(new TextDecoder().decode(bytes)))
}

export async function loadMarketIndexFile(file: File): Promise<MarketIndex> {
  return fromBytes(new Uint8Array(await file.arrayBuffer()))
}

export async function loadMarketIndexUrl(url: string): Promise<MarketIndex> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return fromBytes(new Uint8Array(await response.arrayBuffer()))
}
