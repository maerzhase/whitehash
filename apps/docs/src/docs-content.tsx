"use client"

import type { WhitehashToken } from "@whitehash/chain-reader"
import { registerOnchfsWorker } from "@whitehash/onchfs-sw"
import {
  useArtworkFrame,
  useGatewayImage,
  useMarketIndex,
  useProject,
  useProjects,
  useToken,
  useWalletTokens,
  useWhitehash,
} from "@whitehash/react"
import {
  AddressSearch,
  Artwork,
  Badge,
  Button,
  Card,
  Dialog,
  Field,
  Input,
  ProjectBrowser,
  ProjectGallery,
  Separator,
  Skeleton,
  SortToggle,
  Spinner,
  Textarea,
  TokenDetails,
  Tooltip,
  WalletGallery,
  WalletSearch,
} from "@whitehash/ui"
import Link from "next/link"
import { type ReactNode, useEffect, useState } from "react"
import { DEMO_MARKET_ARTIFACT, MarketDemo } from "./market-demo"
import {
  Callout,
  CodeBlock,
  DocsHeading,
  DocsPage,
  DocsSection,
  LiveDemo,
} from "./components/docs-chrome"

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="understand-table-wrap overflow-x-auto">
      <table className="understand-table w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {head.map(value => (
              <th key={value} className="border-b border-line-strong px-3 py-2 font-medium text-fg">
                {value}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="align-top">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border-b border-line px-3 py-3 text-muted [&_code]:text-fg"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export interface ApiEntry {
  slug: string
  name: string
  group: "React hooks" | "Primitives" | "Domain" | "Blocks"
  description: string
}

// Ordered by relevance to the core job (render fxhash art): hooks → the
// Artwork component -> drop-in blocks. Generic primitives come last because they
// exist so the design system is complete, not as the pitch.
export const API_ENTRIES: ApiEntry[] = [
  {
    slug: "whitehash-provider",
    name: "WhitehashProvider",
    group: "React hooks",
    description: "Set up Whitehash once, then use it throughout your app.",
  },
  {
    slug: "use-whitehash",
    name: "useWhitehash",
    group: "React hooks",
    description: "Access your Whitehash client and its current settings.",
  },
  {
    slug: "use-token",
    name: "useToken",
    group: "React hooks",
    description: "Load one token from its network, collection, and edition number.",
  },
  {
    slug: "use-wallet-tokens",
    name: "useWalletTokens",
    group: "React hooks",
    description: "Find the tokens owned by a collector address across supported networks.",
  },
  {
    slug: "use-projects",
    name: "useProjects",
    group: "React hooks",
    description: "Browse projects and preview images across supported networks.",
  },
  {
    slug: "use-market-index",
    name: "useMarketIndex",
    group: "React hooks",
    description: "Load a market index artifact your app hosts, validated before it renders.",
  },
  {
    slug: "use-project",
    name: "useProject",
    group: "React hooks",
    description: "Load a project and list its tokens.",
  },
  {
    slug: "use-gateway-image",
    name: "useGatewayImage",
    group: "React hooks",
    description: "Load an IPFS image and try another gateway if the first one is unavailable.",
  },
  {
    slug: "use-artwork-frame",
    name: "useArtworkFrame",
    group: "React hooks",
    description: "Control live artwork playback in a protected browser frame.",
  },
  {
    slug: "artwork",
    name: "Artwork",
    group: "Domain",
    description: "Show a token’s preview, live artwork, and reveal status.",
  },
  {
    slug: "market-stats",
    name: "MarketStats",
    group: "Domain",
    description: "Floor, volume, charts, and event history from one market index.",
  },
  {
    slug: "token-details",
    name: "TokenDetails",
    group: "Domain",
    description: "Show a token with its artwork, details, and traits.",
  },
  ...[
    "WalletGallery",
    "ProjectBrowser",
    "ProjectGallery",
    "AddressSearch",
    "WalletSearch",
    "SortToggle",
  ].map(name => ({
    slug: name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, ""),
    name,
    group: "Blocks" as const,
    description: `${name} is a ready-to-embed block with navigation delegated to the consumer.`,
  })),
  ...[
    "Button",
    "Card",
    "Badge",
    "ToggleGroup",
    "Field",
    "Input",
    "Textarea",
    "Dialog",
    "Tooltip",
    "Spinner",
    "Skeleton",
    "Separator",
  ].map(name => ({
    slug: name.toLowerCase(),
    name,
    group: "Primitives" as const,
    description: `The ${name} design-system primitive.`,
  })),
]

export const SAMPLE_TOKEN: WhitehashToken = {
  chain: "tezos:mainnet",
  contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
  tokenId: "14840",
  name: "Reading a book #1",
  description:
    "The formal structure of a book is beautiful by itself, but its aesthetic is the tacit atmosphere within which events take place in a story.",
  iterationHash: "oogKC72UnsYRx4BCL8H9fEU8qsiEpgEqAeM6hWfE95VVXmwhRdE",
  artifactUri: "ipfs://Qmf7gmvgm4A9tKRNCePq4yghxU3VmusV2Cgc5Vqkdvpc8M",
  displayUri: "ipfs://QmYHgcyVhzVEKmUfjMsSJDuBbijBcEdFXCGKsZApLRmwrj",
  thumbnailUri: "ipfs://QmUGAYj2osqjvkpR6zforQixypxEbW2YUeZUdPYBAqDkWw",
  // Canonical project-level generativeUri from fxhash v2 project 86.
  generatorUri: "ipfs://QmSgkdmpqwGLrCtH8qCYQGYNqeKvt47SgasZisGCQrpzKE",
  attributes: [
    { name: "Color Style", value: "Small Palette" },
    { name: "Number of Colors", value: "5" },
    { name: "Columns", value: "14" },
    { name: "Rows", value: "5" },
  ],
  assigned: true,
  metadataUri: null,
  raw: null,
}

export const CONTRAPUNTOS_TOKEN: WhitehashToken = {
  chain: "tezos:mainnet",
  contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
  tokenId: "16333",
  name: "contrapuntos #136",
  description: "A known gentk-v1 fixture used to demonstrate the toolkit API.",
  iterationHash: "ooJ3bEAPXGub6p2mDuTweYuLcny5SF6Yo1gHxFQUqr6HHnmRehK",
  artifactUri: "ipfs://QmSYxhg1TWP9pMeSYAPDj23cf4MAo3nA4iF3kErq611KRG",
  displayUri: "ipfs://QmeWLdf4WeY2sc5iTjv7gJhEvjVtTCPyZM6grNTSx7kTym",
  thumbnailUri: "ipfs://QmaWnpxNQyM1bNjQyCzRQsjCEoQEi5KFwhN5UmMQi6FgNQ",
  generatorUri: "ipfs://QmfTQFEgcgYDohPJLJWWnrKeRMBYrRP8JF79k6kveuXEv2",
  attributes: [{ name: "Network", value: "Tezos" }],
  assigned: true,
  metadataUri: null,
  raw: null,
}

export const ONCHFS_SAMPLE_TOKEN: WhitehashToken = {
  chain: "eip155:1",
  contract: "0xBb47F0ED4A7E3BffcA75660dFa3B053FB7FcE78E",
  tokenId: "2953",
  name: "Genomes #2953",
  description:
    "A live Ethereum artwork whose generator bytes this page resolves from onchfs through a service worker.",
  iterationHash: "0x4d47331fb7ef118d98ff2c313fe79d2a6870a62ad078f625623d1122989b545e",
  artifactUri:
    "onchfs://046f4712c2aaa344f82f1ef8ffed2ab8c9714819228e29c6a28cf67b14377f61/?fxhash=0x4d47331fb7ef118d98ff2c313fe79d2a6870a62ad078f625623d1122989b545e&fxiteration=2953&fxminter=0xb29DDe74b1ba90f3b21F12bA7ae7583976562EDD",
  displayUri: "ipfs://QmZKeTq6iKkfKZnjHRufSc1zr9xfkmDqqaZAFDHPV3rbu1",
  thumbnailUri: "ipfs://QmPePWvBJVxJFs3V7yVGuY9bSzy19L2kCDFSpG2U3p6BKW",
  generatorUri: "onchfs://046f4712c2aaa344f82f1ef8ffed2ab8c9714819228e29c6a28cf67b14377f61",
  attributes: [
    { name: "Genome A", value: "iNrBswx`o" },
    { name: "Genome B", value: "_eSQ[xSsp" },
    { name: "Perfect genome", value: "false" },
  ],
  assigned: true,
  metadataUri: null,
  raw: { snippetVersion: "4.0.0" },
}

function OnchfsTokenExample() {
  const { client } = useWhitehash()
  const [workerError, setWorkerError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void registerOnchfsWorker().catch(cause => {
      if (alive) setWorkerError(cause instanceof Error ? cause.message : String(cause))
    })
    return () => {
      alive = false
    }
  }, [])

  const virtualUrl = client.artworkUrl(ONCHFS_SAMPLE_TOKEN)
  return (
    <DocsSection title="Render an onchfs artwork in the browser">
      <div className="grid gap-8 md:grid-cols-[1.35fr_.65fr] md:items-start">
        <Artwork.Root token={ONCHFS_SAMPLE_TOKEN} className="rounded-lg">
          <Artwork.Image source="thumbnail" />
          <Artwork.Live />
          <Artwork.PlayButton playLabel="▶ Run onchfs live" />
          <Artwork.StatusBadge />
        </Artwork.Root>
        <div className="pt-1">
          <h3 className="font-display text-3xl font-semibold tracking-[-0.04em]">Genomes #2953</h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            This example shows the composed <code>Artwork</code> component: an IPFS preview loads
            first, then <strong>Run onchfs live</strong> replaces it with the executable artwork.
            Its HTML, scripts, and assets are read from Ethereum through the same-origin worker.
          </p>
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Network</dt>
            <dd className="font-mono text-xs">Ethereum</dd>
            <dt className="text-muted">Collection</dt>
            <dd className="truncate font-mono text-xs">0xBb47…E78E</dd>
            <dt className="text-muted">Token ID</dt>
            <dd className="font-mono text-xs">2953</dd>
            <dt className="text-muted">Generator root</dt>
            <dd className="truncate font-mono text-xs">046f4712…77f61</dd>
          </dl>
          {workerError ? (
            <Callout className="mt-5">Service worker registration failed: {workerError}</Callout>
          ) : null}
          {virtualUrl ? (
            <p className="mt-5 break-all font-mono text-[11px] leading-5 text-faint">
              {virtualUrl}
            </p>
          ) : null}
        </div>
      </div>
    </DocsSection>
  )
}

