import { useEffect, useMemo, useState } from "react"
import { tokenKey, type ChainId, type WhitehashToken } from "@whitehash/chain-reader"
import { useWalletTokens } from "@whitehash/react"
import {
  Button,
  Callout,
  CodeBlock,
  DocsHeading,
  DocsPage,
  DocsSection,
  DocsShell,
  ProjectBrowser,
  ProjectGallery,
  SiteHeader,
  Spinner,
  TokenDetails,
  ToolkitHero,
  WalletGallery,
  WalletSearch,
  WhitehashProvider,
  type DocsNavItem,
} from "@whitehash/ui"
import { API_ENTRIES, ApiDocPage, GuidePage } from "./docs-content.js"
import { SettingsPage } from "./settings-page.js"
import { chainReaderConfigFrom, loadSettings, type Settings } from "./settings.js"
import { loadRecent, pushRecent } from "./recent.js"

type Route =
  | { name: "home" }
  | { name: "api"; slug: string }
  | { name: "guide"; slug: string }
  | { name: "showcase" }
  | { name: "settings" }
  | { name: "project"; chain: string; ref: string }
  | { name: "wallet"; address: string }
  | { name: "token"; address: string; key: string }

function parseHash(): Route {
  const parts = location.hash.replace(/^#/, "").split("/").filter(Boolean)
  if (parts[0] === "docs" && parts[1]) return { name: "api", slug: parts[1] }
  if (parts[0] === "guide" && parts[1]) return { name: "guide", slug: parts[1] }
  if (parts[0] === "showcase") return { name: "showcase" }
  if (parts[0] === "settings") return { name: "settings" }
  if (parts[0] === "p" && parts[1] && parts[2]) return { name: "project", chain: decodeURIComponent(parts[1]), ref: decodeURIComponent(parts[2]) }
  if (parts[0] === "w" && parts[1]) {
    const address = decodeURIComponent(parts[1])
    if (parts[2] === "t" && parts[3] && parts[4] && parts[5]) {
      return { name: "token", address, key: `${decodeURIComponent(parts[3])}/${decodeURIComponent(parts[4])}/${decodeURIComponent(parts[5])}` }
    }
    return { name: "wallet", address }
  }
  return { name: "home" }
}

const navigate = (to: string) => { location.hash = to }
const walletHash = (address: string) => `/w/${encodeURIComponent(address)}`
const projectHash = (chain: string, ref: string) => `/p/${encodeURIComponent(chain)}/${encodeURIComponent(ref)}`
const tokenHash = (token: WhitehashToken, address: string) => `${walletHash(address)}/t/${encodeURIComponent(token.chain)}/${encodeURIComponent(token.contract)}/${encodeURIComponent(token.tokenId)}`

const DOC_NAV: DocsNavItem[] = [
  { label: "Getting started", href: "#/guide/getting-started", group: "Guide" },
  { label: "Choose a layer", href: "#/guide/layers", group: "Guide" },
  { label: "Theming", href: "#/guide/theming", group: "Guide" },
  { label: "Vite", href: "#/guide/vite", group: "Deploy" },
  { label: "Next.js", href: "#/guide/next", group: "Deploy" },
  { label: "onchfs proxy", href: "#/guide/proxy", group: "Deploy" },
  { label: "Static hosting", href: "#/guide/deploy", group: "Deploy" },
  ...API_ENTRIES.map(entry => ({ label: entry.name, href: `#/docs/${entry.slug}`, group: entry.group })),
]

export function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings())
  const config = useMemo(() => ({ ...chainReaderConfigFrom(settings), mode: settings.mode }), [settings])
  return <WhitehashProvider config={config}><DocsApp settings={settings} onSettingsChange={setSettings} /></WhitehashProvider>
}

