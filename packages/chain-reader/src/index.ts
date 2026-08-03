/**
 * @whitehash/chain-reader — read fxhash generative tokens owned by a wallet
 * directly from chain (Tezos via TzKT, Ethereum/Base via JSON-RPC), with no
 * dependency on the fxhash indexer or any fxhash-hosted service.
 */
import { isEvmChain, isTezosChain } from "./networks.js"
import { isTezosAddress } from "./tezos.js"
import { MAINNET_CHAINS, TESTNET_CHAINS, type ChainId, type NetworkMode } from "./types.js"

export {
  MAINNET_CHAINS,
  TESTNET_CHAINS,
  type ChainId,
  type NetworkMode,
  type ProjectCaptureMode,
  type ProjectCaptureSettings,
  type ProjectCaptureTriggerMode,
  type WhitehashToken,
  type ChainReaderConfig,
  type ProgressEvent,
  type ProgressCallback,
} from "./types.js"
export {
  CHAINS,
  CHAIN_DEFINITIONS,
  chainDefinition,
  chainFromSlug,
  chainLabel,
  chainSlug,
  isChainId,
  resolveChainId,
  type ChainDefinition,
  type EvmChainId,
  type TezosChainId,
} from "@whitehash/core"
export { DEFAULT_NETWORK_MODE, defaultChainReaderConfig } from "./config.js"
export {
  TEZOS_NETWORKS,
  EVM_NETWORKS,
  type TezosNetworkConfig,
  type EvmNetworkConfig,
} from "./networks.js"
export { DEFAULT_IPFS_GATEWAYS, defaultResolverConfig } from "@whitehash/resolve"
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
  parseFxhashTokenUrl,
  parseRef,
  resolveInput,
  projectRef,
  tokenRef,
  shortAddress,
  projectLabel,
  type ProjectRef,
  type ProjectInput,
  type TokenRef,
  type TokenCoordinates,
  type TokenInput,
  type WhitehashRef,
  type ResolvedInput,
  type AddressInput,
  type ContentInput,
} from "./refs.js"
export { normalizeCaptureSettings, normalizeMetadata, isAssigned } from "./metadata.js"
export {
  discoverEvmProjectTokenRefsViaRpc,
  getEvmProjectTokensViaRpc,
  getLogsAdaptive,
  makeEvmPublicClient,
} from "./evm.js"
export { tzktFetch, tzktBaseUrl } from "./tezos.js"
export { blockscoutBaseUrl, bsFetch } from "./blockscout.js"
export {
  CURATED_PROJECT_EXAMPLES,
  curatedProjectExample,
  type CuratedProjectExample,
  type ExampleCaptureMode,
  type ExampleGeneratorStorage,
  type ExampleMetadataStorage,
  type ExampleProjectKind,
} from "./examples.js"
export {
  type WhitehashProject,
  type ProjectPage,
  type ListOrder,
} from "./browse.js"
export {
  PROJECT_INDEX_FORMAT,
  buildProjectIndex,
  indexedProjectMetadata,
  isIndexedProjectMetadata,
  parseProjectIndex,
  type IndexedIteration,
  type IndexedProject,
  type ProjectIndex,
  type ProjectIndexReader,
  type BuildProjectIndexOptions,
} from "./project-index.js"
export {
  TOKEN_INDEX_FORMAT,
  buildTokenIndex,
  parseTokenIndex,
  type TokenIndex,
  type TokenIndexReader,
} from "./token-index.js"

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
