import { Hono } from "hono"
import { cors } from "hono/cors"

export interface AppOptions {
  env?: Record<string, string | undefined>
  upstream?: string
  maxRedirects?: number
}

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "accept-encoding",
])

const STRIP_RESPONSE = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
])

interface Followed {
  res: Response
  finalUrl: URL
  chain: string[]
}

async function fetchFollow(url: URL, init: RequestInit, maxRedirects: number): Promise<Followed> {
  const chain: string[] = []
  let current = url

  for (let i = 0; i <= maxRedirects; i++) {
    const res = await fetch(current, { ...init, redirect: "manual" })

    if (res.status >= 300 && res.status < 400 && res.headers.has("location")) {
      const location = res.headers.get("location")!
      await res.body?.cancel()
      chain.push(current.toString())
      current = new URL(location, current)
      continue
    }

    return { res, finalUrl: current, chain }
  }

  throw new Error(`Too many redirects (> ${maxRedirects}) for ${url}`)
}

function toProxyPath(finalUrl: URL): string {
  const m = /^([^.]+)\.(ipfs|ipns)\./.exec(finalUrl.hostname)
  if (m) {
    const [, id, ns] = m
    return `/${ns}/${id}${finalUrl.pathname}${finalUrl.search}`
  }
  return `${finalUrl.pathname}${finalUrl.search}`
}

function dirname(path: string): string {
  const clean = path.split("?")[0] ?? "/"
  return clean.endsWith("/") ? clean : clean.slice(0, clean.lastIndexOf("/") + 1)
}

export function patchHtml(html: string, ctx: { requestPath: string; finalUrl: URL }): string {
  const effectiveDir = dirname(toProxyPath(ctx.finalUrl))
  const requestedDir = dirname(ctx.requestPath)

  const head: string[] = []

  if (effectiveDir !== requestedDir && !/<base\s/i.test(html)) {
    head.push(`<base href="${effectiveDir}">`)
  }

  head.push(
    `<meta name="x-proxy-upstream" content="${ctx.finalUrl.toString()}">`,
    `<script id="legacy-snippet-fix">Math.pow = (a,b) => (a === 58 && b === 11) ? 24986644000165536000 : a ** b;</script>`,
  )

  const injection = head.join("\n")

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, m => `${m}\n${injection}`)
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, m => `${m}\n<head>${injection}</head>`)
  }
  return `${injection}\n${html}`
}

export function createApp(options: AppOptions = {}): Hono {
  const upstream = new URL(options.upstream ?? "https://ipfs.io/")
  const maxRedirects = options.maxRedirects ?? 5

  const app = new Hono()
  app.use("*", cors({ origin: "*" }))

  app.get("/health", c => c.json({ ok: true }))

  app.get("/", c =>
    c.json({
      service: "whitehash snippet-proxy",
      usage: "GET /[path]",
      upstream: upstream.origin,
    }),
  )

  app.on(["GET", "HEAD"], "/*", async c => {
    const incoming = new URL(c.req.url)

    const target = new URL(upstream)
    target.pathname = incoming.pathname
    target.search = incoming.search

    const headers = new Headers()
    for (const [k, v] of Object.entries(c.req.header())) {
      if (!HOP_BY_HOP.has(k.toLowerCase()) && v !== undefined) headers.set(k, v)
    }

    let followed: Followed
    try {
      followed = await fetchFollow(target, { method: c.req.method, headers }, maxRedirects)
    } catch (err) {
      return c.json({ error: String(err) }, 502)
    }

    const { res, finalUrl, chain } = followed

    const outHeaders = new Headers()
    res.headers.forEach((v, k) => {
      if (!STRIP_RESPONSE.has(k.toLowerCase())) outHeaders.set(k, v)
    })
    outHeaders.set("x-proxy-upstream", finalUrl.toString())
    if (chain.length) outHeaders.set("x-proxy-redirects", String(chain.length))
    outHeaders.delete("content-security-policy")

    const contentType = res.headers.get("content-type") ?? ""
    const isHtml = /\btext\/html\b|\bapplication\/xhtml\+xml\b/i.test(contentType)

    if (!isHtml || c.req.method === "HEAD" || !res.body) {
      return new Response(res.body, { status: res.status, headers: outHeaders })
    }

    const html = patchHtml(await res.text(), {
      requestPath: incoming.pathname + incoming.search,
      finalUrl,
    })

    outHeaders.set("content-type", contentType || "text/html; charset=utf-8")
    outHeaders.set("content-length", String(Buffer.byteLength(html)))

    return new Response(html, { status: res.status, headers: outHeaders })
  })

  return app
}
