/**
 * Market statistics over normalized events, following the fxhash marketstats
 * definitions: floor/median/listed come from listings that are active at the
 * observation time, volumes are cumulative primary/secondary buckets, and
 * period changes compare a span against the span immediately before it.
 *
 * One deliberate deviation: highest/lowest sale compare native base-unit
 * prices, not USD (this toolkit has no historical fiat rates).
 */
import type { MarketEvent } from "./events.js"

export const VOLUME_SPANS = ["all", "24h", "2d", "7d", "14d", "30d", "60d"] as const
export type VolumeSpan = (typeof VOLUME_SPANS)[number]

const SPAN_DAYS: Record<Exclude<VolumeSpan, "all">, number> = {
  "24h": 1,
  "2d": 2,
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "60d": 60,
}

const DAY_MS = 24 * 60 * 60 * 1000

export interface VolumeBucket {
  sales: number
  /** Base units (mutez / wei) as a decimal string. */
  volume: string
}

export type VolumeBuckets = Record<VolumeSpan, VolumeBucket>

export interface DailyMarketStat {
  /** UTC calendar day, `YYYY-MM-DD`. */
  date: string
  /** Floor of listings active at the end of the day; null when none. */
  floor: string | null
  volume: string
  sales: number
}

export interface MarketStats {
  /** Observation time every "active"/"ago" computation is anchored to. */
  asOf: string
  /** False when active listings cannot be reconstructed from public data
   * (fxhash EVM listings are off-chain signed Seaport orders); floor, median,
   * listed, and the floor changes are then null/0 by construction. */
  listingsAvailable: boolean
  floor: string | null
  median: string | null
  listed: number
  floorChange24h: number | null
  floorChange7d: number | null
  floorChange30d: number | null
  volume: {
    primary: VolumeBuckets
    secondary: VolumeBuckets
    total: VolumeBuckets
  }
  volumeChange24h: number | null
  volumeChange7d: number | null
  volumeChange30d: number | null
  /** Secondary sales only, compared in native base units. */
  highestSale: string | null
  lowestSale: string | null
  daily: DailyMarketStat[]
}

export type OrderStatus = "active" | "accepted" | "cancelled"

export interface OrderState {
  orderId: string
  kind: "listing" | "offer" | "collection_offer" | "auction"
  contract: string
  tokenId: string | null
  price: string | null
  seller: string | null
  buyer: string | null
  createdAt: string | null
  acceptedAt: string | null
  cancelledAt: string | null
  /** Collection offers may fill partially; they are reported accepted on the
   * first observed fill. */
  status: OrderStatus
}

const ORDER_CREATE_KINDS = new Set(["listing", "offer", "collection_offer", "auction"])

function orderKindOf(event: MarketEvent): OrderState["kind"] | null {
  const base = event.kind.replace(/_(cancel|accept|bid|fulfill)$/, "")
  return ORDER_CREATE_KINDS.has(base) ? (base as OrderState["kind"]) : null
}

/**
 * Replay order lifecycles from events sorted ascending. Events referencing an
 * order whose creation predates the indexed range are surfaced too, with
 * `createdAt: null`, so accepts/cancels are never dropped.
 */
export function deriveOrders(events: MarketEvent[]): Map<string, OrderState> {
  const orders = new Map<string, OrderState>()
  for (const event of events) {
    if (!event.orderId || event.kind === "mint" || event.kind === "sale") continue
    const kind = orderKindOf(event)
    if (!kind) continue
    let order = orders.get(event.orderId)
    if (!order) {
      order = {
        orderId: event.orderId,
        kind,
        contract: event.contract,
        tokenId: event.tokenId,
        price: event.price,
        seller: event.seller,
        buyer: null,
        createdAt: null,
        acceptedAt: null,
        cancelledAt: null,
        status: "active",
      }
      orders.set(event.orderId, order)
    }
    if (event.kind === kind) {
      order.createdAt = event.timestamp
      order.price = event.price ?? order.price
      order.seller = event.seller ?? order.seller
      order.tokenId = event.tokenId ?? order.tokenId
    } else if (event.kind.endsWith("_cancel")) {
      order.cancelledAt = event.timestamp
      order.status = "cancelled"
    } else if (event.kind === "auction_bid") {
      order.price = event.price ?? order.price
      order.buyer = event.buyer ?? order.buyer
    } else {
      order.acceptedAt = event.timestamp
      order.status = "accepted"
      order.buyer = event.buyer ?? order.buyer
      order.price = event.price ?? order.price
    }
  }
  return orders
}

