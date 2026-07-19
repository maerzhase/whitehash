import { useState } from "react"
import type { WhitehashToken } from "@whitehash/chain-reader"
import {
  useArtworkFrame,
  useEvmProjectCard,
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
  Callout,
  Card,
  CodeBlock,
  Dialog,
  DocsHeading,
  DocsPage,
  DocsSection,
  Field,
  Input,
  LiveDemo,
  ProjectBrowser,
  ProjectGallery,
  Separator,
  Skeleton,
  SortToggle,
  Spinner,
  Textarea,
  ToggleGroup,
  TokenCard,
  TokenDetails,
  TokenGrid,
  TokenGridSkeleton,
  ToolkitHero,
  WalletGallery,
  WalletSearch,
} from "@whitehash/ui"

export interface ApiEntry {
  slug: string
  name: string
  group: "React hooks" | "Primitives" | "Domain" | "Blocks" | "Docs chrome"
  description: string
}

export const API_ENTRIES: ApiEntry[] = [
  { slug: "whitehash-provider", name: "WhitehashProvider", group: "React hooks", description: "Configure the client, network mode, and cache for every hook and component." },
  { slug: "use-whitehash", name: "useWhitehash", group: "React hooks", description: "Read the configured client, cache, and network mode." },
  { slug: "use-wallet-tokens", name: "useWalletTokens", group: "React hooks", description: "Cache-first wallet ownership with per-chain progress and refresh." },
  { slug: "use-projects", name: "useProjects", group: "React hooks", description: "Paginate projects for a Tezos or EVM chain." },
  { slug: "use-project", name: "useProject", group: "React hooks", description: "Read project details and its minted iterations." },
  { slug: "use-evm-project-card", name: "useEvmProjectCard", group: "React hooks", description: "Lazily enrich EVM project cards with name, supply, and preview." },
  { slug: "use-gateway-image", name: "useGatewayImage", group: "React hooks", description: "Advance through configured public gateways when an image fails." },
  { slug: "use-artwork-frame", name: "useArtworkFrame", group: "React hooks", description: "Own live-artwork play state and secure iframe attributes." },
  ...["Button", "Card", "Badge", "ToggleGroup", "Field", "Input", "Textarea", "Dialog", "Spinner", "Skeleton", "Separator"].map(name => ({ slug: name.toLowerCase(), name, group: "Primitives" as const, description: `The ${name} design-system primitive.` })),
  ...["Artwork", "TokenCard", "TokenGrid", "TokenGridSkeleton", "TokenDetails"].map(name => ({ slug: name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, ""), name, group: "Domain" as const, description: `${name} composes whitehash token semantics with the headless React layer.` })),
  ...["WalletGallery", "ProjectBrowser", "ProjectGallery", "AddressSearch", "WalletSearch", "SortToggle"].map(name => ({ slug: name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, ""), name, group: "Blocks" as const, description: `${name} is a ready-to-embed block with navigation delegated to the consumer.` })),
  ...["SiteHeader", "ToolkitHero", "DocsShell", "DocsPage", "DocsHeading", "DocsSection", "LiveDemo", "Callout", "CodeBlock"].map(name => ({ slug: name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, ""), name, group: "Docs chrome" as const, description: `${name} assembles documentation and toolkit sites from the same published system.` })),
]

const SAMPLE_TOKEN: WhitehashToken = {
  chain: "tezos:mainnet",
  contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
  tokenId: "16333",
  name: "contrapuntos #136",
  description: "A known gentk-v1 fixture used to demonstrate the toolkit API.",
  iterationHash: "ooJ3bEAPXGub6p2mDuTweYuLcny5SF6Yo1gHxFQUqr6HHnmRehK",
  artifactUri: "ipfs://QmSYxhg1TWP9pMeSYAPDj23cf4MAo3nA4iF3kErq611KRG",
  displayUri: null,
  thumbnailUri: null,
  generatorUri: null,
  attributes: [{ name: "Network", value: "Tezos" }],
  assigned: true,
  metadataUri: null,
  raw: null,
}

