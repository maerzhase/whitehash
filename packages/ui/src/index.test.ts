import { describe, expect, it } from "vitest"
import { cn } from "./lib/cn.js"
import { buttonVariants } from "./components/button.js"
import { badgeVariants } from "./components/badge.js"

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
  })

  it("card variant resets the inline-flex base to a column layout", () => {
    const card = buttonVariants({ variant: "card", size: "none" })
    // twMerge would keep both flex utilities; CVA just concatenates, so assert the
    // card layout intent is present.
    expect(card).toContain("flex-col")
    expect(card).toContain("rounded-card")
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
