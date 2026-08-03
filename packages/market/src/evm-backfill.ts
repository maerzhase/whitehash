/**
 * Per-collection EVM secondary-sale backfill.
 *
 * fxhash EVM listings are off-chain signed Seaport orders, so the active
 * order book cannot be reconstructed from public data — only fills can.
 * Instead of scanning all Seaport traffic, this walks the collection's own
 * ERC-721 transfers and decodes Seaport `OrderFulfilled` events found in the
 * same transactions, reconstructing the price from the order's native and
 * ERC-20 payment items. Fills are matched by event signature rather than a
 * marketplace address, so every Seaport version (1.5, 1.6, …) is covered.
 *
 * Discovery defaults to the Blockscout REST API (a handful of paged calls)
 * and falls back to a trustless JSON-RPC `Transfer`-log scan. Scans start at
 * the fxhash factory deploy block, so the scope is fxhash collections;
 * mints (primary sales) are not indexed in this version.
 */
import {
  EVM_NETWORKS,
  blockscoutBaseUrl,
  bsFetch,
  defaultChainReaderConfig,
  getLogsAdaptive,
  makeEvmPublicClient,
  type ChainReaderConfig,
} from "@whitehash/chain-reader"
import type { EvmChainId } from "@whitehash/core"
import { decodeEventLog, parseAbiItem, type Log } from "viem"
import { EVM_FINALITY_BUFFER } from "./contracts.js"
import { mergeMarketEvents, type MarketEvent } from "./events.js"
import type { MarketIndexCursor } from "./market-index.js"

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
)

const ORDER_FULFILLED_ABI = [
  parseAbiItem(
    "event OrderFulfilled(bytes32 orderHash, address indexed offerer, address indexed zone, address recipient, (uint8 itemType, address token, uint256 identifier, uint256 amount)[] offer, (uint8 itemType, address token, uint256 identifier, uint256 amount, address recipient)[] consideration)",
  ),
] as const

/** keccak256 of OrderFulfilled(bytes32,address,address,address,(...)[],(...)[]). */
export const ORDER_FULFILLED_TOPIC =
  "0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const DEFAULT_LOG_CHUNK = 9_000n
const DEFAULT_CONCURRENCY = 8
/** Public Blockscout instances rate-limit well below the RPC concurrency. */
const BLOCKSCOUT_CONCURRENCY = 3
const MAX_BLOCKSCOUT_PAGES = 2_000

interface SeaportItem {
  itemType: number
  token: `0x${string}`
  identifier: bigint
  amount: bigint
}

/** Native or ERC-20 payment legs of an order. */
function paymentTotal(items: readonly SeaportItem[]): bigint {
  let total = 0n
  for (const item of items) {
    if (item.itemType === 0 || item.itemType === 1) total += item.amount
  }
  return total
}

export interface DecodedSeaportSale {
  orderHash: string
  tokenId: string
  price: bigint
}

/**
 * Decode one Seaport log into a sale of `collection`, or null when the log is
 * not an `OrderFulfilled` involving that collection. Listings carry the NFT
 * in `offer` (price = consideration payments); accepted offers carry it in
 * `consideration` (price = offered payments).
 */
export function decodeSeaportSale(
  log: Pick<Log, "data" | "topics">,
  collection: string,
): DecodedSeaportSale | null {
  let decoded: {
    orderHash: string
    offer: readonly SeaportItem[]
    consideration: readonly SeaportItem[]
  }
  try {
    const event = decodeEventLog({
      abi: ORDER_FULFILLED_ABI,
      data: log.data,
      topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
    })
    decoded = event.args as unknown as typeof decoded
  } catch {
    return null
  }
  const wanted = collection.toLowerCase()
  // Bundle orders carrying several tokens of the collection are attributed to
  // the first token with the full payment total; the siblings stay unmatched.
  const isCollectionNft = (item: SeaportItem) =>
    (item.itemType === 2 || item.itemType === 3) && item.token.toLowerCase() === wanted

  const offered = decoded.offer.find(isCollectionNft)
  if (offered) {
    return {
      orderHash: decoded.orderHash,
      tokenId: offered.identifier.toString(),
      price: paymentTotal(decoded.consideration),
    }
  }
  const received = decoded.consideration.find(isCollectionNft)
  if (received) {
    return {
      orderHash: decoded.orderHash,
      tokenId: received.identifier.toString(),
      price: paymentTotal(decoded.offer),
    }
  }
  return null
}

