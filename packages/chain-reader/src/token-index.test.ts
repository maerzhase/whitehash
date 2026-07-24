import { describe, expect, it, vi } from "vitest"
import type { WhitehashProject } from "./browse.js"
import { buildTokenIndex, parseTokenIndex, type TokenIndexReader } from "./token-index.js"
import type { WhitehashToken } from "./types.js"

const token: WhitehashToken = {
  chain: "tezos:mainnet",
  contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
  tokenId: "16333",
  name: "Example #1",
  description: null,
  iterationHash: "ooExample",
  artifactUri: "ipfs://generator?fxhash=ooExample",
  displayUri: "ipfs://display",
  thumbnailUri: "ipfs://thumbnail",
  generatorUri: "ipfs://generator",
  attributes: [{ name: "Palette", value: "Ink" }],
  assigned: true,
  metadataUri: "ipfs://metadata",
  raw: { params: [] },
}

describe("token indexes", () => {
  it("builds a complete portable token index", async () => {
    const reader: TokenIndexReader = { getToken: vi.fn().mockResolvedValue(token) }
    const index = await buildTokenIndex(reader, token, {
      generatedAt: "2026-07-23T00:00:00.000Z",
    })

    expect(index.format).toBe("whitehash-token-index@1")
    expect(index.project).toEqual({
      chain: "tezos:mainnet",
      id: null,
      name: "Example",
      description: null,
      displayUri: "ipfs://display",
      thumbnailUri: "ipfs://thumbnail",
      editions: null,
      minted: null,
      captureSettings: null,
    })
    expect(index.token).toEqual(token)
  })

  it("enriches EVM tokens with their collection project", async () => {
    const evmToken = {
      ...token,
      chain: "eip155:8453" as const,
      contract: "0x1111111111111111111111111111111111111111",
    }
    const project: WhitehashProject = {
      chain: evmToken.chain,
      id: evmToken.contract,
      name: "Example",
      description: "Project description",
      displayUri: "ipfs://project",
      thumbnailUri: "ipfs://project-thumb",
      editions: 100,
      minted: 42,
      captureSettings: {
        mode: "CANVAS",
        triggerMode: "FN_TRIGGER",
        canvasSelector: "canvas",
      },
      raw: { omitted: true },
    }
    const reader: TokenIndexReader = {
      getToken: vi.fn().mockResolvedValue(evmToken),
      getTokenProject: vi.fn().mockResolvedValue(project),
    }

    const index = await buildTokenIndex(reader, evmToken)

    expect(index.project).toEqual({
      chain: evmToken.chain,
      id: evmToken.contract,
      name: "Example",
      description: "Project description",
      displayUri: "ipfs://project",
      thumbnailUri: "ipfs://project-thumb",
      editions: 100,
      minted: 42,
      captureSettings: {
        mode: "CANVAS",
        triggerMode: "FN_TRIGGER",
        canvasSelector: "canvas",
      },
    })
    expect(reader.getTokenProject).toHaveBeenCalledWith(evmToken)
  })

  it("rejects malformed JSON", () => {
    expect(() => parseTokenIndex({ format: "future" })).toThrow("Unsupported token index format")
    expect(() =>
      parseTokenIndex({
        format: "whitehash-token-index@1",
        generatedAt: "now",
        project: { chain: "tezos:mainnet", id: null, name: "Example" },
        token: { chain: "tezos:mainnet" },
      }),
    ).toThrow("Token index is invalid")
  })
})
