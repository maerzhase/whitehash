/**
 * @whitehash/chain-reader — read fxhash generative tokens owned by a wallet
 * directly from chain (Tezos via TzKT, Ethereum/Base via JSON-RPC), with no
 * dependency on the fxhash indexer or any fxhash-hosted service.
 */
import { isEvmChain, isTezosChain } from "./networks.js"
import { isTezosAddress } from "./tezos.js"
import { type ChainId, MAINNET_CHAINS, type NetworkMode, TESTNET_CHAINS } from "./types.js"

export {
  CHAIN_DEFINITIONS,
  CHAINS,
  type ChainDefinition,
  chainDefinition,
  chainFromSlug,
  chainLabel,
  chainSlug,
  type EvmChainId,
  isChainId,
  resolveChainId,
  type TezosChainId,
} from "@whitehash/core"
export { DEFAULT_IPFS_GATEWAYS, defaultResolverConfig } from "@whitehash/resolve"
export {
  type ListOrder,
  type ProjectPage,
  type WhitehashProject,
} from "./browse.js"
export {
  createWhitehashClient,
  type GetWalletTokensOptions,
  type ListProjectsOptions,
  type ListProjectTokensOptions,
  type WhitehashClient,
} from "./client.js"
export { DEFAULT_NETWORK_MODE, defaultChainReaderConfig } from "./config.js"
export {
  discoverEvmProjectTokenRefsViaRpc,
  getEvmProjectTokensViaRpc,
} from "./evm.js"
export {
  CURATED_PROJECT_EXAMPLES,
  type CuratedProjectExample,
  curatedProjectExample,
  type ExampleCaptureMode,
  type ExampleGeneratorStorage,
  type ExampleMetadataStorage,
  type ExampleProjectKind,
} from "./examples.js"
export { isAssigned, normalizeCaptureSettings, normalizeMetadata } from "./metadata.js"
export {
  EVM_NETWORKS,
  type EvmNetworkConfig,
  TEZOS_NETWORKS,
  type TezosNetworkConfig,
} from "./networks.js"
export {
  type BuildProjectIndexOptions,
  buildProjectIndex,
  type IndexedIteration,
  type IndexedProject,
  PROJECT_INDEX_FORMAT,
  type ProjectIndex,
  type ProjectIndexReader,
  parseProjectIndex,
} from "./project-index.js"
export {
  type AddressInput,
  type ContentInput,
  formatRef,
  type ProjectInput,
  type ProjectRef,
  parseRef,
  projectLabel,
  projectRef,
  type ResolvedInput,
  resolveInput,
  shortAddress,
  type TokenInput,
  type TokenRef,
  tokenRef,
  type WhitehashRef,
} from "./refs.js"
export {
  artworkUrl,
  canRenderLive,
  imageSourceUri,
  imageUrl,
  type LiveViewStatus,
  liveViewStatus,
  renderArtifactUri,
  tokenKey,
} from "./semantics.js"
export {
  buildTokenIndex,
  parseTokenIndex,
  TOKEN_INDEX_FORMAT,
  type TokenIndex,
  type TokenIndexReader,
} from "./token-index.js"
export {
  type ChainId,
  type ChainReaderConfig,
  MAINNET_CHAINS,
  type NetworkMode,
  type ProgressCallback,
  type ProgressEvent,
  type ProjectCaptureMode,
  type ProjectCaptureSettings,
  type ProjectCaptureTriggerMode,
  TESTNET_CHAINS,
  type WhitehashToken,
} from "./types.js"

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
