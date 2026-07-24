/**
 * URI resolution for whitehash.
 *
 * Turns content-addressed URIs (`ipfs://`, `onchfs://`, bare CIDs) and inline
 * URIs (`data:`, `http(s)://`) into fetchable HTTP URLs, preserving query
 * strings and fragments — fxhash artifact URIs carry render state there
 * (e.g. `ipfs://{cid}/?fxhash=...#0x{params}`), so dropping them would break
 * the live view.
 *
 * Resolution rules are a dependency-free port of the fxhash `proxyUrl` helper
 * (fxhash monorepo `packages/config/src/utils/ipfs.ts`, MIT), with all
 * fxhash-hosted default endpoints removed.
 */
import { chainSlug as sharedChainSlug, isChainId, type ChainId } from "@whitehash/core"

export interface ResolverConfig {
  /**
   * Ordered list of IPFS gateway roots (no trailing slash), e.g.
   * "https://ipfs.io". Tried in order by {@link fetchWithGatewayFallback}.
   */
  ipfsGateways: string[]
  /** How onchfs virtual URLs are served; `null` disables browser resolution. */
  onchfs: { mode: "service-worker"; basePath?: string } | { mode: "proxy"; baseUrl: string } | null
}

export const DEFAULT_IPFS_GATEWAYS = ["https://ipfs.io", "https://dweb.link"]

/**
 * A default config. `onchfs` is null by design — there is no public
 * fxhash-independent onchfs gateway to default to; callers must supply their
 * own (self-hosted via `apps/onchfs-proxy`).
 */
export function defaultResolverConfig(): ResolverConfig {
  return { ipfsGateways: [...DEFAULT_IPFS_GATEWAYS], onchfs: null }
}

export interface ResolveOptions {
  /**
   * The chain the token lives on (e.g. "eip155:8453", "tezos:mainnet"). Used
   * only for `onchfs://` URIs, which carry no network of their own: the onchfs
   * proxy needs to know which blockchain to resolve against, so the chain is
   * encoded as the first path segment (`:` → `-`). Ignored for other schemes.
   */
  chain?: ChainId
}

interface SplitUri {
  scheme: string | null // lowercased scheme without "://", or null if none
  /** Everything after `scheme://` (authority + path + query + fragment). */
  rest: string
}

/**
 * Split a URI into its scheme and the remainder after `://`. For schemes that
 * use `:` without `//` (e.g. `data:`), the whole thing is returned verbatim so
 * callers can pass it through untouched.
 */
function splitScheme(uri: string): SplitUri {
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(.*)$/s.exec(uri)
  if (match) return { scheme: match[1]!.toLowerCase(), rest: match[2]! }
  return { scheme: null, rest: uri }
}

function normalizeIpfsPath(value: string): string {
  // Metadata and user-provided values appear in several equivalent forms:
  // ipfs://CID, ipfs://ipfs/CID, /ipfs/CID, and bare CID. Keep the payload
  // intact while removing only a leading gateway namespace.
  return value.replace(/^\/+/, "").replace(/^ipfs\/+/, "")
}

function normalizeGatewayRoot(gateway: string): string {
  // Accept both a host root and the copy-paste-friendly gateway API root.
  // `https://host/ipfs/` must not become `https://host/ipfs/ipfs/CID`.
  return gateway
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/ipfs$/i, "")
}

function joinGateway(gateway: string, rest: string): string {
  // rest = "{cid}[/path][?query][#fragment]" — appended verbatim under /ipfs/
  return `${normalizeGatewayRoot(gateway)}/ipfs/${normalizeIpfsPath(rest)}`
}

/** "eip155:8453" → "eip155-8453" for use as a URL path segment. */
export function chainSlug(chain: string): string {
  return isChainId(chain) ? sharedChainSlug(chain) : chain.replace(/:/g, "-")
}

/**
 * Resolve a single URI to an HTTP URL using the first configured IPFS gateway.
 * Returns `null` when the URI cannot be resolved in this configuration
 * (`onchfs://` without a proxy, or `temp://` which is a pre-mint scheme we do
 * not support).
 *
 * Rules:
 * - `data:`, `blob:`, `http://`, `https://` → returned unchanged
 * - `ipfs://<rest>` or a bare CID → `<gateway>/ipfs/<rest>`
 * - `onchfs://<rest>` → the configured proxy or service-worker virtual path
 * - `temp://...` → `null`
 */
