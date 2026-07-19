import { useEffect, useState, type ComponentProps } from "react"
import {
  MAINNET_CHAINS,
  TESTNET_CHAINS,
  isEvmChain,
  isTezosChain,
  type ChainId,
  type ListOrder,
  type WhitehashProject,
  type WhitehashToken,
} from "@whitehash/chain-reader"
import {
  useEvmProjectCard,
  useGatewayImage,
  useProject,
  useProjects,
  useWalletTokens,
  useWhitehash,
  type ChainState,
} from "@whitehash/react"
import { Badge, type BadgeProps } from "./badge.js"
import { Button } from "./button.js"
import { Card } from "./card.js"
import { Skeleton } from "./feedback.js"
import { ToggleGroup } from "./toggle-group.js"
import { TokenGrid, TokenGridSkeleton } from "./token-card.js"
import { cn } from "../lib/cn.js"

const ISSUER_VERSIONS = ["v3", "v2", "v1", "v0"]

export function editionsLabel(minted: number | null, editions: number | null): string {
  if (minted !== null && editions !== null) return `${minted} / ${editions}`
  if (minted !== null) return `${minted} minted`
  if (editions !== null) return `${editions} eds`
  return ""
}

export function chainLabel(chain: ChainId): string {
  if (isTezosChain(chain)) return chain.includes("ghost") ? "Ghostnet" : "Tezos"
  if (chain === "eip155:1") return "Ethereum"
  if (chain === "eip155:8453") return "Base"
  if (chain === "eip155:11155111") return "Sepolia"
  return "Base Sepolia"
}

function shortAddress(address: string): string {
  return `${address.slice(0, 8)}…${address.slice(-4)}`
}

export function SortToggle({
  order,
  onChange,
}: {
  order: ListOrder
  onChange: (order: ListOrder) => void
}) {
  return (
    <ToggleGroup value={order} onValueChange={value => onChange(value as ListOrder)} aria-label="Sort order">
      <ToggleGroup.Item value="newest">Newest</ToggleGroup.Item>
      <ToggleGroup.Item value="oldest">Oldest</ToggleGroup.Item>
    </ToggleGroup>
  )
}

const STATUS_VARIANT: Record<ChainState["status"], BadgeProps["variant"]> = {
  idle: "default",
  loading: "default",
  cached: "accent",
  done: "success",
  error: "danger",
}

export interface WalletGalleryProps extends ComponentProps<"section"> {
  address: string
  onOpenToken?: (token: WhitehashToken) => void
}

export function WalletGallery({ address, onOpenToken, className, ...props }: WalletGalleryProps) {
  const result = useWalletTokens(address)
  return (
    <WalletGalleryContent
      address={address}
      state={result.state}
      loading={result.loading}
      onOpenToken={onOpenToken}
      className={className}
      {...props}
    />
  )
}

export interface WalletGalleryContentProps extends ComponentProps<"section"> {
  address: string
  state: ReturnType<typeof useWalletTokens>["state"]
  loading: boolean
  onOpenToken?: (token: WhitehashToken) => void
}

export function WalletGalleryContent({
  address,
  state,
  loading,
  onOpenToken,
  className,
  ...props
}: WalletGalleryContentProps) {
  const chainStates = Object.values(state?.chains ?? {})
  const noChains = state !== null && chainStates.length === 0
  return (
    <section className={className} {...props}>
      <div className="py-5">
        <h2 className="truncate font-mono text-sm text-muted">{address}</h2>
        <div className="mt-2 flex flex-wrap gap-2" aria-live="polite">
          {chainStates.map(chainState => (
            <Badge key={chainState.chain} variant={STATUS_VARIANT[chainState.status]}>
              {chainState.chain}: {chainState.message}
            </Badge>
          ))}
        </div>
      </div>
      {noChains ? (
        <p className="text-muted">That doesn’t look like a Tezos or EVM address for the current network mode.</p>
      ) : null}
      {state ? <TokenGrid tokens={state.tokens} onOpen={onOpenToken} /> : <TokenGridSkeleton />}
      {!loading && state && state.tokens.length === 0 && !noChains ? (
        <p className="mt-4 text-muted">No fxhash tokens found for this wallet.</p>
      ) : null}
    </section>
  )
}

function ProjectCard({ project, onOpen }: { project: WhitehashProject; onOpen?: () => void }) {
  const isEvm = isEvmChain(project.chain)
  const lazy = useEvmProjectCard(project.chain, isEvm ? project.ref : "")
  const name = project.name ?? lazy.name ?? (isEvm ? shortAddress(project.ref) : project.ref)
  const uri = project.thumbnailUri ?? project.displayUri ?? lazy.thumb
  const label = editionsLabel(project.minted ?? lazy.minted, project.editions)

  return (
    <ProjectCardImage project={project} name={name} uri={uri} label={label} onOpen={onOpen} />
  )
}

function ProjectCardImage({
  project,
  name,
  uri,
  label,
  onOpen,
}: {
  project: WhitehashProject
  name: string
  uri: string | null
  label: string
  onOpen?: () => void
}) {
  // A project preview uses the same gateway fallback hook as artwork parts.
  const image = useGatewayImage(uri, project.chain)
  const body = (
    <>
      <Card.Media className="bg-canvas">
        <div className="absolute inset-3">
          {image.src && !image.failed ? (
            <img
              src={image.src}
              onError={image.onError}
              alt={name}
              loading="lazy"
              className="block size-full object-contain"
            />
          ) : <div className="hatch size-full" aria-hidden />}
        </div>
      </Card.Media>
      <Card.Body>
        <Card.Title>{name}</Card.Title>
        {label ? <Card.Meta><Badge>{label}</Badge></Card.Meta> : null}
      </Card.Body>
    </>
  )
  return onOpen ? <Button variant="card" onClick={onOpen}>{body}</Button> : <Card.Root>{body}</Card.Root>
}

