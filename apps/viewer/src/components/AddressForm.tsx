import { useState } from "react"
import { Button, Input } from "@whitehash/ui"

const RECENT_KEY = "whitehash.recent.v1"

export function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[]
  } catch {
    return []
  }
}

export function pushRecent(address: string): void {
  const list = [address, ...loadRecent().filter(a => a !== address)].slice(0, 8)
  localStorage.setItem(RECENT_KEY, JSON.stringify(list))
}

export function AddressForm({ onSubmit }: { onSubmit: (address: string) => void }) {
  const [value, setValue] = useState("")
  const recent = loadRecent()

  const submit = (addr: string) => {
    const trimmed = addr.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <div className="mx-auto mt-16 max-w-xl text-center">
      <img src="./logo.png" alt="" className="mx-auto mb-5 size-16 rounded-2xl" />
      <h1 className="text-4xl font-semibold tracking-tight">whitehash</h1>
      <p className="mx-auto mt-2 max-w-md text-muted">
        View the fxhash generative art owned by any wallet — read straight from Tezos,
        Ethereum, and Base. No indexer, no fxhash servers.
      </p>
      <form
        className="mt-6 flex gap-2"
        onSubmit={e => {
          e.preventDefault()
          submit(value)
        }}
      >
        <Input
          autoFocus
          type="text"
          placeholder="tz1… or 0x…"
          value={value}
          onChange={e => setValue(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">View</Button>
      </form>
      {recent.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-muted">Recent:</span>
          {recent.map(a => (
            <Button key={a} variant="secondary" size="sm" onClick={() => submit(a)}>
              {a.slice(0, 8)}…{a.slice(-4)}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
