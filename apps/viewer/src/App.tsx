import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Badge, Button, Spinner, type BadgeProps } from "@whitehash/ui"
import { WhitehashProvider, useWalletTokens, type ChainState } from "@whitehash/react"
import { tokenKey, type ChainId, type WhitehashToken } from "@whitehash/chain-reader"
import { chainReaderConfigFrom, loadSettings, type Settings } from "./settings.js"
import { pushRecent } from "./recent.js"
import { WalletSearch } from "./components/WalletSearch.js"
import { TokenGrid } from "./components/TokenGrid.js"
import { TokenDetail } from "./components/TokenDetail.js"
import { SettingsPanel } from "./components/SettingsPanel.js"
import { BrowseView } from "./components/BrowseView.js"
import { ProjectView } from "./components/ProjectView.js"

type Route =
  | { name: "home" } // the project browser
  | { name: "settings" }
  | { name: "project"; chain: string; ref: string }
  | { name: "wallet"; address: string }
  | { name: "token"; address: string; key: string }

function parseHash(): Route {
  const parts = location.hash.replace(/^#/, "").split("/").filter(Boolean)
  if (parts[0] === "settings") return { name: "settings" }
  if (parts[0] === "p" && parts[1] && parts[2]) {
    return { name: "project", chain: decodeURIComponent(parts[1]), ref: decodeURIComponent(parts[2]) }
  }
  if (parts[0] === "w" && parts[1]) {
    const address = decodeURIComponent(parts[1])
    if (parts[2] === "t" && parts[3] && parts[4] && parts[5]) {
      const chain = decodeURIComponent(parts[3])
      const key = `${chain}/${decodeURIComponent(parts[4])}/${decodeURIComponent(parts[5])}`
      return { name: "token", address, key }
    }
    return { name: "wallet", address }
  }
  return { name: "home" }
}

export function navigate(to: string): void {
  location.hash = to
}

const walletHash = (address: string) => `/w/${encodeURIComponent(address)}`
const projectHash = (chain: string, ref: string) =>
  `/p/${encodeURIComponent(chain)}/${encodeURIComponent(ref)}`
function tokenHash(token: WhitehashToken, address: string): string {
  const { chain, contract, tokenId } = token
  return `${walletHash(address)}/t/${encodeURIComponent(chain)}/${encodeURIComponent(
    contract,
  )}/${encodeURIComponent(tokenId)}`
}

export function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings())
  const config = useMemo(
    () => ({ ...chainReaderConfigFrom(settings), mode: settings.mode }),
    [settings],
  )
  return (
    <WhitehashProvider config={config}>
      <ViewerApp settings={settings} onSettingsChange={setSettings} />
    </WhitehashProvider>
  )
}