const USAGE: Record<string, string> = {
  MarketStats: `import { useMarketIndex } from "@whitehash/react"

const { index } = useMarketIndex("/market-index.json")
if (!index) return null

<MarketStats.Root index={index}>
  <MarketStats.Tiles />
  <MarketStats.FloorChart />
  <MarketStats.VolumeChart />
  <MarketStats.Events limit={25} />
</MarketStats.Root>`,
  WhitehashProvider: `<WhitehashProvider>\n  <App />\n</WhitehashProvider>`,
  Card: `<Card.Root>\n  <Card.Media />\n  <Card.Body><Card.Title>Title</Card.Title></Card.Body>\n</Card.Root>`,
  Field: `<Field.Root>\n  <Field.Label>Wallet</Field.Label>\n  <Field.Control render={<Input />} />\n</Field.Root>`,
  Dialog: `<Dialog open={open} onOpenChange={setOpen}>\n  <Dialog.Content><Dialog.Title>Title</Dialog.Title></Dialog.Content>\n</Dialog>`,
  Tooltip: `<Tooltip.Root>\n  <Tooltip.Trigger>3 chains</Tooltip.Trigger>\n  <Tooltip.Content>Tezos · Ethereum · Base</Tooltip.Content>\n</Tooltip.Root>`,
  Artwork: `<Artwork.Root token={token}>\n  <Artwork.Image />\n  <Artwork.Live />\n  <Artwork.PlayButton />\n  <Artwork.StatusBadge />\n</Artwork.Root>`,
  TokenDetails: `<TokenDetails token={token} />`,
  WalletGallery: `<WalletGallery address="tz1…" onOpenToken={setToken} />`,
  ProjectBrowser: `<ProjectBrowser chain="tezos:mainnet" onOpenProject={openProject} />`,
  ProjectGallery: `<ProjectGallery project={{ chain: "tezos:mainnet", id: "v3:13623" }} />`,
  AddressSearch: `<AddressSearch onSubmit={openWallet} />`,
  WalletSearch: `<WalletSearch open={open} onOpenChange={setOpen} onSubmit={openWallet} />`,
}

const codeFor = (name: string) => {
  if (name.startsWith("use")) {
    const args: Record<string, string> = {
      useWalletTokens: `"tz1…"`,
      useToken: `{ chain: "tezos:mainnet", contract: "KT1…", tokenId: "16333" }`,
      useProjects: `{ chain: "tezos:mainnet", order: "newest" }`,
      useProject: `{ chain: "tezos:mainnet", id: "v3:13623" }`,
      useGatewayImage: `uri, "tezos:mainnet"`,
      useArtworkFrame: `token`,
      useWhitehash: ``,
      useMarketIndex: `"/market-index.json"`,
    }
    return `import { ${name} } from "@whitehash/react"\n\nconst result = ${name}(${args[name] ?? ""})`
  }
  return `import { ${name} } from "@whitehash/ui"\n\n${USAGE[name] ?? `<${name} />`}`
}

function HookDemo({ name }: { name: string }) {
  if (name === "useMarketIndex") return <MarketIndexHookDemo />
  if (name === "useWalletTokens") return <WalletHookDemo />
  if (name === "useToken") return <TokenHookDemo />
  if (name === "useProjects") return <ProjectsHookDemo />
  if (name === "useProject") return <ProjectHookDemo />
  if (name === "useGatewayImage") return <GatewayHookDemo />
  if (name === "useArtworkFrame") return <ArtworkHookDemo />
  return <ContextHookDemo />
}

function MarketIndexHookDemo() {
  const { index, loading, error } = useMarketIndex(DEMO_MARKET_ARTIFACT)
  if (loading) return <HookValue>loading…</HookValue>
  if (error || !index) return <HookValue>{error ?? "no artifact"}</HookValue>
  return (
    <HookValue>
      {`${index.project.name ?? index.project.id} · ${index.events.length} events · floor ${
        index.stats.floor ?? "n/a"
      } · indexed to height ${Object.values(index.cursors)[0]?.height ?? "?"}`}
    </HookValue>
  )
}

function HookValue({ children }: { children: string }) {
  return <p className="font-mono text-sm text-muted">{children}</p>
}
function ContextHookDemo() {
  const value = useWhitehash()
  return (
    <HookValue>{`mode: ${value.mode}; gateways: ${value.client.config.resolver.ipfsGateways.length}`}</HookValue>
  )
}
function WalletHookDemo() {
  const value = useWalletTokens("tz1c3hFmjFSwunjLHECnYyjr42KRt5YiHrGX")
  return (
    <HookValue>{value.state ? `${value.state.tokens.length} tokens` : "Loading wallet…"}</HookValue>
  )
}
function TokenHookDemo() {
  const value = useToken(SAMPLE_TOKEN)
  return (
    <HookValue>
      {value.loading ? "Loading token…" : (value.token?.name ?? value.error ?? "Token not found")}
    </HookValue>
  )
}
function ProjectsHookDemo() {
  const value = useProjects({ chain: "tezos:mainnet", limit: 2 })
  return (
    <HookValue>
      {value.loading ? "Loading projects…" : `${value.projects.length} projects loaded`}
    </HookValue>
  )
}
function ProjectHookDemo() {
  const value = useProject({ chain: "tezos:mainnet", id: "v3:13623" })
  return (
    <HookValue>
      {value.loading ? "Loading project…" : (value.project?.name ?? value.error ?? "Project ready")}
    </HookValue>
  )
}
function GatewayHookDemo() {
  const value = useGatewayImage(null, SAMPLE_TOKEN.chain)
  return <HookValue>{value.failed ? "Fallback exhausted" : (value.src ?? "Resolving…")}</HookValue>
}
function ArtworkHookDemo() {
  const value = useArtworkFrame(SAMPLE_TOKEN)
  return <HookValue>{`${value.status.kind}; ${value.playing ? "playing" : "stopped"}`}</HookValue>
}

function ComponentDemo({ name }: { name: string }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("newest")
  if (name.startsWith("use") || name === "WhitehashProvider") return <HookDemo name={name} />
  if (name === "Button")
    return <Button onClick={() => setOpen(value => !value)}>{open ? "Pressed" : "Press me"}</Button>
  if (name === "Badge") return <Badge variant="success">on-chain</Badge>
  if (name === "MarketStats") return <MarketDemo />
  if (name === "Card")
    return (
      <Card.Root className="max-w-xs">
        <Card.Media className="h-24" />
        <Card.Body>
          <Card.Title>Composable card</Card.Title>
        </Card.Body>
      </Card.Root>
    )
  if (name === "ToggleGroup" || name === "SortToggle")
    return <SortToggle order={value as "newest" | "oldest"} onChange={setValue} />
  if (name === "Field" || name === "Input")
    return (
      <Field.Root>
        <Field.Label>Wallet</Field.Label>
        <Field.Control render={<Input placeholder="tz1… or 0x…" />} />
      </Field.Root>
    )
  if (name === "Textarea") return <Textarea defaultValue="One gateway per line" />
  if (name === "Dialog")
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open dialog</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <Dialog.Content>
            <Dialog.Title>Composable dialog</Dialog.Title>
            <Dialog.Close render={<Button className="mt-4" />}>Close</Dialog.Close>
          </Dialog.Content>
        </Dialog>
      </>
    )
  if (name === "Tooltip")
    return (
      <Tooltip.Root>
        <Tooltip.Trigger render={<Button variant="secondary" />}>Hover or focus</Tooltip.Trigger>
        <Tooltip.Content>Tezos · Ethereum · Base</Tooltip.Content>
      </Tooltip.Root>
    )
  if (name === "Spinner") return <Spinner />
  if (name === "Skeleton") return <Skeleton className="h-16 w-full" />
  if (name === "Separator") return <Separator />
  if (name === "Artwork")
    return (
      <Artwork.Root token={SAMPLE_TOKEN} className="max-w-md">
        <Artwork.Image />
        <Artwork.Live />
        <Artwork.PlayButton />
        <Artwork.StatusBadge />
      </Artwork.Root>
    )
  if (name === "TokenDetails") return <TokenDetails token={SAMPLE_TOKEN} />
  if (name === "WalletGallery")
    return <WalletGallery address="tz1c3hFmjFSwunjLHECnYyjr42KRt5YiHrGX" />
  if (name === "ProjectBrowser") return <ProjectBrowser chain="tezos:mainnet" />
  if (name === "ProjectGallery")
    return <ProjectGallery project={{ chain: "tezos:mainnet", id: "v3:13623" }} />
  if (name === "AddressSearch") return <AddressSearch onSubmit={() => setOpen(true)} />
  if (name === "WalletSearch")
    return (
      <>
        <Button onClick={() => setOpen(true)}>Search wallet</Button>
        <WalletSearch open={open} onOpenChange={setOpen} onSubmit={() => undefined} />
      </>
    )
  if (name === "Callout")
    return <Callout>RPCs, indexers, and gateways are public and configurable.</Callout>
  if (name === "CodeBlock")
    return <CodeBlock code="const client = createWhitehashClient(config)" language="ts" />
  return (
    <p className="text-sm text-muted">
      This page is rendered inside the live {name} documentation surface.
    </p>
  )
}

