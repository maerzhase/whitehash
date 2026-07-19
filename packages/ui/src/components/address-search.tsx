import { useEffect, useState, type ComponentProps } from "react"
import { Button } from "./button.js"
import { Dialog, type DialogProps } from "./dialog.js"
import { Input } from "./field.js"
import { cn } from "../lib/cn.js"

export function isWalletAddress(value: string): boolean {
  return /^tz[1-4][1-9A-HJ-NP-Za-km-z]{33}$/.test(value) || /^0x[0-9a-fA-F]{40}$/.test(value)
}

export interface AddressSearchProps extends Omit<ComponentProps<"form">, "onSubmit"> {
  onSubmit: (address: string) => void
  recentAddresses?: string[]
  value?: string
  onValueChange?: (value: string) => void
  autoFocus?: boolean
}

export function AddressSearch({
  onSubmit,
  recentAddresses = [],
  value: controlledValue,
  onValueChange,
  autoFocus,
  className,
  ...props
}: AddressSearchProps) {
  const [localValue, setLocalValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const value = controlledValue ?? localValue
  const setValue = (next: string) => {
    if (controlledValue === undefined) setLocalValue(next)
    onValueChange?.(next)
    if (error) setError(null)
  }
  const submit = (candidate: string) => {
    const address = candidate.trim()
    if (!isWalletAddress(address)) {
      setError("Enter a valid Tezos or EVM address.")
      return
    }
    onSubmit(address)
    setValue("")
  }

  return (
    <div>
      <form
        className={cn("flex gap-2", className)}
        onSubmit={event => {
          event.preventDefault()
          submit(value)
        }}
        {...props}
      >
        <Input
          autoFocus={autoFocus}
          type="text"
          aria-label="Wallet address"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "whitehash-address-error" : undefined}
          placeholder="tz1… or 0x…"
          value={value}
          onChange={event => setValue(event.target.value)}
          className="flex-1"
        />
        <Button type="submit">View</Button>
      </form>
      {error ? <p id="whitehash-address-error" className="mt-2 text-sm text-danger">{error}</p> : null}
      {recentAddresses.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 text-xs font-medium text-faint">Recent</div>
          <div className="flex flex-wrap gap-2">
            {recentAddresses.map(address => (
              <Button key={address} variant="secondary" size="sm" onClick={() => submit(address)}>
                {address.slice(0, 8)}…{address.slice(-4)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export interface WalletSearchProps extends Omit<DialogProps, "children"> {
  onSubmit: (address: string) => void
  recentAddresses?: string[]
}

export function WalletSearch({ open, onOpenChange, onSubmit, recentAddresses }: WalletSearchProps) {
  const [session, setSession] = useState(0)
  useEffect(() => {
    if (open) setSession(value => value + 1)
  }, [open])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content aria-label="Search wallet">
        <Dialog.Title>View a wallet</Dialog.Title>
        <p className="mt-1 text-sm text-muted">Enter a Tezos or Ethereum address to see the fxhash art it owns.</p>
        <AddressSearch
          key={session}
          className="mt-4"
          autoFocus
          recentAddresses={recentAddresses}
          onSubmit={address => {
            onSubmit(address)
            onOpenChange?.(false)
          }}
        />
      </Dialog.Content>
    </Dialog>
  )
}