/**
 * Listing lifecycle with timestamps pre-parsed once. The daily series and the
 * floor replays evaluate every listing per day, so parsing inside that loop
 * would be O(days x orders) wasted work.
 */
interface ListingLifecycle {
  price: bigint
  created: number
  accepted: number | null
  cancelled: number | null
}

function listingLifecycles(orders: Iterable<OrderState>): ListingLifecycle[] {
  const lifecycles: ListingLifecycle[] = []
  for (const order of orders) {
    if (order.kind !== "listing" || order.price === null || order.createdAt === null) continue
    lifecycles.push({
      price: BigInt(order.price),
      created: Date.parse(order.createdAt),
      accepted: order.acceptedAt === null ? null : Date.parse(order.acceptedAt),
      cancelled: order.cancelledAt === null ? null : Date.parse(order.cancelledAt),
    })
  }
  return lifecycles
}

/** fxhash active-listing rule: created by `at`, and neither closed by `at`. */
function isListingActiveAt(listing: ListingLifecycle, at: number): boolean {
  if (listing.created > at) return false
  if (listing.accepted !== null && listing.accepted <= at) return false
  if (listing.cancelled !== null && listing.cancelled <= at) return false
  return true
}

function activeListingPrices(listings: ListingLifecycle[], at: number): bigint[] {
  const prices: bigint[] = []
  for (const listing of listings) {
    if (isListingActiveAt(listing, at)) prices.push(listing.price)
  }
  return prices.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

/** Median of an ascending bigint array; even lengths truncate (integer division). */
export function medianSorted(sorted: bigint[]): bigint | null {
  if (sorted.length === 0) return null
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] as bigint
  return ((sorted[middle - 1] as bigint) + (sorted[middle] as bigint)) / 2n
}

/** Percent change with two decimals; null when either side is zero/absent. */
export function percentChange(previous: bigint | null, current: bigint | null): number | null {
  if (!previous || !current) return null
  return Number(((current - previous) * 10000n) / previous) / 100
}

interface Sale {
  time: number
  price: bigint
  saleKind: "primary" | "secondary"
}

function extractSales(events: MarketEvent[]): Sale[] {
  const sales: Sale[] = []
  for (const event of events) {
    if (event.saleKind === null || event.price === null) continue
    sales.push({
      time: Date.parse(event.timestamp),
      price: BigInt(event.price),
      saleKind: event.saleKind,
    })
  }
  return sales
}

interface MutableBucket {
  sales: number
  volume: bigint
}

function emptyBuckets(): Record<VolumeSpan, MutableBucket> {
  const buckets = {} as Record<VolumeSpan, MutableBucket>
  for (const span of VOLUME_SPANS) buckets[span] = { sales: 0, volume: 0n }
  return buckets
}

function finalizeBuckets(buckets: Record<VolumeSpan, MutableBucket>): VolumeBuckets {
  const result = {} as VolumeBuckets
  for (const span of VOLUME_SPANS) {
    const bucket = buckets[span]
    result[span] = { sales: bucket.sales, volume: bucket.volume.toString() }
  }
  return result
}

export interface ComputeMarketStatsOptions {
  /** Observation time; defaults to now. */
  asOf?: string
  /** Whether the event set can reconstruct active listings (Tezos: yes). */
  listingsAvailable: boolean
}

