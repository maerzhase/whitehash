/**
 * Self-hostable onchfs HTTP proxy.
 *
 * Resolves `onchfs://` artworks from Tezos, Ethereum, and Base and serves them
 * over HTTP so a browser can load them in an iframe. This is the only server
 * component whitehash needs, and it depends on nothing fxhash-hosted — only
 * public RPC nodes (configurable per network via env vars).
 *
 * Request shape: `GET /{networkSlug}/{cid}[/path]` where networkSlug is e.g.
 * `eip155-8453` or `tezos-mainnet` (as produced by @whitehash/resolve). A
 * request without a recognized network prefix falls back to Tezos mainnet.
 *
 * Adapted from the fxhash onchfs http-proxy example (MIT).
 */
import { Hono } from "hono"
import { cors } from "hono/cors"
import onchfs from "onchfs"
import type { OnchfsResponse } from "@whitehash/core"
import { DEFAULT_NETWORK_SLUG, PROXY_NETWORKS, rpcsFor, type ProxyNetwork } from "./networks.js"

type ResolveFn = (uri: string) => Promise<OnchfsResponse>

export interface AppOptions {
  /** Environment for RPC overrides. Defaults to process.env when available. */
  env?: Record<string, string | undefined>
}

function buildResolvers(env: Record<string, string | undefined>): Map<string, ResolveFn> {
  const resolvers = new Map<string, ResolveFn>()
  for (const network of PROXY_NETWORKS) {
    // One resolver per network so a bare CID resolves unambiguously.
    const resolve = onchfs.resolver.create([
      // onchfs types `blockchain` as a closed union of network ids/aliases; our
      // slugs map to valid ids at runtime, so we widen the type here.
      { blockchain: network.onchfsNetwork as never, rpcs: rpcsFor(network, env) },
    ]) as unknown as ResolveFn
    resolvers.set(network.slug, resolve)
  }
  return resolvers
}

function findNetwork(slug: string): ProxyNetwork | undefined {
  return PROXY_NETWORKS.find(n => n.slug === slug)
}

export function createApp(options: AppOptions = {}): Hono {
  const env =
    options.env ?? (typeof process !== "undefined" ? process.env : ({} as Record<string, string>))
  const resolvers = buildResolvers(env)

  const app = new Hono()
  app.use("*", cors({ origin: "*" }))

  app.get("/health", c => c.json({ ok: true, networks: PROXY_NETWORKS.map(n => n.slug) }))

  app.get("/", c =>
    c.json({
      service: "whitehash onchfs-proxy",
      usage: "GET /{networkSlug}/{cid}[/path]",
      networks: PROXY_NETWORKS.map(n => n.slug),
    }),
  )

  app.get("/*", async c => {
    const path = c.req.path // e.g. "/eip155-8453/{cid}/index.html"
    const segments = path.replace(/^\/+/, "").split("/")
    const first = segments[0] ?? ""

    let network = findNetwork(first)
    let onchfsPath: string
    if (network) {
      onchfsPath = "/" + segments.slice(1).join("/")
    } else {
      // No recognized network prefix — default network, whole path is the CID.
      network = findNetwork(DEFAULT_NETWORK_SLUG)!
      onchfsPath = path
    }

    const resolve = resolvers.get(network.slug)
    if (!resolve) return c.json({ error: `unsupported network: ${network.slug}` }, 400)

    // Preserve the query string (artifacts carry ?fxhash=... etc.).
    const url = new URL(c.req.url)
    const uri = onchfsPath + url.search

    try {
      const response = await resolve(uri)
      const headers = new Headers(response.headers as Record<string, string>)
      // Content is immutable (content-addressed) — cache hard.
      if (response.status === 200) {
        headers.set("cache-control", "public, max-age=31536000, immutable")
      }
      // Copy into a plain ArrayBuffer to satisfy BodyInit across TS lib targets.
      const body = response.content.slice().buffer
      return new Response(body, { status: response.status, headers })
    } catch (err) {
      return c.json(
        { error: "resolution failed", detail: String(err instanceof Error ? err.message : err) },
        502,
      )
    }
  })

  return app
}
