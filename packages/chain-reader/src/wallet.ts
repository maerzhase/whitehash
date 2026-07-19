import { getEvmWalletTokens } from "./evm.js"
import { isEvmChain, isTezosChain } from "./networks.js"
import { getTezosWalletTokens } from "./tezos.js"
import type {
  ChainId,
  ChainReaderConfig,
  ProgressCallback,
  WhitehashToken,
} from "./types.js"

/** Enumerate one chain and surface errors to the caller. */
export async function getChainWalletTokens(
  address: string,
  chain: ChainId,
  config: ChainReaderConfig,
  onProgress?: ProgressCallback,
): Promise<WhitehashToken[]> {
  if (isTezosChain(chain)) {
    return getTezosWalletTokens(address, chain, config, fetch, onProgress)
  }
  if (isEvmChain(chain)) {
    return getEvmWalletTokens(address, chain, config, onProgress)
  }
  return []
}

/**
 * Enumerate tokens across several chains. A failure on one chain is reported
 * through progress without discarding successful results from other chains.
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
        return await getChainWalletTokens(address, chain, config, onProgress)
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
