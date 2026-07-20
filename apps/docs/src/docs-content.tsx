"use client"

import { useEffect, useState } from "react"
import { parseRef, type WhitehashToken } from "@whitehash/chain-reader"
import { registerOnchfsWorker } from "@whitehash/onchfs-sw"
import {
  useArtworkFrame,
  useGatewayImage,
  useProject,
  useProjects,
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
  ToggleGroup,
  TokenDetails,
  TokenGrid,
  TokenGridSkeleton,
  WalletGallery,
  WalletSearch,
} from "@whitehash/ui"
import { Callout, CodeBlock, DocsHeading, DocsPage, DocsSection, LiveDemo } from "./components/docs-chrome"
import { GENOMES_2953_PREVIEW } from "./genomes-2953-preview"

export interface ApiEntry {
  slug: string
  name: string
  group: "React hooks" | "Primitives" | "Domain" | "Blocks"
  description: string
}

export const API_ENTRIES: ApiEntry[] = [
  { slug: "whitehash-provider", name: "WhitehashProvider", group: "React hooks", description: "Configure the client, network mode, and cache for every hook and component." },
  { slug: "use-whitehash", name: "useWhitehash", group: "React hooks", description: "Read the configured client, cache, and network mode." },
  { slug: "use-wallet-tokens", name: "useWalletTokens", group: "React hooks", description: "Detect an address family, query the relevant chain contracts, normalize owned tokens, and expose cache-first progress per chain." },
  { slug: "use-projects", name: "useProjects", group: "React hooks", description: "Paginate projects and progressively hydrate missing preview fields on every chain." },
  { slug: "use-project", name: "useProject", group: "React hooks", description: "Read project details and minted iterations from one typed ProjectRef." },
  { slug: "use-gateway-image", name: "useGatewayImage", group: "React hooks", description: "Resolve a protocol-native image URI and advance through your ordered IPFS gateways whenever an image fails." },
  { slug: "use-artwork-frame", name: "useArtworkFrame", group: "React hooks", description: "Own live-artwork play state and secure iframe attributes." },
  ...["Button", "Card", "Badge", "ToggleGroup", "Field", "Input", "Textarea", "Dialog", "Spinner", "Skeleton", "Separator"].map(name => ({ slug: name.toLowerCase(), name, group: "Primitives" as const, description: `The ${name} design-system primitive.` })),
  ...["Artwork", "TokenGrid", "TokenGridSkeleton", "TokenDetails"].map(name => ({ slug: name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, ""), name, group: "Domain" as const, description: `${name} composes whitehash token semantics with the headless React layer.` })),
  ...["WalletGallery", "ProjectBrowser", "ProjectGallery", "AddressSearch", "WalletSearch", "SortToggle"].map(name => ({ slug: name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, ""), name, group: "Blocks" as const, description: `${name} is a ready-to-embed block with navigation delegated to the consumer.` })),
]

export const SAMPLE_TOKEN: WhitehashToken = {
  chain: "tezos:mainnet",
  contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
  tokenId: "16333",
  name: "contrapuntos #136",
  description: "A known gentk-v1 fixture used to demonstrate the toolkit API.",
  iterationHash: "ooJ3bEAPXGub6p2mDuTweYuLcny5SF6Yo1gHxFQUqr6HHnmRehK",
  artifactUri: "ipfs://QmSYxhg1TWP9pMeSYAPDj23cf4MAo3nA4iF3kErq611KRG",
  displayUri: "ipfs://QmeWLdf4WeY2sc5iTjv7gJhEvjVtTCPyZM6grNTSx7kTym",
  thumbnailUri: "ipfs://QmaWnpxNQyM1bNjQyCzRQsjCEoQEi5KFwhN5UmMQi6FgNQ",
  // Canonical project-level generativeUri from fxhash v0 project 65.
  generatorUri: "ipfs://QmfTQFEgcgYDohPJLJWWnrKeRMBYrRP8JF79k6kveuXEv2",
  attributes: [{ name: "Network", value: "Tezos" }],
  assigned: true,
  metadataUri: null,
  raw: null,
}

