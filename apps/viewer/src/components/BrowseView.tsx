import { useState } from "react"
import {
  MAINNET_CHAINS,
  TESTNET_CHAINS,
  isEvmChain,
  isTezosChain,
  type ChainId,
  type ListOrder,
  type WhitehashProject,
} from "@whitehash/chain-reader"
import { Badge, Button, Card, ToggleGroup } from "@whitehash/ui"
import { resolverConfigFrom, type Settings } from "../settings.js"
import { useEvmProjectCard, useProjects } from "../useBrowse.js"
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
  settings,
  onOpen,
}: {
  project: WhitehashProject
  settings: Settings
  onOpen: () => void
}) {
  const resolver = resolverConfigFrom(settings)
  const isEvm = isEvmChain(project.chain)
  // EVM projects carry no name/preview/count in the factory log — fetch lazily.
  const lazy = useEvmProjectCard(project.chain, isEvm ? project.ref : "", settings)
  const name = project.name ?? lazy.name ?? (isEvm ? shortAddr(project.ref) : project.ref)
  const thumbUri = project.thumbnailUri ?? project.displayUri ?? lazy.thumb
  const label = editionsLabel(project.minted ?? lazy.minted, project.editions)

  return (
    <Button variant="card" onClick={onOpen}>
      <Card.Media>
        <GatewayImage uri={thumbUri} chain={project.chain} resolver={resolver} alt={name ?? ""} lazy />
      </Card.Media>
      <Card.Body>
        <Card.Title>{name}</Card.Title>
        {label ? <Card.Meta><Badge>{label}</Badge></Card.Meta> : null}
      </Card.Body>
    </Button>
  )
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
  settings,
  onOpenProject,
}: {
  settings: Settings
  onOpenProject: (chain: ChainId, ref: string) => void
}) {
  const chains = settings.mode === "mainnet" ? MAINNET_CHAINS : TESTNET_CHAINS
  const [chain, setChain] = useState<ChainId>(chains[0]!)
  const [issuerVersion, setIssuerVersion] = useState("v3")
  const [order, setOrder] = useState<ListOrder>("newest")
  const { projects, loading, error, hasMore, loadMore } = useProjects(
    chain,
    issuerVersion,
    order,
    settings,
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 py-5">
        <h2 className="text-lg font-semibold tracking-tight">Browse projects</h2>
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

      <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {projects.map(p => (
          <ProjectCard
            key={`${p.chain}/${p.ref}`}
            project={p}
            settings={settings}
            onOpen={() => onOpenProject(p.chain, p.ref)}
          />
        ))}
      </div>

      {loading ? <p className="mt-4 text-muted">Loading projects…</p> : null}
      {!loading && hasMore ? (
        <Button variant="link" className="mt-4" onClick={loadMore}>
          load more ↓
        </Button>
      ) : null}
      {!loading && projects.length === 0 && !error ? (
        <p className="mt-4 text-muted">No projects found.</p>
      ) : null}
    </div>
  )
}