async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next++
      if (index >= items.length) return
      results[index] = await worker(items[index] as T)
    }
  })
  await Promise.all(runners)
  return results
}

export interface EvmBackfillTarget {
  chain: EvmChainId
  contract: `0x${string}`
}

export interface EvmBackfillOptions {
  config?: ChainReaderConfig
  fetchImpl?: typeof fetch
  /** Resume point: only blocks after this are scanned. */
  sinceBlock?: number
  /** Discovery source; "blockscout" (default) falls back to "rpc" on failure. */
  source?: "blockscout" | "rpc"
  onProgress?: (message: string) => void
}

export interface EvmBackfillResult {
  events: MarketEvent[]
  cursor: MarketIndexCursor
}

/** A collection transfer that may correspond to a Seaport fill. */
interface SaleCandidate {
  txHash: `0x${string}`
  block: number
  timestamp: string
  tokenId: string
  from: string
  to: string
}

interface SeaportLikeLog {
  data: `0x${string}`
  topics: [`0x${string}`, ...`0x${string}`[]]
  index: number
}

export function toSaleEvents(
  candidates: SaleCandidate[],
  logsByTx: Map<`0x${string}`, SeaportLikeLog[]>,
  target: EvmBackfillTarget,
): MarketEvent[] {
  const byTxAndToken = new Map<string, SaleCandidate>()
  for (const candidate of candidates) {
    byTxAndToken.set(`${candidate.txHash}/${candidate.tokenId}`, candidate)
  }
  const events: MarketEvent[] = []
  // Seaport matchOrders emits one OrderFulfilled per component order, so a
  // listing matched against a bid produces two logs for the same token in the
  // same transaction; count each (tx, token) sale once.
  const counted = new Set<string>()
  for (const [txHash, logs] of logsByTx) {
    for (const log of logs) {
      if (log.topics[0]?.toLowerCase() !== ORDER_FULFILLED_TOPIC) continue
      const sale = decodeSeaportSale(log, target.contract)
      if (!sale) continue
      // Seaport also settles NFT-for-NFT barters, which carry no payment items
      // at all. Those are swaps, not sales: counting them would inflate the
      // sale count and drag the lowest-sale figure to zero.
      if (sale.price === 0n) continue
      const saleKey = `${txHash}/${sale.tokenId}`
      const transfer = byTxAndToken.get(saleKey)
      if (!transfer || counted.has(saleKey)) continue
      counted.add(saleKey)
      events.push({
        kind: "sale",
        chain: target.chain,
        marketplace: "seaport",
        contract: target.contract,
        tokenId: sale.tokenId,
        orderId: sale.orderHash,
        price: sale.price.toString(),
        seller: transfer.from,
        buyer: transfer.to,
        saleKind: "secondary",
        timestamp: transfer.timestamp,
        level: transfer.block,
        opHash: txHash,
        sourceId: `${transfer.block}-${log.index}`,
      })
    }
  }
  return events
}

interface BlockscoutTransfer {
  block_number?: number
  log_index?: number
  timestamp?: string
  transaction_hash?: string
  from?: { hash?: string }
  to?: { hash?: string }
  total?: { token_id?: string }
}

