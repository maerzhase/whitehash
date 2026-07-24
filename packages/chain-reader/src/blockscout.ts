/**
 * EVM reading via Blockscout — the EVM analog of TzKT: an open-source,
 * self-hostable, public-good indexer with public instances for every network
 * whitehash supports. Used as the default EVM ownership/discovery source
 * because keyless public RPCs cap eth_getLogs at ~10k blocks; the pure-RPC
 * scan in evm.ts remains available as the trustless fallback.
 *
 * Caveat handled here: Blockscout caches tokenURI metadata at first sight, so
 * a token minted as a "waiting to be signed" placeholder may still show stale
 * placeholder metadata after reveal. When cached metadata looks unassigned we
 * re-read tokenURI from chain and fetch the real JSON.
 */
import { getAddress } from "viem"
import { normalizeMetadata } from "./metadata.js"
import { EVM_NETWORKS } from "./networks.js"
import { fetchEvmMetadata, readTokenUris } from "./evm.js"
import type {
  ChainId,
  ChainReaderConfig,
  EvmSnapshot,
  EvmSnapshotCollection,
  ProgressCallback,
  WhitehashToken,
} from "./types.js"

type EvmChain = Extract<ChainId, `eip155:${string}`>

export const BLOCKSCOUT_DEFAULTS: Record<EvmChain, string> = {
  "eip155:1": "https://eth.blockscout.com",
  "eip155:11155111": "https://eth-sepolia.blockscout.com",
  "eip155:8453": "https://base.blockscout.com",
  "eip155:84532": "https://base-sepolia.blockscout.com",
}

const PROJECT_CREATED_TOPIC = "0x546bc3cd5ff4b322df8339c6833b99285a6333e5e5f90a88ced57d9de7c345fc"

const MAX_PAGES = 200 // safety backstop for pagination loops

export function blockscoutBaseUrl(chain: EvmChain, config: ChainReaderConfig): string {
  const override = config.evm?.blockscout?.[chain]
  return (override ?? BLOCKSCOUT_DEFAULTS[chain]).replace(/\/+$/, "")
}

