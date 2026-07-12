import type { ResolverConfig } from "@whitehash/resolve"

/** Network identifiers. `tezos:*` use TzKT; `eip155:*` use JSON-RPC. */
export type ChainId =
  | "tezos:mainnet"
  | "tezos:ghostnet"
  | "eip155:1" // Ethereum mainnet
  | "eip155:11155111" // Sepolia
  | "eip155:8453" // Base mainnet
  | "eip155:84532" // Base Sepolia

export type NetworkMode = "mainnet" | "testnet"

export const MAINNET_CHAINS: ChainId[] = ["tezos:mainnet", "eip155:1", "eip155:8453"]
export const TESTNET_CHAINS: ChainId[] = [
  "tezos:ghostnet",
  "eip155:11155111",
  "eip155:84532",
]

/** A normalized token, uniform across chains. */
export interface WhitehashToken {
  chain: ChainId
  contract: string
  tokenId: string
  name: string | null
  description: string | null
  /** The token's fxhash seed (present once revealed/signed). */
  iterationHash: string | null
  /**
   * Protocol-native render URL, verbatim from metadata: `ipfs://` or
   * `onchfs://`, already carrying `?fxhash=...#0x...` render state. Prefer this
   * over any `animation_url` (which fxhash rewrote to point at its own proxy).
   */
  artifactUri: string | null
  /** High-quality preview image URI (protocol-native). */
  displayUri: string | null
  /** Thumbnail image URI (protocol-native). */
  thumbnailUri: string | null
  /** Generator code URI, without render params. */
  generatorUri: string | null
  /** Normalized attributes/features, both chains' shapes folded into name/value. */
  attributes: { name: string; value: string }[]
  /**
   * `false` = placeholder/unrevealed ("waiting to be signed"). Such tokens have
   * no real artwork yet; the viewer shows a badge and no live view.
   */
  assigned: boolean
  /** The metadata URI (`ipfs://`/`onchfs://`) the token points at, if known. */
  metadataUri: string | null
  /** Untouched source metadata JSON. */
  raw: unknown
}

export interface EvmSnapshotCollection {
  address: string
  projectId: string
  createdAtBlock: number
}

export interface EvmSnapshot {
  chainId: ChainId
  /** Highest block scanned when this snapshot was generated. */
  lastScannedBlock: number
  collections: EvmSnapshotCollection[]
}

export interface ChainReaderConfig {
  resolver: ResolverConfig
  /** Override TzKT base URLs per Tezos network. */
  tzkt?: Partial<Record<"tezos:mainnet" | "tezos:ghostnet", string>>
  evm?: {
    /** Override RPC endpoints per EVM network. */
    rpcs?: Partial<Record<ChainId, string[]>>
    /** Max block span per getLogs call before adaptive halving. */
    logChunkSize?: number
    /**
     * Committed collection snapshot to seed EVM discovery. Pass `null` to force
     * a full trustless scan from the network's deploy block. When omitted, the
     * bundled snapshot for the network is used.
     */
    snapshot?: EvmSnapshot | null
    /**
     * Cap the highest block scanned (discovery + ownership) instead of using
     * the live chain head. Primarily for tests and bounded scans; tokens
     * transferred after this block are not seen.
     */
    maxBlock?: number
  }
  /** Metadata-fetch parallelism. Default 8. */
  concurrency?: number
}

export interface ProgressEvent {
  chain: ChainId
  phase: "discover" | "ownership" | "metadata" | "done"
  message: string
  /** Tokens found so far on this chain, when known. */
  found?: number
}

export type ProgressCallback = (event: ProgressEvent) => void
