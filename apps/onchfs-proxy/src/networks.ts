/**
 * Network configuration for the onchfs proxy. Maps URL path slugs (as produced
 * by @whitehash/resolve's chainSlug) to onchfs-js blockchain ids and RPC lists.
 * RPCs are overridable via environment variables (comma-separated).
 */
import { CHAIN_DEFINITIONS, chainDefinition, type ChainId } from "@whitehash/core"

export interface ProxyNetwork {
  /** URL path slug, e.g. "eip155-8453". */
  slug: string
  /** onchfs-js blockchain network id. */
  onchfsNetwork: string
  /** Env var holding a comma-separated RPC override list. */
  rpcEnvVar: string
  defaultRpcs: string[]
}

const RPC_ENV_VARS: Record<ChainId, string> = {
  "tezos:mainnet": "ONCHFS_TEZOS_RPCS",
  "tezos:ghostnet": "ONCHFS_GHOSTNET_RPCS",
  "eip155:1": "ONCHFS_ETH_RPCS",
  "eip155:11155111": "ONCHFS_SEPOLIA_RPCS",
  "eip155:8453": "ONCHFS_BASE_RPCS",
  "eip155:84532": "ONCHFS_BASE_SEPOLIA_RPCS",
}

export const PROXY_NETWORKS: ProxyNetwork[] = CHAIN_DEFINITIONS.map(network => ({
  slug: network.slug,
  onchfsNetwork: network.onchfsNetwork,
  rpcEnvVar: RPC_ENV_VARS[network.id]!,
  defaultRpcs: [...network.defaultRpcs],
}))

/** Default network used when a request has no recognized network prefix. */
export const DEFAULT_NETWORK_SLUG = chainDefinition("tezos:mainnet").slug

export function rpcsFor(network: ProxyNetwork, env: Record<string, string | undefined>): string[] {
  const override = env[network.rpcEnvVar]
  if (override) {
    const list = override
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
    if (list.length) return list
  }
  return network.defaultRpcs
}
