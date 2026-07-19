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

export {
  MAINNET_CHAINS,
  TESTNET_CHAINS,
  type ChainId,
  type NetworkMode,
  type WhitehashToken,
  type ChainReaderConfig,
  type ProgressEvent,
  type ProgressCallback,
} from "./types.js"
export {
  renderArtifactUri,
  artworkUrl,
  imageSourceUri,
  imageUrl,
  liveViewStatus,
  canRenderLive,
  tokenKey,
  type LiveViewStatus,
} from "./semantics.js"
export {
  createWhitehashClient,
  type WhitehashClient,
  type GetWalletTokensOptions,
  type ListProjectsOptions,
  type ListProjectTokensOptions,
} from "./client.js"
export {
  formatRef,
  parseRef,
  resolveInput,
  tokenRef,
  shortAddress,
  projectLabel,
  type ProjectRef,
  type TokenRef,
  type WhitehashRef,
  type ResolvedInput,
  type AddressInput,
  type ContentInput,
} from "./refs.js"
export { normalizeMetadata, isAssigned } from "./metadata.js"
export {
  type WhitehashProject,
  type ProjectPage,
  type ListOrder,
} from "./browse.js"

function looksLikeEvmAddress(address: string): boolean {
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
