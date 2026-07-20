"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { formatRef, parseRef, resolveInput, tokenKey, type ProjectRef, type TokenRef, type WhitehashToken } from "@whitehash/chain-reader"
import { useWalletTokens, useWhitehash } from "@whitehash/react"
import { BlockchainType, createRuntimeConnector, type FxParamDefinition, type FxParamDefinitions, type FxParamType, type ProjectState } from "@whitehash/runtime"
import { ArtworkIframe, useRuntimeController } from "@whitehash/runtime/react"
import { registerOnchfsWorker } from "@whitehash/onchfs-sw"
import {
  Artwork,
  Button,
  Card,
  Dialog,
  Field,
  Input,
  ProjectGallery,
  Spinner,
  TokenDetails,
  WalletGallery,
  WhitehashProvider,
} from "@whitehash/ui"
import { API_ENTRIES, ApiDocPage, GuidePage, SAMPLE_TOKEN } from "./docs-content"
import { UNDERSTAND_ENTRIES, UnderstandPage } from "./understand-content"
import { Callout, CodeBlock, DocsPage, DocsShell, SiteHeader, type DocsNavItem } from "./components/docs-chrome"
import { SettingsPage } from "./settings-page"
import { chainReaderConfigFrom, defaultSettings, loadSettings, type Settings } from "./settings"
import { loadRecent, pushRecent } from "./recent"

type Route =
  | { name: "home" }
  | { name: "api"; slug: string }
  | { name: "guide"; slug: string }
  | { name: "understand"; slug: string }
  | { name: "settings" }
  | { name: "project"; ref: ProjectRef }
  | { name: "wallet"; address: string }
  | { name: "token"; address: string; key: string }
  | { name: "direct-token"; ref: TokenRef }

function parsePath(pathname: string, search: URLSearchParams): Route {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent)
  if (parts[0] === "docs" && parts[1]) return { name: "api", slug: parts[1] }
  if (parts[0] === "guide" && parts[1]) return { name: "guide", slug: parts[1] }
  if (parts[0] === "understand" && parts[1]) return { name: "understand", slug: parts[1] }
  if (parts[0] === "settings") return { name: "settings" }
  if (parts[0] === "p" && parts[1] && parts[2]) return { name: "project", ref: { type: "project", chain: parts[1] as ProjectRef["chain"], id: parts[2] } }
  if (parts[0] === "w" && parts[1]) {
    const address = parts[1]
    if (parts[2] === "t" && parts[3] && parts[4] && parts[5]) return { name: "token", address, key: `${parts[3]}/${parts[4]}/${parts[5]}` }
    return { name: "wallet", address }
  }
  const project = search.get("project")
  if (project) {
    try { return { name: "project", ref: parseRef(project, "project") } } catch { /* Invalid input lands on home. */ }
  }
  const directToken = search.get("tokenRef")
  if (directToken) {
    try { return { name: "direct-token", ref: parseRef(directToken, "token") } } catch { /* Invalid input lands on home. */ }
  }
  const wallet = search.get("wallet")
  const token = search.get("token")
  if (wallet && token) return { name: "token", address: wallet, key: token }
  if (wallet) return { name: "wallet", address: wallet }
  return { name: "home" }
}

const segment = (value: string) => encodeURIComponent(value)
const walletPath = (address: string) => `/?wallet=${segment(address)}`
const projectPath = (ref: ProjectRef) => `/?project=${segment(formatRef(ref))}`
const directTokenPath = (ref: TokenRef) => `/?tokenRef=${segment(formatRef(ref))}`
const tokenPath = (token: WhitehashToken, address: string) => `/?wallet=${segment(address)}&token=${segment(tokenKey(token))}`

const DOC_NAV: DocsNavItem[] = [
  // Start
  { label: "Getting started", href: "/guide/getting-started", group: "Start" },
  { label: "How it works", href: "/guide/how-it-works", group: "Start" },
  // Understand — the transparency layer
  ...UNDERSTAND_ENTRIES.map(entry => ({ label: entry.title, href: `/understand/${entry.slug}`, group: "Understand" })),
  // API — grouped by React hooks / Primitives / Domain / Blocks
  ...API_ENTRIES.map(entry => ({ label: entry.name, href: `/docs/${entry.slug}`, group: entry.group })),
  // Guides
  { label: "Configuration", href: "/guide/configuration", group: "Guides" },
  { label: "Theming", href: "/guide/theming", group: "Guides" },
  { label: "Explore variations", href: "/guide/variations", group: "Guides" },
  { label: "onchfs in the browser", href: "/guide/onchfs", group: "Guides" },
  { label: "Next.js", href: "/guide/next", group: "Guides" },
  { label: "onchfs server fallback", href: "/guide/proxy", group: "Guides" },
]