const ONCHFS_SAMPLE_TOKEN: WhitehashToken = {
  chain: "eip155:1",
  contract: "0xBb47F0ED4A7E3BffcA75660dFa3B053FB7FcE78E",
  tokenId: "2953",
  name: "Genomes #2953",
  description: "A live Ethereum artwork whose generator bytes are resolved directly from onchfs by this page's service worker.",
  iterationHash: "0x4d47331fb7ef118d98ff2c313fe79d2a6870a62ad078f625623d1122989b545e",
  artifactUri: "onchfs://046f4712c2aaa344f82f1ef8ffed2ab8c9714819228e29c6a28cf67b14377f61/?fxhash=0x4d47331fb7ef118d98ff2c313fe79d2a6870a62ad078f625623d1122989b545e&fxiteration=2953&fxminter=0xb29DDe74b1ba90f3b21F12bA7ae7583976562EDD",
  displayUri: "ipfs://QmSsAErzt6VsCFArRU9dAYQzv9iqkCLCCi6rsMioaVBQak",
  thumbnailUri: GENOMES_2953_PREVIEW,
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
    void registerOnchfsWorker()
      .catch(cause => { if (alive) setWorkerError(cause instanceof Error ? cause.message : String(cause)) })
    return () => { alive = false }
  }, [])

  const virtualUrl = client.artworkUrl(ONCHFS_SAMPLE_TOKEN)
  return <DocsSection title="Live on-chain result">
    <div className="grid gap-8 md:grid-cols-[1.35fr_.65fr] md:items-start">
      <Artwork.Root token={ONCHFS_SAMPLE_TOKEN} className="rounded-lg">
        <Artwork.Image source="thumbnail" />
        <Artwork.Live />
        <Artwork.PlayButton playLabel="▶ Run onchfs live" />
        <Artwork.StatusBadge />
      </Artwork.Root>
      <div className="pt-1">
        <Badge variant="accent">service worker · ethereum</Badge>
        <h3 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">Genomes #2953</h3>
        <p className="mt-3 text-sm leading-6 text-muted">This is the composed <code>Artwork</code> component: the IPFS preview loads first, then <strong>Run onchfs live</strong> replaces it with the executable artwork. Its HTML, scripts, and assets are read from Ethereum through the same-origin worker.</p>
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Contract</dt><dd className="truncate font-mono text-xs">0xBb47…E78E</dd>
          <dt className="text-muted">Token</dt><dd className="font-mono text-xs">2953</dd>
          <dt className="text-muted">Content</dt><dd className="truncate font-mono text-xs">046f4712…77f61</dd>
        </dl>
        {workerError ? <Callout className="mt-5">Service worker registration failed: {workerError}</Callout> : null}
        {virtualUrl ? <p className="mt-5 break-all font-mono text-[11px] leading-5 text-faint">{virtualUrl}</p> : null}
      </div>
    </div>
  </DocsSection>
}

const USAGE: Record<string, string> = {
  WhitehashProvider: `<WhitehashProvider config={config}>\n  <App />\n</WhitehashProvider>`,
  Card: `<Card.Root>\n  <Card.Media />\n  <Card.Body><Card.Title>Title</Card.Title></Card.Body>\n</Card.Root>`,
  Field: `<Field.Root>\n  <Field.Label>Wallet</Field.Label>\n  <Field.Control render={<Input />} />\n</Field.Root>`,
  Dialog: `<Dialog open={open} onOpenChange={setOpen}>\n  <Dialog.Content><Dialog.Title>Title</Dialog.Title></Dialog.Content>\n</Dialog>`,
  Artwork: `<Artwork.Root token={token}>\n  <Artwork.Image />\n  <Artwork.Live />\n  <Artwork.PlayButton />\n  <Artwork.StatusBadge />\n</Artwork.Root>`,
  TokenGrid: `<TokenGrid>{tokens.map(token =>
  <Card.Root key={tokenKey(token)}>
    <Card.Media><Artwork.Root token={token}><Artwork.Image /></Artwork.Root></Card.Media>
  </Card.Root>
)}</TokenGrid>`,
  TokenGridSkeleton: `<TokenGridSkeleton count={8} />`,
  TokenDetails: `<TokenDetails token={token} settingsHref="/settings" />`,
  WalletGallery: `<WalletGallery address="tz1…" onOpenToken={setToken} />`,
  ProjectBrowser: `<ProjectBrowser chain="tezos:mainnet" onOpenProject={openProject} />`,
  ProjectGallery: `<ProjectGallery project={parseRef("project/tezos%3Amainnet/v3%3A13623", "project")} />`,
  AddressSearch: `<AddressSearch onSubmit={openWallet} />`,
  WalletSearch: `<WalletSearch open={open} onOpenChange={setOpen} onSubmit={openWallet} />`,
}