function ProjectGridSkeleton() {
  return Array.from({ length: 8 }, (_, index) => (
    <Card.Root key={index} aria-hidden className="shadow-[0_1px_2px_rgba(0,0,0,.16)]">
      <Card.Media className="bg-canvas"><Skeleton className="absolute inset-5" /></Card.Media>
      <Card.Body><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-14" /></Card.Body>
    </Card.Root>
  ))
}

export interface ProjectBrowserProps extends Omit<ComponentProps<"section">, "onChange"> {
  chain?: ChainId
  onChainChange?: (chain: ChainId) => void
  onOpenProject?: (chain: ChainId, ref: string) => void
}

export function ProjectBrowser({
  chain: controlledChain,
  onChainChange,
  onOpenProject,
  className,
  ...props
}: ProjectBrowserProps) {
  const { mode } = useWhitehash()
  const chains = mode === "mainnet" ? MAINNET_CHAINS : TESTNET_CHAINS
  const [localChain, setLocalChain] = useState<ChainId>(controlledChain ?? chains[0]!)
  const chain = controlledChain ?? localChain
  const [issuerVersion, setIssuerVersion] = useState("v3")
  const [order, setOrder] = useState<ListOrder>("newest")
  const { projects, loading, error, hasMore, loadMore } = useProjects(chain, { issuerVersion, order })
  const initialLoading = loading && projects.length === 0

  useEffect(() => {
    if (!chains.includes(chain)) setLocalChain(chains[0]!)
  }, [chain, chains])

  const changeChain = (next: ChainId) => {
    if (!controlledChain) setLocalChain(next)
    onChainChange?.(next)
  }

  return (
    <section className={className} {...props}>
      <div className="flex flex-wrap items-center gap-4 border-b border-line py-10">
        <h2 className="mr-auto font-display text-2xl font-semibold leading-8 tracking-[-0.04em]">Browse Projects</h2>
        <ToggleGroup value={chain} onValueChange={value => changeChain(value as ChainId)} aria-label="Chain">
          {chains.map(value => <ToggleGroup.Item key={value} value={value}>{chainLabel(value)}</ToggleGroup.Item>)}
        </ToggleGroup>
        {isTezosChain(chain) ? (
          <ToggleGroup value={issuerVersion} onValueChange={setIssuerVersion} aria-label="Issuer era">
            {ISSUER_VERSIONS.map(value => (
              <ToggleGroup.Item key={value} value={value} title={`fxhash issuer ${value} (era of projects)`}>{value}</ToggleGroup.Item>
            ))}
          </ToggleGroup>
        ) : null}
        <SortToggle order={order} onChange={setOrder} />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
        {initialLoading ? <ProjectGridSkeleton /> : projects.map(project => (
          <ProjectCard
            key={`${project.chain}/${project.ref}`}
            project={project}
            onOpen={onOpenProject ? () => onOpenProject(project.chain, project.ref) : undefined}
          />
        ))}
      </div>
      <div className="mt-4 flex min-h-10 items-start" aria-live="polite">
        {initialLoading ? <span className="sr-only">Loading projects</span> : null}
        {loading && projects.length > 0 ? <p className="text-muted">Loading more projects…</p> : null}
        {!loading && hasMore ? <Button variant="link" onClick={loadMore}>Load More</Button> : null}
        {!loading && projects.length === 0 && !error ? <p className="text-muted">No projects found.</p> : null}
      </div>
    </section>
  )
}

export interface ProjectGalleryProps extends ComponentProps<"section"> {
  chain: ChainId
  projectRef: string
  onOpenToken?: (token: WhitehashToken) => void
  onBack?: () => void
}

export function ProjectGallery({
  chain,
  projectRef,
  onOpenToken,
  onBack,
  className,
  ...props
}: ProjectGalleryProps) {
  const [order, setOrder] = useState<ListOrder>("oldest")
  const { project, tokens, loading, error, hasMore, loadMore } = useProject(chain, projectRef, { order })
  const label = project ? editionsLabel(project.minted, project.editions) : ""
  return (
    <section className={cn("pt-8", className)} {...props}>
      {onBack ? <Button variant="link" onClick={onBack}>← All Projects</Button> : null}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 py-5">
        <h2 className="font-display text-3xl font-semibold leading-10 tracking-[-0.04em]">{project?.name ?? projectRef}</h2>
        {label ? <Badge>{label}{project?.minted !== null && project?.editions !== null ? " minted" : ""}</Badge> : null}
        {isTezosChain(chain) ? <SortToggle order={order} onChange={setOrder} /> : null}
      </div>
      {project?.description ? <p className="max-w-3xl text-sm leading-relaxed text-muted">{project.description}</p> : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {loading && tokens.length === 0 ? <TokenGridSkeleton /> : <TokenGrid tokens={tokens} onOpen={onOpenToken} />}
      <div className="mt-4 flex min-h-10 items-start" aria-live="polite">
        {loading && tokens.length === 0 ? <span className="sr-only">Loading iterations</span> : null}
        {loading && tokens.length > 0 ? <p className="text-muted">Loading more iterations…</p> : null}
        {!loading && hasMore ? <Button variant="link" onClick={() => void loadMore()}>Load More</Button> : null}
        {!loading && tokens.length === 0 && !error ? <p className="text-muted">No minted iterations found.</p> : null}
      </div>
    </section>
  )
}
