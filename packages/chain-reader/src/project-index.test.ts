import { describe, expect, it, vi } from "vitest"
import type { WhitehashProject } from "./browse.js"
import {
  buildProjectIndex,
  parseProjectIndex,
  type ProjectIndexReader,
} from "./project-index.js"
import type { WhitehashToken } from "./types.js"

const project: WhitehashProject = {
  chain: "eip155:8453",
  id: "0x1111111111111111111111111111111111111111",
  name: "Indexed",
  description: null,
  displayUri: "ipfs://preview",
  thumbnailUri: "ipfs://thumb",
  editions: 3,
  minted: 3,
  captureSettings: {
    mode: "VIEWPORT",
    triggerMode: "DELAY",
    resolution: { x: 800, y: 800 },
    delay: 2_000,
  },
  raw: { ignored: true },
}

function token(tokenId: string): WhitehashToken {
  return {
    chain: "eip155:8453",
    contract: project.id,
    tokenId,
    name: `Indexed #${tokenId}`,
    description: null,
    iterationHash: `0x${tokenId}`,
    artifactUri: `ipfs://generator?fxiteration=${tokenId}`,
    displayUri: `ipfs://display-${tokenId}`,
    thumbnailUri: `ipfs://thumb-${tokenId}`,
    generatorUri: "ipfs://generator",
    attributes: [],
    assigned: true,
    metadataUri: `ipfs://metadata-${tokenId}`,
    raw: { ignored: true },
  }
}

describe("project iteration indexes", () => {
  it("collects every page, deduplicates identities, and preserves token metadata", async () => {
    const listProjectTokens = vi
      .fn<ProjectIndexReader["listProjectTokens"]>()
      .mockResolvedValueOnce({ tokens: [token("1"), token("2")], cursor: "next" })
      .mockResolvedValueOnce({ tokens: [token("2"), token("3")], cursor: null })
    const reader: ProjectIndexReader = {
      getProject: vi.fn().mockResolvedValue(project),
      listProjectTokens,
    }

    const index = await buildProjectIndex(reader, project, {
      pageSize: 2,
      generatedAt: "2026-07-23T00:00:00.000Z",
    })

    expect(index.complete).toBe(true)
    expect(index.project).toEqual({
      chain: project.chain,
      id: project.id,
      name: project.name,
      description: project.description,
      displayUri: project.displayUri,
      thumbnailUri: project.thumbnailUri,
      editions: project.editions,
      minted: project.minted,
      captureSettings: project.captureSettings,
    })
    expect(index.iterations.map(item => item.token.tokenId)).toEqual(["1", "2", "3"])
    expect(index.project).not.toHaveProperty("raw")
    expect(index.iterations[0]!.token.raw).toEqual({ ignored: true })
    expect(listProjectTokens).toHaveBeenNthCalledWith(
      2,
      { type: "project", chain: project.chain, id: project.id },
      { cursor: "next", limit: 2, order: "oldest" },
    )
  })

  it("exposes normalized tokens through plain iteration properties", async () => {
    const reader: ProjectIndexReader = {
      getProject: vi.fn().mockResolvedValue(project),
      listProjectTokens: vi.fn().mockResolvedValue({ tokens: [token("7")], cursor: null }),
    }
    const index = await buildProjectIndex(reader, project)

    expect(index.iterations[0]?.token.raw).toEqual({ ignored: true })
    expect(index.iterations[0]?.token).toMatchObject({
      chain: project.chain,
      contract: project.id,
      tokenId: "7",
    })
    expect(index.iterations[1]).toBeUndefined()
  })

  it("rejects malformed or unsupported JSON", () => {
    expect(() => parseProjectIndex({ format: "future" })).toThrow(
      "Unsupported project index format",
    )
    expect(() =>
      parseProjectIndex({
        format: "whitehash-project-index@1",
        generatedAt: "2026-07-23T00:00:00.000Z",
        order: "oldest",
        project: {
          chain: "eip155:1",
          id: "0x1",
          name: null,
          description: null,
          displayUri: null,
          thumbnailUri: null,
          editions: null,
          minted: null,
          captureSettings: null,
        },
        iterations: [{
          position: 2,
          token: { chain: "eip155:1", contract: "0x1", tokenId: "1", attributes: [] },
        }],
        complete: true,
        nextCursor: null,
      }),
    ).toThrow("Invalid project index iteration")
  })
})
