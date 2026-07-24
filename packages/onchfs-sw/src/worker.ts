/**
 * Browser service worker adapted from the fxhash onchfs HTTP proxy example (MIT).
 * It uses only caller-visible public RPCs and a same-origin virtual path.
 */
import type { OnchfsResponse } from "@whitehash/core"
import { ONCHFS_CACHE, parseOnchfsRequest, responseFromOnchfs } from "./core.js"
import { ONCHFS_WORKER_NETWORKS } from "./networks.js"

declare const self: ServiceWorkerGlobalScope
declare function importScripts(...urls: string[]): void

// onchfs publishes a browser-targeted global bundle with its Node shims included.
;(globalThis as unknown as { process: unknown }).process = {
  browser: true,
  version: "",
  versions: {},
  env: {},
  nextTick: (callback: (...args: unknown[]) => void, ...args: unknown[]) =>
    queueMicrotask(() => callback(...args)),
  stdout: {},
  stderr: {},
}
importScripts("./onchfs.global.js")
const onchfs = (
  globalThis as typeof globalThis & {
    Onchfs: { resolver: { create(config: unknown[]): unknown } }
  }
).Onchfs

type ResolveFn = (uri: string) => Promise<OnchfsResponse>
const resolvers = new Map<string, ResolveFn>()

function resolverFor(slug: string): ResolveFn {
  const existing = resolvers.get(slug)
  if (existing) return existing
  const network = ONCHFS_WORKER_NETWORKS.find(value => value.slug === slug)
  if (!network) throw new Error(`Unsupported onchfs network: ${slug}`)
  const resolve = onchfs.resolver.create([
    { blockchain: network.blockchain as never, rpcs: network.rpcs },
  ]) as unknown as ResolveFn
  resolvers.set(slug, resolve)
  return resolve
}

self.addEventListener("install", event => event.waitUntil(self.skipWaiting()))
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()))
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return
  const parsed = parseOnchfsRequest(event.request.url, ONCHFS_WORKER_NETWORKS)
  if (!parsed) return
  event.respondWith(
    (async () => {
      const cache = await caches.open(ONCHFS_CACHE)
      const cacheKey = new Request(parsed.cacheUrl)
      const cached = await cache.match(cacheKey)
      if (cached) return cached
      try {
        const response = await responseFromOnchfs(
          await resolverFor(parsed.network.slug)(parsed.uri),
        )
        if (response.ok) await cache.put(cacheKey, response.clone())
        return response
      } catch (cause) {
        return Response.json(
          {
            error: "onchfs resolution failed",
            detail: cause instanceof Error ? cause.message : String(cause),
          },
          { status: 502 },
        )
      }
    })(),
  )
})
