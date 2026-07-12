import { useState } from "react"
import type { ChainId, WhitehashToken } from "@whitehash/chain-reader"
import { resolverConfigFrom, type Settings } from "../settings.js"
import { useProject } from "../useBrowse.js"
import { TokenGrid } from "./TokenGrid.js"
import { TokenDetail } from "./TokenDetail.js"

export function ProjectView({
  chain,
  refId,
  settings,
  onBack,
}: {
  chain: ChainId
  refId: string
  settings: Settings
  onBack: () => void
}) {
  const { project, tokens, loading, error, hasMore, loadMore } = useProject(
    chain,
    refId,
    settings,
  )
  const [open, setOpen] = useState<WhitehashToken | null>(null)
  const resolver = resolverConfigFrom(settings)

  if (open) {
    return <TokenDetail token={open} resolver={resolver} onBack={() => setOpen(null)} />
  }

  return (
    <div className="project">
      <button className="link" onClick={onBack}>
        ← all projects
      </button>
      <div className="wallet-head">
        <h2>{project?.name ?? (loading ? "Loading…" : refId)}</h2>
        {project?.supply !== null && project?.supply !== undefined ? (
          <span className="chip">{project.supply} editions</span>
        ) : null}
        {project?.description ? <p className="muted">{project.description}</p> : null}
      </div>

      {error ? <p className="status error">{error}</p> : null}

      <TokenGrid tokens={tokens} resolver={resolver} onOpen={setOpen} />

      {loading ? <p className="muted">Loading iterations…</p> : null}
      {!loading && hasMore ? (
        <button className="link" onClick={() => void loadMore()}>
          load more ↓
        </button>
      ) : null}
      {!loading && tokens.length === 0 && !error ? (
        <p className="muted">No minted iterations found.</p>
      ) : null}
    </div>
  )
}
