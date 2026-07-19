"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { tokenKey, type ChainId, type WhitehashToken } from "@whitehash/chain-reader"
import { useWalletTokens } from "@whitehash/react"
import {
  Artwork,
  Button,
  ProjectGallery,
  Spinner,
  TokenCard,
  TokenDetails,
  WalletGallery,
  WalletSearch,
  WhitehashProvider,
} from "@whitehash/ui"
import { API_ENTRIES, ApiDocPage, GuidePage, SAMPLE_TOKEN } from "./docs-content"
import { Callout, CodeBlock, DocsPage, DocsShell, SiteHeader, type DocsNavItem } from "./components/docs-chrome"
import { SettingsPage } from "./settings-page"
import { chainReaderConfigFrom, defaultSettings, loadSettings, type Settings } from "./settings"
import { loadRecent, pushRecent } from "./recent"

type Route =
  | { name: "home" }
  | { name: "api"; slug: string }
  | { name: "guide"; slug: string }
  | { name: "settings" }
  | { name: "project"; chain: string; ref: string }
  | { name: "wallet"; address: string }
  | { name: "token"; address: string; key: string }

function parsePath(pathname: string, search: URLSearchParams): Route {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent)
  if (parts[0] === "docs" && parts[1]) return { name: "api", slug: parts[1] }
  if (parts[0] === "guide" && parts[1]) return { name: "guide", slug: parts[1] }
  if (parts[0] === "settings") return { name: "settings" }
  if (parts[0] === "p" && parts[1] && parts[2]) return { name: "project", chain: parts[1], ref: parts[2] }
  if (parts[0] === "w" && parts[1]) {
    const address = parts[1]
    if (parts[2] === "t" && parts[3] && parts[4] && parts[5]) return { name: "token", address, key: `${parts[3]}/${parts[4]}/${parts[5]}` }
    return { name: "wallet", address }
  }
  const projectChain = search.get("projectChain")
  const projectRef = search.get("projectRef")
  if (projectChain && projectRef) return { name: "project", chain: projectChain, ref: projectRef }
  const wallet = search.get("wallet")
  const token = search.get("token")
  if (wallet && token) return { name: "token", address: wallet, key: token }
  if (wallet) return { name: "wallet", address: wallet }
  return { name: "home" }
}

const segment = (value: string) => encodeURIComponent(value)
const walletPath = (address: string) => `/?wallet=${segment(address)}`
const projectPath = (chain: string, ref: string) => `/?projectChain=${segment(chain)}&projectRef=${segment(ref)}`
const tokenPath = (token: WhitehashToken, address: string) => `/?wallet=${segment(address)}&token=${segment(tokenKey(token))}`

const DOC_NAV: DocsNavItem[] = [
  { label: "Getting started", href: "/guide/getting-started", group: "Guide" },
  { label: "How it works", href: "/guide/how-it-works", group: "Guide" },
  { label: "Configuration", href: "/guide/configuration", group: "Guide" },
  { label: "Theming", href: "/guide/theming", group: "Guide" },
  { label: "Next.js", href: "/guide/next", group: "Deploy" },
  { label: "onchfs proxy", href: "/guide/proxy", group: "Deploy" },
  ...API_ENTRIES.map(entry => ({ label: entry.name, href: `/docs/${entry.slug}`, group: entry.group })),
]

export function App() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  useEffect(() => setSettings(loadSettings()), [])
  const config = useMemo(() => ({ ...chainReaderConfigFrom(settings), mode: settings.mode }), [settings])
  return <WhitehashProvider config={config}><DocsApp settings={settings} onSettingsChange={setSettings} /></WhitehashProvider>
}