function ViewerApp({
  settings,
  onSettingsChange,
}: {
  settings: Settings
  onSettingsChange: (settings: Settings) => void
}) {
  const [route, setRoute] = useState<Route>(parseHash())
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  // Cmd/Ctrl+K or "/" opens wallet search (unless typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const typing = el && /^(input|textarea)$/i.test(el.tagName)
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Per-view scroll restoration. Browse is kept mounted, so returning to it
  // restores both its state and scroll position. Take over from the browser's
  // own history scroll-restoration, which would otherwise reset us to 0.
  const scrollMap = useRef<Record<string, number>>({})
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual"
    const onScroll = () => {
      scrollMap.current[location.hash || "#/"] = window.scrollY
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  useLayoutEffect(() => {
    const y = scrollMap.current[location.hash || "#/"] ?? 0
    // Restore after layout settles (two frames covers the un-hide + reflow).
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)))
  }, [route])

  const address =
    route.name === "wallet" || route.name === "token" ? route.address : null
  const { state, loading, refresh } = useWalletTokens(address)

  useEffect(() => {
    if (address) pushRecent(address)
  }, [address])

  const isHome = route.name === "home"

  return (
    <div className="app-shell mx-auto max-w-[1200px] px-4 pb-24 sm:px-6">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-canvas/90 py-4 backdrop-blur-md">
        <button
          className="group flex min-h-11 min-w-11 items-center gap-3 text-left text-fg sm:min-h-0 sm:min-w-0"
          aria-label="Whitehash Home"
          onClick={() => navigate("/")}
        >
          <img className="brand-mark size-8 rounded-sm" src="./logo.png" alt="" />
          <span className="hidden min-[480px]:block">
            <span className="block font-display text-base font-semibold leading-5 tracking-[-0.02em]">whitehash</span>
          </span>
        </button>
        <nav className="flex items-center gap-1">
          {address ? (
            <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
              <span className="flex size-3.5 items-center justify-center" aria-hidden={!loading}>
                {loading ? <Spinner className="size-3.5" /> : null}
              </span>
              Refresh Wallet
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => setSearchOpen(true)}>
            <SearchIcon />
            Search Wallet
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
            Settings
          </Button>
        </nav>
      </header>

      <main>
        {/* Browse is home and stays mounted so its filters, loaded projects, and
            scroll survive drilling into a project and back. */}
        <div hidden={!isHome}>
          <BrowseView
            onOpenProject={(chain, ref) => navigate(projectHash(chain, ref))}
          />
        </div>

        {route.name === "project" ? (
          <ProjectView
            chain={route.chain as ChainId}
            refId={route.ref}
            onBack={() => navigate("/")}
          />
        ) : null}

        {route.name === "settings" ? (
          <SettingsPanel settings={settings} onChange={onSettingsChange} onBack={() => history.back()} />
        ) : null}

        {route.name === "wallet" && state ? (
          <WalletView
            state={state}
            loading={loading}
            onOpen={t => navigate(tokenHash(t, state.address))}
          />
        ) : null}

        {route.name === "token" && state ? (
          <TokenRoute
            tokenKeyWanted={route.key}
            tokens={state.tokens}
            loading={loading}
            onBack={() => navigate(walletHash(route.address))}
          />
        ) : null}
      </main>

      <WalletSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSubmit={addr => navigate(walletHash(addr))}
      />
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const STATUS_VARIANT: Record<ChainState["status"], BadgeProps["variant"]> = {
  idle: "default",
  loading: "default",
  cached: "accent",
  done: "success",
  error: "danger",
}

function WalletView({
  state,
  loading,
  onOpen,
}: {
  state: NonNullable<ReturnType<typeof useWalletTokens>["state"]>
  loading: boolean
  onOpen: (t: WhitehashToken) => void
}) {
  const chainStates = Object.values(state.chains)
  const noChains = chainStates.length === 0
  return (
    <div>
      <div className="py-5">
        <h2 className="truncate font-mono text-sm text-muted">{state.address}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {chainStates.map(cs => (
            <Badge key={cs.chain} variant={STATUS_VARIANT[cs.status]}>
              {cs.chain}: {cs.message}
            </Badge>
          ))}
        </div>
      </div>

      {noChains ? (
        <p className="text-muted">
          That doesn’t look like a Tezos or EVM address for the current network mode.
        </p>
      ) : null}

      <TokenGrid tokens={state.tokens} onOpen={onOpen} />

      {!loading && state.tokens.length === 0 && !noChains ? (
        <p className="mt-4 text-muted">No fxhash tokens found for this wallet.</p>
      ) : null}
    </div>
  )
}

function TokenRoute({
  tokenKeyWanted,
  tokens,
  loading,
  onBack,
}: {
  tokenKeyWanted: string
  tokens: WhitehashToken[]
  loading: boolean
  onBack: () => void
}) {
  const token = tokens.find(t => tokenKey(t) === tokenKeyWanted)
  if (!token) {
    return (
      <div className="pt-5">
        <Button variant="link" onClick={onBack}>
          ← back
        </Button>
        <p className="mt-2 text-muted">
          {loading ? "Loading…" : "Token not found in this wallet."}
        </p>
      </div>
    )
  }
  return <TokenDetail token={token} onBack={onBack} />
}
