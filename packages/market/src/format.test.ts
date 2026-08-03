import { describe, expect, it } from "vitest"
import {
  chainCurrency,
  formatAddress,
  formatAmount,
  formatPercent,
  formatPrice,
  toDecimal,
} from "./format.js"

describe("chainCurrency", () => {
  it("uses mutez precision on Tezos and wei precision on EVM", () => {
    expect(chainCurrency("tezos:mainnet")).toEqual({ symbol: "XTZ", decimals: 6 })
    expect(chainCurrency("tezos:ghostnet")).toEqual({ symbol: "XTZ", decimals: 6 })
    expect(chainCurrency("eip155:1")).toEqual({ symbol: "ETH", decimals: 18 })
    expect(chainCurrency("eip155:8453")).toEqual({ symbol: "ETH", decimals: 18 })
  })
})

describe("formatAmount", () => {
  it("scales precision to magnitude", () => {
    expect(formatAmount(0)).toBe("0")
    expect(formatAmount(0.123456)).toBe("0.1235")
    expect(formatAmount(2.5)).toBe("2.5")
    expect(formatAmount(2500)).toBe("2,500")
  })
})

describe("formatPrice", () => {
  it("converts base units and appends the symbol", () => {
    expect(formatPrice("2500000000", chainCurrency("tezos:mainnet"))).toBe("2,500 XTZ")
    expect(formatPrice("170000000000000000", chainCurrency("eip155:1"))).toBe("0.17 ETH")
  })

  it("renders an absent price as an em dash", () => {
    expect(formatPrice(null, chainCurrency("tezos:mainnet"))).toBe("—")
  })
})

describe("formatPercent", () => {
  it("signs gains and renders absent changes as an em dash", () => {
    expect(formatPercent(66.666)).toBe("+66.67%")
    expect(formatPercent(-12.5)).toBe("-12.50%")
    expect(formatPercent(0)).toBe("0.00%")
    expect(formatPercent(null)).toBe("—")
  })
})

describe("toDecimal / formatAddress", () => {
  it("divides by the currency scale", () => {
    expect(toDecimal("1500000", 6)).toBe(1.5)
  })

  it("keeps both ends of a truncated address and passes short values through", () => {
    expect(formatAddress("tz1WwJoFqMXqB9sh74dsRkjoxEim5QkzbC8o")).toBe("tz1WwJ…bC8o")
    expect(formatAddress("tz1short")).toBe("tz1short")
    expect(formatAddress(null)).toBe("—")
  })
})
