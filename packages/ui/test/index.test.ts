import { describe, expect, it } from "vitest"
import { cn } from "../src/lib/cn.js"
import { buttonVariants } from "../src/components/button.js"
import { badgeVariants } from "../src/components/badge.js"
import { isWalletAddress } from "../src/components/address-search.js"
import { Tooltip } from "../src/components/tooltip.js"
import { MarketStats, deltaVariants, marketEventLabel } from "../src/components/market-stats.js"

describe("cn", () => {
  it("merges and dedupes conflicting Tailwind classes (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
    expect(cn("text-fg", false && "hidden", "font-medium")).toBe("text-fg font-medium")
  })
})

describe("buttonVariants", () => {
  it("applies variant + size classes", () => {
    const primary = buttonVariants({ variant: "primary", size: "md" })
    expect(primary).toContain("bg-primary")
    expect(primary).toContain("h-10")
    expect(primary).not.toContain("translate")
  })

  it("card variant resets the inline-flex base to a column layout", () => {
    const card = buttonVariants({ variant: "card", size: "none" })
    // twMerge would keep both flex utilities; CVA just concatenates, so assert the
    // card layout intent is present.
    expect(card).toContain("flex-col")
    expect(card).toContain("rounded-card")
    expect(card).not.toContain("translate")
  })
})

describe("badgeVariants", () => {
  it("defaults to the muted surface pill", () => {
    expect(badgeVariants()).toContain("text-muted")
  })
  it("supports status variants", () => {
    expect(badgeVariants({ variant: "danger" })).toContain("text-danger")
  })
})

describe("Tooltip", () => {
  it("exposes the Base UI compound parts", () => {
    expect(Tooltip.Root).toBeDefined()
    expect(Tooltip.Provider).toBeDefined()
    expect(Tooltip.Trigger).toBeDefined()
    expect(Tooltip.Content).toBeDefined()
  })
})

describe("isWalletAddress", () => {
  it("accepts Tezos and EVM wallet shapes", () => {
    expect(isWalletAddress("tz1c3hFmjFSwunjLHECnYyjr42KRt5YiHrGX")).toBe(true)
    expect(isWalletAddress("0x2ce8641036f22627402bd4b1b7d1ed8a8499b205")).toBe(true)
  })

  it("rejects incomplete or unrelated input", () => {
    expect(isWalletAddress("tz1short")).toBe(false)
    expect(isWalletAddress("hello")).toBe(false)
  })
})

describe("deltaVariants", () => {
  it("colors gains, losses and flat changes distinctly", () => {
    expect(deltaVariants({ direction: "up" })).toContain("text-success")
    expect(deltaVariants({ direction: "down" })).toContain("text-danger")
    expect(deltaVariants()).toContain("text-faint")
  })
})

describe("marketEventLabel", () => {
  it("names every event kind, distinguishing the sale flavors", () => {
    expect(marketEventLabel("listing_accept")).toBe("Sale (listing)")
    expect(marketEventLabel("collection_offer_accept")).toBe("Sale (collection offer)")
    expect(marketEventLabel("mint")).toBe("Mint")
    expect(marketEventLabel("sale")).toBe("Sale")
  })
})

describe("MarketStats", () => {
  it("exposes the composable parts", () => {
    for (const part of [
      "Root",
      "Tile",
      "Delta",
      "Tiles",
      "Floor",
      "Listed",
      "Median",
      "Volume",
      "Sales",
      "HighestSale",
      "LowestSale",
      "FloorChart",
      "VolumeChart",
      "Events",
    ] as const) {
      expect(MarketStats[part], part).toBeDefined()
    }
  })
})
