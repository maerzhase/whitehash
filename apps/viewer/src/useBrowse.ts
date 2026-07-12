/**
 * Data hooks for the contract-first project browser: paginated project lists
 * and per-project iteration lists, for both chains.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import {
  getEvmProjectInfo,
  getTezosProject,
  isEvmChain,
  isTezosChain,
  listEvmProjectTokens,
  listProjects,
  listTezosProjectTokens,
  type ChainId,
  type WhitehashProject,
  type WhitehashToken,
} from "@whitehash/chain-reader"
import { chainReaderConfigFrom, type Settings } from "./settings.js"

export function useProjects(
  chain: ChainId,
  issuerVersion: string,
  settings: Settings,
) {
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
        const config = chainReaderConfigFrom(settings)
        const page = await listProjects(chain, config, {
          issuerVersion,
          cursor: fromCursor,
        })
        if (runId.current !== id) return
        setProjects(prev => (append ? [...prev, ...page.projects] : page.projects))
        setCursor(page.cursor)
      } catch (err) {
        if (runId.current === id) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (runId.current === id) setLoading(false)
      }
    },
    [chain, issuerVersion, settings],
  )

  useEffect(() => {
    setProjects([])
    setCursor(null)
    void load(false, null)
  }, [load])

  const loadMore = useCallback(() => {
    if (cursor && !loading) void load(true, cursor)
  }, [cursor, loading, load])

  return { projects, loading, error, hasMore: cursor !== null, loadMore }
}

export function useProject(chain: ChainId, ref: string, settings: Settings) {
  const [project, setProject] = useState<WhitehashProject | null>(null)
  const [tokens, setTokens] = useState<WhitehashToken[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const runId = useRef(0)

  useEffect(() => {
    const id = ++runId.current
    const config = chainReaderConfigFrom(settings)
    setProject(null)
    setTokens([])
    setCursor(null)
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        if (isTezosChain(chain)) {
          const proj = await getTezosProject(chain, ref, config)
          if (runId.current !== id) return
          setProject(proj)
          if (proj?.name) {
            const page = await listTezosProjectTokens(chain, proj.name, config)
            if (runId.current !== id) return
            setTokens(page.tokens)
            setCursor(page.cursor)
          }
        } else if (isEvmChain(chain)) {
          const info = await getEvmProjectInfo(chain, ref, config)
          if (runId.current !== id) return
          const page = await listEvmProjectTokens(chain, ref, config)
          if (runId.current !== id) return
          setProject({
            chain,
            ref,
            name: info.name ?? null,
            description: null,
            displayUri: page.tokens[0]?.displayUri ?? null,
            thumbnailUri: page.tokens[0]?.thumbnailUri ?? null,
            supply: info.supply ?? null,
            raw: info,
          })
          setTokens(page.tokens)
          setCursor(page.cursor)
        }
      } catch (err) {
        if (runId.current === id) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (runId.current === id) setLoading(false)
      }
    })()
  }, [chain, ref, settings])

  const loadMore = useCallback(async () => {
    if (!cursor) return
    const config = chainReaderConfigFrom(settings)
    if (isTezosChain(chain) && project?.name) {
      const page = await listTezosProjectTokens(chain, project.name, config, { cursor })
      setTokens(prev => [...prev, ...page.tokens])
      setCursor(page.cursor)
    } else if (isEvmChain(chain)) {
      const page = await listEvmProjectTokens(chain, ref, config, { cursor })
      setTokens(prev => [...prev, ...page.tokens])
      setCursor(page.cursor)
    }
  }, [chain, ref, cursor, project, settings])

  return { project, tokens, loading, error, hasMore: cursor !== null, loadMore }
}

/** Lazy name/supply/preview for an EVM project card. */
export function useEvmProjectCard(
  chain: ChainId,
  contract: string,
  settings: Settings,
) {
  const [name, setName] = useState<string | null>(null)
  const [thumb, setThumb] = useState<string | null>(null)
  useEffect(() => {
    if (!isEvmChain(chain)) return
    let alive = true
    const config = chainReaderConfigFrom(settings)
    void (async () => {
      const info = await getEvmProjectInfo(chain, contract, config)
      if (alive && info.name) setName(info.name)
      try {
        const page = await listEvmProjectTokens(chain, contract, config)
        const t = page.tokens[0]
        if (alive) setThumb(t?.thumbnailUri ?? t?.displayUri ?? null)
      } catch {
        /* preview is best-effort */
      }
    })()
    return () => {
      alive = false
    }
  }, [chain, contract, settings])
  return { name, thumb }
}
