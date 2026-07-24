import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ChainReaderConfig, WhitehashToken } from "./types.js"

const mocks = vi.hoisted(() => ({
  evm: vi.fn(),
  tezos: vi.fn(),
}))

vi.mock("./evm.js", () => ({ getEvmWalletTokens: mocks.evm }))
vi.mock("./tezos.js", () => ({ getTezosWalletTokens: mocks.tezos }))

import { getChainWalletTokens, getWalletTokens } from "./wallet.js"

const config: ChainReaderConfig = {
  resolver: { ipfsGateways: ["https://ipfs.example"], onchfs: null },
}

const token = (chain: WhitehashToken["chain"], tokenId: string) =>
  ({ chain, tokenId }) as WhitehashToken

beforeEach(() => {
  mocks.evm.mockReset()
  mocks.tezos.mockReset()
})

describe("wallet enumeration", () => {
  it("dispatches each supported chain to its reader", async () => {
    mocks.tezos.mockResolvedValue([token("tezos:mainnet", "1")])
    mocks.evm.mockResolvedValue([token("eip155:1", "2")])
    const progress = vi.fn()

    await expect(
      getChainWalletTokens("tz1-owner", "tezos:mainnet", config, progress),
    ).resolves.toEqual([token("tezos:mainnet", "1")])
    await expect(getChainWalletTokens("0x-owner", "eip155:1", config, progress)).resolves.toEqual([
      token("eip155:1", "2"),
    ])

    expect(mocks.tezos).toHaveBeenCalledWith("tz1-owner", "tezos:mainnet", config, fetch, progress)
    expect(mocks.evm).toHaveBeenCalledWith("0x-owner", "eip155:1", config, progress)
  })

  it("keeps successful results when another chain fails", async () => {
    mocks.evm.mockImplementation(async (_address, chain) => {
      if (chain === "eip155:1") throw new Error("RPC unavailable")
      return [token(chain, "7")]
    })
    const progress = vi.fn()

    await expect(
      getWalletTokens("0x-owner", ["eip155:1", "eip155:8453"], config, progress),
    ).resolves.toEqual([token("eip155:8453", "7")])
    expect(progress).toHaveBeenCalledWith({
      chain: "eip155:1",
      phase: "done",
      message: "Failed: RPC unavailable",
    })
  })

  it("returns no tokens for an unknown chain without invoking a reader", async () => {
    await expect(
      getChainWalletTokens("owner", "unknown:network" as WhitehashToken["chain"], config),
    ).resolves.toEqual([])
    expect(mocks.evm).not.toHaveBeenCalled()
    expect(mocks.tezos).not.toHaveBeenCalled()
  })
})
