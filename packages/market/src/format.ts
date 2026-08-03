/**
 * Presentation helpers for market figures.
 *
 * Every money field in a market index is a base-unit decimal string (mutez or
 * wei), so turning one into something readable needs the chain's currency. The
 * locale is pinned to `en-US` on purpose: these helpers feed artifacts, tests,
 * and server-rendered output, where a machine-dependent number format would be
 * a silent source of drift. Applications that want locale-aware output should
 * format `toDecimal()` themselves.
 */
import { isTezosChain, type ChainId } from "@whitehash/core"

export interface ChainCurrency {
  symbol: string
  decimals: number
}

const XTZ: ChainCurrency = { symbol: "XTZ", decimals: 6 }
const ETH: ChainCurrency = { symbol: "ETH", decimals: 18 }

/** The native currency prices are denominated in on a chain. */
export function chainCurrency(chain: ChainId): ChainCurrency {
  return isTezosChain(chain) ? XTZ : ETH
}

/**
 * Base units to a decimal number for display. Large wei values exceed what a
 * double represents exactly, so treat the result as display-only and keep the
 * original string for arithmetic.
 */
export function toDecimal(baseUnits: string, decimals: number): number {
  return Number(baseUnits) / 10 ** decimals
}

/** Readable amount with magnitude-appropriate precision. */
export function formatAmount(value: number): string {
  if (value === 0) return "0"
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 })
  }
  const digits = Math.abs(value) >= 1 ? 2 : 4
  return value.toLocaleString("en-US", { maximumFractionDigits: digits })
}

/** Base-unit price with its currency symbol; an em dash when absent. */
export function formatPrice(baseUnits: string | null, currency: ChainCurrency): string {
  if (baseUnits === null) return "—"
  return `${formatAmount(toDecimal(baseUnits, currency.decimals))} ${currency.symbol}`
}

/** Signed percentage with two decimals; an em dash when absent. */
export function formatPercent(value: number | null): string {
  if (value === null) return "—"
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
}

/** Truncate an address for dense tables, keeping both ends recognizable. */
export function formatAddress(value: string | null, start = 6, end = 4): string {
  if (!value) return "—"
  return value.length > start + end + 1 ? `${value.slice(0, start)}…${value.slice(-end)}` : value
}