export function App() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  useEffect(() => setSettings(loadSettings()), [])
  useEffect(() => { void registerOnchfsWorker().catch(error => console.warn("onchfs worker unavailable", error)) }, [])
  const config = useMemo(() => ({ ...chainReaderConfigFrom(settings), mode: settings.mode }), [settings])
  return <WhitehashProvider config={config}><DocsApp settings={settings} onSettingsChange={setSettings} /></WhitehashProvider>
}

function DocsApp({ settings, onSettingsChange }: { settings: Settings; onSettingsChange: (settings: Settings) => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const search = useSearchParams()
  const route = parsePath(pathname, search)
  const { client } = useWhitehash()
  const [searchOpen, setSearchOpen] = useState(false)
  const navigate = (to: string) => { router.push(to); window.scrollTo(0, 0) }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && /^(input|textarea)$/i.test(target.tagName)
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault(); setSearchOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const address = route.name === "wallet" || route.name === "token" ? route.address : null
  const wallet = useWalletTokens(address)
  useEffect(() => { if (address) pushRecent(address) }, [address])

  const docsRoute = route.name === "api" || route.name === "guide" || route.name === "understand"
  return (
    <div className="min-h-screen bg-canvas text-fg">
      <SiteHeader actions={<>
        <Button variant="ghost" size="sm" render={<a href="/guide/getting-started" />}>Docs</Button>
        {address ? <Button variant="ghost" size="sm" onClick={wallet.refresh} disabled={wallet.loading}>{wallet.loading ? <Spinner className="size-3.5" /> : null}Refresh</Button> : null}
        <Button variant="secondary" size="sm" onClick={() => setSearchOpen(true)} className="hidden sm:inline-flex">Search <kbd className="ml-2 text-[10px] text-faint">⌘K</kbd></Button>
        <Button variant="ghost" size="sm" render={<a href="/settings" />}>Settings</Button>
      </>} />

      {docsRoute ? (
        <DocsShell items={DOC_NAV} currentHref={pathname}>
          {route.name === "api" ? <ApiDocPage entry={API_ENTRIES.find(entry => entry.slug === route.slug) ?? API_ENTRIES[0]!} />
            : route.name === "understand" ? <UnderstandPage slug={route.slug} />
            : <><GuidePage slug={route.slug} />{route.slug === "variations" ? <DocsPage><Variations token={VARIATION_SAMPLE_TOKEN} /></DocsPage> : null}</>}
        </DocsShell>
      ) : (
        <main>
          {route.name === "home" ? <HomePage onSearch={() => setSearchOpen(true)} /> : null}
          <div className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-6">
            {route.name === "project" ? <ProjectRoute projectRef={route.ref} onBack={() => navigate("/")} /> : null}
            {route.name === "settings" ? <SettingsPage settings={settings} onChange={onSettingsChange} onBack={() => router.back()} /> : null}
            {route.name === "wallet" && wallet.state ? <WalletGallery.Content address={wallet.state.address} state={wallet.state} loading={wallet.loading} onOpenToken={token => navigate(tokenPath(token, wallet.state!.address))} /> : null}
            {route.name === "token" && wallet.state ? <TokenRoute tokenKeyWanted={route.key} tokens={wallet.state.tokens} loading={wallet.loading} onBack={() => navigate(walletPath(route.address))} /> : null}
            {route.name === "direct-token" ? <DirectTokenRoute tokenRef={route.ref} onBack={() => navigate("/")} /> : null}
          </div>
        </main>
      )}

      <PasteSearch open={searchOpen} onOpenChange={setSearchOpen} recentAddresses={loadRecent()} onSubmit={value => {
        const input = resolveInput(value)
        if (input.type === "address") navigate(walletPath(input.address))
        else if (input.type === "project") navigate(projectPath(input))
        else if (input.type === "token") navigate(directTokenPath(input))
        else {
          const url = client.resolveUri(input.uri)
          if (!url) throw new Error("This content needs a chain or an enabled onchfs resolver.")
          window.open(url, "_blank", "noopener,noreferrer")
        }
      }} />
    </div>
  )
}

function HomePage({ onSearch }: { onSearch: () => void }) {
  return (
    <>
      <section className="home-hero">
        <div className="home-grid" aria-hidden />
        <div className="hero-inner relative z-10 mx-auto grid min-h-[calc(100svh-3.5rem)] max-w-[1200px] items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
          <div className="hero-copy max-w-2xl">
            <div className="mb-7 flex items-center gap-2 font-mono text-xs text-muted"><span className="size-1.5 rounded-full bg-success shadow-[0_0_14px_var(--color-success)]" /> Open source · Tezos, Ethereum &amp; Base</div>
            <h1 className="font-display text-5xl font-semibold leading-[0.96] tracking-[-0.065em] sm:text-7xl lg:text-[5.25rem]">Display any fxhash token.<br /><span className="text-muted">The easy way.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted sm:text-lg">One clean API to read and render fxhash generative art from any wallet — across two chains, three token generations, IPFS and onchfs. whitehash jumps every hoop so you just show the art.</p>
            <div className="mt-8 flex flex-wrap gap-2"><Button render={<a href="/guide/getting-started" />}>Get started</Button><Button variant="secondary" onClick={onSearch}>Try a wallet</Button></div>
          </div>
          <div className="hero-visual">
            <div className="mb-3 flex items-center justify-between font-mono text-[11px] text-faint"><span>live component</span><span>tezos:mainnet</span></div>
            <Artwork.Root token={SAMPLE_TOKEN} className="hero-artwork"><Artwork.Image /><Artwork.Live /><Artwork.PlayButton /><Artwork.StatusBadge /></Artwork.Root>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-[1200px] divide-y divide-line px-4 sm:px-6 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {[['01', 'Detect', 'A tz address selects Tezos mainnet or Ghostnet; a 0x address selects Ethereum and Base.'], ['02', 'Read', 'Known contracts are queried directly through TzKT or JSON-RPC and normalized into one token shape.'], ['03', 'Render', 'IPFS gateways fall back in order; onchfs code resolves in-browser through the same-origin service worker.']].map(([number, title, copy]) => <div key={number} className="py-9 lg:px-8 first:pl-0 last:pr-0"><div className="font-mono text-[11px] text-faint">{number}</div><h2 className="mt-4 text-lg font-medium">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{copy}</p></div>)}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 lg:py-28">
        <div className="section-kicker">No black box</div>
        <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">Every value traced to its source.</h2>
        <p className="mt-5 max-w-xl leading-7 text-muted">whitehash hides the hoops, not the truth. The three things every integrator asks — answered directly:</p>
        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
          {[
            ["Where does the image URL come from?", "Anatomy of an artifact URI and how resolveUri builds a fetchable URL.", "/understand/urls"],
            ["Where do the contract addresses come from?", "Every fxhash contract whitehash trusts, listed and verifiable on-chain.", "/understand/sources"],
            ["Project vs. token?", "The two data shapes, field by field, with the vocabulary to match.", "/understand/data-model"],
          ].map(([q, a, href]) => (
            <a key={href} href={href} className="group flex flex-col bg-canvas p-6 transition-colors hover:bg-surface">
              <h3 className="text-base font-medium">{q}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted">{a}</p>
              <span className="mt-4 text-sm text-primary">Understand →</span>
            </a>
          ))}
        </div>
        <a className="docs-text-link mt-6 inline-block" href="/understand/overview">See everything whitehash handles for you →</a>
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:py-32">
        <div><div className="section-kicker">One hook</div><h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">An address in.<br />Renderable tokens out.</h2><p className="mt-5 max-w-md leading-7 text-muted">Cache-first results arrive per chain. Refresh bypasses the cache, while a failure on one network never discards successful results from another.</p><a className="docs-text-link mt-6 inline-block" href="/docs/use-wallet-tokens">Read the API reference →</a></div>
        <CodeBlock language="tsx" code={`const wallet = useWalletTokens(
  "tz1c3hFmjFSwunjLHECnYyjr42KRt5YiHrGX"
)

wallet.state?.tokens   // normalized WhitehashToken[]
wallet.state?.chains   // progress for each selected chain
wallet.loading         // true while live reads are running
wallet.refresh()       // bypass IndexedDB and read again`} />
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1.2fr_.8fr] lg:py-32">
          <CodeBlock className="lg:order-1" language="tsx" code={`const projects = useProjects({
  chain: "eip155:1",
  order: "newest",
})

const projectRef = {
  type: "project",
  chain: "eip155:1",
  id: "0xBb47F0ED4A7E3BffcA75660dFa3B053FB7FcE78E",
} satisfies ProjectRef

const project = useProject(projectRef)
project.tokens           // minted iterations
project.loadMore()       // fetch the next page`} />
          <div className="lg:order-2"><div className="section-kicker">One project vocabulary</div><h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">Discover broadly.<br />Read precisely.</h2><p className="mt-5 max-w-md leading-7 text-muted"><code>useProjects</code> lists projects on one chain. Every result includes a <code>ProjectRef</code> you can pass to <code>useProject</code>. On EVM chains its <code>id</code> is the project’s ERC-721 contract address; on Tezos it identifies an issuer ledger entry.</p><div className="mt-6 flex flex-wrap gap-x-5 gap-y-2"><a className="docs-text-link inline-block" href="/docs/use-projects">Browse projects →</a><a className="docs-text-link inline-block" href="/docs/use-project">Understand ProjectRef →</a></div></div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:py-32">
          <div><div className="section-kicker">Components are the showcase</div><h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">Use the full block.<br />Replace any layer.</h2><p className="mt-5 max-w-md leading-7 text-muted">Start with a wallet gallery or compose the artwork, image fallback, live frame, and status parts yourself.</p></div>
          <div className="showcase-row"><Card.Root><Card.Media><Artwork.Root token={SAMPLE_TOKEN} className="size-full rounded-none border-0"><Artwork.Image source="thumbnail" /></Artwork.Root></Card.Media><Card.Body><Card.Title>{SAMPLE_TOKEN.name}</Card.Title></Card.Body></Card.Root><Callout>Preview images and live artifacts are separate. A token can have a working live view even when its metadata has no display image.</Callout></div>
        </div>
      </section>

      <section className="border-t border-line py-24 text-center sm:py-32"><div className="section-kicker">Build from public data</div><h2 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">Own the path from chain to canvas.</h2><div className="mt-8"><Button render={<a href="/guide/getting-started" />}>Start building</Button></div></section>
    </>
  )
}

