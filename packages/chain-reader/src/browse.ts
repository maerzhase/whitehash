/**
 * Contract-first browsing: enumerate the fxhash projects published on the
 * contracts themselves (not a wallet's holdings), and each project's
 * iterations — directly from public infrastructure.
 *
 * - Tezos: projects live in the issuer contracts' `ledger` big maps (project
 *   metadata JSON on IPFS); iterations are matched on the gentk contracts by
 *   the fxhash naming convention "{project name} #{iteration}" (produced by
 *   the shared metadata builder for every version).
 * - EVM: the FxIssuerFactory's ProjectCreated log IS the project list (each
 *   project is its own FxGenArt721 contract); iterations via Blockscout's
 *   token-instances endpoint.
 */
import { fetchWithGatewayFallback } from "@whitehash/resolve"
import {
  blockscoutBaseUrl,
  buildEvmTokensRefreshingStale,
  discoverEvmCollectionsViaBlockscout,
} from "./blockscout.js"
import { normalizeMetadata } from "./metadata.js"
import { EVM_NETWORKS, TEZOS_NETWORKS } from "./networks.js"
import { hexToUtf8 } from "./tezos.js"
import type {
  ChainId,
  ChainReaderConfig,
  ProgressCallback,
  WhitehashToken,
} from "./types.js"

type TezosChain = Extract<ChainId, `tezos:${string}`>
type EvmChain = Extract<ChainId, `eip155:${string}`>

/** A generative project (collection), uniform across chains. */
export interface WhitehashProject {
  chain: ChainId
  /**
   * Stable reference. Tezos: "{issuerVersion}:{projectId}" (e.g. "v3:31804").
   * EVM: the FxGenArt721 contract address.
   */
  ref: string
  name: string | null
  description: string | null
  displayUri: string | null
  thumbnailUri: string | null
  /** Number of minted/mintable editions when known. */
  supply: number | null
  raw: unknown
}

export interface ProjectPage {
  projects: WhitehashProject[]
  /** Opaque cursor for the next page; null = no more pages. */
  cursor: string | null
}

/** Listing order. Cursors are order-specific — don't mix across orders. */
export type ListOrder = "newest" | "oldest"

// ---------------------------------------------------------------------------
// Tezos
// ---------------------------------------------------------------------------

function tzktBase(chain: TezosChain, config: ChainReaderConfig): string {
  return (config.tzkt?.[chain] ?? TEZOS_NETWORKS[chain].defaultTzktBaseUrl).replace(
    /\/+$/,
    "",
  )
}

interface TzktLedgerKey {
  key: string
  active?: boolean
  value?: { metadata?: string; supply?: string; original_supply?: string }
}

async function fetchProjectMetadata(
  uriHex: string | undefined,
  config: ChainReaderConfig,
  fetchImpl: typeof fetch,
): Promise<Record<string, unknown> | null> {
  if (!uriHex) return null
  try {
    const uri = hexToUtf8(uriHex)
    const res = await fetchWithGatewayFallback(uri, config.resolver, { fetchImpl })
    return (await res.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * List Tezos projects for one issuer version, newest first. Cursor = numeric
 * offset within that issuer's ledger.
 */
export async function listTezosProjects(
  chain: TezosChain,
  config: ChainReaderConfig,
  options: {
    issuerVersion?: string
    cursor?: string | null
    limit?: number
    order?: ListOrder
  } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectPage> {
  const network = TEZOS_NETWORKS[chain]
  const version = options.issuerVersion ?? "v3"
  const issuer = network.issuerContracts.find(i => i.version === version)
  if (!issuer) throw new Error(`Unknown issuer version: ${version}`)
  const limit = options.limit ?? 12
  const offset = options.cursor ? Number(options.cursor) : 0
  const sort = (options.order ?? "newest") === "newest" ? "sort.desc" : "sort.asc"

  const url =
    `${tzktBase(chain, config)}/v1/contracts/${issuer.address}/bigmaps/ledger/keys` +
    `?limit=${limit}&offset=${offset}&${sort}=id&select=key,active,value`
  const res = await fetchImpl(url)
  if (!res.ok) throw new Error(`TzKT HTTP ${res.status} for ${url}`)
  const keys = (await res.json()) as TzktLedgerKey[]

  const concurrency = config.concurrency ?? 8
  const projects: (WhitehashProject | null)[] = new Array(keys.length).fill(null)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, keys.length) }, async () => {
      while (next < keys.length) {
        const i = next++
        const k = keys[i]!
        const meta = await fetchProjectMetadata(k.value?.metadata, config, fetchImpl)
        const supplyRaw = k.value?.supply ?? k.value?.original_supply
        projects[i] = {
          chain,
          ref: `${version}:${k.key}`,
          name: typeof meta?.["name"] === "string" ? (meta["name"] as string) : null,
          description:
            typeof meta?.["description"] === "string"
              ? (meta["description"] as string)
              : null,
          displayUri:
            typeof meta?.["displayUri"] === "string" ? (meta["displayUri"] as string) : null,
          thumbnailUri:
            typeof meta?.["thumbnailUri"] === "string"
              ? (meta["thumbnailUri"] as string)
              : null,
          supply: supplyRaw !== undefined ? Number(supplyRaw) : null,
          raw: meta,
        }
      }
    }),
  )

  return {
    projects: projects.filter((p): p is WhitehashProject => p !== null),
    cursor: keys.length === limit ? String(offset + limit) : null,
  }
}

