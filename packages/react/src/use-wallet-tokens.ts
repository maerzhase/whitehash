import { useCallback, useEffect, useRef, useState } from "react"
import {
  detectAddressChains,
  type ChainId,
  type NetworkMode,
  type ProgressEvent,
  type WhitehashClient,
  type WhitehashToken,
} from "@whitehash/chain-reader"
import type { WhitehashCache } from "./cache.js"
import { useWhitehash } from "./context.js"

export interface ChainState {
  chain: ChainId
  status: "idle" | "loading" | "cached" | "done" | "error"
  message: string
  tokens: WhitehashToken[]
  fromCache: boolean
}

export interface WalletState {
  address: string
  chains: Record<string, ChainState>
  tokens: WhitehashToken[]
}

export interface UseWalletTokensOptions {
  mode?: NetworkMode
  chains?: ChainId[]
  client?: WhitehashClient
  cache?: WhitehashCache
}

export interface LoadWalletChainOptions {
  address: string
  chain: ChainId
  forceRefresh: boolean
  client: WhitehashClient
  cache: WhitehashCache
  onCached?: (tokens: WhitehashToken[]) => void
  onProgress?: (event: ProgressEvent) => void
}

/** Cache-first single-chain read shared by the hook and headless unit tests. */
export async function loadWalletChain({
  address,
  chain,
  forceRefresh,
  client,
  cache,
  onCached,
  onProgress,
}: LoadWalletChainOptions): Promise<WhitehashToken[]> {
  if (!forceRefresh) {
    try {
      const cached = await cache.getWalletTokens(chain, address)
      if (cached) onCached?.(cached.tokens)
    } catch {
      // Persistence is an optimization; a blocked IndexedDB must not prevent
      // the live chain read.
    }
  }

  const tokens = await client.getWalletTokens(address, { chains: [chain], onProgress })
  try {
    await cache.setWalletTokens(chain, address, tokens)
  } catch {
    // Keep the successful live result when persistence is unavailable.
  }
  return tokens
}

export function useWalletTokens(
  address: string | null,
  options: UseWalletTokensOptions = {},
): {
  state: WalletState | null
  loading: boolean
  refresh: () => void
} {
  const context = useWhitehash()
  const client = options.client ?? context.client
  const cache = options.cache ?? context.cache
  const mode = options.mode ?? context.mode
  const explicitChains = options.chains
  const [state, setState] = useState<WalletState | null>(null)
  const [loading, setLoading] = useState(false)
  const runId = useRef(0)

  const run = useCallback(
    async (walletAddress: string, forceRefresh: boolean) => {
      const id = ++runId.current
      const chains = explicitChains ?? detectAddressChains(walletAddress, mode)
      if (chains.length === 0) {
        setLoading(false)
        setState({ address: walletAddress, chains: {}, tokens: [] })
        return
      }

      setLoading(true)
      const chainStates: Record<string, ChainState> = {}
      for (const chain of chains) {
        chainStates[chain] = {
          chain,
          status: "loading",
          message: "Starting…",
          tokens: [],
          fromCache: false,
        }
      }
      setState({ address: walletAddress, chains: { ...chainStates }, tokens: [] })

      const update = () => {
        if (runId.current !== id) return
        setState({
          address: walletAddress,
          chains: { ...chainStates },
          tokens: Object.values(chainStates).flatMap(chainState => chainState.tokens),
        })
      }

      await Promise.all(
        chains.map(async chain => {
          try {
            const tokens = await loadWalletChain({
              address: walletAddress,
              chain,
              forceRefresh,
              client,
              cache,
              onCached: cachedTokens => {
                if (runId.current !== id) return
                chainStates[chain] = {
                  chain,
                  status: "cached",
                  message: `${cachedTokens.length} cached`,
                  tokens: cachedTokens,
                  fromCache: true,
                }
                update()
              },
              onProgress: (event: ProgressEvent) => {
                if (runId.current !== id) return
                chainStates[chain] = {
                  ...chainStates[chain]!,
                  status: "loading",
                  message: event.message,
                }
                update()
              },
            })
            if (runId.current !== id) return
            chainStates[chain] = {
              chain,
              status: "done",
              message: `${tokens.length} found`,
              tokens,
              fromCache: false,
            }
          } catch (error) {
            if (runId.current !== id) return
            chainStates[chain] = {
              ...chainStates[chain]!,
              status: "error",
              message: error instanceof Error ? error.message : String(error),
            }
          }
          update()
        }),
      )

      if (runId.current === id) setLoading(false)
    },
    [cache, client, explicitChains, mode],
  )

  useEffect(() => {
    if (!address) {
      ++runId.current
      setLoading(false)
      setState(null)
      return
    }
    void run(address, false)
  }, [address, run])

  const refresh = useCallback(() => {
    if (address) void run(address, true)
  }, [address, run])

  return { state, loading, refresh }
}
