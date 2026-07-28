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