/** Fetch a single Tezos project by ref ("v3:31804"). */
export async function getTezosProject(
  chain: TezosChain,
  ref: string,
  config: ChainReaderConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<WhitehashProject | null> {
  const [version, projectId] = ref.split(":")
  if (!version || !projectId) return null
  const issuer = TEZOS_NETWORKS[chain].issuerContracts.find(i => i.version === version)
  if (!issuer) return null
  const url = `${tzktBase(chain, config)}/v1/contracts/${issuer.address}/bigmaps/ledger/keys/${projectId}`
  const res = await fetchImpl(url)
  if (!res.ok) return null
  const key = (await res.json()) as TzktLedgerKey
  const meta = await fetchProjectMetadata(key.value?.metadata, config, fetchImpl)
  const supplyRaw = key.value?.supply ?? key.value?.original_supply
  return {
    chain,
    ref,
    name: typeof meta?.["name"] === "string" ? (meta["name"] as string) : null,
    description:
      typeof meta?.["description"] === "string" ? (meta["description"] as string) : null,
    displayUri:
      typeof meta?.["displayUri"] === "string" ? (meta["displayUri"] as string) : null,
    thumbnailUri:
      typeof meta?.["thumbnailUri"] === "string" ? (meta["thumbnailUri"] as string) : null,
    supply: supplyRaw !== undefined ? Number(supplyRaw) : null,
    raw: meta,
  }
}

/**
 * List a Tezos project's minted iterations by name-prefix match across the
 * gentk contracts. fxhash's shared metadata builder names every iteration
 * "{project name} #{n}", so `metadata.name.as={name} #*` matches exactly.
 */
export async function listTezosProjectTokens(
  chain: TezosChain,
  projectName: string,
  config: ChainReaderConfig,
  options: { cursor?: string | null; limit?: number; order?: ListOrder } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<{ tokens: WhitehashToken[]; cursor: string | null }> {
  const network = TEZOS_NETWORKS[chain]
  const limit = options.limit ?? 24
  const offset = options.cursor ? Number(options.cursor) : 0
  const pattern = encodeURIComponent(`${projectName} #*`)
  // Iterations default to oldest-first (#1, #2, …) — the natural reading order.
  const sort = (options.order ?? "oldest") === "oldest" ? "sort.asc" : "sort.desc"

  const pages = await Promise.all(
    network.gentkContracts.map(async contract => {
      const url =
        `${tzktBase(chain, config)}/v1/tokens?contract=${contract}` +
        `&metadata.name.as=${pattern}&limit=${limit}&offset=${offset}&${sort}=tokenId`
      const res = await fetchImpl(url)
      if (!res.ok) return []
      return (await res.json()) as {
        contract?: { address?: string }
        tokenId?: string
        metadata?: Record<string, unknown> | null
      }[]
    }),
  )

  const tokens: WhitehashToken[] = []
  for (const page of pages) {
    for (const t of page) {
      if (!t.contract?.address || t.tokenId === undefined) continue
      const norm = normalizeMetadata(t.metadata ?? {})
      tokens.push({
        chain,
        contract: t.contract.address,
        tokenId: t.tokenId,
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
        raw: t.metadata,
      })
    }
  }
  // Iterations of one project live on exactly one gentk contract in practice,
  // so pagination follows the largest page.
  const maxPage = Math.max(...pages.map(p => p.length), 0)
  return { tokens, cursor: maxPage === limit ? String(offset + limit) : null }
}

// ---------------------------------------------------------------------------
// EVM
// ---------------------------------------------------------------------------

/**
 * List EVM projects (collections), newest first, from the factory's
 * ProjectCreated history via Blockscout. Names/previews are not in the log;
 * use `getEvmProjectInfo` per project (the viewer does this lazily per card).
 */
export async function listEvmProjects(
  chain: EvmChain,
  config: ChainReaderConfig,
  options: { cursor?: string | null; limit?: number; order?: ListOrder } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectPage> {
  const limit = options.limit ?? 12
  const offset = options.cursor ? Number(options.cursor) : 0
  const dir = (options.order ?? "newest") === "newest" ? -1 : 1
  const snapshot = await discoverEvmCollectionsViaBlockscout(chain, config, fetchImpl)
  const ordered = [...snapshot.collections].sort(
    (a, b) => dir * (a.createdAtBlock - b.createdAtBlock),
  )
  const page = ordered.slice(offset, offset + limit)
  return {
    projects: page.map(c => ({
      chain,
      ref: c.address,
      name: null, // filled lazily via getEvmProjectInfo
      description: null,
      displayUri: null,
      thumbnailUri: null,
      supply: null,
      raw: c,
    })),
    cursor: offset + limit < ordered.length ? String(offset + limit) : null,
  }
}

interface BsTokenInfo {
  name?: string | null
  total_supply?: string | null
}

/** Name/supply for one EVM project, plus a preview from its first instance. */
export async function getEvmProjectInfo(
  chain: EvmChain,
  contract: string,
  config: ChainReaderConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<Partial<WhitehashProject>> {
  const base = blockscoutBaseUrl(chain, config)
  try {
    const res = await fetchImpl(`${base}/api/v2/tokens/${contract}`)
    if (!res.ok) return {}
    const info = (await res.json()) as BsTokenInfo
    return {
      name: info.name ?? null,
      supply: info.total_supply !== null && info.total_supply !== undefined
        ? Number(info.total_supply)
        : null,
    }
  } catch {
    return {}
  }
}

interface BsInstance {
  id?: string
  metadata?: Record<string, unknown> | null
}

/**
 * A single preview thumbnail for an EVM project card — refreshes only the first
 * instance from chain if its cached metadata is stale, so grids stay cheap.
 */
export async function getEvmProjectPreview(
  chain: EvmChain,
  contract: string,
  config: ChainReaderConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const res = await fetchImpl(
      `${blockscoutBaseUrl(chain, config)}/api/v2/tokens/${contract}/instances`,
    )
    if (!res.ok) return null
    const data = (await res.json()) as { items?: BsInstance[] }
    const first = (data.items ?? []).find(i => i.id !== undefined && i.id !== null)
    if (!first) return null
    const [token] = await buildEvmTokensRefreshingStale(chain, config, [
      { contract, tokenId: String(first.id), metadata: first.metadata ?? null },
    ])
    return token?.thumbnailUri ?? token?.displayUri ?? null
  } catch {
    return null
  }
}

/** List an EVM project's iterations via Blockscout token instances. */
export async function listEvmProjectTokens(
  chain: EvmChain,
  contract: string,
  config: ChainReaderConfig,
  options: { cursor?: string | null } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<{ tokens: WhitehashToken[]; cursor: string | null }> {
  const base = blockscoutBaseUrl(chain, config)
  let url = `${base}/api/v2/tokens/${contract}/instances`
  if (options.cursor) url += `?${options.cursor}`
  const res = await fetchImpl(url)
  if (!res.ok) throw new Error(`Blockscout HTTP ${res.status} for ${url}`)
  const data = (await res.json()) as {
    items?: BsInstance[]
    next_page_params?: Record<string, unknown> | null
  }

  // Blockscout caches metadata at mint time, so instances often show the
  // "waiting to be signed" placeholder even after reveal — refresh from chain
  // (same as the wallet path) so iterations get real, renderable metadata.
  const items = (data.items ?? [])
    .filter(item => item.id !== undefined && item.id !== null)
    .map(item => ({
      contract,
      tokenId: String(item.id),
      metadata: item.metadata ?? null,
    }))
  const tokens = await buildEvmTokensRefreshingStale(chain, config, items)

  const nextCursor = data.next_page_params
    ? new URLSearchParams(
        Object.entries(data.next_page_params)
          .filter(([, v]) => v !== null && v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : null
  return { tokens, cursor: nextCursor }
}

// ---------------------------------------------------------------------------
// Uniform dispatch
// ---------------------------------------------------------------------------

export async function listProjects(
  chain: ChainId,
  config: ChainReaderConfig,
  options: {
    issuerVersion?: string
    cursor?: string | null
    limit?: number
    order?: ListOrder
  } = {},
  onProgress?: ProgressCallback,
): Promise<ProjectPage> {
  onProgress?.({ chain, phase: "discover", message: "Listing projects" })
  if (chain.startsWith("tezos:")) {
    return listTezosProjects(chain as TezosChain, config, options)
  }
  return listEvmProjects(chain as EvmChain, config, options)
}
