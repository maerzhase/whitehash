/**
 * @whitehash/chain-reader — read fxhash generative tokens owned by a wallet
 * directly from chain (Tezos via TzKT, Ethereum/Base via JSON-RPC), with no
 * dependency on the fxhash indexer or any fxhash-hosted service.
 */
import { getEvmWalletTokens } from "./evm.js"
import { isEvmChain, isTezosChain } from "./networks.js"
import { getTezosWalletTokens, isTezosAddress } from "./tezos.js"
import {
  MAINNET_CHAINS,
  TESTNET_CHAINS,
  type ChainId,
  type ChainReaderConfig,
  type NetworkMode,
  type ProgressCallback,
  type WhitehashToken,
} from "./types.js"

export * from "./types.js"
export { EVM_NETWORKS, TEZOS_NETWORKS, isEvmChain, isTezosChain } from "./networks.js"
export { normalizeMetadata, isAssigned } from "./metadata.js"
export { isTezosAddress, getTezosWalletTokens } from "./tezos.js"
export { isEvmAddress, discoverEvmCollections, getEvmWalletTokens } from "./evm.js"

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

/**
 * Enumerate the fxhash tokens owned by `address` across the given `chains`.
 * Errors on a single chain are surfaced via `onProgress` and do not abort the
 * others; the returned array aggregates whatever succeeded.
 */
export async function getWalletTokens(
  address: string,
  chains: ChainId[],
  config: ChainReaderConfig,
  onProgress?: ProgressCallback,
): Promise<WhitehashToken[]> {
  const results = await Promise.all(
    chains.map(async chain => {
      try {
        if (isTezosChain(chain)) {
          return await getTezosWalletTokens(address, chain, config, fetch, onProgress)
        }
        if (isEvmChain(chain)) {
          return await getEvmWalletTokens(address, chain, config, onProgress)
        }
        return []
      } catch (err) {
        onProgress?.({
          chain,
          phase: "done",
          message: `Failed: ${String(err instanceof Error ? err.message : err)}`,
        })
        return []
      }
    }),
  )
  return results.flat()
}
