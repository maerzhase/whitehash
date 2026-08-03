import { parseFxhashTokenUrl, type ChainId } from "@whitehash/chain-reader"

export interface FxhashHostedResolverOptions {
  url: string
  chain?: ChainId
  fetch?: typeof globalThis.fetch
  onProgress?: (message: string) => void
}

export interface ResolvedFxhashToken {
  chain: ChainId
  contract: string
  tokenId: string
}

const MAX_PAGE_BYTES = 5 * 1024 * 1024
const FXHASH_GRAPHQL_URL = "https://api.fxhash.xyz/graphql"
const RESOLVE_QUERY = `query ResolveIteration($slug: String!) {
  objkt(slug: $slug) {
    slug
    gentkContractAddress
    onChainId
  }
}`

function iterationInput(value: string): { slug: string; requestUrl: string } {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`Invalid fxhash URL: ${value}`)
  }
  if (url.hostname !== "fxhash.xyz" && url.hostname !== "www.fxhash.xyz") {
    throw new Error("The fxhash hosted resolver only accepts fxhash.xyz URLs.")
  }
  if (url.username || url.password) {
    throw new Error("The fxhash hosted resolver does not accept URLs containing credentials.")
  }
  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent)
  let slug: string
  if (parts[0] === "iteration" && parts.length === 2 && parts[1]) slug = parts[1]
  else if (parts[0] === "gentk" && parts[1] === "slug" && parts.length === 3 && parts[2]) {
    slug = parts[2]
  } else if (parts[0] === "project") {
    throw new Error(
      "This fxhash project URL identifies a collection, not one token. Use an iteration URL.",
    )
  } else {
    throw new Error("The fxhash hosted resolver expects a slug-only iteration URL.")
  }
  if (
    slug === "." ||
    slug === ".." ||
    [...slug].some(character => {
      const code = character.charCodeAt(0)
      return character === "/" || character === "\\" || code <= 31 || code === 127
    })
  ) {
    throw new Error("The fxhash iteration slug contains unsafe characters.")
  }
  url.protocol = "https:"
  url.username = ""
  url.password = ""
  url.search = ""
  url.hash = ""
  return { slug, requestUrl: url.toString() }
}

function regexEscape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function chainFromPage(value: string): ChainId | null {
  if (value === "TEZOS") return "tezos:mainnet"
  if (value === "BASE") return "eip155:8453"
  if (value === "ETHEREUM") return "eip155:1"
  return null
}

function extractToken(html: string, slug: string): ResolvedFxhashToken {
  const normalized = html.replaceAll('\\"', '"').replaceAll("&quot;", '"')
  const slugPattern = regexEscape(slug)
  const objectPattern = new RegExp(
    `"id"\\s*:\\s*"([^"]+)"\\s*,\\s*"slug"\\s*:\\s*"${slugPattern}"`,
    "g",
  )
  const candidates = new Map<string, ResolvedFxhashToken>()
  for (const match of normalized.matchAll(objectPattern)) {
    const identity = match[1]!
    const coordinates = parseFxhashTokenUrl(`https://fxhash.xyz/gentk/${identity}`)
    if (!coordinates) continue
    const context = normalized.slice(match.index, match.index + 4_096)
    const pageChain = /"chain"\s*:\s*"(TEZOS|BASE|ETHEREUM)"/.exec(context)?.[1]
    const chain = pageChain ? chainFromPage(pageChain) : null
    if (!chain) continue
    candidates.set(`${chain}/${coordinates.contract}/${coordinates.tokenId}`, {
      chain,
      ...coordinates,
    })
  }
  if (candidates.size === 1) return [...candidates.values()][0]!
  if (candidates.size > 1) {
    throw new Error(`fxhash returned multiple on-chain identities for iteration slug "${slug}".`)
  }
  throw new Error(
    `fxhash did not expose an on-chain token identity for iteration slug "${slug}". The website may have changed.`,
  )
}

function checkedChain(
  token: ResolvedFxhashToken,
  expected: ChainId | undefined,
): ResolvedFxhashToken {
  if (expected && expected !== token.chain) {
    throw new Error(`fxhash resolved ${token.chain}, but the caller selected ${expected}.`)
  }
  return token
}