function DocsApp({ settings, onSettingsChange }: { settings: Settings; onSettingsChange: (settings: Settings) => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const search = useSearchParams()
  const route = parsePath(pathname, search)
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

  const docsRoute = route.name === "api" || route.name === "guide"
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
          {route.name === "api" ? <ApiDocPage entry={API_ENTRIES.find(entry => entry.slug === route.slug) ?? API_ENTRIES[0]!} /> : <GuidePage slug={route.slug} />}
        </DocsShell>
      ) : (
        <main>
          {route.name === "home" ? <HomePage onSearch={() => setSearchOpen(true)} /> : null}
          <div className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-6">
            {route.name === "project" ? <ProjectRoute chain={route.chain as ChainId} projectRef={route.ref} onBack={() => navigate("/")} /> : null}
            {route.name === "settings" ? <SettingsPage settings={settings} onChange={onSettingsChange} onBack={() => router.back()} /> : null}
            {route.name === "wallet" && wallet.state ? <WalletGallery.Content address={wallet.state.address} state={wallet.state} loading={wallet.loading} onOpenToken={token => navigate(tokenPath(token, wallet.state!.address))} /> : null}
            {route.name === "token" && wallet.state ? <TokenRoute tokenKeyWanted={route.key} tokens={wallet.state.tokens} loading={wallet.loading} onBack={() => navigate(walletPath(route.address))} /> : null}
          </div>
        </main>
      )}

      <WalletSearch open={searchOpen} onOpenChange={setSearchOpen} recentAddresses={loadRecent()} onSubmit={value => navigate(walletPath(value))} />
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
            <h1 className="font-display text-5xl font-semibold leading-[0.96] tracking-[-0.065em] sm:text-7xl lg:text-[5.25rem]">Generative art,<br /><span className="text-muted">without the platform.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted sm:text-lg">Read wallets from public chains, resolve content-addressed media, and render live artwork with composable React APIs.</p>
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
          {[['01', 'Detect', 'A tz address selects Tezos mainnet or Ghostnet; a 0x address selects Ethereum and Base.'], ['02', 'Read', 'Known contracts are queried directly through TzKT or JSON-RPC and normalized into one token shape.'], ['03', 'Render', 'IPFS gateways fall back in order; onchfs code is served by your optional self-hosted proxy.']].map(([number, title, copy]) => <div key={number} className="py-9 lg:px-8 first:pl-0 last:pr-0"><div className="font-mono text-[11px] text-faint">{number}</div><h2 className="mt-4 text-lg font-medium">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{copy}</p></div>)}
        </div>
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

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:py-32">
          <div><div className="section-kicker">Components are the showcase</div><h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">Use the full block.<br />Replace any layer.</h2><p className="mt-5 max-w-md leading-7 text-muted">Start with a wallet gallery or compose the artwork, image fallback, live frame, and status parts yourself.</p></div>
          <div className="showcase-row"><TokenCard token={SAMPLE_TOKEN} /><Callout>Preview images and live artifacts are separate. A token can have a working live view even when its metadata has no display image.</Callout></div>
        </div>
      </section>

      <section className="border-t border-line py-24 text-center sm:py-32"><div className="section-kicker">Build from public data</div><h2 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">Own the path from chain to canvas.</h2><div className="mt-8"><Button render={<a href="/guide/getting-started" />}>Start building</Button></div></section>
    </>
  )
}

function ProjectRoute({ chain, projectRef, onBack }: { chain: ChainId; projectRef: string; onBack: () => void }) {
  const [token, setToken] = useState<WhitehashToken | null>(null)
  if (token) return <TokenDetails token={token} onBack={() => setToken(null)} settingsHref="/settings" />
  return <ProjectGallery chain={chain} projectRef={projectRef} onOpenToken={setToken} onBack={onBack} />
}

function TokenRoute({ tokenKeyWanted, tokens, loading, onBack }: { tokenKeyWanted: string; tokens: WhitehashToken[]; loading: boolean; onBack: () => void }) {
  const token = tokens.find(value => tokenKey(value) === tokenKeyWanted)
  if (!token) return <DocsPage className="pt-8"><Button variant="link" onClick={onBack}>← Back</Button><p className="mt-3 text-muted">{loading ? "Loading…" : "Token not found in this wallet."}</p></DocsPage>
  return <TokenDetails token={token} onBack={onBack} settingsHref="/settings" />
}
