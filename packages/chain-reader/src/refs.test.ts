import { describe, expect, it } from "vitest"
import { formatRef, parseRef, projectRef, resolveInput, shortAddress, tokenRef } from "./refs.js"

describe("whitehash refs", () => {
  it("round-trips project and token refs", () => {
    const project = projectRef({ chain: "tezos:mainnet", id: "v3:13623" })
    expect(parseRef(formatRef(project), "project")).toEqual(project)
    const token = tokenRef({ chain: "eip155:8453", contract: "0xabc", tokenId: "42" })
    expect(parseRef(formatRef(token), "token")).toEqual(token)
  })

  it("resolves addresses, CIDs, and pasted token URLs", () => {
    expect(resolveInput("0x2ce8641036f22627402bd4b1b7d1ed8a8499b205").type).toBe("address")
    expect(resolveInput("QmYwAPJzv5CZsnAzt8auVZRnGi2e4D8g9S7u6D6qJ9fFf3")).toEqual({
      type: "content", uri: "ipfs://QmYwAPJzv5CZsnAzt8auVZRnGi2e4D8g9S7u6D6qJ9fFf3",
    })
    const url = `https://example.invalid/gentk/KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE/16333`
    expect(resolveInput(url)).toMatchObject({ type: "token", chain: "tezos:mainnet", tokenId: "16333" })
  })

  it("shortens long addresses for display", () => {
    expect(shortAddress("0x1234567890abcdef")).toBe("0x123456…cdef")
  })
})
