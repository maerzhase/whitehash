import { MARKET_INDEX_FORMAT, parseMarketIndex, type MarketIndex } from "@whitehash/market"
import { useCallback, useEffect, useRef, useState } from "react"

/**
 * A loader for an index that does not live at a plain URL: an API in front of a
 * database, a bundler import, an offline store. `key` identifies the index so
 * the hook knows when to reload; an inline `load` closure would otherwise
 * change identity on every render and refetch forever.
 */
export interface MarketIndexLoader {
  key: string
  load: () => Promise<unknown>
}

/**
 * Where an index comes from:
 *
 * - a URL string, fetched and validated
 * - a `MarketIndex` already in memory, used as-is
 * - a {@link MarketIndexLoader}, for any other transport
 * - `null` to load nothing
 */
export type MarketIndexSource = string | MarketIndex | MarketIndexLoader | null

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

function isLoader(source: MarketIndexSource): source is MarketIndexLoader {
  return typeof source === "object" && source !== null && "load" in source
}

function inMemoryIndex(source: MarketIndexSource): MarketIndex | null {
  if (typeof source !== "object" || source === null) return null
  return "format" in source && source.format === MARKET_INDEX_FORMAT ? source : null
}

/**
 * Load a market index from a URL, a loader, or an index you already hold.
 *
 * A market index is a static artifact an application owns rather than a chain
 * read, which is why this hook takes a source instead of a project reference:
 * one application serves a file from a CDN, another serves many indexes from a
 * database, a third has one in memory already. Anything fetched is validated
 * with `parseMarketIndex`, so a malformed artifact surfaces as `error` rather
 * than a broken render. An index passed in directly is trusted; validate it
 * yourself if it came from untrusted JSON.
 */
export function useMarketIndex(
  source: MarketIndexSource,
  options: UseMarketIndexOptions = {},
): UseMarketIndexResult {
  const fetchImpl = options.fetchImpl
  const direct = inMemoryIndex(source)
  const url = typeof source === "string" ? source : null
  const loaderKey = isLoader(source) ? source.key : null

  // The loader closure is read at call time so a new closure with the same key
  // does not restart the load.
  const loaderRef = useRef<MarketIndexLoader["load"] | null>(null)
  loaderRef.current = isLoader(source) ? source.load : null

  const [index, setIndex] = useState<MarketIndex | null>(null)
  const [loading, setLoading] = useState(url !== null || loaderKey !== null)
  const [error, setError] = useState<string | null>(null)
  const [refreshId, setRefreshId] = useState(0)
  const runId = useRef(0)

  useEffect(() => {
    runId.current += 1
    const id = runId.current
    if (url === null && loaderKey === null) {
      setIndex(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const work =
      url !== null
        ? loadMarketIndex(url, fetchImpl)
        : Promise.resolve()
            .then(() => loaderRef.current?.())
            .then(value => parseMarketIndex(value))
    void work
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
  }, [url, loaderKey, fetchImpl, refreshId])

  const refresh = useCallback(() => setRefreshId(value => value + 1), [])
  if (direct) return { index: direct, loading: false, error: null, refresh }
  return { index, loading, error, refresh }
}
