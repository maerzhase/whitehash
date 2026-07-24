/** Chains supported throughout the whitehash toolkit. */
export const CHAINS = [
  "tezos:mainnet",
  "tezos:ghostnet",
  "eip155:1",
  "eip155:11155111",
  "eip155:8453",
  "eip155:84532",
] as const

export type ChainId = (typeof CHAINS)[number]
export type TezosChainId = Extract<ChainId, `tezos:${string}`>
export type EvmChainId = Extract<ChainId, `eip155:${string}`>
export type NetworkMode = "mainnet" | "testnet"
export type ChainFamily = "tezos" | "evm"

export interface ChainDefinition {
  id: ChainId
  slug: string
  label: string
  family: ChainFamily
  mode: NetworkMode
  aliases: readonly string[]
  /** onchfs-js blockchain identifier. */
  onchfsNetwork: string
  /** Ordered public RPC endpoints used for onchfs and EVM reads. */
  defaultRpcs: readonly string[]
}

export const CHAIN_DEFINITIONS = [
  {
    id: "tezos:mainnet",
    slug: "tezos-mainnet",
    label: "Tezos",
    family: "tezos",
    mode: "mainnet",
    aliases: ["tezos"],
    onchfsNetwork: "tezos:NetXdQprcVkpaWU",
    defaultRpcs: [
      "https://mainnet.tezos.ecadinfra.com",
      "https://mainnet.tezos.marigold.dev",
      "https://rpc.tzbeta.net",
    ],
  },
  {
    id: "tezos:ghostnet",
    slug: "tezos-ghostnet",
    label: "Ghostnet",
    family: "tezos",
    mode: "testnet",
    aliases: ["ghostnet"],
    onchfsNetwork: "tezos:NetXnHfVqm9iesp",
    defaultRpcs: [
      "https://ghostnet.tezos.ecadinfra.com",
      "https://ghostnet.tezos.marigold.dev",
    ],
  },
  {
    id: "eip155:1",
    slug: "eip155-1",
    label: "Ethereum",
    family: "evm",
    mode: "mainnet",
    aliases: ["ethereum", "eth"],
    onchfsNetwork: "eip155:1",
    defaultRpcs: [
      "https://eth.llamarpc.com",
      "https://ethereum-rpc.publicnode.com",
    ],
  },
  {
    id: "eip155:11155111",
    slug: "eip155-11155111",
    label: "Sepolia",
    family: "evm",
    mode: "testnet",
    aliases: ["sepolia"],
    onchfsNetwork: "eip155:11155111",
    defaultRpcs: [
      "https://ethereum-sepolia-rpc.publicnode.com",
      "https://rpc.sepolia.org",
    ],
  },
  {
    id: "eip155:8453",
    slug: "eip155-8453",
    label: "Base",
    family: "evm",
    mode: "mainnet",
    aliases: ["base"],
    onchfsNetwork: "eip155:8453",
    defaultRpcs: [
      "https://mainnet.base.org",
      "https://base-rpc.publicnode.com",
    ],
  },
  {
    id: "eip155:84532",
    slug: "eip155-84532",
    label: "Base Sepolia",
    family: "evm",
    mode: "testnet",
    aliases: ["base-sepolia"],
    onchfsNetwork: "eip155:84532",
    defaultRpcs: [
      "https://sepolia.base.org",
      "https://base-sepolia-rpc.publicnode.com",
    ],
  },
] as const satisfies readonly ChainDefinition[]

export const MAINNET_CHAINS: ChainId[] = CHAIN_DEFINITIONS
  .filter(chain => chain.mode === "mainnet")
  .map(chain => chain.id)

export const TESTNET_CHAINS: ChainId[] = CHAIN_DEFINITIONS
  .filter(chain => chain.mode === "testnet")
  .map(chain => chain.id)

const CHAIN_IDS = new Set<string>(CHAINS)
const CHAIN_BY_ID = new Map<ChainId, ChainDefinition>(
  CHAIN_DEFINITIONS.map(chain => [chain.id, chain]),
)
const CHAIN_BY_SLUG = new Map<string, ChainDefinition>(
  CHAIN_DEFINITIONS.map(chain => [chain.slug, chain]),
)
const CHAIN_BY_ALIAS = new Map<string, ChainDefinition>(
  CHAIN_DEFINITIONS.flatMap(chain => chain.aliases.map(alias => [alias, chain] as const)),
)

export function isChainId(value: string): value is ChainId {
  return CHAIN_IDS.has(value)
}

export function isTezosChain(chain: ChainId): chain is TezosChainId {
  return chain.startsWith("tezos:")
}

export function isEvmChain(chain: ChainId): chain is EvmChainId {
  return chain.startsWith("eip155:")
}

export function chainDefinition(chain: ChainId): ChainDefinition {
  return CHAIN_BY_ID.get(chain)!
}

export function chainFromSlug(slug: string): ChainDefinition | undefined {
  return CHAIN_BY_SLUG.get(slug)
}

/** Resolve either a canonical chain ID or a documented CLI-friendly alias. */
export function resolveChainId(value: string): ChainId | undefined {
  if (isChainId(value)) return value
  return CHAIN_BY_ALIAS.get(value.toLowerCase())?.id
}

export function chainSlug(chain: ChainId): string {
  return chainDefinition(chain).slug
}

export function chainLabel(chain: ChainId): string {
  return chainDefinition(chain).label
}
