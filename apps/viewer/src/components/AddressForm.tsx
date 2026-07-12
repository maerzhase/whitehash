import { useState } from "react"

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
    <div className="home">
      <h1>whitehash</h1>
      <p className="muted">
        View the fxhash generative art owned by any wallet — read straight from
        Tezos, Ethereum, and Base. No indexer, no fxhash servers.
      </p>
      <form
        onSubmit={e => {
          e.preventDefault()
          submit(value)
        }}
      >
        <input
          autoFocus
          type="text"
          placeholder="tz1… or 0x…"
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <button type="submit">View</button>
      </form>
      {recent.length > 0 ? (
        <div className="recent">
          <span className="muted">Recent:</span>
          {recent.map(a => (
            <button key={a} className="chip link" onClick={() => submit(a)}>
              {a.slice(0, 8)}…{a.slice(-4)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