export function resolveUri(
  uri: string,
  config: ResolverConfig,
  options: ResolveOptions = {},
): string | null {
  if (!uri) return null
  const trimmed = uri.trim()
  if (!trimmed) return null

  // Pass-through schemes (inline data, blobs, already-HTTP URLs).
  if (/^(data|blob):/i.test(trimmed)) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const { scheme, rest } = splitScheme(trimmed)

  switch (scheme) {
    case "onchfs": {
      if (!config.onchfs) return null
      const base = (
        config.onchfs.mode === "proxy"
          ? config.onchfs.baseUrl
          : (config.onchfs.basePath ?? "/.whitehash/onchfs")
      ).replace(/\/+$/, "")
      const prefix = options.chain ? `/${chainSlug(options.chain)}` : ""
      return `${base}${prefix}/${rest}`
    }
    case "temp":
      // fxhash pre-mint file emulator — infra-bound, unsupported by design.
      return null
    case "ipfs": {
      const gateway = config.ipfsGateways[0]
      if (!gateway) return null
      return joinGateway(gateway, rest)
    }
    case null: {
      // No scheme — treat as a bare IPFS CID (optionally with path/query/frag).
      const gateway = config.ipfsGateways[0]
      if (!gateway) return null
      return joinGateway(gateway, trimmed)
    }
    default:
      // Unknown scheme — not something we can fetch.
      return null
  }
}

/**
 * Resolve a URI to one HTTP URL per configured IPFS gateway, for fallback
 * fetching. For non-IPFS URIs this returns a single-element array (or empty if
 * unresolvable). IPFS URIs return one URL per gateway, in order.
 */
export function resolveUriAll(
  uri: string,
  config: ResolverConfig,
  options: ResolveOptions = {},
): string[] {
  if (!uri) return []
  const trimmed = uri.trim()
  if (!trimmed) return []

  if (/^(data|blob):/i.test(trimmed)) return [trimmed]
  if (/^https?:\/\//i.test(trimmed)) return [trimmed]

  const { scheme, rest } = splitScheme(trimmed)

  if (scheme === "onchfs") {
    const single = resolveUri(trimmed, config, options)
    return single ? [single] : []
  }
  if (scheme === "temp") return []

  // ipfs:// or bare CID → every gateway
  const ipfsRest = scheme === "ipfs" ? rest : trimmed
  if (scheme !== "ipfs" && scheme !== null) return [] // unknown scheme
  return config.ipfsGateways.map(g => joinGateway(g, ipfsRest))
}

export interface FetchFallbackOptions extends RequestInit {
  /** Injectable fetch (for tests / non-browser runtimes). Defaults to global. */
  fetchImpl?: typeof fetch
  /** Chain hint for `onchfs://` URIs (see {@link ResolveOptions.chain}). */
  chain?: ChainId
}

/**
 * Fetch a URI, trying each configured IPFS gateway in order until one returns
 * an ok response. Non-IPFS URIs are fetched directly. Throws if every attempt
 * fails or the URI is unresolvable.
 */
export async function fetchWithGatewayFallback(
  uri: string,
  config: ResolverConfig,
  options: FetchFallbackOptions = {},
): Promise<Response> {
  const { fetchImpl, chain, ...init } = options
  const doFetch = fetchImpl ?? fetch
  const urls = resolveUriAll(uri, config, { chain })
  if (urls.length === 0) {
    throw new Error(`whitehash/resolve: cannot resolve URI: ${uri}`)
  }

  let lastError: unknown
  for (const url of urls) {
    try {
      const res = await doFetch(url, init)
      if (res.ok) return res
      lastError = new Error(`HTTP ${res.status} for ${url}`)
    } catch (err) {
      lastError = err
    }
  }
  throw new Error(
    `whitehash/resolve: all ${urls.length} gateway attempt(s) failed for ${uri}: ${String(lastError)}`,
  )
}

/**
 * Create a resolver bound to a config. Convenience wrapper.
 */
export function createResolver(config: ResolverConfig) {
  return {
    config,
    resolveUri: (uri: string, options?: ResolveOptions) => resolveUri(uri, config, options),
    resolveUriAll: (uri: string, options?: ResolveOptions) => resolveUriAll(uri, config, options),
    fetch: (uri: string, options?: FetchFallbackOptions) =>
      fetchWithGatewayFallback(uri, config, options),
  }
}

export type Resolver = ReturnType<typeof createResolver>