function ProjectRoute({ projectRef, onBack }: { projectRef: ProjectRef; onBack: () => void }) {
  const [token, setToken] = useState<WhitehashToken | null>(null)
  if (token) return <TokenExperience token={token} onBack={() => setToken(null)} />
  return <ProjectGallery project={projectRef} onOpenToken={setToken} onBack={onBack} />
}

function TokenRoute({ tokenKeyWanted, tokens, loading, onBack }: { tokenKeyWanted: string; tokens: WhitehashToken[]; loading: boolean; onBack: () => void }) {
  const token = tokens.find(value => tokenKey(value) === tokenKeyWanted)
  if (!token) return <DocsPage className="pt-8"><Button variant="link" onClick={onBack}>← Back</Button><p className="mt-3 text-muted">{loading ? "Loading…" : "Token not found in this wallet."}</p></DocsPage>
  return <TokenExperience token={token} onBack={onBack} />
}

function DirectTokenRoute({ tokenRef, onBack }: { tokenRef: TokenRef; onBack: () => void }) {
  const { client } = useWhitehash()
  const [token, setToken] = useState<WhitehashToken | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setToken(null); setError(null)
    void client.getToken(tokenRef).then(value => { if (alive) setToken(value) }).catch(cause => {
      if (alive) setError(cause instanceof Error ? cause.message : String(cause))
    })
    return () => { alive = false }
  }, [client, tokenRef.chain, tokenRef.contract, tokenRef.tokenId])
  if (token) return <TokenExperience token={token} onBack={onBack} />
  return <DocsPage className="pt-8"><Button variant="link" onClick={onBack}>← Back</Button><p className="mt-3 text-muted">{error ?? "Loading token…"}</p></DocsPage>
}

