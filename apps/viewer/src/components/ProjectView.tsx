import { useState } from "react"
import {
  isTezosChain,
  type ChainId,
  type ListOrder,
  type WhitehashToken,
} from "@whitehash/chain-reader"
import { useProject } from "@whitehash/react"
import { Badge, Button } from "@whitehash/ui"
import { SortToggle, editionsLabel } from "./BrowseView.js"
import { TokenGrid, TokenGridSkeleton } from "./TokenGrid.js"
import { TokenDetail } from "./TokenDetail.js"

export function ProjectView({
  chain,
  refId,
  onBack,
}: {
  chain: ChainId
  refId: string
  onBack: () => void
}) {
  const [order, setOrder] = useState<ListOrder>("oldest")
  const { project, tokens, loading, error, hasMore, loadMore } = useProject(chain, refId, { order })
  const [open, setOpen] = useState<WhitehashToken | null>(null)

  if (open) {
    return <TokenDetail token={open} onBack={() => setOpen(null)} />
  }

  const label = project ? editionsLabel(project.minted, project.editions) : ""

  return (
    <div className="pt-8">
      <Button variant="link" onClick={onBack}>
        ← All Projects
      </Button>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 py-5">
        <h2 className="font-display text-3xl font-semibold leading-10 tracking-[-0.04em]">
          {project?.name ?? refId}
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

      {loading && tokens.length === 0 ? (
        <TokenGridSkeleton />
      ) : (
        <TokenGrid tokens={tokens} onOpen={setOpen} />
      )}

      <div className="mt-4 flex min-h-10 items-start" aria-live="polite">
        {loading && tokens.length === 0 ? <span className="sr-only">Loading iterations</span> : null}
        {loading && tokens.length > 0 ? <p className="text-muted">Loading more iterations…</p> : null}
        {!loading && hasMore ? (
          <Button variant="link" onClick={() => void loadMore()}>
            Load More
          </Button>
        ) : null}
        {!loading && tokens.length === 0 && !error ? (
          <p className="text-muted">No minted iterations found.</p>
        ) : null}
      </div>
    </div>
  )
}
