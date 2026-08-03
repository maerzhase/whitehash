import { parseMarketIndex, type MarketIndex } from "@whitehash/market"
import { useCallback, useEffect, useRef, useState } from "react"

export interface UseMarketIndexOptions {
  /** Replaces the global fetch, for tests or a custom transport. */
  fetchImpl?: typeof fetch
}

/**
 * Fetch and validate one artifact. Extracted from the hook so it can be tested
 * without a DOM, matching `loadWalletChain` in use-wallet-tokens.
 */
export async function loadMarketIndex(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MarketIndex> {
  const response = await fetchImpl(url)
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return parseMarketIndex(await response.json())
}

export interface UseMarketIndexResult {
  index: MarketIndex | null
  loading: boolean
  error: string | null
  refresh: () => void
}

/**
 * Load a market index artifact from a URL.
 *
 * This is the one hook that fetches a plain URL rather than reading through the
 * Whitehash client: a market index is a static artifact an application hosts
 * itself (or serves from a CDN), so there is no chain read to bind it to. Pass
 * `null` to skip loading. Untrusted JSON goes through `parseMarketIndex`, so a
 * malformed artifact surfaces as `error` instead of a broken render.
 */
export function useMarketIndex(
  url: string | null,
  options: UseMarketIndexOptions = {},
): UseMarketIndexResult {
  const fetchImpl = options.fetchImpl
  const [index, setIndex] = useState<MarketIndex | null>(null)
  const [loading, setLoading] = useState(url !== null)
  const [error, setError] = useState<string | null>(null)
  const [refreshId, setRefreshId] = useState(0)
  const runId = useRef(0)

  useEffect(() => {
    runId.current += 1
    const id = runId.current
    if (url === null) {
      setIndex(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    void loadMarketIndex(url, fetchImpl)
      .then(value => {
        if (runId.current === id) setIndex(value)
      })
      .catch(cause => {
        if (runId.current === id) {
          setIndex(null)
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      })
      .finally(() => {
        if (runId.current === id) setLoading(false)
      })
  }, [url, fetchImpl, refreshId])

  const refresh = useCallback(() => setRefreshId(value => value + 1), [])
  return { index, loading, error, refresh }
}