async function bsFetch<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetchImpl(url)
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Blockscout HTTP ${res.status}`)
      } else if (!res.ok) {
        throw new Error(`Blockscout HTTP ${res.status} for ${url}`)
      } else {
        return (await res.json()) as T
      }
    } catch (err) {
      lastError = err
    }
    await new Promise(r => {
      setTimeout(r, 400 * 2 ** attempt)
    })
  }
  throw new Error(`Blockscout request failed after retries: ${url} (${String(lastError)})`)
}

function withPageParams(url: string, params: Record<string, unknown> | null): string {
  if (!params) return url
  const u = new URL(url)
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined) u.searchParams.set(k, String(v))
  }
  return u.toString()
}

interface BsPage<T> {
  items: T[]
  next_page_params: Record<string, unknown> | null
}

/** Iterate a paginated Blockscout v2 endpoint. */
async function* bsPages<T>(baseUrl: string, fetchImpl: typeof fetch): AsyncGenerator<T[]> {
  let params: Record<string, unknown> | null = null
  for (let page = 0; page < MAX_PAGES; page++) {
    const data: BsPage<T> = await bsFetch<BsPage<T>>(withPageParams(baseUrl, params), fetchImpl)
    yield data.items ?? []
    if (!data.next_page_params) return
    params = data.next_page_params
  }
}

interface BsLog {
  topics?: (string | null)[]
  block_number?: number
}

/**
 * Discover all FxGenArt721 collections from the factory's ProjectCreated logs
 * via Blockscout — full history, no block-range limits, a handful of requests.
 */
export async function discoverEvmCollectionsViaBlockscout(
  chain: EvmChain,
  config: ChainReaderConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<EvmSnapshot> {
  const network = EVM_NETWORKS[chain]
  const url = `${blockscoutBaseUrl(chain, config)}/api/v2/addresses/${network.issuerFactory}/logs`
  const collections: EvmSnapshotCollection[] = []
  let lastBlock = network.deployBlock

  for await (const items of bsPages<BsLog>(url, fetchImpl)) {
    for (const log of items) {
      const topics = log.topics ?? []
      if (topics[0] !== PROJECT_CREATED_TOPIC) continue
      const tokenTopic = topics[2]
      if (!tokenTopic) continue
      collections.push({
        address: getAddress(`0x${tokenTopic.slice(-40)}`),
        projectId: topics[1] ? String(BigInt(topics[1])) : "",
        createdAtBlock: log.block_number ?? 0,
      })
      if ((log.block_number ?? 0) > lastBlock) lastBlock = log.block_number!
    }
  }

  return { chainId: chain, lastScannedBlock: lastBlock, collections }
}

interface BsNftItem {
  id?: string
  metadata?: Record<string, unknown> | null
  token?: { address_hash?: string; address?: string; name?: string }
}

function bsItemContract(item: BsNftItem): string | null {
  const raw = item.token?.address_hash ?? item.token?.address
  if (!raw) return null
  try {
    return getAddress(raw)
  } catch {
    return null
  }
}

/** Cached Blockscout metadata may predate the reveal; detect that. */
function looksStale(meta: Record<string, unknown> | null | undefined): boolean {
  if (!meta) return true
  return !normalizeMetadata(meta).assigned
}

/**
 * Enumerate the fxhash tokens owned by an address using Blockscout, refreshing
 * stale placeholder metadata from chain.
 */
export async function getEvmWalletTokensViaBlockscout(
  address: string,
  chain: EvmChain,
  config: ChainReaderConfig,
  onProgress?: ProgressCallback,
  fetchImpl: typeof fetch = fetch,
): Promise<WhitehashToken[]> {
  const owner = getAddress(address)

  onProgress?.({ chain, phase: "discover", message: "Discovering collections (Blockscout)" })
  const snapshot = await discoverEvmCollectionsViaBlockscout(chain, config, fetchImpl)
  const collectionSet = new Set(snapshot.collections.map(c => c.address))

  onProgress?.({ chain, phase: "ownership", message: "Listing owned NFTs (Blockscout)" })
  const url = `${blockscoutBaseUrl(chain, config)}/api/v2/addresses/${owner}/nft?type=ERC-721`
  const owned: { contract: string; tokenId: string; metadata: Record<string, unknown> | null }[] =
    []
  for await (const items of bsPages<BsNftItem>(url, fetchImpl)) {
    for (const item of items) {
      const contract = bsItemContract(item)
      if (!contract || !collectionSet.has(contract)) continue
      if (item.id === undefined || item.id === null) continue
      owned.push({ contract, tokenId: String(item.id), metadata: item.metadata ?? null })
    }
    onProgress?.({
      chain,
      phase: "ownership",
      message: `${owned.length} fxhash token(s) so far`,
      found: owned.length,
    })
  }

  const tokens = await buildEvmTokensRefreshingStale(chain, config, owned, onProgress)
  onProgress?.({ chain, phase: "done", message: "Done", found: tokens.length })
  return tokens
}

/**
 * Build normalized tokens from Blockscout items, refreshing any whose cached
 * metadata is a mint-time placeholder by re-reading tokenURI from chain.
 * Shared by the wallet path and the project-browser path — Blockscout caches
 * metadata at first sight, so both need this to show revealed artworks.
 */
export async function buildEvmTokensRefreshingStale(
  chain: EvmChain,
  config: ChainReaderConfig,
  items: { contract: string; tokenId: string; metadata: Record<string, unknown> | null }[],
  onProgress?: ProgressCallback,
): Promise<WhitehashToken[]> {
  const staleIdx = items.map((o, i) => (looksStale(o.metadata) ? i : -1)).filter(i => i >= 0)

  const refreshedUris = new Map<number, string | null>()
  if (staleIdx.length > 0) {
    onProgress?.({
      chain,
      phase: "metadata",
      message: `Refreshing ${staleIdx.length} stale metadata from chain`,
    })
    const uris = await readTokenUris(
      chain,
      config,
      staleIdx.map(i => ({ contract: items[i]!.contract, tokenId: items[i]!.tokenId })),
    )
    staleIdx.forEach((idx, j) => {
      refreshedUris.set(idx, uris[j] ?? null)
    })
  }

  // Fetch refreshed metadata concurrently (one fetch per stale token).
  const freshMeta = new Map<number, Record<string, unknown> | null>()
  {
    const indices = [...refreshedUris.keys()]
    let next = 0
    const concurrency = config.concurrency ?? 8
    await Promise.all(
      Array.from({ length: Math.min(concurrency, indices.length) }, async () => {
        while (next < indices.length) {
          const i = indices[next++]!
          freshMeta.set(i, await fetchEvmMetadata(refreshedUris.get(i) ?? null, config))
        }
      }),
    )
  }

  return items.map((o, i) => {
    let rawMeta = o.metadata
    let metadataUri: string | null = null
    if (refreshedUris.has(i)) {
      metadataUri = refreshedUris.get(i) ?? null
      const fresh = freshMeta.get(i)
      if (fresh) rawMeta = fresh
    }
    const norm = normalizeMetadata(rawMeta ?? {})
    return {
      chain,
      contract: o.contract,
      tokenId: o.tokenId,
      name: norm.name,
      description: norm.description,
      iterationHash: norm.iterationHash,
      artifactUri: norm.artifactUri,
      displayUri: norm.displayUri,
      thumbnailUri: norm.thumbnailUri,
      generatorUri: norm.generatorUri,
      attributes: norm.attributes,
      assigned: norm.assigned,
      metadataUri,
      raw: rawMeta,
    }
  })
}
