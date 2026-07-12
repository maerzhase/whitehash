/**
 * Read fxhash gentk tokens owned by an EVM address (Ethereum, Base) directly
 * via JSON-RPC — no indexer.
 *
 * FxGenArt721 collections are deployed on the fly by FxIssuerFactory, so the
 * set of NFT contracts is discovered from `ProjectCreated` events (mirroring
 * fxhash's own indexer). FxGenArt721 does NOT implement ERC721Enumerable
 * (verified: supportsInterface(0x780e9d63) == false on the deployed Base impl),
 * so ownership is derived from `Transfer` logs and confirmed with `ownerOf`.
 * See PLAN.md §3.7.
 */
import {
  createPublicClient,
  fallback,
  getAddress,
  http,
  isAddress,
  type Address,
  type PublicClient,
} from "viem"
import { genArtAbi, issuerFactoryAbi } from "./abis.js"
import { EVM_NETWORKS } from "./networks.js"
import { normalizeMetadata } from "./metadata.js"
import type {
  ChainId,
  ChainReaderConfig,
  EvmSnapshot,
  EvmSnapshotCollection,
  ProgressCallback,
  WhitehashToken,
} from "./types.js"

type EvmChain = Extract<ChainId, `eip155:${string}`>

// Keyless public RPCs commonly cap eth_getLogs at a 10,000-block range, so we
// default just under that. `getLogsAdaptive` halves further if an RPC is
// stricter. (Verified July 2026: base.org / drpc reject >10k.)
const DEFAULT_LOG_CHUNK = 9_000
const MULTICALL_BATCH = 500

export function isEvmAddress(address: string): boolean {
  return isAddress(address)
}

function makeClient(chain: EvmChain, config: ChainReaderConfig): PublicClient {
  const rpcs = config.evm?.rpcs?.[chain] ?? EVM_NETWORKS[chain].defaultRpcs
  return createPublicClient({
    transport: fallback(rpcs.map(url => http(url))),
  })
}

/**
 * getLogs across a block range with adaptive chunking: try the widest chunk,
 * halve on RPC error (range-limit / result-size). Owner-filtered result sets
 * are tiny, so wide chunks are usually accepted.
 */
async function getLogsAdaptive<T>(
  fetchRange: (from: bigint, to: bigint) => Promise<T[]>,
  fromBlock: bigint,
  toBlock: bigint,
  initialChunk: bigint,
): Promise<T[]> {
  const out: T[] = []
  let from = fromBlock
  let chunk = initialChunk
  while (from <= toBlock) {
    const to = from + chunk - 1n > toBlock ? toBlock : from + chunk - 1n
    try {
      const logs = await fetchRange(from, to)
      out.push(...logs)
      from = to + 1n
      // gently grow back toward the initial chunk after a shrink
      if (chunk < initialChunk) chunk = chunk * 2n > initialChunk ? initialChunk : chunk * 2n
    } catch (err) {
      if (chunk <= 1n) throw err
      chunk = chunk / 2n
    }
  }
  return out
}

/**
 * Discover all FxGenArt721 collections created between `fromBlock` and the
 * chain head. Used by the snapshot script; also called incrementally at read
 * time to extend a stale snapshot.
 */
export async function discoverEvmCollections(
  chain: EvmChain,
  config: ChainReaderConfig,
  fromBlock?: number,
  client?: PublicClient,
): Promise<EvmSnapshot> {
  const network = EVM_NETWORKS[chain]
  const c = client ?? makeClient(chain, config)
  const maxBlock = config.evm?.maxBlock
  const head = maxBlock !== undefined ? BigInt(maxBlock) : await c.getBlockNumber()
  const start = BigInt(fromBlock ?? network.deployBlock)
  const chunk = BigInt(config.evm?.logChunkSize ?? DEFAULT_LOG_CHUNK)

  const logs = await getLogsAdaptive(
    (from, to) =>
      c.getLogs({
        address: network.issuerFactory,
        event: issuerFactoryAbi[0],
        fromBlock: from,
        toBlock: to,
      }),
    start,
    head,
    chunk,
  )

  const collections: EvmSnapshotCollection[] = []
  for (const log of logs) {
    const token = log.args._genArtToken
    const projectId = log.args._projectId
    if (!token) continue
    collections.push({
      address: getAddress(token),
      projectId: projectId?.toString() ?? "",
      createdAtBlock: Number(log.blockNumber ?? 0n),
    })
  }

  return { chainId: chain, lastScannedBlock: Number(head), collections }
}

