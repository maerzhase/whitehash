import { useCallback, useEffect, useRef, useState } from "react"
import {
  formatRef,
  parseRef,
  tokenRef,
  type TokenInput,
  type WhitehashClient,
  type WhitehashToken,
} from "@whitehash/chain-reader"
import { useWhitehash } from "./context.js"

export interface UseTokenOptions {
  client?: WhitehashClient
}

export interface UseTokenResult {
  token: WhitehashToken | null
  loading: boolean
  error: string | null
  refresh: () => void
}

/** Read one normalized token from its chain, contract, and token id. */
export function useToken(input: TokenInput | null, options: UseTokenOptions = {}): UseTokenResult {
  const context = useWhitehash()
  const client = options.client ?? context.client
  const [token, setToken] = useState<WhitehashToken | null>(null)
  const [loading, setLoading] = useState(input !== null)
  const [error, setError] = useState<string | null>(null)
  const [refreshId, setRefreshId] = useState(0)
  const runId = useRef(0)
  const ref = input ? tokenRef(input) : null
  const serializedRef = ref ? formatRef(ref) : null

  useEffect(() => {
    const id = ++runId.current
    if (!serializedRef) {
      setToken(null)
      setLoading(false)
      setError(null)
      return
    }

    setToken(null)
    setLoading(true)
    setError(null)
    void client.getToken(parseRef(serializedRef, "token"))
      .then(value => {
        if (runId.current === id) setToken(value)
      })
      .catch(cause => {
        if (runId.current === id) setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (runId.current === id) setLoading(false)
      })
    return () => {
      if (runId.current === id) runId.current += 1
    }
  }, [client, serializedRef, refreshId])

  const refresh = useCallback(() => setRefreshId(value => value + 1), [])
  return { token, loading, error, refresh }
}