function DocsApp({ settings, onSettingsChange }: { settings: Settings; onSettingsChange: (settings: Settings) => void }) {
  const [route, setRoute] = useState<Route>(parseHash())
  const [searchOpen, setSearchOpen] = useState(false)
  useEffect(() => {
    const onHash = () => { setRoute(parseHash()); window.scrollTo(0, 0) }
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])
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
  const currentHref = location.hash || "#/"
  return (
    <div className="min-h-full bg-canvas text-fg">
      <SiteHeader
        logoSrc="./logo.png"
        actions={<>
          <Button variant="ghost" size="sm" render={<a href="#/guide/getting-started" />}>Docs</Button>
          <Button variant="ghost" size="sm" render={<a href="#/showcase" />}>Browse</Button>
          {address ? <Button variant="ghost" size="sm" onClick={wallet.refresh} disabled={wallet.loading}>{wallet.loading ? <Spinner className="size-3.5" /> : null}Refresh</Button> : null}
          <Button variant="secondary" size="sm" onClick={() => setSearchOpen(true)}>Search wallet</Button>
          <Button variant="ghost" size="sm" render={<a href="#/settings" />}>Settings</Button>
        </>}
      />

      {docsRoute ? (
        <DocsShell items={DOC_NAV} currentHref={currentHref}>
          {route.name === "api" ? <ApiDocPage entry={API_ENTRIES.find(entry => entry.slug === route.slug) ?? API_ENTRIES[0]!} /> : <GuidePage slug={route.slug} />}
        </DocsShell>
      ) : (
        <main>
          {route.name === "home" ? <HomePage /> : null}
          <div className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-6">
            {route.name === "showcase" ? <ProjectBrowser onOpenProject={(chain, ref) => navigate(projectHash(chain, ref))} /> : null}
            {route.name === "project" ? <ProjectRoute chain={route.chain as ChainId} projectRef={route.ref} onBack={() => navigate("/showcase")} /> : null}
            {route.name === "settings" ? <SettingsPage settings={settings} onChange={onSettingsChange} onBack={() => history.back()} /> : null}
            {route.name === "wallet" && wallet.state ? <WalletGallery.Content address={wallet.state.address} state={wallet.state} loading={wallet.loading} onOpenToken={token => navigate(tokenHash(token, wallet.state!.address))} /> : null}
            {route.name === "token" && wallet.state ? <TokenRoute tokenKeyWanted={route.key} tokens={wallet.state.tokens} loading={wallet.loading} onBack={() => navigate(walletHash(route.address))} /> : null}
          </div>
        </main>
      )}

      <WalletSearch open={searchOpen} onOpenChange={setSearchOpen} recentAddresses={loadRecent()} onSubmit={addressValue => navigate(walletHash(addressValue))} />
    </div>
  )
}

function HomePage() {
  return (
    <>
      <ToolkitHero
        logoSrc="./logo.png"
        description="Embed generative art directly from public Tezos, Ethereum, and Base infrastructure. Choose low-level reads, headless hooks, or complete UI blocks."
        actions={<><Button render={<a href="#/guide/getting-started" />}>Get started</Button><Button variant="secondary" render={<a href="#/showcase" />}>Browse live art</Button></>}
      />
      <DocsPage className="px-4 pb-24 sm:px-6">
        <DocsSection title="Choose your altitude">
          <div className="grid gap-8 md:grid-cols-3">
            <div><div className="font-mono text-xs text-primary">Layer 0</div><h3 className="mt-2 text-xl font-semibold">Framework-free</h3><p className="mt-2 text-sm leading-relaxed text-muted">Read wallets, projects, metadata, and render URLs with one configured client.</p></div>
            <div><div className="font-mono text-xs text-primary">Layer 1</div><h3 className="mt-2 text-xl font-semibold">Headless React</h3><p className="mt-2 text-sm leading-relaxed text-muted">Hooks own caching, progress, gateway fallback, and secure iframe state.</p></div>
            <div><div className="font-mono text-xs text-primary">Layer 2</div><h3 className="mt-2 text-xl font-semibold">Complete UI</h3><p className="mt-2 text-sm leading-relaxed text-muted">Composable artwork, token, gallery, search, and documentation components.</p></div>
          </div>
        </DocsSection>
        <DocsSection title="One embed, no server"><CodeBlock code={`<WhitehashProvider config={config}>\n  <WalletGallery address="tz1…" />\n</WhitehashProvider>`} /><Callout className="mt-4">The onchfs proxy is the only optional server piece; IPFS and chain reads happen directly in the browser.</Callout></DocsSection>
      </DocsPage>
    </>
  )
}

function ProjectRoute({ chain, projectRef, onBack }: { chain: ChainId; projectRef: string; onBack: () => void }) {
  const [token, setToken] = useState<WhitehashToken | null>(null)
  if (token) return <TokenDetails token={token} onBack={() => setToken(null)} settingsHref="#/settings" />
  return <ProjectGallery chain={chain} projectRef={projectRef} onOpenToken={setToken} onBack={onBack} />
}

function TokenRoute({ tokenKeyWanted, tokens, loading, onBack }: { tokenKeyWanted: string; tokens: WhitehashToken[]; loading: boolean; onBack: () => void }) {
  const token = tokens.find(value => tokenKey(value) === tokenKeyWanted)
  if (!token) return <DocsPage className="pt-8"><Button variant="link" onClick={onBack}>← Back</Button><p className="mt-3 text-muted">{loading ? "Loading…" : "Token not found in this wallet."}</p></DocsPage>
  return <TokenDetails token={token} onBack={onBack} settingsHref="#/settings" />
}