async function loadSnapshot(
  chain: EvmChain,
  config: ChainReaderConfig,
): Promise<EvmSnapshot | null> {
  // Explicit snapshot (or explicit null = force full scan) wins.
  if (config.evm && "snapshot" in config.evm) return config.evm.snapshot ?? null
  // Otherwise try the bundled snapshot for the network.
  try {
    const mod = (await import(`../snapshots/${chain.replace(":", "-")}.json`, {
      with: { type: "json" },
    })) as { default: EvmSnapshot }
    return mod.default
  } catch {
    return null
  }
}

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function getEvmWalletTokens(
  address: string,
  chain: EvmChain,
  config: ChainReaderConfig,
  onProgress?: ProgressCallback,
): Promise<WhitehashToken[]> {
  if (!isEvmAddress(address)) throw new Error(`Not an EVM address: ${address}`)
  const owner = getAddress(address)
  const network = EVM_NETWORKS[chain]
  const client = makeClient(chain, config)

  // 1. Collection set: snapshot + incremental discovery for newer collections.
  onProgress?.({ chain, phase: "discover", message: "Loading collection set" })
  const snapshot = await loadSnapshot(chain, config)
  const collections = new Map<string, EvmSnapshotCollection>()
  if (snapshot) {
    for (const col of snapshot.collections) collections.set(getAddress(col.address), col)
  }
  const scanFrom = snapshot ? snapshot.lastScannedBlock + 1 : network.deployBlock
  const incremental = await discoverEvmCollections(chain, config, scanFrom, client)
  for (const col of incremental.collections) {
    collections.set(getAddress(col.address), col)
  }
  const addresses = [...collections.keys()] as Address[]
  if (addresses.length === 0) {
    onProgress?.({ chain, phase: "done", message: "No collections", found: 0 })
    return []
  }

  // 2. Ownership: Transfer logs where this address is the recipient, across all
  //    collections at once, from each collection's creation block.
  onProgress?.({
    chain,
    phase: "ownership",
    message: `Scanning ${addresses.length} collections for transfers`,
  })
  const chunk = BigInt(config.evm?.logChunkSize ?? DEFAULT_LOG_CHUNK)
  const head =
    config.evm?.maxBlock !== undefined
      ? BigInt(config.evm.maxBlock)
      : await client.getBlockNumber()
  const minCreated = Math.min(
    ...[...collections.values()].map(c => c.createdAtBlock || network.deployBlock),
  )
  // viem allows an address array; chunk the address list to stay under RPC caps.
  const receivedKeys = new Set<string>()
  for (const addrBatch of chunked(addresses, 1000)) {
    const logs = await getLogsAdaptive(
      (from, to) =>
        client.getLogs({
          address: addrBatch,
          event: genArtAbi[0],
          args: { to: owner },
          fromBlock: from,
          toBlock: to,
        }),
      BigInt(minCreated),
      head,
      chunk,
    )
    for (const log of logs) {
      const c = getAddress(log.address)
      const id = log.args.tokenId
      if (id === undefined) continue
      receivedKeys.add(`${c}:${id.toString()}`)
    }
  }

  // 3. Confirm current ownership with ownerOf (catches tokens later sent away
  //    and re-received tokens alike).
  const candidates = [...receivedKeys].map(k => {
    const [contract, tokenId] = k.split(":") as [string, string]
    return { contract: contract as Address, tokenId }
  })
  const owned: { contract: Address; tokenId: string }[] = []
  for (const batch of chunked(candidates, MULTICALL_BATCH)) {
    const results = await client.multicall({
      allowFailure: true,
      multicallAddress: network.multicall3,
      contracts: batch.map(c => ({
        address: c.contract,
        abi: genArtAbi,
        functionName: "ownerOf" as const,
        args: [BigInt(c.tokenId)],
      })),
    })
    results.forEach((r, i) => {
      if (r.status === "success" && getAddress(r.result as string) === owner) {
        owned.push(batch[i]!)
      }
    })
  }

  onProgress?.({
    chain,
    phase: "metadata",
    message: `Owns ${owned.length} token(s); fetching metadata`,
    found: owned.length,
  })

  // 4. tokenURI for owned tokens, then fetch + normalize metadata.
  const tokens: WhitehashToken[] = []
  for (const batch of chunked(owned, MULTICALL_BATCH)) {
    const uriResults = await client.multicall({
      allowFailure: true,
      multicallAddress: network.multicall3,
      contracts: batch.map(c => ({
        address: c.contract,
        abi: genArtAbi,
        functionName: "tokenURI" as const,
        args: [BigInt(c.tokenId)],
      })),
    })
    await Promise.all(
      batch.map(async (c, i) => {
        const uriRes = uriResults[i]
        const metadataUri =
          uriRes && uriRes.status === "success" ? (uriRes.result as string) : null
        const rawMeta = await fetchEvmMetadata(metadataUri, config)
        const norm = normalizeMetadata(rawMeta ?? {})
        tokens.push({
          chain,
          contract: c.contract,
          tokenId: c.tokenId,
          name: norm.name,
          description: norm.description,
          iterationHash: norm.iterationHash,
          artifactUri: norm.artifactUri,
          displayUri: norm.displayUri,
          thumbnailUri: norm.thumbnailUri,
          generatorUri: norm.generatorUri,
          attributes: norm.attributes,
          assigned: norm.assigned && metadataUri !== null,
          metadataUri,
          raw: rawMeta,
        })
      }),
    )
  }

  onProgress?.({ chain, phase: "done", message: "Done", found: tokens.length })
  return tokens
}

async function fetchEvmMetadata(
  metadataUri: string | null,
  config: ChainReaderConfig,
): Promise<Record<string, unknown> | null> {
  if (!metadataUri) return null
  try {
    // data:application/json;base64,... — decode inline
    if (metadataUri.startsWith("data:")) {
      const comma = metadataUri.indexOf(",")
      const meta = metadataUri.slice(0, comma)
      const payload = metadataUri.slice(comma + 1)
      const json = meta.includes("base64")
        ? new TextDecoder().decode(
            Uint8Array.from(atob(payload), ch => ch.charCodeAt(0)),
          )
        : decodeURIComponent(payload)
      return JSON.parse(json) as Record<string, unknown>
    }
    const { fetchWithGatewayFallback } = await import("@whitehash/resolve")
    const res = await fetchWithGatewayFallback(metadataUri, config.resolver)
    return (await res.json()) as Record<string, unknown>
  } catch {
    return null
  }
}