export function computeMarketStats(
  events: MarketEvent[],
  options: ComputeMarketStatsOptions,
): MarketStats {
  const asOf = options.asOf ?? new Date().toISOString()
  const at = Date.parse(asOf)
  if (Number.isNaN(at)) throw new Error(`Invalid asOf timestamp: ${asOf}`)

  const orders = deriveOrders(events)
  const sales = extractSales(events)

  const primary = emptyBuckets()
  const secondary = emptyBuckets()
  let highest: bigint | null = null
  let lowest: bigint | null = null

  for (const sale of sales) {
    if (sale.time > at) continue
    const buckets = sale.saleKind === "primary" ? primary : secondary
    buckets.all.sales += 1
    buckets.all.volume += sale.price
    for (const span of VOLUME_SPANS) {
      if (span === "all") continue
      if (sale.time > at - SPAN_DAYS[span] * DAY_MS) {
        buckets[span].sales += 1
        buckets[span].volume += sale.price
      }
    }
    if (sale.saleKind === "secondary") {
      if (highest === null || sale.price > highest) highest = sale.price
      if (lowest === null || sale.price < lowest) lowest = sale.price
    }
  }

  const total = emptyBuckets()
  for (const span of VOLUME_SPANS) {
    total[span].sales = primary[span].sales + secondary[span].sales
    total[span].volume = primary[span].volume + secondary[span].volume
  }

  const volumeChange = (span: "24h" | "7d" | "30d"): number | null => {
    const doubled: Record<typeof span, VolumeSpan> = { "24h": "2d", "7d": "14d", "30d": "60d" }
    const current = total[span].volume
    const previous = total[doubled[span]].volume - current
    return percentChange(previous, current)
  }

  let floor: bigint | null = null
  let median: bigint | null = null
  let listed = 0
  let floorChange24h: number | null = null
  let floorChange7d: number | null = null
  let floorChange30d: number | null = null

  const listings = options.listingsAvailable ? listingLifecycles(orders.values()) : []
  if (options.listingsAvailable) {
    const prices = activeListingPrices(listings, at)
    floor = prices[0] ?? null
    median = medianSorted(prices)
    listed = prices.length
    const floorAt = (daysAgo: number): bigint | null =>
      activeListingPrices(listings, at - daysAgo * DAY_MS)[0] ?? null
    floorChange24h = percentChange(floorAt(1), floor)
    floorChange7d = percentChange(floorAt(7), floor)
    floorChange30d = percentChange(floorAt(30), floor)
  }

  return {
    asOf,
    listingsAvailable: options.listingsAvailable,
    floor: floor === null ? null : floor.toString(),
    median: median === null ? null : median.toString(),
    listed,
    floorChange24h,
    floorChange7d,
    floorChange30d,
    volume: {
      primary: finalizeBuckets(primary),
      secondary: finalizeBuckets(secondary),
      total: finalizeBuckets(total),
    },
    volumeChange24h: volumeChange("24h"),
    volumeChange7d: volumeChange("7d"),
    volumeChange30d: volumeChange("30d"),
    highestSale: highest === null ? null : highest.toString(),
    lowestSale: lowest === null ? null : lowest.toString(),
    daily: computeDailySeries(events, listings, sales, at, options.listingsAvailable),
  }
}

function utcDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10)
}

function computeDailySeries(
  events: MarketEvent[],
  listings: ListingLifecycle[],
  sales: Sale[],
  at: number,
  listingsAvailable: boolean,
): DailyMarketStat[] {
  const first = events.reduce<number | null>((earliest, event) => {
    const time = Date.parse(event.timestamp)
    if (Number.isNaN(time) || time > at) return earliest
    return earliest === null || time < earliest ? time : earliest
  }, null)
  if (first === null) return []

  const salesByDay = new Map<string, MutableBucket>()
  for (const sale of sales) {
    if (sale.time > at) continue
    const day = utcDay(sale.time)
    const bucket = salesByDay.get(day) ?? { sales: 0, volume: 0n }
    bucket.sales += 1
    bucket.volume += sale.price
    salesByDay.set(day, bucket)
  }

  const series: DailyMarketStat[] = []
  const firstDayStart = Date.UTC(
    new Date(first).getUTCFullYear(),
    new Date(first).getUTCMonth(),
    new Date(first).getUTCDate(),
  )
  for (let dayStart = firstDayStart; dayStart <= at; dayStart += DAY_MS) {
    const day = utcDay(dayStart)
    const dayEnd = Math.min(dayStart + DAY_MS - 1, at)
    const bucket = salesByDay.get(day) ?? { sales: 0, volume: 0n }
    const dayFloor = listingsAvailable ? (activeListingPrices(listings, dayEnd)[0] ?? null) : null
    series.push({
      date: day,
      floor: dayFloor === null ? null : dayFloor.toString(),
      volume: bucket.volume.toString(),
      sales: bucket.sales,
    })
  }
  return series
}
