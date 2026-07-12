/**
 * Load a wallet's tokens across the detected chains, cache-first with a live
 * refresh. Streams progress per chain so the UI can show what's happening
 * during slow EVM scans.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import {
  detectAddressChains,
  getTezosWalletTokens,
  getEvmWalletTokens,
  isEvmChain,
  isTezosChain,
  type ChainId,
  type ProgressEvent,
  type WhitehashToken,
} from "@whitehash/chain-reader"
import { chainReaderConfigFrom, type Settings } from "./settings.js"
import { readCache, writeCache } from "./cache.js"

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

async function loadChain(
  address: string,
  chain: ChainId,
  settings: Settings,
  onProgress: (e: ProgressEvent) => void,
): Promise<WhitehashToken[]> {
  const config = chainReaderConfigFrom(settings)
  if (isTezosChain(chain)) {
    return getTezosWalletTokens(address, chain, config, fetch, onProgress)
  }
  if (isEvmChain(chain)) {
    return getEvmWalletTokens(address, chain, config, onProgress)
  }
  return []
}

export function useWalletTokens(
  address: string | null,
  settings: Settings,
): {
  state: WalletState | null
  loading: boolean
  refresh: () => void
} {
  const [state, setState] = useState<WalletState | null>(null)
  const [loading, setLoading] = useState(false)
  const runId = useRef(0)

  const run = useCallback(
    async (addr: string, forceRefresh: boolean) => {
      const id = ++runId.current
      const chains = detectAddressChains(addr, settings.mode)
      if (chains.length === 0) {
        setState({ address: addr, chains: {}, tokens: [] })
        return
      }

      setLoading(true)
      const chainStates: Record<string, ChainState> = {}
      for (const c of chains) {
        chainStates[c] = { chain: c, status: "loading", message: "Starting…", tokens: [], fromCache: false }
      }
      setState({ address: addr, chains: { ...chainStates }, tokens: [] })

      const update = () => {
        if (runId.current !== id) return
        const all = Object.values(chainStates).flatMap(cs => cs.tokens)
        setState({ address: addr, chains: { ...chainStates }, tokens: all })
      }

      await Promise.all(
        chains.map(async chain => {
          // Cache-first.
          if (!forceRefresh) {
            const cached = await readCache(chain, addr)
            if (cached && runId.current === id) {
              chainStates[chain] = {
                chain,
                status: "cached",
                message: `${cached.tokens.length} cached`,
                tokens: cached.tokens,
                fromCache: true,
              }
              update()
            }
          }
          try {
            const tokens = await loadChain(addr, chain, settings, e => {
              if (runId.current !== id) return
              chainStates[chain] = {
                ...chainStates[chain]!,
                status: "loading",
                message: e.message,
              }
              update()
            })
            if (runId.current !== id) return
            chainStates[chain] = {
              chain,
              status: "done",
              message: `${tokens.length} found`,
              tokens,
              fromCache: false,
            }
            await writeCache(chain, addr, tokens)
          } catch (err) {
            if (runId.current !== id) return
            // Keep any cached tokens on error.
            chainStates[chain] = {
              ...chainStates[chain]!,
              status: "error",
              message: err instanceof Error ? err.message : String(err),
            }
          }
          update()
        }),
      )

      if (runId.current === id) setLoading(false)
    },
    [settings],
  )

  useEffect(() => {
    if (!address) {
      setState(null)
      return
    }
    void run(address, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, settings.mode])

  const refresh = useCallback(() => {
    if (address) void run(address, true)
  }, [address, run])

  return { state, loading, refresh }
}
