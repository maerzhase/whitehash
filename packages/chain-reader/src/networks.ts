/**
 * Network configuration: contract addresses, endpoints, and deploy blocks.
 *
 * Addresses are copied from the fxhash monorepo config (MIT) and verified
 * against the production indexer configuration (July 2026).
 */
import { type ChainId, chainDefinition, isEvmChain, isTezosChain } from "@whitehash/core"

export interface TezosNetworkConfig {
  chainId: Extract<ChainId, `tezos:${string}`>
  /** onchfs blockchain identifier for onchfs-js. */
  onchfsNetwork: string
  defaultTzktBaseUrl: string
  /** gentk FA2 NFT contracts (v1, v2, v3) that hold user-owned artworks. */
  gentkContracts: string[]
  /**
   * fxhash issuer contracts (project registries), oldest → newest. Each
   * project is an entry in the contract's `ledger` big map with an IPFS
   * metadata pointer.
   */
  issuerContracts: { version: string; address: string }[]
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

export const TEZOS_NETWORKS: Record<Extract<ChainId, `tezos:${string}`>, TezosNetworkConfig> = {
  "tezos:mainnet": {
    chainId: "tezos:mainnet",
    onchfsNetwork: chainDefinition("tezos:mainnet").onchfsNetwork,
    defaultTzktBaseUrl: "https://api.tzkt.io",
    gentkContracts: [
      "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE", // gentk_v1
      "KT1U6EHmNxJTkvaWJ4ThczG4FSDaHC21ssvi", // gentk_v2
      "KT1EfsNuqwLAWDd3o4pvfUx1CAh5GMdTrRvr", // gentk_v3
    ],
    issuerContracts: [
      { version: "v0", address: "KT1AEVuykWeuuFX7QkEAMNtffzwhe1Z98hJS" },
      { version: "v1", address: "KT1XCoGnfupWk7Sp8536EfrxcP73LmT68Nyr" },
      { version: "v2", address: "KT1BJC12dG17CVvPKJ1VYaNnaT5mzfnUTwXv" },
      { version: "v3", address: "KT1Xpmp15KfqoePNW9HczFmqaGNHwadV2a3b" },
    ],
  },
  "tezos:ghostnet": {
    chainId: "tezos:ghostnet",
    onchfsNetwork: chainDefinition("tezos:ghostnet").onchfsNetwork,
    defaultTzktBaseUrl: "https://api.ghostnet.tzkt.io",
    gentkContracts: [
      "KT1ExHjELnDuat9io3HkDcrBhHmek7h8EVXG", // gentk_v1
      "KT1NkZho1yRkDdQnN4Mz93sDYyY2pPrEHTNs", // gentk_v2
      "KT1TtVAyjh4Ahdm8sLZwFnL7tqoLf59XrK2h", // gentk_v3
    ],
    issuerContracts: [
      { version: "v0", address: "KT1PyfrDD85RxUWz8dMHoC92MxdPzecSQ5t9" },
      { version: "v1", address: "KT1QwWVZogqPZZtGSVxGpLkEWar7LFvAsMdd" },
      { version: "v2", address: "KT1Sy7X6TubmZ39G8CHVrUcxjc3jiF68P8oB" },
      { version: "v3", address: "KT1DfymMp3qD5Pd5ujPjp7UsQbppY9yY1Hbf" },
    ],
  },
}

const MULTICALL3: `0x${string}` = "0xcA11bde05977b3631167028862bE2a173976CA11"

export const EVM_NETWORKS: Record<Extract<ChainId, `eip155:${string}`>, EvmNetworkConfig> = {
  "eip155:1": {
    chainId: "eip155:1",
    numericChainId: 1,
    onchfsNetwork: chainDefinition("eip155:1").onchfsNetwork,
    defaultRpcs: [...chainDefinition("eip155:1").defaultRpcs],
    issuerFactory: "0x442295de8A31d65026dBc09c29d469F6854f188a",
    multicall3: MULTICALL3,
    deployBlock: 18762350,
  },
  "eip155:11155111": {
    chainId: "eip155:11155111",
    numericChainId: 11155111,
    onchfsNetwork: chainDefinition("eip155:11155111").onchfsNetwork,
    defaultRpcs: [...chainDefinition("eip155:11155111").defaultRpcs],
    issuerFactory: "0x4e9ef916F55B5d4a27E6406C7Ce8bcd29c2693d6",
    multicall3: MULTICALL3,
    deployBlock: 5013011,
  },
  "eip155:8453": {
    chainId: "eip155:8453",
    numericChainId: 8453,
    onchfsNetwork: chainDefinition("eip155:8453").onchfsNetwork,
    defaultRpcs: [...chainDefinition("eip155:8453").defaultRpcs],
    issuerFactory: "0xf05636d65c7a10dF989eC2411D4F3230d3A02f3D",
    multicall3: MULTICALL3,
    deployBlock: 10786140,
  },
  "eip155:84532": {
    chainId: "eip155:84532",
    numericChainId: 84532,
    onchfsNetwork: chainDefinition("eip155:84532").onchfsNetwork,
    defaultRpcs: [...chainDefinition("eip155:84532").defaultRpcs],
    issuerFactory: "0x60cFDE3aaf6E938535767794088cf15EaaC50019",
    multicall3: MULTICALL3,
    deployBlock: 8763620,
  },
}

export { isEvmChain, isTezosChain }