const codeFor = (name: string) => {
  if (name.startsWith("use")) {
    const args: Record<string, string> = {
      useWalletTokens: `"tz1…"`,
      useProjects: `{ chain: "tezos:mainnet", order: "newest" }`,
      useProject: `projectRef`,
      useGatewayImage: `uri, "tezos:mainnet"`,
      useArtworkFrame: `token`,
      useWhitehash: ``,
    }
    return `import { ${name} } from "@whitehash/react"\n\nconst result = ${name}(${args[name] ?? ""})`
  }
  return `import { ${name} } from "@whitehash/ui"\n\n${USAGE[name] ?? `<${name} />`}`
}

function HookDemo({ name }: { name: string }) {
  if (name === "useWalletTokens") return <WalletHookDemo />
  if (name === "useProjects") return <ProjectsHookDemo />
  if (name === "useProject") return <ProjectHookDemo />
  if (name === "useGatewayImage") return <GatewayHookDemo />
  if (name === "useArtworkFrame") return <ArtworkHookDemo />
  return <ContextHookDemo />
}

function HookValue({ children }: { children: string }) { return <p className="font-mono text-sm text-muted">{children}</p> }
function ContextHookDemo() { const value = useWhitehash(); return <HookValue>{`mode: ${value.mode}; gateways: ${value.client.config.resolver.ipfsGateways.length}`}</HookValue> }
function WalletHookDemo() { const value = useWalletTokens("tz1c3hFmjFSwunjLHECnYyjr42KRt5YiHrGX"); return <HookValue>{value.state ? `${value.state.tokens.length} tokens` : "Loading wallet…"}</HookValue> }
function ProjectsHookDemo() { const value = useProjects({ chain: "tezos:mainnet", limit: 2 }); return <HookValue>{value.loading ? "Loading projects…" : `${value.projects.length} projects loaded`}</HookValue> }
function ProjectHookDemo() { const value = useProject(parseRef("project/tezos%3Amainnet/v3%3A13623", "project")); return <HookValue>{value.loading ? "Loading project…" : value.project?.name ?? value.error ?? "Project ready"}</HookValue> }
function GatewayHookDemo() { const value = useGatewayImage(null, SAMPLE_TOKEN.chain); return <HookValue>{value.failed ? "Fallback exhausted" : value.src ?? "Resolving…"}</HookValue> }
function ArtworkHookDemo() { const value = useArtworkFrame(SAMPLE_TOKEN); return <HookValue>{`${value.status.kind}; ${value.playing ? "playing" : "stopped"}`}</HookValue> }

function ComponentDemo({ name }: { name: string }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("newest")
  if (name.startsWith("use") || name === "WhitehashProvider") return <HookDemo name={name} />
  if (name === "Button") return <Button onClick={() => setOpen(value => !value)}>{open ? "Pressed" : "Press me"}</Button>
  if (name === "Badge") return <Badge variant="success">on-chain</Badge>
  if (name === "Card") return <Card.Root className="max-w-xs"><Card.Media className="h-24" /><Card.Body><Card.Title>Composable card</Card.Title></Card.Body></Card.Root>
  if (name === "ToggleGroup" || name === "SortToggle") return <SortToggle order={value as "newest" | "oldest"} onChange={setValue} />
  if (name === "Field" || name === "Input") return <Field.Root><Field.Label>Wallet</Field.Label><Field.Control render={<Input placeholder="tz1… or 0x…" />} /></Field.Root>
  if (name === "Textarea") return <Textarea defaultValue="One gateway per line" />
  if (name === "Dialog") return <><Button onClick={() => setOpen(true)}>Open dialog</Button><Dialog open={open} onOpenChange={setOpen}><Dialog.Content><Dialog.Title>Composable dialog</Dialog.Title><Dialog.Close render={<Button className="mt-4" />}>Close</Dialog.Close></Dialog.Content></Dialog></>
  if (name === "Spinner") return <Spinner />
  if (name === "Skeleton") return <Skeleton className="h-16 w-full" />
  if (name === "Separator") return <Separator />
  if (name === "Artwork") return <Artwork.Root token={SAMPLE_TOKEN} className="max-w-md"><Artwork.Image /><Artwork.Live /><Artwork.PlayButton /><Artwork.StatusBadge /></Artwork.Root>
  if (name === "TokenGrid") return <TokenGrid><Card.Root><Card.Media><Artwork.Root token={SAMPLE_TOKEN} className="size-full rounded-none border-0"><Artwork.Image /></Artwork.Root></Card.Media><Card.Body><Card.Title>{SAMPLE_TOKEN.name}</Card.Title></Card.Body></Card.Root></TokenGrid>
  if (name === "TokenGridSkeleton") return <TokenGridSkeleton count={2} />
  if (name === "TokenDetails") return <TokenDetails token={SAMPLE_TOKEN} />
  if (name === "WalletGallery") return <WalletGallery address="tz1c3hFmjFSwunjLHECnYyjr42KRt5YiHrGX" />
  if (name === "ProjectBrowser") return <ProjectBrowser chain="tezos:mainnet" />
  if (name === "ProjectGallery") return <ProjectGallery project={parseRef("project/tezos%3Amainnet/v3%3A13623", "project")} />
  if (name === "AddressSearch") return <AddressSearch onSubmit={() => setOpen(true)} />
  if (name === "WalletSearch") return <><Button onClick={() => setOpen(true)}>Search wallet</Button><WalletSearch open={open} onOpenChange={setOpen} onSubmit={() => undefined} /></>
  if (name === "Callout") return <Callout>Infrastructure is public and configurable.</Callout>
  if (name === "CodeBlock") return <CodeBlock code="const client = createWhitehashClient(config)" language="ts" />
  return <p className="text-sm text-muted">This page is rendered inside the live {name} documentation surface.</p>
}

