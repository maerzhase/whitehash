import { describe, expect, it, vi } from "vitest"
import { resolveFxhashHostedTokenUrl } from "./fxhash-resolver.js"

const tezosApiResponse = {
  data: {
    objkt: {
      slug: "monogrid-1.1-ce-256",
      gentkContractAddress: "KT1U6EHmNxJTkvaWJ4ThczG4FSDaHC21ssvi",
      onChainId: 824878,
    },
  },
}

const fallbackPage = `
<script>
(window[Symbol.for("ApolloSSRDataTransport")] ??= []).push({
  "data":{"onchain":{"objkt":[{
    "id":"KT1U6EHmNxJTkvaWJ4ThczG4FSDaHC21ssvi-824878",
    "slug":"monogrid-1.1-ce-256",
    "iteration":"256",
    "generative_token":{"id":"13944","chain":"TEZOS"}
  }]}}
})
</script>`

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

function pageResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "text/html" } })
}

describe("fxhash hosted resolver", () => {
  it("resolves one Tezos identity through the hosted API", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(tezosApiResponse))
    await expect(
      resolveFxhashHostedTokenUrl({
        url: "https://www.fxhash.xyz/iteration/monogrid-1.1-ce-256",
        fetch: fetcher,
      }),
    ).resolves.toEqual({
      chain: "tezos:mainnet",
      contract: "KT1U6EHmNxJTkvaWJ4ThczG4FSDaHC21ssvi",
      tokenId: "824878",
    })
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.fxhash.xyz/graphql",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("monogrid-1.1-ce-256"),
      }),
    )
  })

  it.each([
    ["eip155:8453", "eip155:8453"],
    ["eip155:1", "eip155:1"],
  ] as const)("uses the caller's explicit EVM chain %s", async (selected, chain) => {
    const response = {
      data: {
        objkt: {
          slug: "dom-2953",
          gentkContractAddress: "0x50c04A6B066d659Fe2F66F6388Cf8dD394036632",
          onChainId: 2953,
        },
      },
    }
    await expect(
      resolveFxhashHostedTokenUrl({
        url: "https://fxhash.xyz/iteration/dom-2953",
        chain: selected,
        fetch: vi.fn().mockResolvedValue(jsonResponse(response)),
      }),
    ).resolves.toMatchObject({ chain, tokenId: "2953" })
  })

  it("does not guess the chain for a hosted EVM result", async () => {
    const response = {
      data: {
        objkt: {
          slug: "dom-2953",
          gentkContractAddress: "0x50c04A6B066d659Fe2F66F6388Cf8dD394036632",
          onChainId: 2953,
        },
      },
    }
    await expect(
      resolveFxhashHostedTokenUrl({
        url: "https://fxhash.xyz/iteration/dom-2953",
        fetch: vi.fn().mockResolvedValue(jsonResponse(response)),
      }),
    ).rejects.toThrow("EVM fxhash iteration needs a chain")
  })

  it("falls back to deterministic server-rendered page data", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(pageResponse("unavailable", 503))
      .mockResolvedValueOnce(pageResponse(fallbackPage))
    await expect(
      resolveFxhashHostedTokenUrl({
        url: "https://fxhash.xyz/iteration/monogrid-1.1-ce-256?tracking=ignored#state",
        fetch: fetcher,
      }),
    ).resolves.toMatchObject({ chain: "tezos:mainnet", tokenId: "824878" })
    expect(fetcher).toHaveBeenLastCalledWith(
      "https://fxhash.xyz/iteration/monogrid-1.1-ce-256",
      expect.any(Object),
    )
  })

  it("rejects project URLs because they are not single-token identities", async () => {
    await expect(
      resolveFxhashHostedTokenUrl({
        url: "https://fxhash.xyz/project/monogrid-1.1-ce",
        fetch: vi.fn(),
      }),
    ).rejects.toThrow("collection, not one token")
  })

  it("reports website changes and browser checkpoints clearly", async () => {
    await expect(
      resolveFxhashHostedTokenUrl({
        url: "https://fxhash.xyz/iteration/missing",
        fetch: vi
          .fn()
          .mockResolvedValueOnce(pageResponse("unavailable", 503))
          .mockResolvedValueOnce(pageResponse("<html>changed</html>")),
      }),
    ).rejects.toThrow("website may have changed")
    await expect(
      resolveFxhashHostedTokenUrl({
        url: "https://fxhash.xyz/iteration/checkpoint",
        fetch: vi
          .fn()
          .mockResolvedValueOnce(pageResponse("unavailable", 503))
          .mockResolvedValueOnce(pageResponse("<title>Vercel Security Checkpoint</title>")),
      }),
    ).rejects.toThrow("browser security checkpoint")
  })
})
