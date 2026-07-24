import { describe, expect, it, vi } from "vitest"
import { defaultResolverConfig } from "@whitehash/resolve"
import { discoverEvmProjectTokenRefsViaRpc, getEvmWalletTokens, isEvmAddress } from "./evm.js"
import type { ChainReaderConfig } from "./types.js"
import type { PublicClient } from "viem"

describe("isEvmAddress", () => {
  it("accepts checksummed and lowercase 0x addresses", () => {
    expect(isEvmAddress("0x2ce8641036f22627402bd4b1b7d1ed8a8499b205")).toBe(true)
    expect(isEvmAddress("0x2ce8641036f22627402bD4b1B7d1ed8A8499b205")).toBe(true)
  })
  it("rejects Tezos and junk", () => {
    expect(isEvmAddress("KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE")).toBe(false)
    expect(isEvmAddress("0x123")).toBe(false)
  })
})

describe("discoverEvmProjectTokenRefsViaRpc", () => {
  it("enumerates a probed sequential FxGenArt721 supply without scanning logs", async () => {
    const contract = "0x50c04A6B066d659Fe2F66F6388Cf8dD394036632"
    const readContract = vi.fn(
      async ({ functionName, args }: { functionName: string; args?: readonly bigint[] }) => {
        if (functionName === "totalSupply") return 3n
        const tokenId = args?.[0]
        if (tokenId && tokenId >= 1n && tokenId <= 3n) return contract
        throw new Error("missing")
      },
    )
    const client = {
      getBlockNumber: vi.fn().mockResolvedValue(20_000_000n),
      readContract,
    } as unknown as PublicClient

    const result = await discoverEvmProjectTokenRefsViaRpc(
      "eip155:8453",
      contract,
      { resolver: defaultResolverConfig() },
      client,
    )

    expect(result.strategy).toBe("sequential-supply")
    expect(result.tokens.map(token => token.tokenId)).toEqual(["1", "2", "3"])
  })

  it("finds deployment and orders token ids by mint log", async () => {
    const deployment = 10_786_145n
    const contract = "0x50c04A6B066d659Fe2F66F6388Cf8dD394036632"
    const getBytecode = vi.fn(async ({ blockNumber }: { blockNumber?: bigint }) =>
      (blockNumber ?? 0n) >= deployment ? "0x1234" : undefined,
    )
    const getLogs = vi.fn(async () => [
      { address: contract, blockNumber: deployment + 2n, logIndex: 1, args: { tokenId: 9n } },
      { address: contract, blockNumber: deployment + 1n, logIndex: 3, args: { tokenId: 4n } },
    ])
    const client = { getBytecode, getLogs } as unknown as PublicClient
    const config: ChainReaderConfig = {
      resolver: defaultResolverConfig(),
      evm: { maxBlock: 10_786_150 },
    }

    const result = await discoverEvmProjectTokenRefsViaRpc("eip155:8453", contract, config, client)

    expect(result.deploymentBlock).toBe(Number(deployment))
    expect(result.strategy).toBe("mint-logs")
    expect(result.tokens.map(token => token.tokenId)).toEqual(["4", "9"])
    expect(getLogs).toHaveBeenCalledOnce()
  })
})

// Opt-in live integration test against a known Base holder. Set
// WHITEHASH_LIVE_TEST=1.
const live = process.env.WHITEHASH_LIVE_TEST === "1" ? describe : describe.skip
live("getEvmWalletTokens (live Base)", () => {
  // "In the Folds" — collection 0xfe38... on Base, holder owns iterations 1-3,
  // alongside tokens from other collections discovered by Blockscout.
  const COLLECTION = "0xfe38c07c5ef421b301ba07fc4c03041c848af09e"
  const HOLDER = "0x2ce8641036f22627402bd4b1b7d1ed8a8499b205"

  const config: ChainReaderConfig = {
    resolver: defaultResolverConfig(),
  }

  it("reads owned tokens with resolvable metadata", async () => {
    const tokens = await getEvmWalletTokens(HOLDER, "eip155:8453", config)
    expect(tokens.length).toBeGreaterThanOrEqual(1)
    const collectionTokens = tokens.filter(token => token.contract.toLowerCase() === COLLECTION)
    expect(collectionTokens.length).toBeGreaterThanOrEqual(1)
    for (const t of collectionTokens) {
      expect(t.assigned).toBe(true)
      expect(t.iterationHash).toMatch(/^0x[0-9a-f]+$/i)
      expect(t.artifactUri).toMatch(/^(ipfs|onchfs):\/\//)
    }
  }, 60_000)
})
