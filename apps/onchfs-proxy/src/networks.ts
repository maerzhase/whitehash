/**
 * Network configuration for the onchfs proxy. Maps URL path slugs (as produced
 * by @whitehash/resolve's chainSlug) to onchfs-js blockchain ids and RPC lists.
 * RPCs are overridable via environment variables (comma-separated).
 */

export interface ProxyNetwork {
  /** URL path slug, e.g. "eip155-8453". */
  slug: string
  /** onchfs-js blockchain network id. */
  onchfsNetwork: string
  /** Env var holding a comma-separated RPC override list. */
  rpcEnvVar: string
  defaultRpcs: string[]
}

export const PROXY_NETWORKS: ProxyNetwork[] = [
  {
    slug: "tezos-mainnet",
    onchfsNetwork: "tezos:NetXdQprcVkpaWU",
    rpcEnvVar: "ONCHFS_TEZOS_RPCS",
    defaultRpcs: [
      "https://mainnet.tezos.ecadinfra.com",
      "https://mainnet.tezos.marigold.dev",
      "https://rpc.tzbeta.net",
    ],
  },
  {
    slug: "tezos-ghostnet",
    onchfsNetwork: "tezos:NetXnHfVqm9iesp",
    rpcEnvVar: "ONCHFS_GHOSTNET_RPCS",
    defaultRpcs: ["https://ghostnet.tezos.ecadinfra.com", "https://ghostnet.tezos.marigold.dev"],
  },
  {
    slug: "eip155-1",
    onchfsNetwork: "eip155:1",
    rpcEnvVar: "ONCHFS_ETH_RPCS",
    defaultRpcs: ["https://eth.llamarpc.com", "https://ethereum-rpc.publicnode.com"],
  },
  {
    slug: "eip155-11155111",
    onchfsNetwork: "eip155:11155111",
    rpcEnvVar: "ONCHFS_SEPOLIA_RPCS",
    defaultRpcs: ["https://ethereum-sepolia-rpc.publicnode.com"],
  },
  {
    slug: "eip155-8453",
    onchfsNetwork: "eip155:8453",
    rpcEnvVar: "ONCHFS_BASE_RPCS",
    defaultRpcs: ["https://mainnet.base.org", "https://base-rpc.publicnode.com"],
  },
  {
    slug: "eip155-84532",
    onchfsNetwork: "eip155:84532",
    rpcEnvVar: "ONCHFS_BASE_SEPOLIA_RPCS",
    defaultRpcs: ["https://sepolia.base.org"],
  },
]

/** Default network used when a request has no recognized network prefix. */
export const DEFAULT_NETWORK_SLUG = "tezos-mainnet"

export function rpcsFor(
  network: ProxyNetwork,
  env: Record<string, string | undefined>,
): string[] {
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
