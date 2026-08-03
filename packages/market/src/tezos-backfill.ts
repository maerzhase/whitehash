/**
 * Per-project Tezos market backfill via the public TzKT API.
 *
 * Decoding semantics mirror the fxhash indexer: order data comes from each
 * operation's inline big-map diffs (TzKT `select=...,diffs`), and `remove_key`
 * diffs still carry the removed value, so accepts and cancels are
 * self-describing. Marketplace v1 called listings "offers" on-chain; they are
 * normalized to listing events here.
 */
import {
  TEZOS_NETWORKS,
  defaultChainReaderConfig,
  tzktBaseUrl,
  tzktFetch,
  type ChainReaderConfig,
} from "@whitehash/chain-reader"
import type { TezosChainId } from "@whitehash/core"
import {
  TEZOS_MARKETPLACES,
  TEZOS_REORG_BUFFER,
  gentkContractForVersion,
  gentkVersionForContract,
} from "./contracts.js"
import { mergeMarketEvents, type MarketEvent } from "./events.js"
import type { MarketIndexCursor } from "./market-index.js"

const PAGE_LIMIT = 1000
const ID_BATCH = 100

export interface TzktBigmapDiff {
  bigmap: number
  path: string
  action: "add_key" | "update_key" | "remove_key" | string
  content?: { hash?: string; key?: unknown; value?: unknown }
}

export interface TzktOperation {
  id: number
  level: number
  timestamp: string
  sender?: { address?: string }
  amount?: number
  parameter?: { entrypoint?: string; value?: unknown } | null
  diffs?: TzktBigmapDiff[] | null
  hash: string
}

export interface TezosBackfillTarget {
  chain: TezosChainId
  /** whitehash project id, e.g. `"v2:13944"` (issuer version + on-chain id). */
  projectId: string
  /** The project's minted iterations (canonical token identities). */
  tokens: { contract: string; tokenId: string }[]
}

export interface TezosBackfillOptions {
  config?: ChainReaderConfig
  fetchImpl?: typeof fetch
  /** Resume point: only operations with `level > sinceLevel` are fetched. */
  sinceLevel?: number
  /**
   * Order ids already known from a previous run (from the existing index's
   * events), so accepts/cancels of old orders are still found incrementally.
   */
  knownOrderIds?: string[]
  onProgress?: (message: string) => void
}

export interface TezosBackfillResult {
  events: MarketEvent[]
  cursor: MarketIndexCursor
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * TzKT's `.in` filter rejects a single-item list ("JSON array must contain at
 * least two items"), so a batch of one has to use the scalar form of the same
 * field.
 */
function valueFilter(field: string, values: string[]): string {
  if (values.length === 1) return `${field}=${values[0]}`
  return `${field}.in=${values.join(",")}`
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size))
  }
  return out
}

async function fetchOperations(
  base: string,
  query: string,
  fetchImpl: typeof fetch,
): Promise<TzktOperation[]> {
  const select = "id,level,timestamp,sender,amount,parameter,diffs,hash"
  const operations: TzktOperation[] = []
  let offsetId: number | undefined
  for (;;) {
    const cursor = offsetId === undefined ? "" : `&offset.cr=${offsetId}`
    const url =
      `${base}/v1/operations/transactions?${query}` +
      `&status=applied&select=${select}&sort.asc=id&limit=${PAGE_LIMIT}${cursor}`
    const page = await tzktFetch<TzktOperation[]>(url, fetchImpl)
    operations.push(...page)
    if (page.length < PAGE_LIMIT) return operations
    offsetId = page[page.length - 1]?.id
    await sleep(120) // politeness between pages
  }
}