const USAGE: Record<string, string> = {
  WhitehashProvider: `<WhitehashProvider config={config}>\n  <App />\n</WhitehashProvider>`,
  Card: `<Card.Root>\n  <Card.Media />\n  <Card.Body><Card.Title>Title</Card.Title></Card.Body>\n</Card.Root>`,
  Field: `<Field.Root>\n  <Field.Label>Wallet</Field.Label>\n  <Field.Control render={<Input />} />\n</Field.Root>`,
  Dialog: `<Dialog open={open} onOpenChange={setOpen}>\n  <Dialog.Content><Dialog.Title>Title</Dialog.Title></Dialog.Content>\n</Dialog>`,
  Artwork: `<Artwork.Root token={token}>\n  <Artwork.Image />\n  <Artwork.Live />\n  <Artwork.PlayButton />\n  <Artwork.StatusBadge />\n</Artwork.Root>`,
  TokenCard: `<TokenCard token={token} onSelect={setToken} />`,
  TokenGrid: `<TokenGrid tokens={tokens} onOpen={setToken} />`,
  TokenGridSkeleton: `<TokenGridSkeleton count={8} />`,
  TokenDetails: `<TokenDetails token={token} settingsHref="#/settings" />`,
  WalletGallery: `<WalletGallery address="tz1…" onOpenToken={setToken} />`,
  ProjectBrowser: `<ProjectBrowser chain="tezos:mainnet" onOpenProject={openProject} />`,
  ProjectGallery: `<ProjectGallery chain="tezos:mainnet" projectRef="v3:…" />`,
  AddressSearch: `<AddressSearch onSubmit={openWallet} />`,
  WalletSearch: `<WalletSearch open={open} onOpenChange={setOpen} onSubmit={openWallet} />`,
  SiteHeader: `<SiteHeader logoSrc="/logo.png" actions={<Navigation />} />`,
  ToolkitHero: `<ToolkitHero logoSrc="/logo.png" actions={<GetStarted />} />`,
  DocsShell: `<DocsShell items={items} currentHref={location.hash}>\n  <DocsPage />\n</DocsShell>`,
  DocsPage: `<DocsPage><DocsHeading title="API" /></DocsPage>`,
  DocsHeading: `<DocsHeading eyebrow="React hook" title="useWalletTokens" />`,
  DocsSection: `<DocsSection title="Usage">…</DocsSection>`,
  LiveDemo: `<LiveDemo><Example /></LiveDemo>`,
  Callout: `<Callout>Public infrastructure is configurable.</Callout>`,
  CodeBlock: `<CodeBlock code={source} language="tsx" />`,
}

