import { useCallback, useEffect, useRef, useState } from "react"
import {
  formatRef,
  projectRef,
  type ChainId,
  type ListOrder,
  type ProjectInput,
  type WhitehashClient,
  type WhitehashProject,
  type WhitehashToken,
} from "@whitehash/chain-reader"
import { useWhitehash } from "./context.js"

export interface UseProjectsOptions {
  chain: ChainId
  version?: string
  order?: ListOrder
  limit?: number
  client?: WhitehashClient
}

/** List projects and progressively fill any preview fields missing from discovery. */
export function useProjects(options: UseProjectsOptions) {
  const context = useWhitehash()
  const client = options.client ?? context.client
  const { chain, version, limit } = options
  const order = options.order ?? "newest"
  const [projects, setProjects] = useState<WhitehashProject[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const runId = useRef(0)

  const hydrate = useCallback((project: WhitehashProject, id: number) => {
    void client.getProject(project).then(value => {
      if (!value || runId.current !== id) return
      setProjects(previous => previous.map(item =>
        item.chain === value.chain && item.id === value.id ? value : item,
      ))
    }).catch(() => {
      // Preview enrichment is best-effort; the discovered project stays usable.
    })
  }, [client])

  const load = useCallback(async (append: boolean, fromCursor: string | null) => {
    const id = ++runId.current
    setLoading(true)
    setError(null)
    try {
      const page = await client.listProjects({ chain, version, cursor: fromCursor, order, limit })
      if (runId.current !== id) return
      setProjects(previous => append ? [...previous, ...page.projects] : page.projects)
      setCursor(page.cursor)
      page.projects.forEach(project => {
        if (!project.name || !project.thumbnailUri || project.minted === null) hydrate(project, id)
      })
    } catch (cause) {
      if (runId.current === id) setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      if (runId.current === id) setLoading(false)
    }
  }, [chain, client, hydrate, limit, order, version])

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

/** Read one project and its minted iterations; refs carry their own chain. */
export function useProject(input: ProjectInput, options: UseProjectOptions = {}) {
  const ref = projectRef(input)
  const context = useWhitehash()
  const client = options.client ?? context.client
  const order = options.order ?? "oldest"
  const [project, setProject] = useState<WhitehashProject | null>(null)
  const [tokens, setTokens] = useState<WhitehashToken[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const runId = useRef(0)
  const serializedRef = formatRef(ref)

  useEffect(() => {
    const id = ++runId.current
    setProject(null)
    setTokens([])
    setCursor(null)
    setLoading(true)
    setError(null)
    void Promise.all([client.getProject(ref), client.listProjectTokens(ref, { order })])
      .then(([projectValue, page]) => {
        if (runId.current !== id) return
        setProject(projectValue)
        setTokens(page.tokens)
        setCursor(page.cursor)
      })
      .catch(cause => {
        if (runId.current === id) setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (runId.current === id) setLoading(false)
      })
  }, [client, order, serializedRef])

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return
    setLoading(true)
    setError(null)
    try {
      const page = await client.listProjectTokens(ref, { cursor, order })
      setTokens(previous => [...previous, ...page.tokens])
      setCursor(page.cursor)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLoading(false)
    }
  }, [client, cursor, loading, order, serializedRef])

  return { project, tokens, loading, error, hasMore: cursor !== null, loadMore }
}