export function ApiDocPage({ entry }: { entry: ApiEntry }) {
  return (
    <DocsPage>
      <DocsHeading eyebrow={entry.group} title={entry.name} description={entry.description} />
      <ApiDetails name={entry.name} />
      <DocsSection title="Live example"><LiveDemo><ComponentDemo name={entry.name} /></LiveDemo></DocsSection>
      <DocsSection title="Usage"><CodeBlock code={codeFor(entry.name)} /></DocsSection>
    </DocsPage>
  )
}

function ApiDetails({ name }: { name: string }) {
  if (name === "useWalletTokens") return (
    <>
      <DocsSection title="What happens with a tz address?">
        <ol className="api-steps">
          <li><span>1</span><div><strong>The address selects the Tezos family.</strong><p>In mainnet mode, a <code>tz1…</code> address maps to <code>tezos:mainnet</code>; in testnet mode it maps to Ghostnet. Pass <code>chains</code> to override detection.</p></div></li>
          <li><span>2</span><div><strong>Whitehash checks known gentk contracts.</strong><p>The chain reader queries the configured TzKT endpoint for token balances across the fxhash gentk v1, v2, and v3 FA2 contracts. It does not crawl arbitrary Tezos NFTs.</p></div></li>
          <li><span>3</span><div><strong>Metadata becomes one stable token shape.</strong><p>Metadata is fetched through the configured IPFS gateways and normalized into <code>WhitehashToken</code>, including artifact, display, thumbnail, seed, assignment state, and attributes.</p></div></li>
          <li><span>4</span><div><strong>Cached data arrives before the live result.</strong><p>IndexedDB results can render immediately. Each chain then refreshes independently; one failed network does not remove successful tokens from another.</p></div></li>
        </ol>
      </DocsSection>
      <DocsSection title="Return value"><CodeBlock language="ts" code={`{
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
}`} /></DocsSection>
      <DocsSection title="Control exactly what is queried"><CodeBlock code={`const wallet = useWalletTokens(address, {
  mode: "mainnet",
  chains: ["tezos:mainnet"], // skip address-based detection
  client,                   // optional custom WhitehashClient
  cache,                    // optional memory or IndexedDB cache
})`} /></DocsSection>
      <DocsSection title="The address is the owner, not a collection filter">
        <div className="docs-prose"><p>Pass a collector/account address—the address whose holdings you want. Passing an NFT contract address asks for tokens <em>owned by that contract</em>; it does not restrict results to that collection.</p><p>Whitehash deliberately reads only fxhash artwork contracts. Tezos balances are filtered to the gentk v1–v3 FA2 contracts. Ethereum and Base collections are discovered from each chain’s <code>FxIssuerFactory</code>, then the wallet’s ERC-721 holdings are intersected with that collection set.</p></div>
        <CodeBlock className="mt-5" language="text" code={`Tezos gentk v1  KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE
Tezos gentk v2  KT1U6EHmNxJTkvaWJ4ThczG4FSDaHC21ssvi
Tezos gentk v3  KT1EfsNuqwLAWDd3o4pvfUx1CAh5GMdTrRvr

Ethereum factory  0x442295de8A31d65026dBc09c29d469F6854f188a
Base factory      0xf05636d65c7a10dF989eC2411D4F3230d3A02f3D`} />
      </DocsSection>
    </>
  )
  if (name === "useProjects") return (
    <>
      <DocsSection title="List projects on one chain"><div className="docs-prose"><p><code>useProjects</code> does not accept a wallet or collection contract. It discovers projects published by the configured fxhash issuer for the selected chain and returns normalized <code>WhitehashProject</code> values.</p><p>Use <code>version</code> to select a Tezos issuer generation. EVM projects are discovered from <code>ProjectCreated</code> factory events, so each returned project already carries its collection contract in <code>project.ref.id</code>.</p></div><CodeBlock className="mt-5" code={`const result = useProjects({
  chain: "eip155:8453",
  order: "newest",
  limit: 12,
})

result.projects[0]?.ref
// { type: "project", chain: "eip155:8453", id: "0x…" }

result.hasMore && result.loadMore()`} /></DocsSection>
      <DocsSection title="Where projects come from"><CodeBlock language="text" code={`Tezos mainnet issuer v0  KT1AEVuykWeuuFX7QkEAMNtffzwhe1Z98hJS
Tezos mainnet issuer v1  KT1XCoGnfupWk7Sp8536EfrxcP73LmT68Nyr
Tezos mainnet issuer v2  KT1BJC12dG17CVvPKJ1VYaNnaT5mzfnUTwXv
Tezos mainnet issuer v3  KT1Xpmp15KfqoePNW9HczFmqaGNHwadV2a3b

Ethereum issuer factory  0x442295de8A31d65026dBc09c29d469F6854f188a
Base issuer factory      0xf05636d65c7a10dF989eC2411D4F3230d3A02f3D`} /></DocsSection>
    </>
  )
  if (name === "useProject") return (
    <>
      <DocsSection title="ProjectRef is a portable project address"><div className="docs-prose"><p>A <code>ProjectRef</code> combines the network with that network’s native project identifier. The explicit chain removes address ambiguity between Ethereum, Base, mainnet, and testnets.</p><p>For Ethereum and Base, <code>id</code> is the project’s ERC-721 collection contract, so yes—you can put a project contract address there. For Tezos, projects are entries inside versioned issuer contracts, so <code>id</code> is written as <code>v3:13623</code>, not as a gentk or issuer contract address.</p></div><CodeBlock className="mt-5" code={`import { formatRef, type ProjectRef } from "@whitehash/chain-reader"

const ref = {
  type: "project",
  chain: "eip155:1",
  id: "0xBb47F0ED4A7E3BffcA75660dFa3B053FB7FcE78E",
} satisfies ProjectRef

const result = useProject(ref)
formatRef(ref)
// project/eip155%3A1/0xBb47F0ED4A7E3BffcA75660dFa3B053FB7FcE78E`} /></DocsSection>
      <DocsSection title="What the hook reads"><div className="docs-prose"><p>The hook fetches project metadata and the first page of minted iterations in parallel. It returns <code>project</code>, <code>tokens</code>, <code>loading</code>, <code>error</code>, <code>hasMore</code>, and <code>loadMore</code>.</p><p>Use <code>TokenRef</code> when you already know one token: its fields are <code>chain</code>, <code>contract</code>, and <code>tokenId</code>.</p></div></DocsSection>
    </>
  )
  if (name === "WhitehashProvider") return <DocsSection title="Configuration boundary"><p className="docs-prose">Create the resolver and network configuration once. Every hook and UI component below the provider uses the same IPFS gateway order, onchfs mode, TzKT endpoints, EVM RPCs, cache, and mainnet/testnet mode.</p><CodeBlock className="mt-5" code={`const config = {
  mode: "mainnet",
  resolver: {
    ipfsGateways: ["https://ipfs.io", "https://dweb.link"],
    onchfs: { mode: "service-worker" },
  },
  tzkt: { "tezos:mainnet": "https://api.tzkt.io" },
  evm: { rpcs: { "eip155:8453": [process.env.NEXT_PUBLIC_BASE_RPC!] } },
}`} /></DocsSection>
  if (name === "useGatewayImage") return <DocsSection title="Fallback behavior"><p className="docs-prose">The hook turns an <code>ipfs://</code> URI into one HTTP URL per configured gateway. Attach <code>onError</code> to the image: each browser error advances to the next URL. HTTP, data, and blob URLs pass through unchanged; onchfs uses the configured service worker or proxy and needs the token chain as a routing hint.</p><CodeBlock className="mt-5" code={`const image = useGatewayImage(token.displayUri, token.chain)

if (image.failed) return <ImageUnavailable />
return <img src={image.src} onError={image.onError} alt="" />`} /></DocsSection>
  if (name === "useArtworkFrame") return <DocsSection title="Image and live artwork are different"><p className="docs-prose">Display and thumbnail URIs are static previews. The artifact URI is executable HTML and becomes the iframe URL. <code>useArtworkFrame</code> applies the token seed, checks whether onchfs resolution is available, and supplies the sandbox and device permissions; it never puts an artifact HTML URL into an image tag.</p></DocsSection>
  return null
}

const GUIDES: Record<string, { title: string; description: string; code: string; language?: string }> = {
  "getting-started": { title: "Getting started", description: "Mount a working wallet gallery, backed by public chain reads and configurable content resolution.", code: `"use client"

import { WalletGallery, WhitehashProvider } from "@whitehash/ui"
import "@whitehash/ui/styles.css"

const config = {
  mode: "mainnet",
  resolver: {
    ipfsGateways: ["https://ipfs.io", "https://dweb.link"],
    onchfs: null,
  },
}

export function Collection({ address }: { address: string }) {
  return (
  <WhitehashProvider config={config}>
      <WalletGallery address={address} />
    </WhitehashProvider>
  )
}` },
  "how-it-works": { title: "How whitehash works", description: "Whitehash is a client-side pipeline, not a hosted indexer or a replacement platform.", code: `wallet address
  → detect Tezos or EVM address family
  → query known fxhash contracts via TzKT or JSON-RPC
  → fetch and normalize token metadata
  → resolve IPFS previews or onchfs artifacts
  → render headless state or @whitehash/ui components`, language: "text" },
  configuration: { title: "Configuration", description: "Bind endpoints once at the provider, or pass a custom client directly to a hook for an ad-hoc integration.", code: `const config = {
  mode: "mainnet",
  resolver: {
    // Ordered. Metadata fetches and image components fall back in sequence.
    ipfsGateways: [
      "https://your-gateway.example",
      "https://ipfs.io",
      "https://dweb.link",
    ],
    // Optional. Required only for onchfs:// live artifacts.
    onchfs: { mode: "proxy", baseUrl: "https://onchfs.example.com" },
  },
  tzkt: {
    "tezos:mainnet": "https://api.tzkt.io",
  },
  evm: {
    rpcs: {
      "eip155:1": ["https://ethereum-rpc.example"],
      "eip155:8453": ["https://base-rpc.example"],
    },
  },
}` },
  theming: { title: "Theming and tokens", description: "Override variables; do not fork component styles. These are the complete public design tokens.", code: `:root {
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
}` },
  next: { title: "Next.js", description: "Whitehash hooks and UI are client components. Put the provider below your root layout and keep route state in Next.js—not a hash router.", code: `// app/providers.tsx
"use client"

import { WhitehashProvider } from "@whitehash/ui"

export function Providers({ children }: { children: React.ReactNode }) {
  return <WhitehashProvider config={config}>{children}</WhitehashProvider>
}` },
  onchfs: { title: "Run onchfs in the browser", description: "Resolve on-chain artwork code through a same-origin service worker—no proxy or whitehash server required.", code: `"use client"

import { useEffect } from "react"
import { registerOnchfsWorker } from "@whitehash/onchfs-sw"

export const config = {
  resolver: {
    ipfsGateways: ["https://ipfs.io", "https://dweb.link"],
    onchfs: { mode: "service-worker" },
  },
}

export function OnchfsRegistration() {
  useEffect(() => {
    void registerOnchfsWorker().catch(console.error)
  }, [])
  return null
}

// Mount <OnchfsRegistration /> once beside your provider.` },
  variations: { title: "Explore variations", description: "Drive the original content-addressed generator with a different seed or declared fx(params), entirely in the browser.", code: `import { BlockchainType, createRuntimeConnector } from "@whitehash/runtime"
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

return <ArtworkIframe ref={runtime.ref} />` },
  proxy: { title: "Self-host the onchfs fallback", description: "Serve onchfs:// bytes over HTTP when service workers are unavailable or your hosting setup cannot serve root-scoped worker assets.", code: `# Node, container, or local development
PORT=3939 pnpm --filter @whitehash/onchfs-proxy start

# Vercel (api/[[...route]].ts is included)
cd apps/onchfs-proxy && vercel deploy

# Point whitehash at the deployment
resolver: { onchfs: { mode: "proxy", baseUrl: "https://onchfs.example.com" } }`, language: "bash" },
}

