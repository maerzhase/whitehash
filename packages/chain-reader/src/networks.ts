/**
 * Network configuration: contract addresses, endpoints, and deploy blocks.
 *
 * Addresses are copied from the fxhash monorepo config (MIT) and verified
 * against the production indexer configuration (July 2026). See PLAN.md §3.2/§3.3.
 */
import type { ChainId } from "./types.js"

export interface TezosNetworkConfig {
  chainId: Extract<ChainId, `tezos:${string}`>
  /** onchfs blockchain identifier for onchfs-js. */
  onchfsNetwork: string
  defaultTzktBaseUrl: string
  /** gentk FA2 NFT contracts (v1, v2, v3) that hold user-owned artworks. */
  gentkContracts: string[]
}

export interface EvmNetworkConfig {
  chainId: Extract<ChainId, `eip155:${string}`>
  numericChainId: number
  /** onchfs blockchain identifier for onchfs-js (e.g. "eip155:8453"). */
  onchfsNetwork: string
  defaultRpcs: string[]
  /** FxIssuerFactory — emits ProjectCreated(uint96,address,address). */
  issuerFactory: `0x${string}`
  multicall3: `0x${string}`
  /** Block the factory was deployed at (discovery start). */
  deployBlock: number
}

export const TEZOS_NETWORKS: Record<
  Extract<ChainId, `tezos:${string}`>,
  TezosNetworkConfig
> = {
  "tezos:mainnet": {
    chainId: "tezos:mainnet",
    onchfsNetwork: "tezos:NetXdQprcVkpaWU",
    defaultTzktBaseUrl: "https://api.tzkt.io",
    gentkContracts: [
      "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE", // gentk_v1
      "KT1U6EHmNxJTkvaWJ4ThczG4FSDaHC21ssvi", // gentk_v2
      "KT1EfsNuqwLAWDd3o4pvfUx1CAh5GMdTrRvr", // gentk_v3
    ],
  },
  "tezos:ghostnet": {
    chainId: "tezos:ghostnet",
    onchfsNetwork: "tezos:NetXnHfVqm9iesp",
    defaultTzktBaseUrl: "https://api.ghostnet.tzkt.io",
    gentkContracts: [
      "KT1ExHjELnDuat9io3HkDcrBhHmek7h8EVXG", // gentk_v1
      "KT1NkZho1yRkDdQnN4Mz93sDYyY2pPrEHTNs", // gentk_v2
      "KT1TtVAyjh4Ahdm8sLZwFnL7tqoLf59XrK2h", // gentk_v3
    ],
  },
}

const MULTICALL3: `0x${string}` = "0xcA11bde05977b3631167028862bE2a173976CA11"

export const EVM_NETWORKS: Record<
  Extract<ChainId, `eip155:${string}`>,
  EvmNetworkConfig
> = {
  "eip155:1": {
    chainId: "eip155:1",
    numericChainId: 1,
    onchfsNetwork: "eip155:1",
    defaultRpcs: ["https://eth.llamarpc.com", "https://ethereum-rpc.publicnode.com"],
    issuerFactory: "0x442295de8A31d65026dBc09c29d469F6854f188a",
    multicall3: MULTICALL3,
    deployBlock: 18762350,
  },
  "eip155:11155111": {
    chainId: "eip155:11155111",
    numericChainId: 11155111,
    onchfsNetwork: "eip155:11155111",
    defaultRpcs: [
      "https://ethereum-sepolia-rpc.publicnode.com",
      "https://rpc.sepolia.org",
    ],
    issuerFactory: "0x4e9ef916F55B5d4a27E6406C7Ce8bcd29c2693d6",
    multicall3: MULTICALL3,
    deployBlock: 5013011,
  },
  "eip155:8453": {
    chainId: "eip155:8453",
    numericChainId: 8453,
    onchfsNetwork: "eip155:8453",
    defaultRpcs: ["https://mainnet.base.org", "https://base-rpc.publicnode.com"],
    issuerFactory: "0xf05636d65c7a10dF989eC2411D4F3230d3A02f3D",
    multicall3: MULTICALL3,
    deployBlock: 10786140,
  },
  "eip155:84532": {
    chainId: "eip155:84532",
    numericChainId: 84532,
    onchfsNetwork: "eip155:84532",
    defaultRpcs: [
      "https://sepolia.base.org",
      "https://base-sepolia-rpc.publicnode.com",
    ],
    issuerFactory: "0x60cFDE3aaf6E938535767794088cf15EaaC50019",
    multicall3: MULTICALL3,
    deployBlock: 8763620,
  },
}

export function isTezosChain(chain: ChainId): chain is Extract<ChainId, `tezos:${string}`> {
  return chain.startsWith("tezos:")
}

export function isEvmChain(chain: ChainId): chain is Extract<ChainId, `eip155:${string}`> {
  return chain.startsWith("eip155:")
}
