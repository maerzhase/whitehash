import { useState } from "react"
import {
  isTezosChain,
  type ChainId,
  type ListOrder,
  type WhitehashToken,
} from "@whitehash/chain-reader"
import { Badge, Button } from "@whitehash/ui"
import { resolverConfigFrom, type Settings } from "../settings.js"
import { useProject } from "../useBrowse.js"
import { SortToggle, editionsLabel } from "./BrowseView.js"
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
  const [order, setOrder] = useState<ListOrder>("oldest")
  const { project, tokens, loading, error, hasMore, loadMore } = useProject(
    chain,
    refId,
    order,
    settings,
  )
  const [open, setOpen] = useState<WhitehashToken | null>(null)
  const resolver = resolverConfigFrom(settings)

  if (open) {
    return <TokenDetail token={open} resolver={resolver} onBack={() => setOpen(null)} />
  }

  const label = project ? editionsLabel(project.minted, project.editions) : ""

  return (
    <div className="pt-5">
      <Button variant="link" onClick={onBack}>
        ← all projects
      </Button>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {project?.name ?? (loading ? "Loading…" : refId)}
        </h2>
        {label ? (
          <Badge>
            {label}
            {project && project.minted !== null && project.editions !== null ? " minted" : ""}
          </Badge>
        ) : null}
        {/* Blockscout's instances endpoint has a fixed order, so the toggle is Tezos-only. */}
        {isTezosChain(chain) ? <SortToggle order={order} onChange={setOrder} /> : null}
      </div>
      {project?.description ? (
        <p className="max-w-3xl text-sm leading-relaxed text-muted">{project.description}</p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <TokenGrid tokens={tokens} resolver={resolver} onOpen={setOpen} />

      {loading ? <p className="mt-4 text-muted">Loading iterations…</p> : null}
      {!loading && hasMore ? (
        <Button variant="link" className="mt-4" onClick={() => void loadMore()}>
          load more ↓
        </Button>
      ) : null}
      {!loading && tokens.length === 0 && !error ? (
        <p className="mt-4 text-muted">No minted iterations found.</p>
      ) : null}
    </div>
  )
}
