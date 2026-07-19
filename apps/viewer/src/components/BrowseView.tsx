import { useEffect, useState } from "react"
import {
  MAINNET_CHAINS,
  TESTNET_CHAINS,
  isEvmChain,
  isTezosChain,
  type ChainId,
  type ListOrder,
  type WhitehashProject,
} from "@whitehash/chain-reader"
import { useEvmProjectCard, useProjects, useWhitehash } from "@whitehash/react"
import { Badge, Button, Card, Skeleton, ToggleGroup } from "@whitehash/ui"
import { GatewayImage } from "./GatewayImage.js"

/** "5 / 500", "5 minted", or "" when nothing is known. */
export function editionsLabel(minted: number | null, editions: number | null): string {
  if (minted !== null && editions !== null) return `${minted} / ${editions}`
  if (minted !== null) return `${minted} minted`
  if (editions !== null) return `${editions} eds`
  return ""
}

const ISSUER_VERSIONS = ["v3", "v2", "v1", "v0"]

function chainLabel(chain: ChainId): string {
  if (isTezosChain(chain)) return chain.includes("ghost") ? "Ghostnet" : "Tezos"
  if (chain === "eip155:1") return "Ethereum"
  if (chain === "eip155:8453") return "Base"
  if (chain === "eip155:11155111") return "Sepolia"
  return "Base Sepolia"
}

function shortAddr(a: string): string {
  return `${a.slice(0, 8)}…${a.slice(-4)}`
}

function ProjectCard({
  project,
  onOpen,
}: {
  project: WhitehashProject
  onOpen: () => void
}) {
  const isEvm = isEvmChain(project.chain)
  // EVM projects carry no name/preview/count in the factory log — fetch lazily.
  const lazy = useEvmProjectCard(project.chain, isEvm ? project.ref : "")
  const name = project.name ?? lazy.name ?? (isEvm ? shortAddr(project.ref) : project.ref)
  const thumbUri = project.thumbnailUri ?? project.displayUri ?? lazy.thumb
  const label = editionsLabel(project.minted ?? lazy.minted, project.editions)

  return (
    <Button variant="card" onClick={onOpen}>
      <Card.Media className="bg-canvas">
        <div className="absolute inset-3">
          <GatewayImage uri={thumbUri} chain={project.chain} alt={name ?? ""} lazy />
        </div>
      </Card.Media>
      <Card.Body>
        <Card.Title>{name}</Card.Title>
        {label ? <Card.Meta><Badge>{label}</Badge></Card.Meta> : null}
      </Card.Body>
    </Button>
  )
}

function ProjectGridSkeleton() {
  return Array.from({ length: 8 }, (_, index) => (
    <Card.Root
      key={index}
      aria-hidden
      className="shadow-[0_1px_2px_rgba(0,0,0,.16)]"
    >
      <Card.Media className="bg-canvas">
        <Skeleton className="absolute inset-5" />
      </Card.Media>
      <Card.Body>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-14" />
      </Card.Body>
    </Card.Root>
  ))
}

export function SortToggle({
  order,
  onChange,
}: {
  order: ListOrder
  onChange: (o: ListOrder) => void
}) {
  return (
    <ToggleGroup value={order} onValueChange={v => onChange(v as ListOrder)} aria-label="Sort order">
      <ToggleGroup.Item value="newest">Newest</ToggleGroup.Item>
      <ToggleGroup.Item value="oldest">Oldest</ToggleGroup.Item>
    </ToggleGroup>
  )
}

export function BrowseView({
  onOpenProject,
}: {
  onOpenProject: (chain: ChainId, ref: string) => void
}) {
  const { mode } = useWhitehash()
  const chains = mode === "mainnet" ? MAINNET_CHAINS : TESTNET_CHAINS
  const [chain, setChain] = useState<ChainId>(chains[0]!)
  const [issuerVersion, setIssuerVersion] = useState("v3")
  const [order, setOrder] = useState<ListOrder>("newest")

  useEffect(() => {
    if (!chains.includes(chain)) setChain(chains[0]!)
  }, [chain, chains])
  const { projects, loading, error, hasMore, loadMore } = useProjects(chain, {
    issuerVersion,
    order,
  })
  const initialLoading = loading && projects.length === 0

  return (
    <div>
      <section className="brand-hero">
        <div className="brand-hero-copy">
          <h1 className="brand-hero-title font-display text-primary">
            <span>white</span><span>hash</span>
          </h1>
          <p className="brand-hero-description">
            View generative art directly from Tezos, Ethereum, and Base.
          </p>
        </div>
        <img
          className="brand-hero-logo"
          src="./logo.png"
          alt="Whitehash"
          width="1024"
          height="1024"
          fetchPriority="high"
        />
      </section>

      <div className="flex flex-wrap items-center gap-4 border-b border-line py-10">
        <h2 className="mr-auto font-display text-2xl font-semibold leading-8 tracking-[-0.04em]">Browse Projects</h2>
        <ToggleGroup value={chain} onValueChange={v => setChain(v as ChainId)} aria-label="Chain">
          {chains.map(c => (
            <ToggleGroup.Item key={c} value={c}>
              {chainLabel(c)}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup>
        {isTezosChain(chain) ? (
          <ToggleGroup value={issuerVersion} onValueChange={setIssuerVersion} aria-label="Issuer era">
            {ISSUER_VERSIONS.map(v => (
              <ToggleGroup.Item key={v} value={v} title={`fxhash issuer ${v} (era of projects)`}>
                {v}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup>
        ) : null}
        <SortToggle order={order} onChange={setOrder} />
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
        {initialLoading ? (
          <ProjectGridSkeleton />
        ) : (
          projects.map(p => (
            <ProjectCard
              key={`${p.chain}/${p.ref}`}
              project={p}
              onOpen={() => onOpenProject(p.chain, p.ref)}
            />
          ))
        )}
      </div>

      <div className="mt-4 flex min-h-10 items-start" aria-live="polite">
        {initialLoading ? <span className="sr-only">Loading projects</span> : null}
        {loading && projects.length > 0 ? <p className="text-muted">Loading more projects…</p> : null}
        {!loading && hasMore ? (
          <Button variant="link" onClick={loadMore}>
            Load More
          </Button>
        ) : null}
        {!loading && projects.length === 0 && !error ? (
          <p className="text-muted">No projects found.</p>
        ) : null}
      </div>
    </div>
  )
}
