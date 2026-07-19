import { describe, expect, it } from "vitest"
import { ONCHFS_VIRTUAL_PATH, parseOnchfsRequest, responseFromOnchfs } from "./core.js"
import { ONCHFS_WORKER_NETWORKS } from "./networks.js"

describe("onchfs virtual requests", () => {
  it("maps a chain-scoped URL to an onchfs URI and query-independent cache key", () => {
    const parsed = parseOnchfsRequest(
      `https://docs.example${ONCHFS_VIRTUAL_PATH}/eip155-1/abc/index.html?fxhash=0x1`,
      ONCHFS_WORKER_NETWORKS,
    )
    expect(parsed?.network.blockchain).toBe("eip155:1")
    expect(parsed?.uri).toBe("/abc/index.html?fxhash=0x1")
    expect(parsed?.cacheUrl).toBe(`https://docs.example${ONCHFS_VIRTUAL_PATH}/eip155-1/abc/index.html`)
  })

  it("preserves resolver headers and adds immutable caching", async () => {
    const response = await responseFromOnchfs({
      status: 200,
      content: new TextEncoder().encode("<!doctype html>"),
      headers: { "content-type": "text/html" },
    })
    expect(response.headers.get("content-type")).toBe("text/html")
    expect(response.headers.get("cache-control")).toContain("immutable")
    expect(await response.text()).toBe("<!doctype html>")
  })

  it("decompresses gzip before returning a synthetic worker response", async () => {
    const compressed = await new Response(
      new Blob(["<h1>Genomes</h1>"]).stream().pipeThrough(new CompressionStream("gzip")),
    ).arrayBuffer()
    const response = await responseFromOnchfs({
      status: 200,
      content: new Uint8Array(compressed),
      headers: { "content-type": "text/html", "content-encoding": "gzip" },
    })
    expect(response.headers.has("content-encoding")).toBe(false)
    expect(await response.text()).toBe("<h1>Genomes</h1>")
  })
})
