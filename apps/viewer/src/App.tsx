import { useEffect, useMemo, useState } from "react"
import { Badge, Button, Spinner, type BadgeProps } from "@whitehash/ui"
import { loadSettings, resolverConfigFrom, type Settings } from "./settings.js"
import { useWalletTokens, type ChainState } from "./useWalletTokens.js"
import { tokenKey } from "./render.js"
import { AddressForm, pushRecent } from "./components/AddressForm.js"
import { TokenGrid } from "./components/TokenGrid.js"
import { TokenDetail } from "./components/TokenDetail.js"
import { SettingsPanel } from "./components/SettingsPanel.js"
import { BrowseView } from "./components/BrowseView.js"
import { ProjectView } from "./components/ProjectView.js"
import type { ChainId, WhitehashToken } from "@whitehash/chain-reader"

type Route =
  | { name: "home" }
  | { name: "settings" }
  | { name: "browse" }
  | { name: "project"; chain: string; ref: string }
  | { name: "wallet"; address: string }
  | { name: "token"; address: string; key: string }

function parseHash(): Route {
  const hash = location.hash.replace(/^#/, "")
  const parts = hash.split("/").filter(Boolean)
  if (parts[0] === "settings") return { name: "settings" }
  if (parts[0] === "browse") {
    if (parts[1] && parts[2]) {
      return {
        name: "project",
        chain: decodeURIComponent(parts[1]),
        ref: decodeURIComponent(parts[2]),
      }
    }
    return { name: "browse" }
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

function walletHash(address: string): string {
  return `/w/${encodeURIComponent(address)}`
}
function tokenHash(token: WhitehashToken, address: string): string {
  const { chain, contract, tokenId } = token
  return `/w/${encodeURIComponent(address)}/t/${encodeURIComponent(chain)}/${encodeURIComponent(
    contract,
  )}/${encodeURIComponent(tokenId)}`
}

export function App() {
  const [route, setRoute] = useState<Route>(parseHash())
  const [settings, setSettings] = useState<Settings>(loadSettings())

  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  const address =
    route.name === "wallet" || route.name === "token" ? route.address : null
  const { state, loading, refresh } = useWalletTokens(address, settings)
  const resolver = useMemo(() => resolverConfigFrom(settings), [settings])

  useEffect(() => {
    if (address) pushRecent(address)
  }, [address])

  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-16">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-canvas py-4">
        <button
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-fg"
          onClick={() => navigate("/")}
        >
          <img className="size-7 rounded-md" src="./logo.png" alt="" />
          whitehash
        </button>
        <nav className="flex items-center gap-1">
          {address ? (
            <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
              {loading ? <Spinner className="size-3.5" /> : null}
              refresh
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => navigate("/browse")}>
            browse
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
            settings
          </Button>
        </nav>
      </header>

      <main>
        {route.name === "home" ? (
          <>
            <AddressForm onSubmit={addr => navigate(walletHash(addr))} />
            <p className="mt-6 text-center text-muted">
              …or{" "}
              <Button variant="link" onClick={() => navigate("/browse")}>
                browse all published projects →
              </Button>
            </p>
          </>
        ) : null}

        {route.name === "browse" ? (
          <BrowseView
            settings={settings}
            onOpenProject={(chain, ref) =>
              navigate(`/browse/${encodeURIComponent(chain)}/${encodeURIComponent(ref)}`)
            }
          />
        ) : null}

        {route.name === "project" ? (
          <ProjectView
            chain={route.chain as ChainId}
            refId={route.ref}
            settings={settings}
            onBack={() => navigate("/browse")}
          />
        ) : null}

        {route.name === "settings" ? (
          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            onBack={() => history.back()}
          />
        ) : null}

        {route.name === "wallet" && state ? (
          <WalletView
            state={state}
            loading={loading}
            resolver={resolver}
            onOpen={t => navigate(tokenHash(t, state.address))}
          />
        ) : null}

        {route.name === "token" && state ? (
          <TokenRoute
            tokenKeyWanted={route.key}
            tokens={state.tokens}
            loading={loading}
            resolver={resolver}
            onBack={() => navigate(walletHash(route.address))}
          />
        ) : null}
      </main>
    </div>
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
  resolver,
  onOpen,
}: {
  state: NonNullable<ReturnType<typeof useWalletTokens>["state"]>
  loading: boolean
  resolver: ReturnType<typeof resolverConfigFrom>
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

      <TokenGrid tokens={state.tokens} resolver={resolver} onOpen={onOpen} />

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
  resolver,
  onBack,
}: {
  tokenKeyWanted: string
  tokens: WhitehashToken[]
  loading: boolean
  resolver: ReturnType<typeof resolverConfigFrom>
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
  return <TokenDetail token={token} resolver={resolver} onBack={onBack} />
}
