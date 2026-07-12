import { useEffect, useMemo, useState } from "react"
import { loadSettings, resolverConfigFrom, type Settings } from "./settings.js"
import { useWalletTokens } from "./useWalletTokens.js"
import { tokenKey } from "./render.js"
import { AddressForm, pushRecent } from "./components/AddressForm.js"
import { TokenGrid } from "./components/TokenGrid.js"
import { TokenDetail } from "./components/TokenDetail.js"
import { SettingsPanel } from "./components/SettingsPanel.js"
import type { WhitehashToken } from "@whitehash/chain-reader"

type Route =
  | { name: "home" }
  | { name: "settings" }
  | { name: "wallet"; address: string }
  | { name: "token"; address: string; key: string }

function parseHash(): Route {
  const hash = location.hash.replace(/^#/, "")
  const parts = hash.split("/").filter(Boolean)
  if (parts[0] === "settings") return { name: "settings" }
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
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => navigate("/")}>
          whitehash
        </button>
        <nav>
          {address ? (
            <button className="link" onClick={refresh} disabled={loading}>
              {loading ? "loading…" : "refresh"}
            </button>
          ) : null}
          <button className="link" onClick={() => navigate("/settings")}>
            settings
          </button>
        </nav>
      </header>

      <main>
        {route.name === "home" ? (
          <AddressForm onSubmit={addr => navigate(walletHash(addr))} />
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
    <div className="wallet">
      <div className="wallet-head">
        <h2 className="mono ellipsis">{state.address}</h2>
        <div className="statuses">
          {chainStates.map(cs => (
            <span key={cs.chain} className={`status ${cs.status}`}>
              {cs.chain}: {cs.message}
            </span>
          ))}
        </div>
      </div>

      {noChains ? (
        <p className="muted">
          That doesn’t look like a Tezos or EVM address for the current network mode.
        </p>
      ) : null}

      <TokenGrid tokens={state.tokens} resolver={resolver} onOpen={onOpen} />

      {!loading && state.tokens.length === 0 && !noChains ? (
        <p className="muted">No fxhash tokens found for this wallet.</p>
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
      <div className="detail">
        <button className="link" onClick={onBack}>
          ← back
        </button>
        <p className="muted">{loading ? "Loading…" : "Token not found in this wallet."}</p>
      </div>
    )
  }
  return <TokenDetail token={token} resolver={resolver} onBack={onBack} />
}
