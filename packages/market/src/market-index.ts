/**
 * Portable market index artifact: one JSON document with a project's
 * normalized market event history, derived stats, and resume cursors for
 * incremental re-runs. Follows the whitehash portable-index conventions.
 */
import { isIndexedProjectMetadata, type IndexedProject } from "@whitehash/chain-reader"
import { isTezosChain, type ChainId } from "@whitehash/core"
import {
  compareMarketEvents,
  isMarketEvent,
  mergeMarketEvents,
  type MarketEvent,
} from "./events.js"
import { VOLUME_SPANS, computeMarketStats, type MarketStats } from "./stats.js"

export const MARKET_INDEX_FORMAT = "whitehash-market-index@1" as const

export interface MarketIndexCursor {
  /** Last fully indexed chain height: a Tezos level or an EVM block number. */
  height: number
}

export interface MarketIndex {
  format: typeof MARKET_INDEX_FORMAT
  generatedAt: string
  project: IndexedProject
  /** Resume points per chain; `updateMarketIndex` continues after these. */
  cursors: Partial<Record<ChainId, MarketIndexCursor>>
  /** Ascending by (level, sourceId). */
  events: MarketEvent[]
  stats: MarketStats
}

export interface BuildMarketIndexOptions {
  project: IndexedProject
  events: MarketEvent[]
  cursors: Partial<Record<ChainId, MarketIndexCursor>>
  generatedAt?: string
}

export function buildMarketIndex(options: BuildMarketIndexOptions): MarketIndex {
  const generatedAt = options.generatedAt ?? new Date().toISOString()
  const events = mergeMarketEvents(options.events)
  return {
    format: MARKET_INDEX_FORMAT,
    generatedAt,
    project: options.project,
    cursors: options.cursors,
    events,
    stats: computeMarketStats(events, {
      asOf: generatedAt,
      // fxhash EVM listings are off-chain signed Seaport orders, so only
      // Tezos event sets can reconstruct the active order book.
      listingsAvailable: isTezosChain(options.project.chain),
    }),
  }
}

/** Merge freshly backfilled events into an existing index and recompute stats. */
export function updateMarketIndex(
  existing: MarketIndex,
  update: {
    events: MarketEvent[]
    cursors: Partial<Record<ChainId, MarketIndexCursor>>
    project?: IndexedProject
    generatedAt?: string
  },
): MarketIndex {
  return buildMarketIndex({
    project: update.project ?? existing.project,
    events: mergeMarketEvents(existing.events, update.events),
    cursors: { ...existing.cursors, ...update.cursors },
    generatedAt: update.generatedAt,
  })
}

function nullableDecimalString(value: unknown): boolean {
  return value === null || (typeof value === "string" && /^\d+$/.test(value))
}

function nullableNumber(value: unknown): boolean {
  return value === null || typeof value === "number"
}

function isVolumeBuckets(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  return VOLUME_SPANS.every(span => {
    const bucket = (value as Record<string, { sales?: unknown; volume?: unknown }>)[span]
    return (
      !!bucket &&
      typeof bucket.sales === "number" &&
      typeof bucket.volume === "string" &&
      /^\d+$/.test(bucket.volume)
    )
  })
}

function isMarketStats(value: unknown): value is MarketStats {
  if (!value || typeof value !== "object") return false
  const stats = value as Partial<MarketStats>
  return (
    typeof stats.asOf === "string" &&
    !Number.isNaN(Date.parse(stats.asOf)) &&
    typeof stats.listingsAvailable === "boolean" &&
    typeof stats.listed === "number" &&
    nullableDecimalString(stats.floor) &&
    nullableDecimalString(stats.median) &&
    nullableDecimalString(stats.highestSale) &&
    nullableDecimalString(stats.lowestSale) &&
    nullableNumber(stats.floorChange24h) &&
    nullableNumber(stats.floorChange7d) &&
    nullableNumber(stats.floorChange30d) &&
    nullableNumber(stats.volumeChange24h) &&
    nullableNumber(stats.volumeChange7d) &&
    nullableNumber(stats.volumeChange30d) &&
    !!stats.volume &&
    typeof stats.volume === "object" &&
    isVolumeBuckets(stats.volume.primary) &&
    isVolumeBuckets(stats.volume.secondary) &&
    isVolumeBuckets(stats.volume.total) &&
    Array.isArray(stats.daily) &&
    stats.daily.every(
      day =>
        !!day &&
        typeof day === "object" &&
        typeof day.date === "string" &&
        nullableDecimalString(day.floor) &&
        typeof day.volume === "string" &&
        typeof day.sales === "number",
    )
  )
}

/** Validate untrusted JSON before using it as a market index. */
export function parseMarketIndex(value: unknown): MarketIndex {
  if (!value || typeof value !== "object") throw new Error("Market index must be an object")
  const index = value as Partial<MarketIndex>
  if (index.format !== MARKET_INDEX_FORMAT) {
    throw new Error(`Unsupported market index format: ${String(index.format)}`)
  }
  if (!isIndexedProjectMetadata(index.project)) {
    throw new Error("Market index project metadata is invalid")
  }
  if (
    typeof index.generatedAt !== "string" ||
    !index.cursors ||
    typeof index.cursors !== "object"
  ) {
    throw new Error("Market index header is invalid")
  }
  for (const [chain, cursor] of Object.entries(index.cursors)) {
    if (!cursor || typeof (cursor as MarketIndexCursor).height !== "number") {
      throw new Error(`Invalid market index cursor for ${chain}`)
    }
  }
  if (!Array.isArray(index.events)) throw new Error("Market index events must be an array")
  for (const [position, event] of index.events.entries()) {
    if (!isMarketEvent(event) || Number.isNaN(Date.parse(event.timestamp))) {
      throw new Error(`Invalid market event at position ${position}`)
    }
  }
  if (!isMarketStats(index.stats)) throw new Error("Market index stats are invalid")
  const sorted = [...index.events].sort(compareMarketEvents)
  for (let position = 0; position < sorted.length; position++) {
    if (sorted[position] !== index.events[position]) {
      throw new Error("Market index events must be sorted ascending by level")
    }
  }
  return index as MarketIndex
}
