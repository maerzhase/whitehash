/**
 * @whitehash/chain-reader — read fxhash generative tokens owned by a wallet
 * directly from chain (Tezos via TzKT, Ethereum/Base via JSON-RPC), with no
 * dependency on the fxhash indexer or any fxhash-hosted service.
 */
import { isEvmChain, isTezosChain } from "./networks.js"
import { isTezosAddress } from "./tezos.js"
import {
  MAINNET_CHAINS,
  TESTNET_CHAINS,
  type ChainId,
  type NetworkMode,
} from "./types.js"

export * from "./types.js"
export * from "./semantics.js"
export { createWhitehashClient, type WhitehashClient } from "./client.js"
export { getWalletTokens, getChainWalletTokens } from "./wallet.js"
export { EVM_NETWORKS, TEZOS_NETWORKS, isEvmChain, isTezosChain } from "./networks.js"
export { normalizeMetadata, isAssigned } from "./metadata.js"
export { isTezosAddress, getTezosWalletTokens } from "./tezos.js"
export {
  isEvmAddress,
  discoverEvmCollections,
  getEvmWalletTokens,
  getEvmWalletTokensViaRpc,
} from "./evm.js"
export {
  BLOCKSCOUT_DEFAULTS,
  discoverEvmCollectionsViaBlockscout,
  getEvmWalletTokensViaBlockscout,
} from "./blockscout.js"
export {
  listProjects,
  listTezosProjects,
  listEvmProjects,
  getTezosProject,
  getEvmProjectInfo,
  getEvmProjectPreview,
  listTezosProjectTokens,
  listEvmProjectTokens,
  type WhitehashProject,
  type ProjectPage,
  type ListOrder,
} from "./browse.js"

/** viem-checksum-independent 0x-address shape check. */
export function looksLikeEvmAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

/**
 * Which networks an address should be queried on, for a given mode. Because an
 * address is valid on mainnet and testnet alike, the caller picks the mode
 * rather than scanning all six networks.
 */
export function detectAddressChains(address: string, mode: NetworkMode): ChainId[] {
  const chains = mode === "mainnet" ? MAINNET_CHAINS : TESTNET_CHAINS
  if (isTezosAddress(address)) return chains.filter(isTezosChain)
  if (looksLikeEvmAddress(address)) return chains.filter(isEvmChain)
  return []
}