interface DecodeContext {
  chain: TezosChainId
  /** Contract used for events without a per-token identity (collection offers, mints). */
  defaultContract: string
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function gentkIdentity(
  ctx: DecodeContext,
  gentk: unknown,
): { contract: string; tokenId: string } | null {
  const value = record(gentk)
  const tokenId = str(value?.id)
  const version = str(value?.version)
  if (tokenId === null || version === null) return null
  const contract = gentkContractForVersion(ctx.chain, version)
  return contract ? { contract, tokenId } : null
}

function diffByPath(op: TzktOperation, path: string): TzktBigmapDiff | null {
  return op.diffs?.find(diff => diff.path === path) ?? null
}

function baseEvent(
  op: TzktOperation,
  ctx: DecodeContext,
): Pick<MarketEvent, "chain" | "timestamp" | "level" | "opHash" | "sourceId"> {
  return {
    chain: ctx.chain,
    timestamp: op.timestamp,
    level: op.level,
    opHash: op.hash,
    sourceId: String(op.id),
  }
}

/** Decode one marketplace-v2 operation into a normalized event, or null. */
export function decodeMarketplaceV2Operation(
  op: TzktOperation,
  ctx: DecodeContext,
): MarketEvent | null {
  const entrypoint = op.parameter?.entrypoint
  const marketplace = "fxhash-tezos-v2" as const
  const orderId = (family: string, key: unknown) => `${marketplace}:${family}:${String(key)}`
  const sender = op.sender?.address ?? null

  switch (entrypoint) {
    case "listing":
    case "listing_cancel":
    case "listing_accept": {
      const diff = diffByPath(op, "listings")
      const value = record(diff?.content?.value)
      const token = gentkIdentity(ctx, value?.gentk)
      if (!diff || !value || !token) return null
      const shared = {
        ...baseEvent(op, ctx),
        marketplace,
        ...token,
        orderId: orderId("listing", diff.content?.key),
        price: str(value.price),
        seller: str(value.seller),
      }
      if (entrypoint === "listing") {
        return { ...shared, kind: "listing", buyer: null, saleKind: null }
      }
      if (entrypoint === "listing_cancel") {
        return { ...shared, kind: "listing_cancel", buyer: null, saleKind: null }
      }
      return { ...shared, kind: "listing_accept", buyer: sender, saleKind: "secondary" }
    }
    case "offer":
    case "offer_cancel":
    case "offer_accept": {
      const diff = diffByPath(op, "offers")
      const value = record(diff?.content?.value)
      const token = gentkIdentity(ctx, value?.gentk)
      if (!diff || !value || !token) return null
      const shared = {
        ...baseEvent(op, ctx),
        marketplace,
        ...token,
        orderId: orderId("offer", diff.content?.key),
        price: str(value.price),
        buyer: str(value.buyer),
      }
      if (entrypoint === "offer") return { ...shared, kind: "offer", seller: null, saleKind: null }
      if (entrypoint === "offer_cancel") {
        return { ...shared, kind: "offer_cancel", seller: null, saleKind: null }
      }
      return { ...shared, kind: "offer_accept", seller: sender, saleKind: "secondary" }
    }
    case "collection_offer":
    case "collection_offer_cancel":
    case "collection_offer_accept": {
      const diff = diffByPath(op, "collection_offers")
      const value = record(diff?.content?.value)
      if (!diff || !value) return null
      const params = record(op.parameter?.value)
      const token =
        entrypoint === "collection_offer_accept" ? gentkIdentity(ctx, params?.gentk) : null
      const shared = {
        ...baseEvent(op, ctx),
        marketplace,
        contract: token?.contract ?? ctx.defaultContract,
        tokenId: token?.tokenId ?? null,
        orderId: orderId("collection_offer", diff.content?.key),
        price: str(value.price),
        buyer: str(value.buyer),
      }
      if (entrypoint === "collection_offer") {
        return { ...shared, kind: "collection_offer", seller: null, saleKind: null }
      }
      if (entrypoint === "collection_offer_cancel") {
        return { ...shared, kind: "collection_offer_cancel", seller: null, saleKind: null }
      }
      return { ...shared, kind: "collection_offer_accept", seller: sender, saleKind: "secondary" }
    }
    case "auction":
    case "auction_bid":
    case "auction_cancel":
    case "auction_fulfill": {
      // Never used on mainnet (zero operations as of Aug 2026); decoded for completeness.
      const diff = diffByPath(op, "auctions")
      const value = record(diff?.content?.value)
      const token = gentkIdentity(ctx, value?.gentk)
      if (!diff || !value || !token) return null
      const topBid = record(value.top_bid)
      const shared = {
        ...baseEvent(op, ctx),
        marketplace,
        ...token,
        orderId: orderId("auction", diff.content?.key),
        price: str(topBid?.price),
        seller: str(value.seller),
        buyer: str(topBid?.bidder),
      }
      if (entrypoint === "auction")
        return { ...shared, kind: "auction", buyer: null, saleKind: null }
      if (entrypoint === "auction_bid") return { ...shared, kind: "auction_bid", saleKind: null }
      if (entrypoint === "auction_cancel") {
        return { ...shared, kind: "auction_cancel", saleKind: null }
      }
      return { ...shared, kind: "auction_fulfill", saleKind: "secondary" }
    }
    default:
      return null
  }
}

/** Decode one marketplace-v1 operation; v1 "offers" are normalized to listings. */
export function decodeMarketplaceV1Operation(
  op: TzktOperation,
  ctx: DecodeContext,
): MarketEvent | null {
  const entrypoint = op.parameter?.entrypoint
  const diff = diffByPath(op, "offers")
  const value = record(diff?.content?.value)
  const tokenId = str(value?.objkt_id)
  const gentkV1 = TEZOS_NETWORKS[ctx.chain].gentkContracts[0]
  if (!diff || !value || tokenId === null || !gentkV1) return null
  const shared = {
    ...baseEvent(op, ctx),
    marketplace: "fxhash-tezos-v1" as const,
    contract: gentkV1,
    tokenId,
    orderId: `fxhash-tezos-v1:listing:${String(diff.content?.key)}`,
    price: str(value.price),
    seller: str(value.issuer),
  }
  switch (entrypoint) {
    case "offer":
      return { ...shared, kind: "listing", buyer: null, saleKind: null }
    case "cancel_offer":
      return { ...shared, kind: "listing_cancel", buyer: null, saleKind: null }
    case "collect":
      return {
        ...shared,
        kind: "listing_accept",
        buyer: op.sender?.address ?? null,
        saleKind: "secondary",
      }
    default:
      return null
  }
}

/** Decode one issuer mint operation into a primary-sale event. */
export function decodeMintOperation(op: TzktOperation, ctx: DecodeContext): MarketEvent {
  return {
    ...baseEvent(op, ctx),
    kind: "mint",
    marketplace: null,
    contract: ctx.defaultContract,
    tokenId: null,
    orderId: null,
    price: String(op.amount ?? 0),
    seller: null,
    buyer: op.sender?.address ?? null,
    saleKind: "primary",
  }
}

/** Parse a whitehash-style order id back into marketplace/family/key. */
function parseOrderId(
  orderId: string,
): { marketplace: string; family: string; key: string } | null {
  const [marketplace, family, key] = orderId.split(":")
  if (!marketplace || !family || key === undefined) return null
  return { marketplace, family, key }
}

interface OrderIdBuckets {
  v1Listings: Set<string>
  v2Listings: Set<string>
  v2Offers: Set<string>
  v2CollectionOffers: Set<string>
  v2Auctions: Set<string>
}

function bucketOrderIds(orderIds: Iterable<string>): OrderIdBuckets {
  const buckets: OrderIdBuckets = {
    v1Listings: new Set(),
    v2Listings: new Set(),
    v2Offers: new Set(),
    v2CollectionOffers: new Set(),
    v2Auctions: new Set(),
  }
  for (const orderId of orderIds) {
    const parsed = parseOrderId(orderId)
    if (!parsed) continue
    if (parsed.marketplace === "fxhash-tezos-v1") buckets.v1Listings.add(parsed.key)
    else if (parsed.family === "listing") buckets.v2Listings.add(parsed.key)
    else if (parsed.family === "offer") buckets.v2Offers.add(parsed.key)
    else if (parsed.family === "collection_offer") buckets.v2CollectionOffers.add(parsed.key)
    else if (parsed.family === "auction") buckets.v2Auctions.add(parsed.key)
  }
  return buckets
}

/**
 * Backfill a Tezos project's market history. Fetches order creations filtered
 * to the project's tokens, then the follow-up accepts/cancels for every
 * observed (and previously known) order id, then issuer mints.
 */
export async function backfillTezosMarketEvents(
  target: TezosBackfillTarget,
  options: TezosBackfillOptions = {},
): Promise<TezosBackfillResult> {
  const { chain, projectId } = target
  const config = options.config ?? defaultChainReaderConfig()
  const fetchImpl = options.fetchImpl ?? fetch
  const onProgress = options.onProgress
  const base = tzktBaseUrl(chain, config)
  const marketplaces = TEZOS_MARKETPLACES[chain]

  const head = await tzktFetch<{ level: number }>(`${base}/v1/head`, fetchImpl)
  const maxLevel = head.level - TEZOS_REORG_BUFFER
  const range =
    `level.le=${maxLevel}` +
    (options.sinceLevel !== undefined ? `&level.gt=${options.sinceLevel}` : "")
  if (options.sinceLevel !== undefined && options.sinceLevel >= maxLevel) {
    return { events: [], cursor: { level: options.sinceLevel } }
  }

  const [issuerVersion, issuerId] = target.projectId.split(":")
  if (!issuerVersion || !issuerId) {
    throw new Error(`Unsupported Tezos project id (expected "v<N>:<id>"): ${projectId}`)
  }
  const issuer = TEZOS_NETWORKS[chain].issuerContracts.find(i => i.version === issuerVersion)
  if (!issuer) throw new Error(`Unknown issuer version ${issuerVersion} on ${chain}`)

  const tokenSet = new Set(target.tokens.map(token => `${token.contract}/${token.tokenId}`))
  const tokensByVersion = new Map<string, string[]>()
  for (const token of target.tokens) {
    const version = gentkVersionForContract(chain, token.contract)
    if (version === null) continue
    const ids = tokensByVersion.get(version) ?? []
    ids.push(token.tokenId)
    tokensByVersion.set(version, ids)
  }
  const defaultContract =
    target.tokens[0]?.contract ?? TEZOS_NETWORKS[chain].gentkContracts[0] ?? ""
  const ctx: DecodeContext = { chain, defaultContract }

  const events: MarketEvent[] = []
  const orderIds = bucketOrderIds(options.knownOrderIds ?? [])
  const belongsToProject = (event: MarketEvent): boolean =>
    event.tokenId === null || tokenSet.has(`${event.contract}/${event.tokenId}`)

  const collectV2 = (ops: TzktOperation[]) => {
    for (const op of ops) {
      const event = decodeMarketplaceV2Operation(op, ctx)
      if (!event || !belongsToProject(event)) continue
      events.push(event)
      const parsed = event.orderId ? parseOrderId(event.orderId) : null
      if (parsed?.family === "listing") orderIds.v2Listings.add(parsed.key)
      else if (parsed?.family === "offer") orderIds.v2Offers.add(parsed.key)
      else if (parsed?.family === "collection_offer") orderIds.v2CollectionOffers.add(parsed.key)
      else if (parsed?.family === "auction") orderIds.v2Auctions.add(parsed.key)
    }
  }

  // Marketplace v2: order creations reference the token in their parameters.
  const creationBatches = [...tokensByVersion].flatMap(([version, ids]) =>
    chunk(ids, ID_BATCH).map(batch => ({ version, batch })),
  )
  for (const [index, { version, batch }] of creationBatches.entries()) {
    onProgress?.(`orders: batch ${index + 1}/${creationBatches.length} · ${events.length} event(s)`)
    const ops = await fetchOperations(
      base,
      `target=${marketplaces.v2}&entrypoint.in=listing,offer,auction&${range}` +
        `&parameter.gentk.version=${version}&${valueFilter("parameter.gentk.id", batch)}`,
      fetchImpl,
    )
    collectV2(ops)
  }
  onProgress?.(`orders: ${events.length} creation(s) found`)

  // Collection-wide offers reference the project id instead of a token.
  onProgress?.(`collection offers: querying · ${events.length} event(s)`)
  collectV2(
    await fetchOperations(
      base,
      `target=${marketplaces.v2}&entrypoint=collection_offer&${range}&parameter.collection=${issuerId}`,
      fetchImpl,
    ),
  )

  // Follow-ups only carry the order id; query by the ids collected above
  // (plus previously known ids, so incremental runs catch late closes).
  const followUps: { entrypoints: string; parameter: string; ids: Set<string> }[] = [
    {
      entrypoints: "listing_cancel,listing_accept",
      parameter: "parameter",
      ids: orderIds.v2Listings,
    },
    { entrypoints: "offer_cancel,offer_accept", parameter: "parameter", ids: orderIds.v2Offers },
    {
      entrypoints: "collection_offer_cancel",
      parameter: "parameter",
      ids: orderIds.v2CollectionOffers,
    },
    {
      entrypoints: "collection_offer_accept",
      parameter: "parameter.offer_id",
      ids: orderIds.v2CollectionOffers,
    },
    {
      entrypoints: "auction_bid,auction_cancel,auction_fulfill",
      parameter: "parameter",
      ids: orderIds.v2Auctions,
    },
  ]
  const followUpBatches = followUps.flatMap(followUp =>
    chunk([...followUp.ids], ID_BATCH).map(batch => ({ followUp, batch })),
  )
  for (const [index, { followUp, batch }] of followUpBatches.entries()) {
    onProgress?.(`closes: batch ${index + 1}/${followUpBatches.length} · ${events.length} event(s)`)
    const ops = await fetchOperations(
      base,
      `target=${marketplaces.v2}&entrypoint.in=${followUp.entrypoints}&${range}` +
        `&${valueFilter(followUp.parameter, batch)}`,
      fetchImpl,
    )
    collectV2(ops)
  }
  onProgress?.(`marketplace v2: ${events.length} event(s)`)

  // Marketplace v1 only ever traded first-generation gentks.
  const v1TokenIds = tokensByVersion.get("0") ?? []
  if (v1TokenIds.length > 0) {
    const collectV1 = (ops: TzktOperation[]) => {
      for (const op of ops) {
        const event = decodeMarketplaceV1Operation(op, ctx)
        if (!event || !belongsToProject(event)) continue
        events.push(event)
        const parsed = event.orderId ? parseOrderId(event.orderId) : null
        if (parsed) orderIds.v1Listings.add(parsed.key)
      }
    }
    for (const [index, batch] of chunk(v1TokenIds, ID_BATCH).entries()) {
      onProgress?.(`marketplace v1 orders: batch ${index + 1} · ${events.length} event(s)`)
      collectV1(
        await fetchOperations(
          base,
          `target=${marketplaces.v1}&entrypoint=offer&${range}&${valueFilter("parameter.objkt_id", batch)}`,
          fetchImpl,
        ),
      )
    }
    for (const [index, batch] of chunk([...orderIds.v1Listings], ID_BATCH).entries()) {
      onProgress?.(`marketplace v1 closes: batch ${index + 1} · ${events.length} event(s)`)
      collectV1(
        await fetchOperations(
          base,
          `target=${marketplaces.v1}&entrypoint.in=collect,cancel_offer&${range}` +
            `&${valueFilter("parameter", batch)}`,
          fetchImpl,
        ),
      )
    }
    onProgress?.(`marketplace v1: ${events.length} event(s)`)
  }

  // Primary sales: mints on the project's issuer contract. Issuer v1 takes the
  // bare project id as its parameter; later issuers wrap it in an object.
  // Ticket-based v3 mints carry no payment here (paid at ticket purchase).
  const mintQueries =
    issuerVersion === "v1"
      ? [`entrypoint=mint&parameter=${issuerId}`]
      : issuerVersion === "v3"
        ? [
            `entrypoint=mint&parameter.issuer_id=${issuerId}`,
            `entrypoint=mint_with_ticket&parameter.issuer_id=${issuerId}`,
          ]
        : [`entrypoint=mint&parameter.issuer_id=${issuerId}`]
  for (const mintQuery of mintQueries) {
    onProgress?.(`mints: querying issuer ${issuerVersion} · ${events.length} event(s)`)
    const ops = await fetchOperations(
      base,
      `target=${issuer.address}&${mintQuery}&${range}`,
      fetchImpl,
    )
    for (const op of ops) events.push(decodeMintOperation(op, ctx))
  }
  onProgress?.(`mints included: ${events.length} event(s) total`)

  return { events: mergeMarketEvents(events), cursor: { level: maxLevel } }
}