async function collectViaBlockscout(
  target: EvmBackfillTarget,
  config: ChainReaderConfig,
  fetchImpl: typeof fetch,
  fromBlock: number,
  toBlock: number,
  onProgress?: (message: string) => void,
): Promise<MarketEvent[]> {
  const base = blockscoutBaseUrl(target.chain, config)
  const candidates: SaleCandidate[] = []
  let pageParams = ""
  // Transfers are returned newest-first; stop once a page falls below fromBlock.
  for (let page = 0; page < MAX_BLOCKSCOUT_PAGES; page++) {
    const body = await bsFetch<{ items?: BlockscoutTransfer[]; next_page_params?: unknown }>(
      `${base}/api/v2/tokens/${target.contract}/transfers${pageParams}`,
      fetchImpl,
    )
    const items = body.items ?? []
    let reachedCursor = false
    for (const item of items) {
      const block = item.block_number
      const txHash = item.transaction_hash as `0x${string}` | undefined
      const tokenId = item.total?.token_id
      const from = item.from?.hash
      if (block === undefined || !txHash || tokenId === undefined || !from || !item.timestamp) {
        continue
      }
      if (block < fromBlock) {
        reachedCursor = true
        continue
      }
      if (block > toBlock || from.toLowerCase() === ZERO_ADDRESS) continue
      candidates.push({
        txHash,
        block,
        timestamp: new Date(item.timestamp).toISOString(),
        tokenId,
        from,
        to: item.to?.hash ?? ZERO_ADDRESS,
      })
    }
    if (reachedCursor || !body.next_page_params) break
    if (page === MAX_BLOCKSCOUT_PAGES - 1) {
      // Fail loud instead of silently truncating history; the caller falls
      // back to the (uncapped) RPC scan.
      throw new Error(
        `Blockscout transfer pagination exceeded ${MAX_BLOCKSCOUT_PAGES} pages for ${target.contract}`,
      )
    }
    pageParams = `?${new URLSearchParams(
      Object.entries(body.next_page_params as Record<string, string | number>).map(
        ([key, value]) => [key, String(value)],
      ),
    )}`
    onProgress?.(`transfers: page ${page + 1} · ${candidates.length} candidate(s)`)
  }
  onProgress?.(`transfers: ${candidates.length} non-mint transfer(s) via Blockscout`)

  const txHashes = [...new Set(candidates.map(candidate => candidate.txHash))]
  let fetched = 0
  const logsByTx = new Map<`0x${string}`, SeaportLikeLog[]>()
  await mapConcurrent(txHashes, BLOCKSCOUT_CONCURRENCY, async txHash => {
    const body = await bsFetch<{
      items?: { data?: string; topics?: (string | null)[]; index?: number }[]
    }>(`${base}/api/v2/transactions/${txHash}/logs`, fetchImpl)
    fetched += 1
    if (fetched % 25 === 0 || fetched === txHashes.length) {
      onProgress?.(`sale logs: ${fetched}/${txHashes.length} transaction(s)`)
    }
    logsByTx.set(
      txHash,
      (body.items ?? []).flatMap(log =>
        log.data && log.topics?.[0] && log.index !== undefined
          ? [
              {
                data: log.data as `0x${string}`,
                topics: log.topics.filter(
                  (topic): topic is `0x${string}` => topic !== null,
                ) as SeaportLikeLog["topics"],
                index: log.index,
              },
            ]
          : [],
      ),
    )
  })
  return toSaleEvents(candidates, logsByTx, target)
}