export function GuidePage({ slug }: { slug: string }) {
  const guide = GUIDES[slug] ?? GUIDES["getting-started"]!
  return <DocsPage><DocsHeading eyebrow="Guide" title={guide.title} description={guide.description} /><DocsSection title={slug === "how-it-works" ? "Request path" : "Example"}><CodeBlock code={guide.code} language={guide.language ?? (slug === "theming" ? "css" : "tsx")} /></DocsSection><GuideDetails slug={slug} /></DocsPage>
}

function GuideDetails({ slug }: { slug: string }) {
  if (slug === "getting-started") return <><DocsSection title="What you get"><div className="docs-prose"><p>The gallery calls <code>useWalletTokens</code>, displays cached results while live reads run, and composes token previews with gateway fallback. No whitehash server is involved for wallet discovery, metadata, or IPFS images.</p><p>This docs app also registers the optional same-origin service worker for <code>onchfs://</code> artwork. Follow <a className="docs-text-link" href="/guide/onchfs">Run onchfs in the browser</a> to add the two worker assets and enable it in your own app.</p></div></DocsSection><DocsSection title="Paste and route anything"><div className="docs-prose"><p><code>ProjectRef</code> and <code>TokenRef</code> carry their chain and serialize through <code>formatRef</code>. Use <code>parseRef</code> for routes and <code>resolveInput</code> when accepting a pasted ref, artwork URL, CID, or wallet/contract address.</p><p>The docs search uses exactly that utility, then opens a wallet, project, direct token, or resolved content URL.</p></div></DocsSection></>
  if (slug === "how-it-works") return <DocsSection title="Network behavior"><div className="docs-prose"><p><strong>Tezos:</strong> TzKT enumerates balances in the known gentk v1–v3 FA2 contracts, then metadata is resolved from its protocol-native URI.</p><p><strong>Ethereum and Base:</strong> JSON-RPC reads known issuer factories and project contracts. Archive-capable RPCs make historical log scans substantially faster.</p><p><strong>Rendering:</strong> preview images use display/thumbnail metadata. Live frames use the artifact URI and token seed. These are intentionally separate paths.</p></div></DocsSection>
  if (slug === "configuration") return <><DocsSection title="IPFS gateway order"><div className="docs-prose"><p>Gateway roots do not include <code>/ipfs/</code>. Whitehash appends the CID and path, preserving query strings and fragments. Metadata requests try each gateway until a response succeeds; <code>useGatewayImage</code> advances when the browser fires an image error.</p><p>An empty gateway list cannot resolve IPFS or bare-CID content. HTTP, data, and blob URLs are passed through as-is.</p></div></DocsSection><DocsSection title="Ad-hoc client"><CodeBlock code={`const client = createWhitehashClient({
  ...config,
  resolver: { ...config.resolver, ipfsGateways: [temporaryGateway] },
})

const wallet = useWalletTokens(address, { client })`} /></DocsSection></>
  if (slug === "variations") return <><DocsSection title="Use the project generator, not the minted artifact"><div className="docs-prose"><p>Open a token from a wallet or project, then choose <strong>Explore</strong>. The runtime loads the project’s reusable <code>generativeUri</code> and supplies the selected <code>fxhash</code> in its URL query, together with the minter, iteration, chain, and any published fx(params).</p><p>That distinction matters for early gentk tokens: their minted <code>artifactUri</code> can be an iteration-specific capture with the original hash embedded in its HTML. The contrapuntos demo below uses project v0:65’s canonical immutable generator, so <strong>New hash</strong> drives the real artwork rather than a replacement fixture.</p></div></DocsSection><DocsSection title="Infrastructure stays yours"><Callout>The runtime has no fxhash-hosted default. Its connector accepts an injected <code>resolveUri</code>, plus optional self-hosted emulator or legacy-wrapper bases.</Callout></DocsSection></>
  if (slug === "onchfs") return <><DocsSection title="1. Host the two worker assets"><div className="docs-prose"><p>Copy both exported files into your public root. They must remain next to each other because the small worker loads the onchfs browser bundle with <code>importScripts</code>. Root placement lets the worker claim <code>/</code> and intercept the virtual artwork path.</p></div><CodeBlock className="mt-5" language="bash" code={`cp node_modules/@whitehash/onchfs-sw/dist/worker.js public/onchfs-sw.js
cp node_modules/@whitehash/onchfs-sw/dist/onchfs.global.js public/onchfs.global.js`} /><Callout className="mt-5">Service workers require HTTPS in production. Localhost is allowed for development.</Callout></DocsSection><DocsSection title="2. Register once, then enable resolver mode"><div className="docs-prose"><p><code>registerOnchfsWorker()</code> registers <code>/onchfs-sw.js</code>, waits for activation, and waits until the page is controlled. The resolver then converts an <code>onchfs://</code> URI into a same-origin, chain-scoped path such as <code>/.whitehash/onchfs/eip155-1/&lbrace;cid&rbrace;/</code>.</p><p>The worker reads the content-addressed bytes from configured public RPCs, decompresses gzip responses, preserves content type, and caches immutable file bytes. Token query parameters still reach the artwork runtime, but do not duplicate the cached generator.</p></div></DocsSection><DocsSection title="3. Render a real Ethereum piece"><CodeBlock code={`const ref = {
  type: "token",
  chain: "eip155:1",
  contract: "0xBb47F0ED4A7E3BffcA75660dFa3B053FB7FcE78E",
  tokenId: "2953",
} as const

