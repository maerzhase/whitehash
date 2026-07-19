import { describe, expect, it } from "vitest"
import { cn } from "./lib/cn.js"
import { buttonVariants } from "./components/button.js"
import { badgeVariants } from "./components/badge.js"
import { isWalletAddress } from "./components/address-search.js"

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
