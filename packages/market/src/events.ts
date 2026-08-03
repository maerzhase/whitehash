/**
 * Normalized market event model.
 *
 * One event per observed on-chain market action, across marketplace
 * generations and chains, ordered by (level, sourceId). Prices are kept as
 * base-unit strings (mutez / wei) so artifacts stay JSON-safe and lossless.
 */
import type { ChainId } from "@whitehash/core"

/**
 * Tezos completed sales appear as `*_accept` lifecycle kinds; EVM Seaport
 * fills appear as the standalone kind `"sale"`. Consumers counting sales
 * should filter on `saleKind !== null`, never on `kind === "sale"`.
 */
export const MARKET_EVENT_KINDS = [
  "listing",
  "listing_cancel",
  "listing_accept",
  "offer",
  "offer_cancel",
  "offer_accept",
  "collection_offer",
  "collection_offer_cancel",
  "collection_offer_accept",
  "auction",
  "auction_bid",
  "auction_cancel",
  "auction_fulfill",
  "mint",
  "sale",
] as const

export type MarketEventKind = (typeof MARKET_EVENT_KINDS)[number]

/**
 * The venue an order lived on. `"seaport"` is protocol-level: fills are
 * matched by event signature, so fxhash.xyz and other Seaport marketplaces
 * (e.g. OpenSea) are indistinguishable.
 */
export type Marketplace = "fxhash-tezos-v1" | "fxhash-tezos-v2" | "seaport"

export interface MarketEvent {
  kind: MarketEventKind
  chain: ChainId
  /** Null for mints, which happen on issuer/token contracts. */
  marketplace: Marketplace | null
  /** NFT contract the event concerns. */
  contract: string
  /** Null for collection-wide offers and mints without a resolvable token. */
  tokenId: string | null
  /**
   * Marketplace-scoped order identity (`<marketplace>:<id>`), or the Seaport
   * order hash. Null for mints.
   */
  orderId: string | null
  /** Base units (mutez / wei) as a decimal string; null when unknown. */
  price: string | null
  seller: string | null
  buyer: string | null
  /** Set on mints and completed sales; null on order lifecycle events. */
  saleKind: "primary" | "secondary" | null
  /** ISO 8601. */
  timestamp: string
  /** Tezos level or EVM block number. */
  level: number
  opHash: string
  /** Unique per event: TzKT operation id, or EVM `<block>-<logIndex>`. */
  sourceId: string
}

export function isMarketEventKind(value: unknown): value is MarketEventKind {
  return typeof value === "string" && (MARKET_EVENT_KINDS as readonly string[]).includes(value)
}

function nullableString(value: unknown): boolean {
  return value === null || typeof value === "string"
}

/** Validate one untrusted event object. */
export function isMarketEvent(value: unknown): value is MarketEvent {
  if (!value || typeof value !== "object") return false
  const event = value as Partial<MarketEvent>
  return (
    isMarketEventKind(event.kind) &&
    typeof event.chain === "string" &&
    nullableString(event.marketplace) &&
    typeof event.contract === "string" &&
    nullableString(event.tokenId) &&
    nullableString(event.orderId) &&
    (event.price === null || (typeof event.price === "string" && /^\d+$/.test(event.price))) &&
    nullableString(event.seller) &&
    nullableString(event.buyer) &&
    (event.saleKind === null || event.saleKind === "primary" || event.saleKind === "secondary") &&
    typeof event.timestamp === "string" &&
    typeof event.level === "number" &&
    typeof event.opHash === "string" &&
    typeof event.sourceId === "string"
  )
}

/**
 * Deterministic artifact ordering: level, then source identity. Source ids
 * are numeric TzKT operation ids or EVM `<block>-<logIndex>` pairs, so ties
 * compare segment-wise numerically rather than lexicographically (which would
 * order "100-10" before "100-5").
 */
export function compareMarketEvents(a: MarketEvent, b: MarketEvent): number {
  if (a.level !== b.level) return a.level - b.level
  if (a.sourceId === b.sourceId) return 0
  const segmentsA = a.sourceId.split("-")
  const segmentsB = b.sourceId.split("-")
  for (let index = 0; index < Math.max(segmentsA.length, segmentsB.length); index++) {
    const segmentA = segmentsA[index]
    const segmentB = segmentsB[index]
    if (segmentA === segmentB) continue
    if (segmentA === undefined) return -1
    if (segmentB === undefined) return 1
    const numericA = Number(segmentA)
    const numericB = Number(segmentB)
    if (Number.isFinite(numericA) && Number.isFinite(numericB) && numericA !== numericB) {
      return numericA - numericB
    }
    return segmentA < segmentB ? -1 : 1
  }
  return 0
}

/** Merge event sets, deduplicating on `sourceId` + `kind` (newest wins). */
export function mergeMarketEvents(...sets: MarketEvent[][]): MarketEvent[] {
  const merged = new Map<string, MarketEvent>()
  for (const events of sets) {
    for (const event of events) merged.set(`${event.sourceId}/${event.kind}`, event)
  }
  return [...merged.values()].sort(compareMarketEvents)
}