function apiToken(
  value: unknown,
  slug: string,
  expectedChain: ChainId | undefined,
): ResolvedFxhashToken | null {
  if (!value || typeof value !== "object") return null
  const data = (value as { data?: unknown }).data
  if (!data || typeof data !== "object") return null
  const objkt = (data as { objkt?: unknown }).objkt
  if (!objkt || typeof objkt !== "object") return null
  const record = objkt as Record<string, unknown>
  if (
    record.slug !== slug ||
    typeof record.gentkContractAddress !== "string" ||
    (typeof record.onChainId !== "number" && typeof record.onChainId !== "string")
  ) {
    return null
  }
  const contract = record.gentkContractAddress
  const tokenId = String(record.onChainId)
  if (contract.startsWith("KT1")) {
    const coordinates = parseFxhashTokenUrl(`https://fxhash.xyz/gentk/${contract}-${tokenId}`)
    return coordinates
      ? checkedChain({ chain: "tezos:mainnet", ...coordinates }, expectedChain)
      : null
  }
  if (/^0x[0-9a-fA-F]{40}$/.test(contract)) {
    if (!expectedChain) {
      throw new Error(
        "An EVM fxhash iteration needs a chain. Pass --chain base, --chain ethereum, or a full EVM chain ID.",
      )
    }
    if (!expectedChain.startsWith("eip155:")) {
      throw new Error(`An EVM fxhash iteration cannot use Tezos chain ${expectedChain}.`)
    }
    const coordinates = parseFxhashTokenUrl(`https://fxhash.xyz/gentk/${contract}-${tokenId}`)
    return coordinates ? { chain: expectedChain, ...coordinates } : null
  }
  return null
}

/**
 * Resolve a slug-only fxhash iteration URL through fxhash's currently hosted service.
 *
 * This is an explicit hosted convenience path. The returned identity can be passed to
 * `archiveToken()`; archive creation itself does not depend on fxhash.
 */
export async function resolveFxhashHostedTokenUrl(
  options: FxhashHostedResolverOptions,
): Promise<ResolvedFxhashToken> {
  const { slug, requestUrl } = iterationInput(options.url)
  const fetcher = options.fetch ?? globalThis.fetch
  options.onProgress?.(`Resolving ${slug} through fxhash's hosted service`)
  const apiResponse = await fetcher(FXHASH_GRAPHQL_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "whitehash-archive",
    },
    body: JSON.stringify({ query: RESOLVE_QUERY, variables: { slug } }),
  })
  if (apiResponse.ok) {
    let payload: unknown
    try {
      payload = await apiResponse.json()
    } catch {
      payload = null
    }
    const token = apiToken(payload, slug, options.chain)
    if (token) return token
  }
  options.onProgress?.("The fxhash API did not resolve the slug; trying the website page")
  const response = await fetcher(requestUrl, {
    headers: { accept: "text/html", "user-agent": "whitehash-archive" },
  })
  if (!response.ok) throw new Error(`fxhash resolver: HTTP ${response.status}`)
  if (response.url) {
    const finalUrl = new URL(response.url)
    if (finalUrl.hostname !== "fxhash.xyz" && finalUrl.hostname !== "www.fxhash.xyz") {
      throw new Error("fxhash resolver redirected to an unrelated hostname.")
    }
  }
  const declaredLength = Number(response.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PAGE_BYTES) {
    throw new Error("fxhash resolver page exceeded the 5 MB safety limit.")
  }
  const html = await response.text()
  if (html.length > MAX_PAGE_BYTES) {
    throw new Error("fxhash resolver page exceeded the 5 MB safety limit.")
  }
  if (/Vercel Security Checkpoint|We're verifying your browser/i.test(html)) {
    throw new Error(
      "fxhash blocked the hosted resolver with a browser security checkpoint. Use an identity-bearing token URL or try again from a browser-enabled network.",
    )
  }
  return checkedChain(extractToken(html, slug), options.chain)
}

const FXHASH_PROJECT_API_URL = "https://api.v2.fxhash.xyz/v1/graphql"
const RESOLVE_PROJECT_QUERY = `query ResolveProject($slug: String!) {
  onchain {
    generative_token(where: { slug: { _eq: $slug } }, limit: 2) {
      id
      slug
      chain
    }
  }
}`

