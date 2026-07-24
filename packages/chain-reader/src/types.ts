import type { ResolverConfig } from "@whitehash/resolve"
import type {
  CaptureMode,
  CaptureSettings,
  CaptureTriggerMode,
  ChainId,
  NetworkMode,
  WhitehashToken,
} from "@whitehash/core"

export {
  MAINNET_CHAINS,
  TESTNET_CHAINS,
  type ChainId,
  type NetworkMode,
  type WhitehashToken,
} from "@whitehash/core"

/** Backwards-compatible chain-reader names for shared capture contracts. */
export type ProjectCaptureMode = CaptureMode
export type ProjectCaptureTriggerMode = CaptureTriggerMode
export type ProjectCaptureSettings = CaptureSettings

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
    /**
     * How to enumerate EVM ownership. "blockscout" (default) uses the
     * open-source Blockscout indexer's public instances — fast, full history —
     * and falls back to "rpc" if unreachable. "rpc" forces the trustless
     * Transfer-log scan over JSON-RPC.
     */
    ownershipSource?: "blockscout" | "rpc"
    /** Override Blockscout instance base URLs per EVM network. */
    blockscout?: Partial<Record<ChainId, string>>
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
