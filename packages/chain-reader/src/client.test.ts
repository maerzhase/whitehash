import { describe, expect, it } from "vitest"
import { createWhitehashClient } from "./client.js"
import { DEFAULT_NETWORK_MODE, defaultChainReaderConfig } from "./config.js"

const client = createWhitehashClient({
  resolver: {
    ipfsGateways: ["https://ipfs.io", "https://dweb.link"],
    onchfs: null,
  },
})

describe("createWhitehashClient", () => {
  it("exposes the same zero-config defaults used by React", () => {
    expect(DEFAULT_NETWORK_MODE).toBe("mainnet")
    expect(defaultChainReaderConfig()).toEqual({
      resolver: {
        ipfsGateways: ["https://ipfs.io", "https://dweb.link"],
        onchfs: null,
      },
    })
  })

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
