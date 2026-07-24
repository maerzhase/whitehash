import { describe, expect, it } from "vitest"
import { createApp } from "./app.js"
import { PROXY_NETWORKS, rpcsFor } from "./networks.js"

describe("createApp", () => {
  const app = createApp({ env: {} })

  it("serves /health with the network list", async () => {
    const res = await app.request("/health")
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; networks: string[] }
    expect(body.ok).toBe(true)
    expect(body.networks).toContain("eip155-8453")
    expect(body.networks).toContain("tezos-mainnet")
  })

  it("describes usage at /", async () => {
    const res = await app.request("/")
    const body = (await res.json()) as { usage: string }
    expect(body.usage).toContain("networkSlug")
  })
})

describe("rpcsFor", () => {
  const network = PROXY_NETWORKS.find(n => n.slug === "eip155-8453")!

  it("uses defaults when no env override", () => {
    expect(rpcsFor(network, {})).toEqual(network.defaultRpcs)
  })

  it("parses a comma-separated env override", () => {
    expect(rpcsFor(network, { ONCHFS_BASE_RPCS: "https://a.example, https://b.example" })).toEqual([
      "https://a.example",
      "https://b.example",
    ])
  })

  it("falls back to defaults for an empty override", () => {
    expect(rpcsFor(network, { ONCHFS_BASE_RPCS: "  " })).toEqual(network.defaultRpcs)
  })
})
