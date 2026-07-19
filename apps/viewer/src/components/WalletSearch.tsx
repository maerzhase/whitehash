import { useState } from "react"
import { Button, Dialog, Input } from "@whitehash/ui"
import { loadRecent } from "../recent.js"

/**
 * Spotlight-style wallet search. A centered dialog (over a dimmed backdrop)
 * that takes a Tezos/EVM address and opens its wallet view. Opened from the nav
 * or a keyboard shortcut — wallet lookup is a specific action, not the landing.
 */
export function WalletSearch({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (address: string) => void
}) {
  const [value, setValue] = useState("")
  const recent = loadRecent()

  const submit = (addr: string) => {
    const trimmed = addr.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    onOpenChange(false)
    setValue("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content aria-label="Search wallet">
        <Dialog.Title>View a wallet</Dialog.Title>
        <p className="mt-1 text-sm text-muted">
          Enter a Tezos or Ethereum address to see the fxhash art it owns.
        </p>
        <form
          className="mt-4 flex gap-2"
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
          <div className="mt-4">
            <div className="mb-2 text-xs font-medium text-faint">
              Recent
            </div>
            <div className="flex flex-wrap gap-2">
              {recent.map(a => (
                <Button key={a} variant="secondary" size="sm" onClick={() => submit(a)}>
                  {a.slice(0, 8)}…{a.slice(-4)}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </Dialog.Content>
    </Dialog>
  )
}
