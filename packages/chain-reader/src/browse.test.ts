import { describe, expect, it, vi } from "vitest"
import { defaultResolverConfig } from "@whitehash/resolve"
import { listTezosProjects, listTezosProjectTokens } from "./browse.js"
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
            { key: "31804", value: { metadata: META_HEX, supply: "500" } },
          ]),
        )
      if (u.includes("/ipfs/QmProjectMeta"))
        return new Response(
          JSON.stringify({
            name: "Scale",
            description: "a project",
            displayUri: "ipfs://QmDisp",
            thumbnailUri: "ipfs://QmThumb",
          }),
        )
      throw new Error(`unexpected fetch ${u}`)
    }) as unknown as typeof fetch

    const page = await listTezosProjects("tezos:mainnet", config, {}, fetchImpl)
    expect(page.projects).toHaveLength(1)
    const p = page.projects[0]!
    expect(p.ref).toBe("v3:31804")
    expect(p.name).toBe("Scale")
    expect(p.supply).toBe(500)
    expect(p.thumbnailUri).toBe("ipfs://QmThumb")
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
