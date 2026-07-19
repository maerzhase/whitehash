/**
 * User settings, persisted to localStorage. These drive the resolver and
 * chain-reader configs. Every network endpoint is user-overridable — nothing
 * fxhash-hosted, and archive-capable RPCs can be supplied for fast EVM lookups.
 */
import { DEFAULT_IPFS_GATEWAYS, type ResolverConfig } from "@whitehash/resolve"
import type { ChainId, ChainReaderConfig, NetworkMode } from "@whitehash/chain-reader"

export interface Settings {
  mode: NetworkMode
  ipfsGateways: string[]
  /** Optional proxy fallback. Empty uses the same-origin service worker. */
  onchfsProxy: string
  /** Per-network RPC overrides (comma-joined in the UI). Empty = library default. */
  rpcs: Partial<Record<ChainId, string[]>>
  /** Per-network TzKT base URL overrides. */
  tzkt: Partial<Record<"tezos:mainnet" | "tezos:ghostnet", string>>
}

const STORAGE_KEY = "whitehash.settings.v1"

export function defaultSettings(): Settings {
  return {
    mode: "mainnet",
    ipfsGateways: [...DEFAULT_IPFS_GATEWAYS],
    onchfsProxy: "",
    rpcs: {},
    tzkt: {},
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSettings()
    const parsed = JSON.parse(raw) as Partial<Settings>
    return { ...defaultSettings(), ...parsed }
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function resolverConfigFrom(settings: Settings): ResolverConfig {
  return {
    ipfsGateways: settings.ipfsGateways.length
      ? settings.ipfsGateways
      : [...DEFAULT_IPFS_GATEWAYS],
    onchfs: settings.onchfsProxy.trim()
      ? { mode: "proxy", baseUrl: settings.onchfsProxy.trim() }
      : { mode: "service-worker" },
  }
}

export function chainReaderConfigFrom(settings: Settings): ChainReaderConfig {
  return {
    resolver: resolverConfigFrom(settings),
    tzkt: settings.tzkt,
    evm: { rpcs: settings.rpcs },
  }
}