const token = await client.getToken(ref)
const url = token && client.artworkUrl(token)
// /.whitehash/onchfs/eip155-1/{content-id}/?fxhash=…`} /><Callout className="mt-5">Genomes #2953 is the repository acceptance fixture: it renders with <code>onchfs.mode = "service-worker"</code> and no proxy configured.</Callout></DocsSection><OnchfsTokenExample /><DocsSection title="When to use the server fallback"><div className="docs-prose"><p>Use <code>&lbrace; mode: "proxy", baseUrl &rbrace;</code> when service workers are unavailable, your host cannot serve the assets from a root scope, or server-side/archive tooling needs ordinary HTTP responses. The byte-resolution contract is the same.</p></div><a className="docs-text-link mt-5 inline-block" href="/guide/proxy">Configure the onchfs server fallback →</a></DocsSection></>
  if (slug === "proxy") return <><DocsSection title="What is already in the repository"><div className="docs-prose"><p><code>apps/onchfs-proxy</code> contains the working Hono service, a Node entry, and a Vercel catch-all adapter. It supports Tezos mainnet/Ghostnet, Ethereum/Sepolia, and Base/Base Sepolia.</p><p>There is not yet a dedicated Cloudflare Worker deployment entry. The Hono app exposes a standard <code>fetch</code> handler and is structurally portable, but the onchfs dependency bundle should be verified against Worker limits before calling it supported.</p></div></DocsSection><DocsSection title="Request and caching"><CodeBlock language="text" code={`GET /eip155-8453/{cid}/index.html?fxhash=…
  → choose the Base resolver
  → read content-addressed bytes from configured Base RPCs
  → preserve content type and query string
  → Cache-Control: public, max-age=31536000, immutable`} /><Callout className="mt-5">The proxy never discovers wallets or fetches IPFS. Its only job is translating onchfs content into browser-loadable HTTP responses.</Callout></DocsSection><DocsSection title="RPC overrides"><CodeBlock language="bash" code={`ONCHFS_TEZOS_RPCS=https://rpc-1.example,https://rpc-2.example
ONCHFS_GHOSTNET_RPCS=https://ghostnet-rpc.example
ONCHFS_ETH_RPCS=https://ethereum-rpc.example
ONCHFS_SEPOLIA_RPCS=https://sepolia-rpc.example
ONCHFS_BASE_RPCS=https://base-rpc.example
ONCHFS_BASE_SEPOLIA_RPCS=https://base-sepolia-rpc.example`} /></DocsSection></>
  return null
}
