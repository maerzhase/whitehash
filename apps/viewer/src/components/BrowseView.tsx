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
    <button className="card" onClick={onOpen}>
      <div className="card-img">
        <GatewayImage uri={thumbUri} chain={project.chain} resolver={resolver} alt={name ?? ""} lazy />
      </div>
      <div className="card-meta">
        <span className="card-name">{name}</span>
        {label ? <span className="chip">{label}</span> : null}
      </div>
    </button>
  )
}

function shortAddr(a: string): string {
  return `${a.slice(0, 8)}…${a.slice(-4)}`
}

export function SortToggle({
  order,
  onChange,
}: {
  order: ListOrder
  onChange: (o: ListOrder) => void
}) {
  return (
    <div className="toggle small">
      {(["newest", "oldest"] as const).map(o => (
        <button key={o} className={order === o ? "on" : ""} onClick={() => onChange(o)}>
          {o} first
        </button>
      ))}
    </div>
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
    <div className="browse">
      <div className="browse-head">
        <h2>Browse projects</h2>
        <div className="toggle">
          {chains.map(c => (
            <button key={c} className={chain === c ? "on" : ""} onClick={() => setChain(c)}>
              {chainLabel(c)}
            </button>
          ))}
        </div>
        {isTezosChain(chain) ? (
          <div className="toggle small">
            {ISSUER_VERSIONS.map(v => (
              <button
                key={v}
                className={issuerVersion === v ? "on" : ""}
                onClick={() => setIssuerVersion(v)}
                title={`fxhash issuer ${v} (era of projects)`}
              >
                {v}
              </button>
            ))}
          </div>
        ) : null}
        <SortToggle order={order} onChange={setOrder} />
      </div>

      {error ? <p className="status error">{error}</p> : null}

      <div className="grid">
        {projects.map(p => (
          <ProjectCard
            key={`${p.chain}/${p.ref}`}
            project={p}
            settings={settings}
            onOpen={() => onOpenProject(p.chain, p.ref)}
          />
        ))}
      </div>

      {loading ? <p className="muted">Loading projects…</p> : null}
      {!loading && hasMore ? (
        <button className="link" onClick={loadMore}>
          load more ↓
        </button>
      ) : null}
      {!loading && projects.length === 0 && !error ? (
        <p className="muted">No projects found.</p>
      ) : null}
    </div>
  )
}
