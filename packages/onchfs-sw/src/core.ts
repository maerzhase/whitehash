import type { OnchfsWorkerNetwork } from "./networks.js"

export const ONCHFS_VIRTUAL_PATH = "/.whitehash/onchfs"
export const ONCHFS_CACHE = "whitehash-onchfs-v1"

export interface ParsedOnchfsRequest {
  network: OnchfsWorkerNetwork
  uri: string
  cacheUrl: string
}

export function parseOnchfsRequest(
  requestUrl: string,
  networks: readonly OnchfsWorkerNetwork[],
  basePath = ONCHFS_VIRTUAL_PATH,
): ParsedOnchfsRequest | null {
  const url = new URL(requestUrl)
  const prefix = `${basePath.replace(/\/$/, "")}/`
  if (!url.pathname.startsWith(prefix)) return null
  const segments = url.pathname.slice(prefix.length).split("/")
  const slug = segments.shift()
  const network = networks.find(value => value.slug === slug)
  if (!network || segments.length === 0) return null
  const path = `/${segments.join("/")}`
  return {
    network,
    uri: `${path}${url.search}`,
    // onchfs files are immutable and render query parameters do not change bytes.
    cacheUrl: `${url.origin}${prefix}${network.slug}${path}`,
  }
}

export async function responseFromOnchfs(value: {
  status: number
  content: Uint8Array
  headers: Record<string, string>
}): Promise<Response> {
  const headers = new Headers(value.headers)
  let body: BodyInit = value.content.slice().buffer
  if (headers.get("content-encoding")?.toLowerCase() === "gzip") {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("This browser cannot decompress gzip onchfs content")
    }
    const stream = new Blob([body]).stream().pipeThrough(new DecompressionStream("gzip"))
    body = await new Response(stream).arrayBuffer()
    // Synthetic service-worker responses do not pass through HTTP content decoding.
    headers.delete("content-encoding")
    headers.delete("content-length")
  }
  if (value.status === 200) {
    headers.set("cache-control", "public, max-age=31536000, immutable")
  }
  return new Response(body, { status: value.status, headers })
}
