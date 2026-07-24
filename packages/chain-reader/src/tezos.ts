/**
 * Read fxhash gentk tokens owned by a Tezos address via the public TzKT API.
 * TzKT indexes TZIP-21 metadata inline, so a single balances query returns
 * holdings with metadata attached.
 */
import { normalizeMetadata } from "./metadata.js"
import { TEZOS_NETWORKS } from "./networks.js"
import type { ChainId, ChainReaderConfig, ProgressCallback, WhitehashToken } from "./types.js"

type TezosChain = Extract<ChainId, `tezos:${string}`>

const PAGE_LIMIT = 200

interface TzktBalance {
  account?: { address?: string }
  token?: {
    contract?: { address?: string }
    tokenId?: string
    metadata?: Record<string, unknown> | null
  }
  balance?: string
}

export function isTezosAddress(address: string): boolean {
  return /^(tz1|tz2|tz3|tz4|KT1)[0-9A-Za-z]{33}$/.test(address)
}

async function tzktFetch<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetchImpl(url)
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`TzKT HTTP ${res.status}`)
      } else if (!res.ok) {
        throw new Error(`TzKT HTTP ${res.status} for ${url}`)
      } else {
        return (await res.json()) as T
      }
    } catch (err) {
      lastError = err
    }
    await sleep(300 * 2 ** attempt)
  }
  throw new Error(`TzKT request failed after retries: ${url} (${String(lastError)})`)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function baseUrl(chain: TezosChain, config: ChainReaderConfig): string {
  const override = config.tzkt?.[chain]
  return (override ?? TEZOS_NETWORKS[chain].defaultTzktBaseUrl).replace(/\/+$/, "")
}

/**
 * Hex-decode a big-map `token_info[""]` value into a UTF-8 metadata URI.
 * TzKT returns these values hex-encoded (e.g. "697066733a2f2f..." → "ipfs://...").
 */
export function hexToUtf8(hex: string): string {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return new TextDecoder().decode(bytes)
}

/**
 * Fallback when TzKT has not indexed a token's inline metadata: read the
 * metadata URI from the `token_metadata` big map, then fetch the JSON via the
 * resolver. Returns null if unavailable.
 */
async function fetchMetadataViaBigMap(
  chain: TezosChain,
  config: ChainReaderConfig,
  contract: string,
  tokenId: string,
  fetchImpl: typeof fetch,
): Promise<Record<string, unknown> | null> {
  try {
    const url = `${baseUrl(chain, config)}/v1/contracts/${contract}/bigmaps/token_metadata/keys/${tokenId}`
    const key = await tzktFetch<{ value?: { token_info?: Record<string, string> } }>(url, fetchImpl)
    const encoded = key.value?.token_info?.[""]
    if (!encoded) return null
    const uri = hexToUtf8(encoded)
    const { fetchWithGatewayFallback } = await import("@whitehash/resolve")
    const res = await fetchWithGatewayFallback(uri, config.resolver, { fetchImpl })
    return (await res.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function getTezosWalletTokens(
  address: string,
  chain: TezosChain,
  config: ChainReaderConfig,
  fetchImpl: typeof fetch = fetch,
  onProgress?: ProgressCallback,
): Promise<WhitehashToken[]> {
  if (!isTezosAddress(address)) {
    throw new Error(`Not a Tezos address: ${address}`)
  }
  const network = TEZOS_NETWORKS[chain]
  const contractsParam = network.gentkContracts.join(",")
  const tokens: WhitehashToken[] = []

  onProgress?.({ chain, phase: "ownership", message: "Querying TzKT balances" })

  for (let offset = 0; ; offset += PAGE_LIMIT) {
    const url =
      `${baseUrl(chain, config)}/v1/tokens/balances` +
      `?account=${address}&balance.ne=0` +
      `&token.contract.in=${contractsParam}` +
      `&limit=${PAGE_LIMIT}&offset=${offset}`
    const page = await tzktFetch<TzktBalance[]>(url, fetchImpl)
    if (page.length === 0) break

    for (const bal of page) {
      const contract = bal.token?.contract?.address
      const tokenId = bal.token?.tokenId
      if (!contract || tokenId === undefined) continue

      // A 133-token mainnet audit had inline
      // metadata on 133/133 balances. Keep the big-map path as a correctness
      // fallback for index lag, but avoid its extra request in the normal case.
      let rawMeta: Record<string, unknown> | null = bal.token?.metadata ?? null
      if (!rawMeta) {
        rawMeta = await fetchMetadataViaBigMap(chain, config, contract, tokenId, fetchImpl)
      }

      const norm = normalizeMetadata(rawMeta ?? {})
      tokens.push({
        chain,
        contract,
        tokenId,
        name: norm.name,
        description: norm.description,
        iterationHash: norm.iterationHash,
        artifactUri: norm.artifactUri,
        displayUri: norm.displayUri,
        thumbnailUri: norm.thumbnailUri,
        generatorUri: norm.generatorUri,
        attributes: norm.attributes,
        assigned: norm.assigned,
        metadataUri: null,
        raw: rawMeta,
      })
    }

    onProgress?.({
      chain,
      phase: "metadata",
      message: `Fetched ${tokens.length} token(s)`,
      found: tokens.length,
    })

    if (page.length < PAGE_LIMIT) break
    await sleep(120) // politeness between pages
  }

  onProgress?.({ chain, phase: "done", message: "Done", found: tokens.length })
  return tokens
}
