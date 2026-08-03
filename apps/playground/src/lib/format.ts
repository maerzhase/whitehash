import { isTezosChain, type ChainId } from "@whitehash/core"

export interface ChainCurrency {
  symbol: string
  decimals: number
}

export function chainCurrency(chain: ChainId): ChainCurrency {
  return isTezosChain(chain) ? { symbol: "XTZ", decimals: 6 } : { symbol: "ETH", decimals: 18 }
}

/** Base-unit string → decimal number for display; precision loss is fine here. */
export function toDecimal(baseUnits: string, decimals: number): number {
  return Number(baseUnits) / 10 ** decimals
}

export function formatAmount(value: number): string {
  if (value === 0) return "0"
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 })
  }
  const digits = Math.abs(value) >= 1 ? 2 : 4
  return value.toLocaleString("en-US", { maximumFractionDigits: digits })
}

export function formatPrice(baseUnits: string | null, currency: ChainCurrency): string {
  if (baseUnits === null) return "—"
  return `${formatAmount(toDecimal(baseUnits, currency.decimals))} ${currency.symbol}`
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

export function shortAddress(value: string | null): string {
  if (!value) return "—"
  return value.length > 13 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value
}