async function collectViaRpc(
  target: EvmBackfillTarget,
  config: ChainReaderConfig,
  fromBlock: bigint,
  toBlock: bigint,
  onProgress?: (message: string) => void,
): Promise<MarketEvent[]> {
  const client = makeEvmPublicClient(target.chain, config)
  const chunkSize = config.evm?.logChunkSize ? BigInt(config.evm.logChunkSize) : DEFAULT_LOG_CHUNK
  let scanned = 0
  const transfers = await getLogsAdaptive(
    async (from, to) => {
      const logs = await client.getLogs({
        address: target.contract,
        event: TRANSFER_EVENT,
        fromBlock: from,
        toBlock: to,
      })
      scanned += 1
      if (scanned % 10 === 0) {
        const done = Number(to - fromBlock)
        const span = Number(toBlock - fromBlock) || 1
        onProgress?.(
          `transfer logs: block ${to} of ${toBlock} (${Math.floor((done / span) * 100)}%)`,
        )
      }
      return logs
    },
    fromBlock,
    toBlock,
    chunkSize,
  )
  onProgress?.(`transfer logs: ${transfers.length} found via RPC`)

  const saleTransfers = transfers.filter(
    transfer =>
      transfer.transactionHash &&
      transfer.blockNumber !== null &&
      transfer.args.tokenId !== undefined &&
      (transfer.args.from ?? ZERO_ADDRESS).toLowerCase() !== ZERO_ADDRESS,
  )
  const timestampByBlock = new Map<bigint, string>()
  await mapConcurrent(
    [...new Set(saleTransfers.map(transfer => transfer.blockNumber as bigint))],
    config.concurrency ?? DEFAULT_CONCURRENCY,
    async block => {
      const { timestamp } = await client.getBlock({ blockNumber: block })
      timestampByBlock.set(block, new Date(Number(timestamp) * 1000).toISOString())
    },
  )
  const candidates: SaleCandidate[] = saleTransfers.map(transfer => ({
    txHash: transfer.transactionHash as `0x${string}`,
    block: Number(transfer.blockNumber),
    timestamp: timestampByBlock.get(transfer.blockNumber as bigint) ?? new Date(0).toISOString(),
    tokenId: (transfer.args.tokenId as bigint).toString(),
    from: transfer.args.from ?? ZERO_ADDRESS,
    to: transfer.args.to ?? ZERO_ADDRESS,
  }))

  const logsByTx = new Map<`0x${string}`, SeaportLikeLog[]>()
  await mapConcurrent(
    [...new Set(candidates.map(candidate => candidate.txHash))],
    config.concurrency ?? DEFAULT_CONCURRENCY,
    async txHash => {
      const receipt = await client.getTransactionReceipt({ hash: txHash })
      logsByTx.set(
        txHash,
        receipt.logs.flatMap(log =>
          log.topics[0] && log.logIndex !== null
            ? [
                {
                  data: log.data,
                  topics: log.topics as SeaportLikeLog["topics"],
                  index: log.logIndex,
                },
              ]
            : [],
        ),
      )
    },
  )
  return toSaleEvents(candidates, logsByTx, target)
}

/** Public RPCs commonly refuse deep historical `eth_getLogs` queries. */
function archiveRpcHint(chain: EvmChainId, error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error)
  return new Error(
    `Historical log scan was rejected by the configured ${chain} RPC. Public RPCs often ` +
      `restrict archive queries; set config.evm.rpcs["${chain}"] to an archive-capable ` +
      `endpoint, or retry the Blockscout source later. Original error: ${detail}`,
  )
}

export async function backfillEvmMarketEvents(
  target: EvmBackfillTarget,
  options: EvmBackfillOptions = {},
): Promise<EvmBackfillResult> {
  const config = options.config ?? defaultChainReaderConfig()
  const fetchImpl = options.fetchImpl ?? fetch
  const onProgress = options.onProgress
  const network = EVM_NETWORKS[target.chain]

  const client = makeEvmPublicClient(target.chain, config)
  const head = await client.getBlockNumber()
  const toBlock = Number(head) - EVM_FINALITY_BUFFER
  const fromBlock = options.sinceBlock !== undefined ? options.sinceBlock + 1 : network.deployBlock
  if (fromBlock > toBlock) {
    return { events: [], cursor: { height: options.sinceBlock ?? network.deployBlock } }
  }

  const scanViaRpc = async () => {
    try {
      return await collectViaRpc(target, config, BigInt(fromBlock), BigInt(toBlock), onProgress)
    } catch (error) {
      throw archiveRpcHint(target.chain, error)
    }
  }

  let events: MarketEvent[]
  if (options.source === "rpc") {
    events = await scanViaRpc()
  } else {
    try {
      events = await collectViaBlockscout(target, config, fetchImpl, fromBlock, toBlock, onProgress)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      if (options.source === "blockscout") throw error
      onProgress?.(`Blockscout unavailable (${detail}); falling back to an RPC log scan`)
      events = await scanViaRpc()
    }
  }
  onProgress?.(`decoded ${events.length} Seaport sale(s)`)

  return { events: mergeMarketEvents(events), cursor: { height: toBlock } }
}