function tokenRuntimeState(token: WhitehashToken): ProjectState {
  const metadata = token.raw && typeof token.raw === "object"
    ? token.raw as Record<string, unknown>
    : {}
  const artifact = token.artifactUri ?? ""
  const inputBytes = /(?:#0x|[?&]fxparams=)([0-9a-f]+)/i.exec(artifact)?.[1]
  const definition = (Array.isArray(metadata.params) ? metadata.params : undefined) as FxParamDefinitions | undefined
  const cid = token.generatorUri ?? artifact.replace(/[?#].*$/, "")
  return {
    cid,
    chain: token.chain.startsWith("tezos:")
      ? BlockchainType.TEZOS
      : token.chain === "eip155:8453" || token.chain === "eip155:84532"
        ? BlockchainType.BASE
        : BlockchainType.ETHEREUM,
    hash: token.iterationHash ?? undefined,
    iteration: token.tokenId,
    snippetVersion: typeof metadata.snippetVersion === "string" ? metadata.snippetVersion : undefined,
    inputBytes,
    definition,
  }
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
const VARIATION_SAMPLE_TOKEN: WhitehashToken = SAMPLE_TOKEN

function freshHash(previous: string): string {
  if (previous.startsWith("0x")) {
    return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`
  }
  return `oo${Array.from({ length: 49 }, () => BASE58[Math.floor(Math.random() * BASE58.length)]!).join("")}`
}

function coerceParam(value: string, definition: FxParamDefinition<FxParamType>) {
  if (definition.type === "number") return Number(value)
  if (definition.type === "bigint") return BigInt(value)
  if (definition.type === "boolean") return value === "true"
  return value
}

function Variations({ token }: { token: WhitehashToken }) {
  const { client } = useWhitehash()
  const state = useMemo(() => tokenRuntimeState(token), [token])
  const connector = useMemo(() => createRuntimeConnector({
    resolveUri: uri => client.resolveUri(uri, { chain: token.chain }),
  }), [client, token.chain])
  const value = useRuntimeController({ state, options: { connector, autoRefresh: true } })
  const definitions = value.runtime.definition.params ?? []
  const hash = value.runtime.state.hash ?? ""
  const supportsSeedVariation = Boolean(token.generatorUri)
  return <div className="mt-5 grid gap-8 md:grid-cols-[1.4fr_1fr]">
    <ArtworkIframe ref={value.ref} title={`Variation of ${token.name ?? token.tokenId}`} className="aspect-square w-full rounded-lg border border-line bg-black" />
    <div>
      <h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">Explore variations</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Everything runs in your browser. Change the seed or declared fx(params); the controller rebuilds the content-addressed generator URL and reloads only this iframe.</p>
      <Field.Root className="mt-5"><Field.Label>Hash</Field.Label><Field.Control render={<Input value={hash} onChange={event => value.controller.runtime().updateState({ hash: event.target.value })} />} /></Field.Root>
      <Button className="mt-2" variant="secondary" disabled={!supportsSeedVariation} onClick={() => value.controller.runtime().updateState({ hash: freshHash(hash) })}>New hash</Button>
      {!supportsSeedVariation ? <Callout className="mt-4">This token record does not include its project’s reusable <code>generatorUri</code>. Its minted <code>artifactUri</code> may have the original seed embedded, so it is not safe to use as a variation generator.</Callout> : null}
      {definitions.length ? <div className="mt-6 space-y-4">{definitions.map(definition => <Field.Root key={definition.id}>
        <Field.Label>{definition.name ?? definition.id}</Field.Label>
        <Field.Control render={<Input defaultValue={String(value.controls.params.values[definition.id] ?? definition.value ?? definition.default)} onChange={event => value.controller.controls().update({ [definition.id]: coerceParam(event.target.value, definition) }, definitions, { forceRefresh: true })} />} />
      </Field.Root>)}</div> : <Callout className="mt-6">This token does not publish editable fx(params) definitions. Seed exploration is still available.</Callout>}
      <p className="mt-5 break-all font-mono text-[11px] text-faint">{value.controller.getUrl()}</p>
    </div>
  </div>
}

function TokenExperience({ token, onBack }: { token: WhitehashToken; onBack: () => void }) {
  const [tab, setTab] = useState<"details" | "explore">("details")
  return <DocsPage className="pt-5">
    <Button variant="link" onClick={onBack}>← Back</Button>
    <div className="mt-4 flex gap-2"><Button size="sm" variant={tab === "details" ? "primary" : "secondary"} onClick={() => setTab("details")}>Details</Button><Button size="sm" variant={tab === "explore" ? "primary" : "secondary"} onClick={() => setTab("explore")}>Explore</Button></div>
    {tab === "details" ? <TokenDetails token={token} settingsHref="/settings" className="pt-0" /> : <Variations token={token} />}
  </DocsPage>
}

function PasteSearch({ open, onOpenChange, recentAddresses, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; recentAddresses: string[]; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const submit = (candidate: string) => {
    try { onSubmit(candidate.trim()); setError(null); onOpenChange(false) }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><Dialog.Content>
    <Dialog.Title>Paste anything</Dialog.Title>
    <p className="mt-1 text-sm text-muted">Wallet address, project or token ref, artwork URL, or CID.</p>
    <form className="mt-4 flex gap-2" onSubmit={event => { event.preventDefault(); submit(value) }}>
      <Input value={value} onChange={event => setValue(event.target.value)} autoFocus placeholder="tz1…, 0x…, project/…, token/…, or CID" />
      <Button type="submit">Open</Button>
    </form>
    {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    {recentAddresses.length ? <div className="mt-4 flex flex-wrap gap-2">{recentAddresses.map(address => <Button key={address} variant="ghost" size="sm" onClick={() => submit(address)}>{address.slice(0, 8)}…</Button>)}</div> : null}
  </Dialog.Content></Dialog>
}
