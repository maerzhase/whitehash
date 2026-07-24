import { describe, expect, it, vi } from "vitest"
import { defaultResolverConfig } from "@whitehash/resolve"
import {
  getTezosProject,
  listTezosProjects,
  listTezosProjectTokens,
} from "./browse.js"
import type { ChainReaderConfig } from "./types.js"

const config: ChainReaderConfig = { resolver: defaultResolverConfig() }

// hex for "ipfs://QmProjectMeta"
const META_HEX = Buffer.from("ipfs://QmProjectMeta").toString("hex")

describe("listTezosProjects", () => {
  it("reads the issuer ledger and resolves project metadata", async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url)
      if (u.includes("/bigmaps/ledger/keys"))
        return new Response(
          JSON.stringify([
            {
              key: "31804",
              value: {
                metadata: META_HEX,
                supply: "500",
                balance: "494",
                iterations_count: "5",
              },
            },
          ]),
        )
      if (u.includes("/ipfs/QmProjectMeta"))
        return new Response(
          JSON.stringify({
            name: "Scale",
            description: "a project",
            displayUri: "ipfs://QmDisp",
            thumbnailUri: "ipfs://QmThumb",
            capture: {
              mode: "VIEWPORT",
              triggerMode: "DELAY",
              resolution: { x: 800, y: 800 },
              delay: 2_000,
            },
          }),
        )
      throw new Error(`unexpected fetch ${u}`)
    }) as unknown as typeof fetch

    const page = await listTezosProjects("tezos:mainnet", config, {}, fetchImpl)
    expect(page.projects).toHaveLength(1)
    const p = page.projects[0]!
    expect({ chain: p.chain, id: p.id }).toEqual({ chain: "tezos:mainnet", id: "v3:31804" })
    expect(p.name).toBe("Scale")
    expect(p.editions).toBe(500) // cap
    expect(p.minted).toBe(5) // iterations_count wins over supply-balance
    expect(p.thumbnailUri).toBe("ipfs://QmThumb")
    expect(p.captureSettings).toEqual({
      mode: "VIEWPORT",
      triggerMode: "DELAY",
      resolution: { x: 800, y: 800 },
      delay: 2_000,
    })
    expect(page.cursor).toBeNull() // fewer than limit → no next page

    // default order is newest-first
    const urls = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.map(c =>
      String(c[0]),
    )
    expect(urls.some(u => u.includes("sort.desc=id"))).toBe(true)
  })

  it("supports oldest-first ordering", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([]))) as unknown as
      typeof fetch
    await listTezosProjects("tezos:mainnet", config, { order: "oldest" }, fetchImpl)
    expect(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0])).toContain(
      "sort.asc=id",
    )
  })
})

describe("getTezosProject", () => {
  it("treats an empty missing-key response as no project", async () => {
    const fetchImpl = vi.fn(async () => new Response("")) as unknown as typeof fetch
    await expect(
      getTezosProject("tezos:mainnet", "v0:999999", config, fetchImpl),
    ).resolves.toBeNull()
  })
})

describe("listTezosProjectTokens", () => {
  it("matches iterations by name prefix across gentk contracts", async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url)
      // only gentk_v3 has matches; others return empty
      if (u.includes("KT1EfsNuqwLAWDd3o4pvfUx1CAh5GMdTrRvr"))
        return new Response(
          JSON.stringify([
            {
              contract: { address: "KT1EfsNuqwLAWDd3o4pvfUx1CAh5GMdTrRvr" },
              tokenId: "1",
              metadata: {
                name: "Scale #1",
                iterationHash: "oo1",
                artifactUri: "ipfs://QmGen/?fxhash=oo1",
              },
            },
          ]),
        )
      return new Response(JSON.stringify([]))
    }) as unknown as typeof fetch

    const { tokens, cursor } = await listTezosProjectTokens(
      "tezos:mainnet",
      "Scale",
      config,
      {},
      fetchImpl,
    )
    expect(tokens).toHaveLength(1)
    expect(tokens[0]!.name).toBe("Scale #1")
    expect(tokens[0]!.assigned).toBe(true)
    expect(cursor).toBeNull()
    // the query must use the "{name} #*" pattern
    const urls = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.map(c =>
      String(c[0]),
    )
    expect(urls.some(u => u.includes(encodeURIComponent("Scale #*")))).toBe(true)
  })
})