export function ApiDocPage({ entry }: { entry: ApiEntry }) {
  return (
    <DocsPage>
      <DocsHeading eyebrow={entry.group} title={entry.name} description={entry.description} />
      <DocsSection title="Usage">
        <CodeBlock code={codeFor(entry.name)} />
      </DocsSection>
      <ApiDetails name={entry.name} />
      <DocsSection title="Live result">
        <LiveDemo>
          <ComponentDemo name={entry.name} />
        </LiveDemo>
      </DocsSection>
    </DocsPage>
  )
}

function ApiDetails({ name }: { name: string }) {
  if (name === "useMarketIndex")
    return (
      <>
        <DocsSection title="Return value">
          <CodeBlock
            language="ts"
            code={`{
  index: MarketIndex | null
  loading: boolean
  error: string | null
  refresh(): void
}`}
          />
        </DocsSection>
        <DocsSection title="Where the index comes from">
          <div className="docs-prose">
            <p>
              A market index is an artifact your application owns rather than a chain read, so the
              hook takes a source instead of a project reference. One application serves a file from
              a CDN, another serves many indexes from a database, a third already holds one in
              memory. Pass <code>null</code> to skip loading.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            language="tsx"
            code={`// A file you host
useMarketIndex("/market-index.json")

// Your own API, one artifact per project. The key identifies the index, so an
// inline load closure does not restart the request on every render.
useMarketIndex({
  key: \`\${chain}/\${id}\`,
  load: () => fetch(\`/api/market/\${chain}/\${id}\`).then(response => response.json()),
})

// An index you already have
useMarketIndex(index)`}
          />
          <div className="docs-prose mt-4">
            <p>
              Anything fetched or loaded goes through <code>parseMarketIndex</code>, so a truncated
              or foreign payload surfaces as <code>error</code> instead of a broken render. An index
              passed in directly is trusted; validate it yourself if it came from untrusted JSON.
              Use <code>loadMarketIndex</code> for the same fetch outside React.
            </p>
          </div>
        </DocsSection>
      </>
    )
  if (name === "MarketStats")
    return (
      <>
        <DocsSection title="Parts">
          <CodeBlock
            language="tsx"
            code={`MarketStats.Root          // provides the index and its chain currency
MarketStats.Tiles         // the default stat set, in a responsive grid
MarketStats.Floor         // individual tiles
MarketStats.Listed
MarketStats.Median
MarketStats.Volume        // span="24h" | "7d" | "30d" | "all" | …
MarketStats.Sales
MarketStats.HighestSale
MarketStats.LowestSale
MarketStats.FloorChart    // daily floor, with a crosshair
MarketStats.VolumeChart   // daily traded volume
MarketStats.Events        // newest-first history; limit={25}
MarketStats.Tile          // label/value cell for your own arrangements
MarketStats.Delta         // signed percentage, colored by direction`}
          />
        </DocsSection>
        <DocsSection title="Currency is handled for you">
          <div className="docs-prose">
            <p>
              Every money field in an index is a base-unit string, mutez on Tezos and wei on EVM.
              The parts format them with the chain the index came from, so your code never converts.
              The same helpers are exported from <code>@whitehash/market</code> if you render your
              own layout.
            </p>
            <p>
              <code>FloorChart</code> renders nothing when active listings are unavailable, which is
              the case on Ethereum and Base: fxhash listings there are signed off-chain, so only
              sales can be recovered. <code>Floor</code> and <code>Listed</code> say so on the tile.
            </p>
          </div>
        </DocsSection>
      </>
    )
  if (name === "useToken")
    return (
      <>
        <DocsSection title="Return value">
          <CodeBlock
            language="ts"
            code={`{
  token: WhitehashToken | null
  loading: boolean
  error: string | null
  refresh(): void
}`}
          />
        </DocsSection>
        <DocsSection title="Identity is explicit">
          <div className="docs-prose">
            <p>
              Pass the token&rsquo;s <code>chain</code>, <code>contract</code>, and{" "}
              <code>tokenId</code>. Pass <code>null</code> while a route or selection is incomplete;
              the hook clears its result without issuing a request.
            </p>
          </div>
        </DocsSection>
      </>
    )
  if (name === "useWalletTokens")
    return (
      <>
        <DocsSection title="Return value">
          <CodeBlock
            language="ts"
            code={`{
  state: {
    address: string
    tokens: WhitehashToken[]
    chains: Record<ChainId, {
      status: "idle" | "loading" | "cached" | "done" | "error"
      message: string
      tokens: WhitehashToken[]
      fromCache: boolean
    }>
  } | null
  loading: boolean
  refresh(): void
}`}
          />
        </DocsSection>
        <DocsSection title="Behavior">
          <div className="docs-prose">
            <p>
              The address selects its Tezos or EVM family. Whitehash reads only known fxhash
              contracts, normalizes every generation into <code>WhitehashToken</code>, and can show
              cached results while each chain refreshes independently.
            </p>
            <p>
              The address is always the <strong>owner</strong>. Passing an NFT contract asks for
              tokens owned by that contract; it does not filter a collection.
            </p>
          </div>
        </DocsSection>
        <DocsSection title="Limit the query">
          <CodeBlock
            code={`const wallet = useWalletTokens(address, {
  mode: "mainnet",
  chains: ["tezos:mainnet"], // skip address-based detection
  client,                   // optional custom WhitehashClient
  cache,                    // optional memory or IndexedDB cache
})`}
          />
        </DocsSection>
        <Callout>
          Need the exact contracts and fallback path? See{" "}
          <Link className="docs-text-link" href="/understand/sources">
            Where data comes from
          </Link>
          .
        </Callout>
      </>
    )
  if (name === "useProjects")
    return (
      <>
        <DocsSection title="List projects on one chain">
          <div className="docs-prose">
            <p>
              <code>useProjects</code> discovers projects published by the configured fxhash issuer
              for the selected chain and returns normalized <code>WhitehashProject</code> values.
            </p>
            <p>
              Use <code>version</code> to select a Tezos issuer generation. On EVM chains,{" "}
              <code>project.id</code> is the collection contract.
            </p>
          </div>
          <CodeBlock
            className="mt-5"
            code={`const result = useProjects({
  chain: "eip155:8453",
  order: "newest",
  limit: 12,
})

result.projects[0]
// { chain: "eip155:8453", id: "0x…", name: … }

result.hasMore && result.loadMore()`}
          />
        </DocsSection>
        <Callout>
          Project discovery is scoped to verified fxhash issuers. Their addresses are listed in{" "}
          <Link className="docs-text-link" href="/understand/sources">
            Where data comes from
          </Link>
          .
        </Callout>
      </>
    )
  if (name === "useProject")
    return (
      <>
        <DocsSection title="Pass project identity directly">
          <div className="docs-prose">
            <p>
              <code>useProject</code> accepts the project&rsquo;s <code>chain</code> and{" "}
              <code>id</code>. For Ethereum and Base, <code>id</code> is the ERC-721 collection
              contract. For Tezos, it is an issuer entry such as <code>v3:13623</code>.
            </p>
          </div>
          <CodeBlock
            className="mt-5"
            code={`const result = useProject({
  chain: "eip155:1",
  id: "0xBb47F0ED4A7E3BffcA75660dFa3B053FB7FcE78E",
})`}
          />
        </DocsSection>
        <DocsSection title="What the hook reads">
          <div className="docs-prose">
            <p>
              The hook fetches project metadata and the first page of minted iterations in parallel.
              It returns <code>project</code>, <code>tokens</code>, <code>loading</code>,{" "}
              <code>error</code>, <code>hasMore</code>, and <code>loadMore</code>.
            </p>
            <p>
              Framework-free token reads follow the same pattern: pass <code>chain</code>,{" "}
              <code>contract</code>, and <code>tokenId</code> directly to{" "}
              <code>client.getToken()</code>.
            </p>
          </div>
        </DocsSection>
      </>
    )
  if (name === "WhitehashProvider")
    return (
      <DocsSection title="Configuration boundary">
        <p className="docs-prose">
          <code>WhitehashProvider</code> works without configuration. It selects mainnet, bundled
          third-party endpoints, default IPFS gateways, and browser-persistent caching. Pass only
          the values you want to override.
        </p>
        <CodeBlock
          className="mt-5"
          code={`const config = {
  mode: "mainnet",
  resolver: {
    ipfsGateways: ["https://ipfs.io", "https://dweb.link"],
    onchfs: { mode: "service-worker" },
  },
  tzkt: { "tezos:mainnet": "https://api.tzkt.io" },
  evm: { rpcs: { "eip155:8453": [process.env.NEXT_PUBLIC_BASE_RPC!] } },
}`}
        />
      </DocsSection>
    )
  if (name === "useGatewayImage")
    return (
      <DocsSection title="Fallback behavior">
        <p className="docs-prose">
          The hook turns an <code>ipfs://</code> URI into one HTTP URL per configured gateway.
          Attach <code>onError</code> to the image: each browser error advances to the next URL.
          HTTP, data, and blob URLs pass through unchanged; onchfs uses the configured service
          worker or proxy and needs the token chain as a routing hint.
        </p>
        <CodeBlock
          className="mt-5"
          code={`const image = useGatewayImage(token.displayUri, token.chain)

if (image.failed) return <ImageUnavailable />
return <img src={image.src} onError={image.onError} alt="" />`}
        />
      </DocsSection>
    )
  if (name === "useArtworkFrame")
    return (
      <DocsSection title="Image and live artwork are different">
        <p className="docs-prose">
          Display and thumbnail URIs are static previews. The artifact URI is executable HTML and
          becomes the iframe URL. <code>useArtworkFrame</code> applies the token seed, checks
          whether onchfs resolution is available, and supplies the sandbox and device permissions;
          it never puts an artifact HTML URL into an image tag.
        </p>
      </DocsSection>
    )
  if (name === "Artwork")
    return (
      <>
        <DocsSection title="Why a compound component">
          <div className="docs-prose">
            <p>
              Rendering one token safely requires a preview with gateway fallback, an executable
              artifact in a <em>sandboxed</em> iframe with the correct seed, a play/stop lifecycle,
              and explicit handling of unrevealed or unresolvable tokens. <code>Artwork.Root</code>{" "}
              owns that state through <code>useArtworkFrame</code> and shares it with each part. Use
              only the parts you need, or place them inside your own layout.
            </p>
          </div>
        </DocsSection>
        <DocsSection title="Anatomy">
          <div className="understand-table-wrap overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  {["Part", "Renders", "Key props"].map(h => (
                    <th
                      key={h}
                      className="border-b border-line-strong px-3 py-2 font-medium text-fg"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    <code>Artwork.Root</code>,
                    "The container. Required. Owns play state, live-view status, and the token context every other part reads.",
                    <>
                      <code>token: WhitehashToken</code> (required), <code>className</code>
                    </>,
                  ],
                  [
                    <code>Artwork.Image</code>,
                    "The static preview with multi-gateway fallback. Hidden while the live frame plays.",
                    <>
                      <code>source: "thumbnail" | "display"</code> (default display),{" "}
                      <code>alt</code>, <code>className</code>
                    </>,
                  ],
                  [
                    <code>Artwork.Live</code>,
                    "The sandboxed iframe running the artifact URL (seed + params applied). Mounts only while playing.",
                    <>
                      <code>className</code>; sandbox/allow attributes are supplied for you
                    </>,
                  ],
                  [
                    <code>Artwork.PlayButton</code>,
                    "Play/stop toggle. Renders only when the token is revealed and its artifact is resolvable.",
                    <>
                      <code>playLabel</code>, <code>stopLabel</code>, <code>className</code>
                    </>,
                  ],
                  [
                    <code>Artwork.StatusBadge</code>,
                    "Why there is no live view: unrevealed token, or onchfs without a resolver. Renders nothing when playable.",
                    <>
                      <code>className</code>
                    </>,
                  ],
                ].map((row, i) => (
                  <tr key={i} className="align-top">
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className="border-b border-line px-3 py-3 text-muted [&_code]:text-fg"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DocsSection>
        <DocsSection title="Minimal vs. full">
          <CodeBlock
            language="tsx"
            code={`// Minimal: just the live artwork with its play control
<Artwork.Root token={token}>
  <Artwork.Image />
  <Artwork.Live />
  <Artwork.PlayButton />
</Artwork.Root>

// Inside your own card. Parts are position-independent.
<Card.Root>
  <Card.Media>
    <Artwork.Root token={token} className="size-full rounded-none border-0">
      <Artwork.Image source="thumbnail" />
    </Artwork.Root>
  </Card.Media>
  <Card.Body><Card.Title>{token.name}</Card.Title></Card.Body>
</Card.Root>`}
          />
        </DocsSection>
        <DocsSection title="What Root decides for you">
          <div className="docs-prose">
            <p>
              From the token alone, <code>Root</code> derives: the preview URL (gateways in your
              configured order), the live URL (<code>artworkUrl</code>, v1 seed applied, ipfs/onchfs
              resolved), and the status: <code>ok</code>, <code>unrevealed</code> (placeholder
              token), or <code>needs-onchfs</code> (artifact is on-chain but no resolver is
              enabled). The iframe always ships{" "}
              <code>sandbox="allow-scripts allow-same-origin allow-modals"</code> plus the
              device-permission allowlist generative pieces expect.
            </p>
          </div>
        </DocsSection>
      </>
    )
  return null
}

