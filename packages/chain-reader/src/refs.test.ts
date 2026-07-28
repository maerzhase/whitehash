import { describe, expect, it } from "vitest"
import {
  formatRef,
  parseFxhashTokenUrl,
  parseRef,
  projectRef,
  resolveInput,
  shortAddress,
  tokenRef,
} from "./refs.js"

const tezosContract = "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE"
const evmContract = "0x50c04A6B066d659Fe2F66F6388Cf8dD394036632"

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
      type: "content",
      uri: "ipfs://QmYwAPJzv5CZsnAzt8auVZRnGi2e4D8g9S7u6D6qJ9fFf3",
    })
    const url = `https://example.invalid/gentk/KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE/16333`
    expect(resolveInput(url)).toMatchObject({
      type: "token",
      chain: "tezos:mainnet",
      tokenId: "16333",
    })
  })

  it.each([
    [`https://www.fxhash.xyz/gentk/${tezosContract}-16333`, tezosContract, "16333"],
    [`https://fxhash.xyz/objkt/${tezosContract}-16333`, tezosContract, "16333"],
    [`https://fxhash.xyz/iteration/id/${tezosContract}-16333`, tezosContract, "16333"],
    [`https://fxhash.xyz/gentk/${evmContract}-2953`, evmContract, "2953"],
    [`https://fxhash.xyz/gentk/${tezosContract}/16333`, tezosContract, "16333"],
  ])("parses identity-bearing fxhash token URL %s", (url, contract, tokenId) => {
    expect(parseFxhashTokenUrl(url)).toEqual({ contract, tokenId })
  })

  it("ignores query strings and fragments when parsing token identity", () => {
    expect(
      parseFxhashTokenUrl(`https://fxhash.xyz/gentk/${tezosContract}-16333?preview=1#state`),
    ).toEqual({ contract: tezosContract, tokenId: "16333" })
    expect(resolveInput(`https://fxhash.xyz/objkt/${tezosContract}-16333`)).toEqual({
      type: "token",
      chain: "tezos:mainnet",
      contract: tezosContract,
      tokenId: "16333",
    })
  })

  it.each([
    "https://fxhash.xyz/gentk/slug/example",
    "https://fxhash.xyz/iteration/example",
    "https://fxhash.xyz/project/example",
    "https://fxhash.xyz/gentk/KT1invalid-1",
    `https://fxhash.xyz/gentk/${tezosContract}-`,
    `https://example.invalid/gentk/${tezosContract}-16333`,
    `https://fxhash.xyz/gentk/${tezosContract}-%2e%2e`,
    `https://fxhash.xyz/gentk/${tezosContract}-bad%2Fid`,
  ])("rejects non-identity fxhash URL %s", url => {
    expect(parseFxhashTokenUrl(url)).toBeNull()
  })

  it("shortens long addresses for display", () => {
    expect(shortAddress("0x1234567890abcdef")).toBe("0x123456…cdef")
  })
})
