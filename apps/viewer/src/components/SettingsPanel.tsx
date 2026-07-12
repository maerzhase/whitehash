import { useState } from "react"
import type { ChainId } from "@whitehash/chain-reader"
import { defaultSettings, saveSettings, type Settings } from "../settings.js"

const EVM_NETWORKS: { chain: ChainId; label: string }[] = [
  { chain: "eip155:1", label: "Ethereum RPCs" },
  { chain: "eip155:8453", label: "Base RPCs" },
  { chain: "eip155:11155111", label: "Sepolia RPCs" },
  { chain: "eip155:84532", label: "Base Sepolia RPCs" },
]

function lines(v: string[] | undefined): string {
  return (v ?? []).join("\n")
}
function parseLines(v: string): string[] {
  return v
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean)
}

export function SettingsPanel({
  settings,
  onChange,
  onBack,
}: {
  settings: Settings
  onChange: (s: Settings) => void
  onBack: () => void
}) {
  const [draft, setDraft] = useState<Settings>(settings)

  const commit = (next: Settings) => {
    setDraft(next)
    onChange(next)
    saveSettings(next)
  }

  return (
    <div className="settings">
      <button className="link" onClick={onBack}>
        ← back
      </button>
      <h2>Settings</h2>

      <section>
        <h3>Network mode</h3>
        <div className="toggle">
          {(["mainnet", "testnet"] as const).map(m => (
            <button
              key={m}
              className={draft.mode === m ? "on" : ""}
              onClick={() => commit({ ...draft, mode: m })}
            >
              {m}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>IPFS gateways</h3>
        <p className="muted">One per line, tried in order.</p>
        <textarea
          value={lines(draft.ipfsGateways)}
          onChange={e => commit({ ...draft, ipfsGateways: parseLines(e.target.value) })}
          rows={3}
        />
      </section>

      <section>
        <h3>onchfs proxy URL</h3>
        <p className="muted">
          Required to view onchfs artworks (many Ethereum & Base pieces store their code
          on-chain). Run <code>pnpm --filter @whitehash/onchfs-proxy start</code> and point
          this at it (e.g. http://localhost:3000), or deploy apps/onchfs-proxy.
        </p>
        <input
          type="text"
          placeholder="https://my-onchfs-proxy.example"
          value={draft.onchfsProxy}
          onChange={e => commit({ ...draft, onchfsProxy: e.target.value })}
        />
      </section>

      <section>
        <h3>EVM RPCs</h3>
        <p className="muted">
          Public RPCs cap log queries, so EVM wallet scans are slow. Paste an
          archive-capable RPC (one line each) for fast lookups. Blank = library default.
        </p>
        {EVM_NETWORKS.map(({ chain, label }) => (
          <label key={chain} className="field">
            <span>{label}</span>
            <textarea
              rows={2}
              value={lines(draft.rpcs[chain])}
              onChange={e =>
                commit({
                  ...draft,
                  rpcs: { ...draft.rpcs, [chain]: parseLines(e.target.value) },
                })
              }
            />
          </label>
        ))}
      </section>

      <section>
        <h3>TzKT base URLs</h3>
        <label className="field">
          <span>Mainnet</span>
          <input
            type="text"
            placeholder="https://api.tzkt.io"
            value={draft.tzkt["tezos:mainnet"] ?? ""}
            onChange={e =>
              commit({
                ...draft,
                tzkt: { ...draft.tzkt, "tezos:mainnet": e.target.value || undefined },
              })
            }
          />
        </label>
        <label className="field">
          <span>Ghostnet</span>
          <input
            type="text"
            placeholder="https://api.ghostnet.tzkt.io"
            value={draft.tzkt["tezos:ghostnet"] ?? ""}
            onChange={e =>
              commit({
                ...draft,
                tzkt: { ...draft.tzkt, "tezos:ghostnet": e.target.value || undefined },
              })
            }
          />
        </label>
      </section>

      <section>
        <button
          className="link danger"
          onClick={() => commit(defaultSettings())}
        >
          reset to defaults
        </button>
      </section>
    </div>
  )
}