const GUIDES: Record<
  string,
  { title: string; description: string; code: string; language?: string }
> = {
  "getting-started": {
    title: "Getting started",
    description: "Render one real fxhash token in a React page.",
    code: `pnpm add @whitehash/ui @whitehash/react`,
    language: "bash",
  },
  configuration: {
    title: "Configuration",
    description: "Start with the defaults, then change only the services you need to control.",
    code: `<WhitehashProvider>
  <App />
</WhitehashProvider>`,
  },
  cli: {
    title: "Archive CLI",
    description:
      "Choose a portable JSON index for a website, or a self-contained archive for offline preservation.",
    code: `# Build a website index
npx @whitehash/archive project v2:13944

# Preserve one token offline
npx @whitehash/archive \\
  "https://www.fxhash.xyz/gentk/KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE-16333"`,
    language: "bash",
  },
  market: {
    title: "Market history",
    description:
      "Backfill one project's listings, offers, sales and mints from public infrastructure, then render them.",
    code: `# Write market-index-v2-13944.json and its .sqlite sibling
npx @whitehash/archive market v2:13944

# Resolve an fxhash project slug first
npx @whitehash/archive market blokkendoos --resolver fxhash

# Extend an existing artifact from its saved cursors
npx @whitehash/archive market v2:13944 --update market-index-v2-13944.json`,
    language: "bash",
  },
  theming: {
    title: "Theming and tokens",
    description: "Change colors, spacing, and type without rewriting the components.",
    code: `:root {
  --color-canvas: #000;
  --color-surface: #000;
  --color-surface-2: #1a1a1a;
  --color-elevated: #1f1f1f;
  --color-line: #ffffff24;
  --color-line-strong: #ffffff3d;
  --color-fg: #f4e7d8;
  --color-muted: #a0a0a0;
  --color-faint: #7d7d7d;
  --color-primary: #f4e7d8;
  --color-primary-hover: #fff;
  --color-primary-fg: #090c0a;
  --color-warning: #ffae00;
  --color-success: #00ca50;
  --color-danger: #ff565f;
  --color-ring: #47a8ff;
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-card: 12px;
  --font-sans: "Geist Sans", sans-serif;
  --font-display: "Geist Sans", sans-serif;
  --font-mono: "Geist Mono", monospace;
}`,
  },
  onchfs: {
    title: "Onchfs",
    description:
      "Choose a client-side service worker or a self-hosted proxy to resolve onchfs:// artwork.",
    code: `// Client-side browser resolution
const clientConfig = {
  resolver: {
    onchfs: { mode: "service-worker" },
  },
}

// Your own HTTP endpoint
const serverConfig = {
  resolver: {
    onchfs: { mode: "proxy", baseUrl: "https://onchfs.example.com" },
  },
}`,
  },
  variations: {
    title: "Explore variations",
    description: "Try the original generator with a different seed or settings in the browser.",
    code: `import { BlockchainType, createRuntimeConnector } from "@whitehash/runtime"
import { ArtworkIframe, useRuntimeController } from "@whitehash/runtime/react"

const connector = createRuntimeConnector({
  resolveUri: uri => client.resolveUri(uri, { chain: token.chain }),
})
const runtime = useRuntimeController({
  state: {
    cid: token.generatorUri!,
    chain: BlockchainType.TEZOS,
    hash: token.iterationHash!,
    definition: token.raw.params,
  },
  options: { connector, autoRefresh: true },
})

return <ArtworkIframe ref={runtime.ref} />`,
  },
  capture: {
    title: "Capture engine",
    description:
      "Create repeatable PNG or GIF images from generative artwork in a background browser.",
    code: `pnpm add @whitehash/capture puppeteer-core`,
    language: "bash",
  },
}

export function GuidePage({ slug }: { slug: string }) {
  const guide = GUIDES[slug] ?? GUIDES["getting-started"]!
  const firstSection =
    slug === "getting-started" || slug === "capture"
      ? "Install"
      : slug === "configuration"
        ? "The default"
        : slug === "market"
          ? "Index a project"
          : slug === "cli"
            ? "Start with one command"
            : slug === "onchfs"
              ? "Choose a resolver"
              : "Example"
  return (
    <DocsPage>
      <DocsHeading eyebrow="Guide" title={guide.title} description={guide.description} />
      <DocsSection title={firstSection}>
        {slug === "onchfs" && (
          <div className="docs-prose mb-4">
            <p>
              Resolve <code>onchfs://</code> URLs in one of two ways: run the worker in the browser,
              or host an HTTP proxy endpoint for your app and server-side tools. Choose the one that
              fits your deployment.
            </p>
          </div>
        )}
        <CodeBlock
          code={guide.code}
          language={guide.language ?? (slug === "theming" ? "css" : "tsx")}
        />
      </DocsSection>
      <GuideDetails slug={slug} />
    </DocsPage>
  )
}

