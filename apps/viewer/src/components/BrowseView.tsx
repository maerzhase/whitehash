import { useState } from "react"
import {
  MAINNET_CHAINS,
  TESTNET_CHAINS,
  isEvmChain,
  isTezosChain,
  type ChainId,
  type WhitehashProject,
} from "@whitehash/chain-reader"
import { resolveUri } from "@whitehash/resolve"
import { resolverConfigFrom, type Settings } from "../settings.js"
import { useEvmProjectCard, useProjects } from "../useBrowse.js"

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
  // EVM projects carry no name/preview in the factory log — fetch lazily.
  const lazy = useEvmProjectCard(project.chain, isEvm ? project.ref : "", settings)
  const name = project.name ?? lazy.name ?? (isEvm ? shortAddr(project.ref) : project.ref)
  const thumbUri = project.thumbnailUri ?? project.displayUri ?? lazy.thumb
  const img = thumbUri ? resolveUri(thumbUri, resolver, { chain: project.chain }) : null

  return (
    <button className="card" onClick={onOpen}>
      <div className="card-img">
        {img ? <img src={img} alt={name ?? ""} loading="lazy" /> : <div className="noimg" />}
      </div>
      <div className="card-meta">
        <span className="card-name">{name}</span>
        {project.supply !== null ? <span className="chip">{project.supply} eds</span> : null}
      </div>
    </button>
  )
}

function shortAddr(a: string): string {
  return `${a.slice(0, 8)}…${a.slice(-4)}`
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
  const { projects, loading, error, hasMore, loadMore } = useProjects(
    chain,
    issuerVersion,
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
