import { describe, expect, it } from "vitest"
import { createWhitehashClient } from "./client.js"

const client = createWhitehashClient({
  resolver: {
    ipfsGateways: ["https://ipfs.io", "https://dweb.link"],
    onchfsProxy: null,
  },
})

describe("createWhitehashClient", () => {
  it("binds resolver configuration", () => {
    expect(client.resolveUriAll("ipfs://QmExample")).toEqual([
      "https://ipfs.io/ipfs/QmExample",
      "https://dweb.link/ipfs/QmExample",
    ])
  })

  it("binds wallet configuration without requiring chains", async () => {
    await expect(client.getWalletTokens("tz1unused", { chains: [] })).resolves.toEqual([])
  })
})