function GuideDetails({ slug }: { slug: string }) {
  if (slug === "market")
    return (
      <>
        <DocsSection title="What it reads">
          <div className="docs-prose">
            <p>
              On Tezos the command reads the fxhash marketplace contracts through TzKT and recovers
              the full order book: listings, offers, collection offers, their cancels and accepts,
              plus every mint. Mints are searched across all issuer generations, because older
              projects kept minting on the contract they launched with.
            </p>
            <p>
              On Ethereum and Base it walks the collection&rsquo;s own transfers and decodes the
              Seaport fills and mint purchases in those transactions. Sales and mints both come
              back; active listings do not, because fxhash listings there are signed off-chain and
              never touch the chain. Stats mark that with <code>listingsAvailable: false</code>, and
              floor, median, and listed count read as unavailable rather than zero.
            </p>
          </div>
        </DocsSection>
        <DocsSection title="Artifacts and incremental runs">
          <div className="docs-prose">
            <p>
              Each run writes a versioned <code>whitehash-market-index@1</code> JSON file and a
              queryable SQLite sibling. Both carry a resume height per chain, so{" "}
              <code>--update</code> fetches only what happened since. Add <code>--json-only</code>{" "}
              to skip SQLite, and <code>--source rpc</code> to force a trustless log scan instead of
              Blockscout, which needs an archive-capable endpoint.
            </p>
          </div>
        </DocsSection>
        <DocsSection title="Display it">
          <div className="docs-prose">
            <p>
              <code>useMarketIndex</code> loads and validates an artifact your app hosts, and the{" "}
              <code>MarketStats</code> parts render it. Prices arrive as base units, mutez or wei,
              and every part formats them with the chain the index came from.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            language="tsx"
            code={`import { useMarketIndex } from "@whitehash/react"
import { MarketStats } from "@whitehash/ui"

function Market() {
  const { index, loading, error } = useMarketIndex("/market-index.json")
  if (loading) return <p>Loading…</p>
  if (error || !index) return <p>{error ?? "Not found"}</p>

  return (
    <MarketStats.Root index={index}>
      <MarketStats.Tiles />
      <MarketStats.FloorChart />
      <MarketStats.VolumeChart />
      <MarketStats.Events limit={25} />
    </MarketStats.Root>
  )
}`}
          />
        </DocsSection>
        <DocsSection title="How the numbers are defined">
          <div className="docs-prose">
            <p>
              The statistics follow fxhash&rsquo;s own definitions, so a floor here means the same
              thing it does on fxhash: the lowest price among listings active at the moment the
              index was built. Volume buckets are cumulative per span, and a period&rsquo;s change
              compares it with the span immediately before it.
            </p>
            <p>
              Two deliberate differences: the highest and lowest sale compare native base units
              rather than converted USD, because this toolkit keeps no historical exchange rates,
              and Tezos mint prices record the tez actually paid.
            </p>
          </div>
        </DocsSection>
      </>
    )
  if (slug === "getting-started")
    return (
      <>
        <DocsSection title="Before you start">
          <div className="docs-prose">
            <p>
              This guide assumes <strong>React 18.3+</strong>. The first render needs no API key,
              backend, wallet connection, or <code>fxhash</code> dependency.
            </p>
          </div>
        </DocsSection>
        <DocsSection title="1. Add the provider">
          <div className="docs-prose">
            <p>
              Mount <code>WhitehashProvider</code> once near your app&rsquo;s root. The defaults are
              ready for the first render; add configuration when you need to control a service.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            code={`"use client"
import { WhitehashProvider } from "@whitehash/ui"
import "@whitehash/ui/styles.css"

<WhitehashProvider>…</WhitehashProvider>`}
          />
        </DocsSection>
        <DocsSection title="2. Render one artwork">
          <div className="docs-prose">
            <p>
              Give <code>useToken</code> a chain, contract, and token ID, then pass the normalized
              token to <code>Artwork</code>. The component coordinates the preview, seeded live
              iframe, play state, and unrevealed state.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            code={`import { useToken } from "@whitehash/react"
import { Artwork } from "@whitehash/ui"

function FirstArtwork() {
  const { token, loading, error } = useToken({
    chain: "tezos:mainnet",
    contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
    tokenId: "16333",
  })

  if (loading) return <p>Loading…</p>
  if (error || !token) return <p>{error ?? "Token not found"}</p>

  return (
    <Artwork.Root token={token}>
      <Artwork.Image />
      <Artwork.Live />
      <Artwork.PlayButton />
      <Artwork.StatusBadge />
    </Artwork.Root>
  )
}`}
          />
        </DocsSection>
        <DocsSection title="The result">
          <LiveDemo>
            <Artwork.Root token={SAMPLE_TOKEN} className="max-w-md">
              <Artwork.Image />
              <Artwork.Live />
              <Artwork.PlayButton />
              <Artwork.StatusBadge />
            </Artwork.Root>
          </LiveDemo>
          <div className="docs-prose mt-4">
            <p>
              The image appears first. <strong>Run live</strong> swaps in the correctly seeded
              artwork inside a restricted iframe. If the token is unrevealed or needs onchfs before
              it can run, the component says so instead of failing silently.
            </p>
          </div>
        </DocsSection>
        <DocsSection title="3. Use the identity you already have">
          <div className="docs-prose">
            <p>
              <code>useToken</code> is the direct path. If your application starts with a collector
              or project, discovery APIs return the same token shape:
            </p>
          </div>
          <div className="mt-4">
            <Table
              head={["You have", "Use"]}
              rows={[
                ["A collector address", <code>useWalletTokens(address)</code>],
                ["A project", <code>useProject(&lbrace; chain, id &rbrace;).tokens</code>],
                [
                  "Exact token identity",
                  <code>useToken(&lbrace; chain, contract, tokenId &rbrace;)</code>,
                ],
              ]}
            />
          </div>
          <div className="docs-prose mt-4">
            <p>
              Refs are optional serialized values for routes and paste fields. Normal reads use the
              identity fields already present on projects and tokens.
            </p>
          </div>
        </DocsSection>
        <DocsSection title="What the component handles">
          <CodeBlock
            language="text"
            code={`WhitehashToken
  → resolve the preview through ordered IPFS gateways
  → build the seeded live-artifact URL
  → preserve fx(params) and gentk-v1 seed quirks
  → sandbox the executable iframe
  → expose unrevealed and onchfs states`}
          />
          <div className="docs-prose mt-4">
            <p>
              The read path does not depend on a hosted service. Continue to{" "}
              <Link className="docs-text-link" href="/understand/overview">
                understand how it works
              </Link>
              , or inspect the complete{" "}
              <Link className="docs-text-link" href="/docs/artwork">
                Artwork anatomy
              </Link>
              .
            </p>
          </div>
        </DocsSection>
      </>
    )
  if (slug === "configuration")
    return (
      <>
        <Callout>
          <code>&lt;WhitehashProvider&gt;</code> ships with production-ready defaults for mainnet,
          public indexers and RPCs, and IPFS gateways. Override any dependency you want to control.
        </Callout>
        <DocsSection title="Use testnets">
          <div className="docs-prose">
            <p>
              Change <code>mode</code> when an address lookup should target Ghostnet, Sepolia, and
              Base Sepolia. Project and token identities already carry their chain explicitly.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            code={`<WhitehashProvider config={{ mode: "testnet" }}>
  <App />
</WhitehashProvider>`}
          />
        </DocsSection>
        <DocsSection title="Use your IPFS gateway">
          <div className="docs-prose">
            <p>
              Provide gateway roots in fallback order. If omitted, the bundled defaults remain
              active.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            code={`<WhitehashProvider config={{
  resolver: {
    ipfsGateways: ["https://your-gateway.example", "https://ipfs.io"],
  },
}}>
  <App />
</WhitehashProvider>`}
          />
        </DocsSection>
        <DocsSection title="Render onchfs artwork">
          <div className="docs-prose">
            <p>
              <code>onchfs</code> is the only intentionally disabled capability because browsers
              need a service worker or HTTP proxy to load its custom URI scheme. Follow the{" "}
              <Link className="docs-text-link" href="/guide/onchfs">
                onchfs guide
              </Link>{" "}
              to enable it.
            </p>
          </div>
        </DocsSection>
        <DocsSection title="All defaults">
          <Table
            head={["Setting", "Default", "What it controls"]}
            rows={[
              [
                <code>mode</code>,
                <code>"mainnet"</code>,
                <>Wallet lookups use Tezos mainnet, Ethereum, and Base</>,
              ],
              [
                <code>resolver.ipfsGateways</code>,
                <>
                  <code>ipfs.io</code>, then <code>dweb.link</code>
                </>,
                <>Metadata and image fallback order</>,
              ],
              [
                <code>resolver.onchfs</code>,
                <code>null</code>,
                <>Onchfs playback is opt-in because it requires worker assets or your proxy</>,
              ],
              [
                <code>tzkt</code>,
                <>Public TzKT mainnet/Ghostnet endpoints</>,
                <>Tezos ownership and project reads</>,
              ],
              [
                <code>evm.ownershipSource</code>,
                <code>"blockscout"</code>,
                <>Public Blockscout first, then JSON-RPC fallback</>,
              ],
              [
                <code>evm.rpcs</code>,
                <>Bundled public RPC lists per EVM chain</>,
                <>Ethereum, Sepolia, Base, and Base Sepolia reads</>,
              ],
              [<code>concurrency</code>, <code>8</code>, <>Parallel metadata fetches</>],
              [
                <>React cache</>,
                <>IndexedDB in the browser</>,
                <>Cached data appears before a live refresh</>,
              ],
            ]}
          />
        </DocsSection>
        <DocsSection title="Defaults exposed by the API">
          <div className="docs-prose">
            <p>
              Use the exported constants when application code, tests, or a framework-free client
              need to inspect the same values.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            code={`import {
  DEFAULT_NETWORK_MODE, // "mainnet"
  MAINNET_CHAINS,       // Tezos mainnet, Ethereum, Base
  TESTNET_CHAINS,       // Ghostnet, Sepolia, Base Sepolia
  TEZOS_NETWORKS,       // contracts + default TzKT endpoints
  EVM_NETWORKS,         // factories + default RPC lists
  defaultChainReaderConfig,
} from "@whitehash/chain-reader"`}
          />
        </DocsSection>
        <DocsSection title="Framework-free client">
          <div className="docs-prose">
            <p>
              The React provider fills defaults for you. The lower-level client keeps configuration
              explicit; use the exported factory when you want the same defaults.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            code={`import {
  createWhitehashClient,
  defaultChainReaderConfig,
} from "@whitehash/chain-reader"

const client = createWhitehashClient(defaultChainReaderConfig())`}
          />
        </DocsSection>
        <DocsSection title="IPFS gateway order">
          <div className="docs-prose">
            <p>
              Gateway roots do not include <code>/ipfs/</code>. Whitehash appends the CID and path,
              preserving query strings and fragments. Metadata and image requests advance through
              the array in order.
            </p>
            <p>HTTP, data, and blob URLs pass through unchanged.</p>
          </div>
        </DocsSection>
        <DocsSection title="One-off override">
          <CodeBlock
            code={`const defaults = defaultChainReaderConfig()
const client = createWhitehashClient({
  ...defaults,
  resolver: {
    ...defaults.resolver,
    ipfsGateways: [temporaryGateway],
  },
})

const wallet = useWalletTokens(address, { client })`}
          />
        </DocsSection>
      </>
    )
  if (slug === "cli")
    return (
      <>
        <DocsSection title="Choose your outcome">
          <div className="docs-prose">
            <p>
              Start with the result you need. The index commands describe artwork for a hosted
              application; the archive commands collect the files needed to keep and replay it
              offline.
            </p>
          </div>
          <div className="mt-4">
            <Table
              head={["If you need to…", "Use", "You get"]}
              rows={[
                [
                  "Load artwork on a website",
                  <>
                    <code>--json</code>, <code>project</code>, or <code>token</code>
                  </>,
                  "Portable JSON with normalized identities, metadata, and content-addressed URIs; not artwork bytes",
                ],
                [
                  "Keep artwork available offline",
                  <>
                    An identity-bearing token URL or <code>wallet</code>
                  </>,
                  "A self-contained archive with artwork assets, previews, integrity data, and offline replay support",
                ],
              ]}
            />
          </div>
        </DocsSection>
        <DocsSection title="How the JSON formats align">
          <div className="docs-prose">
            <p>
              Both index formats are designed for hosted applications, not offline preservation.
              They use the same normalized <code>project</code> and token shapes. A project index
              stores tokens in <code>iterations[]</code>; a token index stores one token at{" "}
              <code>token</code>. Missing chain metadata is written as <code>null</code>, never
              silently omitted.
            </p>
            <p>
              For Tezos tokens, the CLI follows the gentk contract&rsquo;s{" "}
              <code>token_data.issuer_id</code> back to the issuer project and loads its capture
              settings. For EVM tokens, the collection contract is the project ID, but capture
              settings remain <code>null</code> when the public collection/token metadata does not
              publish them.
            </p>
          </div>
          <div className="mt-5">
            <Table
              head={["Field", "Project index", "Token index"]}
              rows={[
                [
                  <code>format</code>,
                  <code>whitehash-project-index@1</code>,
                  <code>whitehash-token-index@1</code>,
                ],
                [<code>generatedAt</code>, "ISO timestamp", "ISO timestamp"],
                [
                  <code>project</code>,
                  "Normalized project metadata",
                  "The same normalized project metadata",
                ],
                [
                  <code>project.captureSettings</code>,
                  "Normalized project capture configuration or null",
                  "The same configuration when discoverable from the parent project",
                ],
                [<code>token data</code>, <code>iterations[].token</code>, <code>token</code>],
                [
                  <code>raw</code>,
                  "Original metadata on every token",
                  "Original metadata on the token",
                ],
                [
                  <code>pagination</code>,
                  <code>order, complete, nextCursor</code>,
                  "Not applicable",
                ],
              ]}
            />
          </div>
        </DocsSection>
        <DocsSection title="Index a project">
          <div className="docs-prose">
            <p>
              Tezos project IDs such as <code>v2:13944</code> identify their chain automatically.
              For EVM projects, prefix the collection address with <code>base:</code> or{" "}
              <code>ethereum:</code>.
            </p>
            <p>
              The CLI follows every discovery cursor and writes the versioned{" "}
              <code>whitehash-project-index@1</code> format. It includes normalized project data,
              display-ready iterations, and original token metadata for fields such as fx(params)
              that are not normalized yet. The project reader&rsquo;s provider envelope is omitted.
            </p>
            <p>
              Every iteration retains its canonical <code>chain</code>, <code>contract</code>, and{" "}
              <code>tokenId</code>. Use the static metadata immediately, or refresh that identity
              from chain when freshness matters.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            language="bash"
            code={`npx @whitehash/archive project v2:13944 \\
  --out ./public/monogrid.json`}
          />
          <div className="docs-prose mt-4">
            <p>
              For a project&rsquo;s market history, the <code>market</code> command writes listings,
              offers, sales, mints, and derived statistics into their own artifact. See the{" "}
              <a className="docs-text-link" href="/guide/market">
                market history guide
              </a>
              .
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            language="json"
            code={`{
  "format": "whitehash-project-index@1",
  "generatedAt": "2026-07-23T12:00:00.000Z",
  "order": "oldest",
  "project": {
    "chain": "tezos:mainnet",
    "id": "v2:13944",
    "name": "Monogrid 1.1",
    "description": "…",
    "displayUri": "ipfs://…",
    "thumbnailUri": "ipfs://…",
    "editions": 256,
    "minted": 256,
    "captureSettings": {
      "mode": "VIEWPORT",
      "triggerMode": "DELAY",
      "gpu": false,
      "resolution": { "x": 800, "y": 800 },
      "delay": 2000
    }
  },
  "iterations": [
    {
      "position": 1,
      "token": {
        "chain": "tezos:mainnet",
        "contract": "KT1…",
        "tokenId": "12345",
        "name": "Monogrid 1.1 #0",
        "description": "…",
        "iterationHash": "oo…",
        "artifactUri": "ipfs://…",
        "displayUri": "ipfs://…",
        "thumbnailUri": "ipfs://…",
        "generatorUri": "ipfs://…",
        "attributes": [{ "name": "Palette", "value": "Blue" }],
        "assigned": true,
        "metadataUri": null,
        "raw": { "original": "metadata remains available here" }
      }
    }
  ],
  "complete": true,
  "nextCursor": null
}`}
          />
        </DocsSection>
        <DocsSection title="Display an indexed project">
          <div className="docs-prose">
            <p>
              Validate imported or fetched JSON before using it. Lookup is a direct array access and
              returns the ordinary <code>WhitehashToken</code> shape expected by{" "}
              <code>Artwork</code>.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            code={`import {
  parseProjectIndex,
} from "@whitehash/chain-reader"
import { Artwork } from "@whitehash/ui"

const projectJson = await fetch("/monogrid.json").then(response => response.json())
const { iterations } = parseProjectIndex(projectJson)
const token = iterations[24]?.token

return token ? (
  <Artwork.Root token={token}>
    <Artwork.Image />
    <Artwork.Live />
    <Artwork.PlayButton />
  </Artwork.Root>
) : null`}
          />
        </DocsSection>
        <DocsSection title="Build a website index for one token">
          <div className="docs-prose">
            <p>
              Paste an identity-bearing token URL with <code>--json</code> to write the smaller{" "}
              <code>whitehash-token-index@1</code> format for a hosted website. This normalized JSON
              retains content-addressed URIs; it does not contain the artwork bytes.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            language="bash"
            code={`npx @whitehash/archive \\
  "https://www.fxhash.xyz/gentk/KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE-16333" \\
  --json \\
  --out ./public/token.json

# The existing coordinate form remains available:
npx @whitehash/archive token \\
  KT1U6EHmNxJTkvaWJ4ThczG4FSDaHC21ssvi 784640 \\
  --out ./public/monogrid-1.json`}
          />
          <Callout className="mt-5">
            EVM combined-ID URLs need <code>--chain base</code> or <code>--chain ethereum</code>.
            For a slug-only iteration URL, add <code>--resolver fxhash</code>. That explicit hosted
            convenience recovers the chain, contract, and token ID from fxhash&apos;s hosted service
            before writing the JSON.
          </Callout>
          <CodeBlock
            className="mt-4"
            language="json"
            code={`{
  "format": "whitehash-token-index@1",
  "generatedAt": "2026-07-23T12:00:00.000Z",
  "project": {
    "chain": "tezos:mainnet",
    "id": "v2:13944",
    "name": "monogrid 1.1 CE",
    "description": "…",
    "displayUri": "ipfs://QmXC…",
    "thumbnailUri": "ipfs://QmTz…",
    "editions": 256,
    "minted": 256,
    "captureSettings": {
      "mode": "VIEWPORT",
      "triggerMode": "DELAY",
      "gpu": false,
      "resolution": { "x": 800, "y": 800 },
      "delay": 2000
    }
  },
  "token": {
    "chain": "tezos:mainnet",
    "contract": "KT1U6EHmNxJTkvaWJ4ThczG4FSDaHC21ssvi",
    "tokenId": "784640",
    "name": "monogrid 1.1 CE #1",
    "description": "…",
    "iterationHash": "opas…",
    "artifactUri": "ipfs://QmQt…",
    "displayUri": "ipfs://QmfA…",
    "thumbnailUri": "ipfs://QmaP…",
    "generatorUri": "ipfs://QmQt…",
    "attributes": [{ "name": "Style", "value": "Line" }],
    "assigned": true,
    "metadataUri": null,
    "raw": { "original": "metadata remains available here" }
  }
}`}
          />
        </DocsSection>
        <DocsSection title="Display an indexed token">
          <div className="docs-prose">
            <p>
              Validate the token JSON, extract its normalized token, and pass it directly to{" "}
              <code>Artwork</code>.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            code={`import {
  parseTokenIndex,
} from "@whitehash/chain-reader"
import { Artwork } from "@whitehash/ui"

const json = await fetch("/monogrid-1.json").then(response => response.json())
const { project, token } = parseTokenIndex(json)

return (
  <Artwork.Root token={token}>
    <Artwork.Image />
    <Artwork.Live />
    <Artwork.PlayButton />
  </Artwork.Root>
)`}
          />
        </DocsSection>
        <DocsSection title="Refresh one token from chain">
          <div className="docs-prose">
            <p>
              The index is an acceleration layer, not a new identity system. Resolve its token ref
              through the client when you need the latest reveal or metadata state.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            code={`import {
  createWhitehashClient,
  defaultChainReaderConfig,
  tokenRef,
} from "@whitehash/chain-reader"

const ref = token ? tokenRef(token) : null
const current = ref
  ? await createWhitehashClient(defaultChainReaderConfig()).getToken(ref)
  : null`}
          />
        </DocsSection>
        <DocsSection title="Discover EVM iterations without an indexer">
          <div className="docs-prose">
            <p>
              RPC mode probes the deployed fxhash collection&rsquo;s supply and token-ID boundaries,
              constructs the verified zero- or one-based range, and hydrates those identities
              through on-chain <code>tokenURI</code> calls. A mint-event scan handles non-sequential
              contracts. It bypasses Blockscout for iteration discovery and produces the same index
              format.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            language="bash"
            code={`npx @whitehash/archive project \\
  base:0x50c04A6B066d659Fe2F66F6388Cf8dD394036632 \\
  --direct \\
  --out ./public/dom2.json`}
          />
          <Callout className="mt-5">
            Tezos project indexing currently uses TzKT to query the shared gentk contracts
            precisely. A pure Tezos RPC scan would need to reconstruct the project-to-token
            relationship across shared FA2 storage.
          </Callout>
        </DocsSection>
        <DocsSection title="Preserve artwork offline">
          <div className="docs-prose">
            <p>
              Paste an identity-bearing fxhash token URL to download IPFS CAR files or read onchfs
              bytes from chain, write available preview assets, and produce integrity hashes plus an
              offline wrapper. The identity is parsed locally without an fxhash-hosted service.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            language="bash"
            code={`npx @whitehash/archive \\
  "https://www.fxhash.xyz/gentk/KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE-16333"

npx @whitehash/archive verify ./whitehash-token-16333`}
          />
          <div className="docs-prose mt-5">
            <p>
              The ordinary <code>verify</code> command is deterministic and offline: it checks
              hashes, required files, local references, and path safety. Add the explicit opt-in
              flag below to compare the recorded token snapshot with current public chain data.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            language="bash"
            code={`npx @whitehash/archive verify ./whitehash-token-16333 --onchain`}
          />
          <Callout className="mt-5">
            Live verification reports match, mismatch, unavailable provider, or unverifiable legacy
            archive. It reads the exact recorded chain, contract, and token ID and never guesses an
            EVM chain. The result is current provider-observed state, not a signature, ownership
            check, provider consensus, or historical proof at the archive&rsquo;s creation time.
            Reveal and metadata references may legitimately change.
          </Callout>
          <div className="docs-prose mt-5">
            <p>
              Slug-only iteration links do not contain an on-chain identity. While the fxhash
              website remains available, resolve one explicitly and then run the same archive
              pipeline:
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            language="bash"
            code={`npx @whitehash/archive \\
  "https://fxhash.xyz/iteration/monogrid-1.1-ce-256" \\
  --resolver fxhash`}
          />
          <Callout className="mt-5">
            Hosted resolution is optional and clearly reported. It may stop working if fxhash
            changes its API or page structure, or presents a browser security checkpoint. The
            completed archive remains fully offline; identity-bearing token URLs do not use this
            resolver.
          </Callout>
          <div className="docs-prose mt-5">
            <p>
              For collection-scale preservation, the existing wallet command uses the same archive
              writer and format:
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            language="bash"
            code={`npx @whitehash/archive wallet tz1… \\
  --chains tezos \\
  --out ./whitehash-archive

npx @whitehash/archive verify ./whitehash-archive`}
          />
        </DocsSection>
      </>
    )
  if (slug === "variations")
    return (
      <>
        <DocsSection title="Use the project generator, not the minted artifact">
          <div className="docs-prose">
            <p>
              Open a token from a wallet or project, then choose <strong>Explore</strong>. The
              runtime loads the project’s reusable <code>generativeUri</code> and adds the selected{" "}
              <code>fxhash</code>, minter, iteration, chain, and any published fx(params) to its
              URL.
            </p>
            <p>
              That distinction matters for early gentk tokens: their minted <code>artifactUri</code>{" "}
              can be an iteration-specific capture with the original hash embedded in its HTML. The
              Reading a book demo below uses project v2:86&rsquo;s canonical immutable generator, so{" "}
              <strong>New hash</strong> drives the original artwork rather than a replacement
              fixture.
            </p>
          </div>
        </DocsSection>
        <DocsSection title="Bring your own services">
          <Callout>
            The runtime has no fxhash-hosted default. Its connector accepts an injected{" "}
            <code>resolveUri</code>, plus optional self-hosted emulator or legacy-wrapper bases.
          </Callout>
        </DocsSection>
      </>
    )
  if (slug === "capture")
    return (
      <>
        <Callout>
          <strong>What it reproduces:</strong> the fxhash capture contract: load one artwork in
          Chromium, wait for a delay or <code>fxpreview()</code>, capture the viewport or intrinsic
          canvas, and read its declared features. You choose the browser host and storage provider.
        </Callout>
        <DocsSection title="Capture one viewport">
          <div className="docs-prose">
            <p>
              Use the local provider in development. The final URL is intentionally caller-owned:
              add <code>preview=1</code>, <code>fxcontext=capture</code>, the iteration hash,
              minter, parameter bytes, and any other project inputs before calling the engine.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            code={`import { writeFile } from "node:fs/promises"
import {
  capture,
  CaptureMode,
  CaptureTriggerMode,
} from "@whitehash/capture"
import { localProvider } from "@whitehash/capture/browser/local"

const result = await capture({
  url: "https://art.example/token?preview=1&fxcontext=capture",
  browser: localProvider({ useGl: "egl" }),
  allowlist: ["https://art.example/"],
  settings: {
    mode: CaptureMode.VIEWPORT,
    resolution: { x: 1024, y: 1024 },
    triggerMode: CaptureTriggerMode.FN_TRIGGER,
  },
})

await writeFile("capture.png", result.image)
console.log(result.features, result.triggeredBy, result.timing)`}
          />
          <Callout className="mt-5">
            Configure <code>allowlist</code> on every publicly reachable endpoint. Without it, an
            artwork URL can turn Chromium into an SSRF path to private network services.
          </Callout>
        </DocsSection>
        <DocsSection title="Choose a capture mode">
          <Table
            head={["Mode", "Viewport", "Output", "Use it when"]}
            rows={[
              [
                <code>VIEWPORT</code>,
                <>Requested resolution, 256-2048 px per axis</>,
                <>Exact viewport PNG</>,
                <>Composition includes DOM, CSS, SVG, or WebGL</>,
              ],
              [
                <code>CANVAS</code>,
                <code>800 × 800</code>,
                <>Canvas intrinsic resolution</>,
                <>One readable canvas is the canonical artwork output</>,
              ],
              [
                <code>CUSTOM</code>,
                <>Not applicable</>,
                <>Rejected server-side</>,
                <>Client-side DOM capture needs a separate harness</>,
              ],
            ]}
          />
          <div className="docs-prose mt-5">
            <p>
              Every viewport uses <code>deviceScaleFactor: 1</code>, so requested pixels are output
              pixels. Canvas captures can be much larger than their page viewport; set{" "}
              <code>maxDimension</code> and <code>maxImageBytes</code> for untrusted or unknown
              projects.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            code={`const result = await capture({
  url,
  browser,
  maxDimension: 4096,
  maxImageBytes: 20_000_000,
  settings: {
    mode: CaptureMode.CANVAS,
    canvasSelector: "#art",
    triggerMode: CaptureTriggerMode.DELAY,
    delay: 1_000,
  },
})`}
          />
        </DocsSection>
        <DocsSection title="Artwork readiness contract">
          <div className="docs-prose">
            <p>
              <code>FN_TRIGGER</code> waits for either a window <code>fxhash-preview</code> event or
              a console message whose text is exactly <code>FXPREVIEW</code>. Existing{" "}
              <code>fxpreview()</code> and <code>$fx.preview()</code> implementations use these
              conventions.
            </p>
            <p>
              The listeners are installed before navigation, so an artwork may signal immediately
              while its document loads. The wait is bounded at five minutes by default. Set{" "}
              <code>useFallbackCaptureOnTimeout</code> only when a best-effort image is preferable
              to a hard failure.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            language="js"
            code={`// A non-fxhash page can implement the same contract:
window.dispatchEvent(new Event("fxhash-preview"))

// The v3 snippet-compatible alternative:
console.log("FXPREVIEW")`}
          />
        </DocsSection>
        <DocsSection title="Features and GIFs">
          <div className="docs-prose">
            <p>
              After readiness, the engine checks <code>window.$fx._features</code>, then legacy{" "}
              <code>window.$fxhashFeatures</code>. It returns only string, number, and boolean
              attributes. Invalid feature data degrades to an empty array without losing a
              successful image.
            </p>
            <p>
              GIF capture requires the optional <code>gifenc</code> peer.{" "}
              <code>FN_TRIGGER_GIF</code> consumes one readiness signal per frame; delay captures
              use <code>captureInterval</code>.
            </p>
          </div>
          <CodeBlock className="mt-4" language="bash" code={`pnpm add gifenc`} />
          <CodeBlock
            className="mt-4"
            code={`const animation = await capture({
  url,
  browser,
  settings: {
    mode: CaptureMode.VIEWPORT,
    resolution: { x: 800, y: 800 },
    triggerMode: CaptureTriggerMode.FN_TRIGGER_GIF,
    gif: true,
    frameCount: 24,
    playbackFps: 12,
  },
})`}
          />
        </DocsSection>
        <DocsSection title="Run Chromium where your server runs">
          <Table
            head={["Environment", "Provider", "Notes"]}
            rows={[
              [
                <>Local Node.js</>,
                <code>@whitehash/capture/browser/local</code>,
                <>
                  Discovers Chrome from environment variables, PATH, and common install locations
                </>,
              ],
              [
                <>Vercel or Lambda</>,
                <code>@whitehash/capture/browser/sparticuz</code>,
                <>
                  Uses <code>@sparticuz/chromium-min</code> and a hosted Chromium pack
                </>,
              ],
              [
                <>Browserless or isolated worker</>,
                <code>@whitehash/capture/browser/remote</code>,
                <>Connects through a browser WebSocket endpoint</>,
              ],
            ]}
          />
          <CodeBlock
            className="mt-5"
            code={`import { sparticuzProvider } from "@whitehash/capture/browser/sparticuz"

const browser = sparticuzProvider({
  packUrl: process.env.CHROMIUM_PACK_URL,
  useGl: "egl",
})`}
          />
          <div className="docs-prose mt-5">
            <p>
              The built-in launch arguments are container-safe and include <code>--no-sandbox</code>
              . Arbitrary generator code should run in a separately isolated remote browser, not
              beside credentials or sensitive workloads.
            </p>
          </div>
        </DocsSection>
        <DocsSection title="Mount an HTTP endpoint">
          <div className="docs-prose">
            <p>
              The handler uses web-standard <code>Request</code> and <code>Response</code>. Your
              resolver maps a request to the final artwork URL, settings, and a versioned cache key.
              Store and lock modules are optional.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            code={`import { createCaptureHandler } from "@whitehash/capture"
import { memoryLock } from "@whitehash/capture/lock/memory"
import { r2Store } from "@whitehash/capture/store/r2"

const handler = createCaptureHandler({
  browser,
  resolve: request => {
    const hash = new URL(request.url).searchParams.get("hash")
    return hash ? {
      key: \`captures/v1/\${hash}.png\`,
      url: artworkUrl(hash),
      settings,
    } : null
  },
  store: r2Store({ client: r2, bucket: "captures", publicBaseUrl: cdn }),
  lock: memoryLock(),
  headers: { "Cache-Control": "public, max-age=31536000, immutable" },
})`}
          />
          <div className="docs-prose mt-5">
            <p>
              Cache hits redirect to a public store URL when configured, or stream stored bytes.
              Concurrent misses for the same key render once; waiters poll the store until the lock
              holder writes the result. <code>HEAD</code> and stable JSON error responses are built
              in.
            </p>
          </div>
        </DocsSection>
        <DocsSection title="Framework adapters">
          <CodeBlock
            code={`// Next.js route handler
import { toNextRouteHandler } from "@whitehash/capture/adapters/next"
export const runtime = "nodejs"
export const maxDuration = 300
export const { GET, HEAD } = toNextRouteHandler(handler)

// Hono
import { toHono } from "@whitehash/capture/adapters/hono"
app.get("/capture/:key", toHono(handler))

// Express
import { toExpress } from "@whitehash/capture/adapters/express"
app.use("/capture", toExpress(handler))`}
          />
        </DocsSection>
        <DocsSection title="Post-process thumbnails">
          <div className="docs-prose">
            <p>
              The optional Sharp entry creates a 300 × 300 inside-fit PNG. For GIFs it can also
              extract the middle frame as a full-resolution PNG and thumbnail.
            </p>
          </div>
          <CodeBlock className="mt-4" language="bash" code={`pnpm add sharp`} />
          <CodeBlock
            className="mt-4"
            code={`import {
  makeThumbnail,
  gifMiddleFrameStill,
} from "@whitehash/capture/postprocess"

const thumbnail = await makeThumbnail(result.image)
const { image, thumbnail: gifThumbnail } =
  await gifMiddleFrameStill(animation.image)`}
          />
        </DocsSection>
        <DocsSection title="Failures and browser limits">
          <div className="docs-prose">
            <p>
              The stable error codes are <code>UNKNOWN</code>, <code>HTTP_ERROR</code>,{" "}
              <code>MISSING_PARAMETERS</code>, <code>INVALID_TRIGGER_PARAMETERS</code>,{" "}
              <code>INVALID_PARAMETERS</code>, <code>UNSUPPORTED_URL</code>,{" "}
              <code>CANVAS_CAPTURE_FAILED</code>, <code>TIMEOUT</code>, and{" "}
              <code>EXTRACT_FEATURES_FAILED</code>.
            </p>
            <p>
              The final navigation response must be exactly HTTP 200; the engine never captures an
              error page as artwork. A missing selector, non-canvas match, or cross-origin-tainted
              canvas produces <code>CANVAS_CAPTURE_FAILED</code>.
            </p>
            <p>
              WebGL created with <code>preserveDrawingBuffer: false</code> can read back black
              through <code>toDataURL()</code>. Switch that project to <code>VIEWPORT</code>{" "}
              capture, which screenshots Chromium&rsquo;s composed output instead.
            </p>
          </div>
        </DocsSection>
      </>
    )
  if (slug === "onchfs")
    return (
      <>
        <DocsSection title="1. Use the client-side worker">
          <div className="docs-prose">
            <p>
              The standard <code>Artwork</code> component can resolve and execute{" "}
              <code>onchfs://</code> artwork directly in the browser, without an fxhash endpoint or
              hosted backend.
            </p>
            <p>
              Place the worker and its browser bundle in your public root. They must remain next to
              each other.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            language="bash"
            code={`pnpm add @whitehash/onchfs-sw

cp node_modules/@whitehash/onchfs-sw/dist/worker.js public/onchfs-sw.js
cp node_modules/@whitehash/onchfs-sw/dist/onchfs.global.js public/onchfs.global.js`}
          />
          <Callout className="mt-5">
            Service workers require HTTPS in production. Localhost works during development.
          </Callout>
        </DocsSection>
        <DocsSection title="2. Register the worker once">
          <div className="docs-prose">
            <p>
              Mount the registration component beside your provider. After activation, every{" "}
              <code>Artwork</code> can resolve <code>onchfs://</code> with no component changes.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            code={`"use client"

import { useEffect } from "react"
import { registerOnchfsWorker } from "@whitehash/onchfs-sw"

export function OnchfsRegistration() {
  useEffect(() => {
    void registerOnchfsWorker().catch(console.error)
  }, [])
  return null
}

// Mount <OnchfsRegistration /> once beside your provider.`}
          />
        </DocsSection>
        <DocsSection title="3. Render normally">
          <CodeBlock
            code={`const { token, loading } = useToken({
  chain: "eip155:1",
  contract: "0xBb47F0ED4A7E3BffcA75660dFa3B053FB7FcE78E",
  tokenId: "2953",
})

if (!loading && token) {
  return <Artwork.Root token={token}>…</Artwork.Root>
}`}
          />
        </DocsSection>
        <OnchfsTokenExample />
        <DocsSection title="How onchfs reaches the iframe">
          <div className="docs-prose">
            <p>
              The service worker translates a browser-unreadable <code>onchfs://</code> URI into a
              same-origin response. The artwork bytes remain content-addressed and chain-native all
              the way to the iframe.
            </p>
            <p>
              The same <code>Artwork</code> API now covers both IPFS and onchfs content.
            </p>
          </div>
        </DocsSection>
        <DocsSection title="Use a self-hosted proxy instead">
          <div className="docs-prose">
            <p>
              Choose proxy mode when service workers are unavailable or your application needs
              ordinary HTTP responses. Host the endpoint yourself and point <code>baseUrl</code> at
              it. Immutable generator bytes receive long-lived cache headers; query parameters still
              reach the runtime without duplicating those bytes.
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            language="bash"
            code={`# From the onchfs-proxy app directory
pnpm install
PORT=3939 pnpm start`}
          />
          <div className="docs-prose mt-5">
            <p>
              The same Hono app can run inside a Next.js route handler. Mount it under the path you
              will use as <code>baseUrl</code>:
            </p>
          </div>
          <CodeBlock
            className="mt-4"
            code={`import { Hono } from "hono"
import { createApp } from "@whitehash/onchfs-proxy"

const routes = new Hono()
routes.route("/api/onchfs", createApp())

export const runtime = "nodejs"
export const GET = (request: Request) => routes.fetch(request)
export const HEAD = GET`}
          />
          <CodeBlock
            className="mt-4"
            language="tsx"
            code={`const config = {
  resolver: {
    onchfs: { mode: "proxy", baseUrl: "https://example.com/api/onchfs" },
  },
}`}
          />
          <CodeBlock
            className="mt-4"
            language="bash"
            code={`ONCHFS_ETH_RPCS=https://ethereum-rpc.example
ONCHFS_BASE_RPCS=https://base-rpc.example`}
          />
          <Callout className="mt-5">
            The proxy only translates onchfs content into HTTP. It does not discover wallets or
            fetch IPFS.
          </Callout>
        </DocsSection>
      </>
    )
  return null
}