const codeFor = (name: string) => {
  if (name.startsWith("use")) {
    const args: Record<string, string> = {
      useWalletTokens: `"tz1…"`,
      useProjects: `"tezos:mainnet"`,
      useProject: `"tezos:mainnet", projectRef`,
      useEvmProjectCard: `"eip155:1", contract`,
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
  if (name === "useEvmProjectCard") return <EvmCardHookDemo />
  if (name === "useGatewayImage") return <GatewayHookDemo />
  if (name === "useArtworkFrame") return <ArtworkHookDemo />
  return <ContextHookDemo />
}

function HookValue({ children }: { children: string }) { return <p className="font-mono text-sm text-muted">{children}</p> }
function ContextHookDemo() { const value = useWhitehash(); return <HookValue>{`mode: ${value.mode}; gateways: ${value.client.config.resolver.ipfsGateways.length}`}</HookValue> }
function WalletHookDemo() { const value = useWalletTokens("tz1c3hFmjFSwunjLHECnYyjr42KRt5YiHrGX"); return <HookValue>{value.state ? `${value.state.tokens.length} tokens` : "Loading wallet…"}</HookValue> }
function ProjectsHookDemo() { const value = useProjects("tezos:mainnet", { limit: 2 }); return <HookValue>{value.loading ? "Loading projects…" : `${value.projects.length} projects loaded`}</HookValue> }
function ProjectHookDemo() { const value = useProject("tezos:mainnet", "v3:13623"); return <HookValue>{value.loading ? "Loading project…" : value.project?.name ?? value.error ?? "Project ready"}</HookValue> }
function EvmCardHookDemo() { const value = useEvmProjectCard("eip155:1", "0xBb47F0ED4A7E3BffcA75660dFa3B053FB7FcE78E"); return <HookValue>{value.name ?? "Loading EVM project…"}</HookValue> }
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
  if (name === "TokenCard") return <TokenCard token={SAMPLE_TOKEN} className="max-w-xs" />
  if (name === "TokenGrid") return <TokenGrid tokens={[SAMPLE_TOKEN]} />
  if (name === "TokenGridSkeleton") return <TokenGridSkeleton count={2} />
  if (name === "TokenDetails") return <TokenDetails token={SAMPLE_TOKEN} />
  if (name === "WalletGallery") return <WalletGallery address="tz1c3hFmjFSwunjLHECnYyjr42KRt5YiHrGX" />
  if (name === "ProjectBrowser") return <ProjectBrowser chain="tezos:mainnet" />
  if (name === "ProjectGallery") return <ProjectGallery chain="tezos:mainnet" projectRef="v3:13623" />
  if (name === "AddressSearch") return <AddressSearch onSubmit={() => setOpen(true)} />
  if (name === "WalletSearch") return <><Button onClick={() => setOpen(true)}>Search wallet</Button><WalletSearch open={open} onOpenChange={setOpen} onSubmit={() => undefined} /></>
  if (name === "Callout") return <Callout>Infrastructure is public and configurable.</Callout>
  if (name === "CodeBlock") return <CodeBlock code="const client = createWhitehashClient(config)" language="ts" />
  if (name === "ToolkitHero") return <ToolkitHero logoSrc="./logo.png" className="min-h-[28rem]" />
  return <p className="text-sm text-muted">This page is rendered inside the live {name} documentation surface.</p>
}

export function ApiDocPage({ entry }: { entry: ApiEntry }) {
  return (
    <DocsPage>
      <DocsHeading eyebrow={entry.group} title={entry.name} description={entry.description} />
      <DocsSection title="Live example"><LiveDemo><ComponentDemo name={entry.name} /></LiveDemo></DocsSection>
      <DocsSection title="Usage"><CodeBlock code={codeFor(entry.name)} /></DocsSection>
      <DocsSection title="Composition"><Callout>All network, cache, gateway, and iframe ceremony stays in the lower layer. Visual parts remain replaceable through compound APIs and behavioral slots.</Callout></DocsSection>
    </DocsPage>
  )
}

const GUIDES: Record<string, { title: string; description: string; code: string }> = {
  "getting-started": { title: "Getting started", description: "Mount a working wallet gallery with one toolkit import.", code: `import { WalletGallery, WhitehashProvider } from "@whitehash/ui"
import "@whitehash/ui/styles.css"

root.render(
  <WhitehashProvider config={config}>
    <WalletGallery address="tz1…" />
  </WhitehashProvider>,
)` },
  layers: { title: "Choose your layer", description: "Use framework-free reads, headless React state, or the complete design system.", code: `@whitehash/chain-reader  // framework-free
@whitehash/react         // headless hooks
@whitehash/ui            // complete embeds` },
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
  vite: { title: "Vite", description: "Use precompiled CSS with no Tailwind plugin, or scan package source in Tailwind v4.", code: `import "@whitehash/ui/styles.css"` },
  next: { title: "Next.js", description: "Render client components below WhitehashProvider; no server API route is required.", code: `"use client"
import { WhitehashProvider } from "@whitehash/ui"` },
  proxy: { title: "Self-host onchfs", description: "The optional proxy resolves on-chain filesystem bytes for Ethereum and Base artwork. Deploy apps/onchfs-proxy to any Node host or Vercel function, then set resolver.onchfsProxy.", code: `PORT=3939 pnpm --filter @whitehash/onchfs-proxy start\n\nresolver: { onchfsProxy: "https://onchfs.example" }` },
  deploy: { title: "Static deployment", description: "The relative-base build needs no rewrites. Upload dist/ to GitHub Pages, an IPFS pinning service, or any static host.", code: `pnpm --filter @whitehash/docs build

# local/static host
npx serve apps/docs/dist

# IPFS
ipfs add -r apps/docs/dist

# GitHub Pages: upload apps/docs/dist as the Pages artifact` },
}

export function GuidePage({ slug }: { slug: string }) {
  const guide = GUIDES[slug] ?? GUIDES["getting-started"]!
  return <DocsPage><DocsHeading eyebrow="Guide" title={guide.title} description={guide.description} /><DocsSection title="Example"><CodeBlock code={guide.code} language={slug === "theming" ? "css" : "tsx"} /></DocsSection><DocsSection title="Infrastructure"><Callout>All endpoints remain network-keyed and configurable. Testnets use the same API shapes as mainnet.</Callout></DocsSection></DocsPage>
}
