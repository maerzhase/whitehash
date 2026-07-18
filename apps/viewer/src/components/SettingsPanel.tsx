import { useState, type ReactNode } from "react"
import type { ChainId } from "@whitehash/chain-reader"
import { Button, Field, Input, Separator, Textarea, ToggleGroup } from "@whitehash/ui"
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 py-6">
      <h3 className="text-base font-semibold">{title}</h3>
      {children}
    </section>
  )
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
    <div className="max-w-2xl pt-5">
      <Button variant="link" onClick={onBack}>
        ← back
      </Button>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">Settings</h2>

      <div className="divide-y divide-line">
        <Section title="Network mode">
          <ToggleGroup
            value={draft.mode}
            onValueChange={v => commit({ ...draft, mode: v as Settings["mode"] })}
            aria-label="Network mode"
            className="w-fit"
          >
            <ToggleGroup.Item value="mainnet">Mainnet</ToggleGroup.Item>
            <ToggleGroup.Item value="testnet">Testnet</ToggleGroup.Item>
          </ToggleGroup>
        </Section>

        <Section title="IPFS gateways">
          <Field.Root>
            <Field.Description>One per line, tried in order.</Field.Description>
            <Field.Control
              render={<Textarea rows={3} />}
              value={lines(draft.ipfsGateways)}
              onChange={e => commit({ ...draft, ipfsGateways: parseLines(e.target.value) })}
            />
          </Field.Root>
        </Section>

        <Section title="onchfs proxy URL">
          <Field.Root>
            <Field.Description>
              Required to view onchfs artworks (many Ethereum &amp; Base pieces store their
              code on-chain). Run{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">
                pnpm --filter @whitehash/onchfs-proxy start
              </code>{" "}
              and point this at it (e.g. http://localhost:3000), or deploy apps/onchfs-proxy.
            </Field.Description>
            <Field.Control
              render={<Input />}
              type="text"
              placeholder="https://my-onchfs-proxy.example"
              value={draft.onchfsProxy}
              onChange={e => commit({ ...draft, onchfsProxy: e.target.value })}
            />
          </Field.Root>
        </Section>

        <Section title="EVM RPCs">
          <p className="text-sm leading-snug text-muted">
            Public RPCs cap log queries, so EVM wallet scans are slow. Paste an
            archive-capable RPC (one line each) for fast lookups. Blank = library default.
          </p>
          {EVM_NETWORKS.map(({ chain, label }) => (
            <Field.Root key={chain}>
              <Field.Label>{label}</Field.Label>
              <Field.Control
                render={<Textarea rows={2} />}
                value={lines(draft.rpcs[chain])}
                onChange={e =>
                  commit({
                    ...draft,
                    rpcs: { ...draft.rpcs, [chain]: parseLines(e.target.value) },
                  })
                }
              />
            </Field.Root>
          ))}
        </Section>

        <Section title="TzKT base URLs">
          <Field.Root>
            <Field.Label>Mainnet</Field.Label>
            <Field.Control
              render={<Input />}
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
          </Field.Root>
          <Field.Root>
            <Field.Label>Ghostnet</Field.Label>
            <Field.Control
              render={<Input />}
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
          </Field.Root>
        </Section>
      </div>

      <Separator className="my-4" />
      <Button variant="danger" size="sm" onClick={() => commit(defaultSettings())}>
        reset to defaults
      </Button>
    </div>
  )
}
