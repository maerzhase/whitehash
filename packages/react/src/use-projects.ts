import { useCallback, useEffect, useRef, useState } from "react"
import {
  isEvmChain,
  isTezosChain,
  type ChainId,
  type ListOrder,
  type WhitehashClient,
  type WhitehashProject,
  type WhitehashToken,
} from "@whitehash/chain-reader"
import { useWhitehash } from "./context.js"

export interface UseProjectsOptions {
  issuerVersion?: string
  order?: ListOrder
  limit?: number
  client?: WhitehashClient
}

export function useProjects(chain: ChainId, options: UseProjectsOptions = {}) {
  const context = useWhitehash()
  const client = options.client ?? context.client
  const issuerVersion = options.issuerVersion
  const order = options.order ?? "newest"
  const limit = options.limit
  const [projects, setProjects] = useState<WhitehashProject[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const runId = useRef(0)

  const load = useCallback(
    async (append: boolean, fromCursor: string | null) => {
      const id = ++runId.current
      setLoading(true)
      setError(null)
      try {
        const page = await client.listProjects(chain, {
          issuerVersion,
          cursor: fromCursor,
          order,
          limit,
        })
        if (runId.current !== id) return
        setProjects(previous => append ? [...previous, ...page.projects] : page.projects)
        setCursor(page.cursor)
      } catch (cause) {
        if (runId.current === id) {
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      } finally {
        if (runId.current === id) setLoading(false)
      }
    },
    [chain, client, issuerVersion, limit, order],
  )

  useEffect(() => {
    setProjects([])
    setCursor(null)
    void load(false, null)
  }, [load])

  const loadMore = useCallback(() => {
    if (cursor && !loading) void load(true, cursor)
  }, [cursor, load, loading])

  return { projects, loading, error, hasMore: cursor !== null, loadMore }
}

export interface UseProjectOptions {
  order?: ListOrder
  client?: WhitehashClient
}

export function useProject(
  chain: ChainId,
  ref: string,
  options: UseProjectOptions = {},
) {
  const context = useWhitehash()
  const client = options.client ?? context.client
  const order = options.order ?? "oldest"
  const [project, setProject] = useState<WhitehashProject | null>(null)
  const [tokens, setTokens] = useState<WhitehashToken[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const runId = useRef(0)

  useEffect(() => {
    const id = ++runId.current
    setProject(null)
    setTokens([])
    setCursor(null)
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        if (isTezosChain(chain)) {
          const value = await client.getProject(chain, ref)
          if (runId.current !== id) return
          setProject(value)
          if (value?.name) {
            const page = await client.listProjectTokens(chain, ref, {
              projectName: value.name,
              order,
            })
            if (runId.current !== id) return
            setTokens(page.tokens)
            setCursor(page.cursor)
          }
        } else if (isEvmChain(chain)) {
          const [info, page] = await Promise.all([
            client.getEvmProjectInfo(chain, ref),
            client.listProjectTokens(chain, ref),
          ])
          if (runId.current !== id) return
          setProject({
            chain,
            ref,
            name: info.name ?? null,
            description: null,
            displayUri: page.tokens[0]?.displayUri ?? null,
            thumbnailUri: page.tokens[0]?.thumbnailUri ?? null,
            editions: null,
            minted: info.minted ?? null,
            raw: info,
          })
          setTokens(page.tokens)
          setCursor(page.cursor)
        }
      } catch (cause) {
        if (runId.current === id) {
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      } finally {
        if (runId.current === id) setLoading(false)
      }
    })()
  }, [chain, client, order, ref])

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return
    setLoading(true)
    setError(null)
    try {
      const page = await client.listProjectTokens(chain, ref, {
        cursor,
        order,
        projectName: project?.name ?? undefined,
      })
      setTokens(previous => [...previous, ...page.tokens])
      setCursor(page.cursor)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLoading(false)
    }
  }, [chain, client, cursor, loading, order, project?.name, ref])

  return { project, tokens, loading, error, hasMore: cursor !== null, loadMore }
}

/** Lazy name, supply, and image details for an EVM project card. */
export function useEvmProjectCard(
  chain: ChainId,
  contract: string,
  options: { client?: WhitehashClient } = {},
) {
  const context = useWhitehash()
  const client = options.client ?? context.client
  const [name, setName] = useState<string | null>(null)
  const [thumb, setThumb] = useState<string | null>(null)
  const [minted, setMinted] = useState<number | null>(null)

  useEffect(() => {
    if (!isEvmChain(chain) || !contract) return
    let alive = true
    void Promise.all([
      client.getEvmProjectInfo(chain, contract),
      client.getEvmProjectPreview(chain, contract),
    ]).then(([info, preview]) => {
      if (!alive) return
      setName(info.name ?? null)
      setMinted(info.minted ?? null)
      setThumb(preview)
    }).catch(() => {
      // Card enrichment is best-effort; the project remains navigable by ref.
    })
    return () => {
      alive = false
    }
  }, [chain, client, contract])

  return { name, thumb, minted }
}