export interface ResolvedFxhashProject {
  chain: ChainId
  /** A Whitehash project id: `v2:<id>` on Tezos, the collection address on EVM. */
  id: string
}

export interface FxhashHostedProjectResolverOptions {
  /** A project slug, or an fxhash project URL containing one. */
  input: string
  chain?: ChainId
  fetch?: typeof globalThis.fetch
  onProgress?: (message: string) => void
}

function projectSlug(value: string): string {
  const raw = value.trim()
  let slug = raw
  if (/^https?:\/\//i.test(raw)) {
    let url: URL
    try {
      url = new URL(raw)
    } catch {
      throw new Error(`Invalid fxhash URL: ${raw}`)
    }
    if (url.hostname !== "fxhash.xyz" && url.hostname !== "www.fxhash.xyz") {
      throw new Error("The fxhash hosted resolver only accepts fxhash.xyz URLs.")
    }
    if (url.username || url.password) {
      throw new Error("The fxhash hosted resolver does not accept URLs containing credentials.")
    }
    const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent)
    const candidate =
      parts[0] === "project" && parts.length === 2
        ? parts[1]
        : parts[0] === "generative" && parts[1] === "slug" && parts.length === 3
          ? parts[2]
          : undefined
    if (!candidate) {
      throw new Error("The fxhash hosted resolver expects a project URL or a bare project slug.")
    }
    slug = candidate
  }
  if (
    !slug ||
    slug === "." ||
    slug === ".." ||
    [...slug].some(character => {
      const code = character.charCodeAt(0)
      return character === "/" || character === "\\" || code <= 31 || code === 127
    })
  ) {
    throw new Error("The fxhash project slug contains unsafe characters.")
  }
  return slug
}

/**
 * Resolve an fxhash project slug to an on-chain project identity through
 * fxhash's currently hosted service.
 *
 * A slug exists only in fxhash's own database, so recovering the on-chain
 * identity behind one cannot be done from public chain data. This is the same
 * explicit hosted convenience as the iteration resolver: everything after it
 * reads public infrastructure only.
 *
 * Tezos ids are returned as `v2:<id>`. The v2 issuer ledger holds every project
 * generation, including the earliest ids, so it resolves project metadata for
 * any Tezos project regardless of which issuer its mints ran on.
 */
export async function resolveFxhashHostedProject(
  options: FxhashHostedProjectResolverOptions,
): Promise<ResolvedFxhashProject> {
  const slug = projectSlug(options.input)
  const fetcher = options.fetch ?? globalThis.fetch
  options.onProgress?.(`Resolving project "${slug}" through fxhash's hosted service`)
  const response = await fetcher(FXHASH_PROJECT_API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query: RESOLVE_PROJECT_QUERY, variables: { slug } }),
  })
  if (!response.ok) throw new Error(`fxhash resolver: HTTP ${response.status}`)
  const payload = (await response.json()) as {
    data?: { onchain?: { generative_token?: { id?: unknown; slug?: unknown; chain?: unknown }[] } }
  }
  const matches = payload.data?.onchain?.generative_token ?? []
  if (matches.length > 1) {
    throw new Error(`fxhash returned multiple projects for slug "${slug}".`)
  }
  const match = matches[0]
  if (!match || match.slug !== slug || typeof match.id !== "string") {
    throw new Error(
      `fxhash did not resolve project slug "${slug}". Check the slug, or pass the on-chain project ID.`,
    )
  }
  const chain = chainFromPage(String(match.chain))
  if (!chain) throw new Error(`fxhash reported an unsupported chain for "${slug}".`)
  if (options.chain && options.chain !== chain) {
    throw new Error(`fxhash resolved ${chain}, but the caller selected ${options.chain}.`)
  }
  if (chain === "tezos:mainnet") {
    if (!/^\d+$/.test(match.id)) {
      throw new Error(`fxhash returned an unexpected Tezos project id for "${slug}".`)
    }
    return { chain, id: `v2:${match.id}` }
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(match.id)) {
    throw new Error(`fxhash returned an unexpected EVM collection address for "${slug}".`)
  }
  return { chain, id: match.id }
}
