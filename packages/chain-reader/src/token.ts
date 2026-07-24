import { buildEvmTokensRefreshingStale } from "./blockscout.js"
import { normalizeMetadata } from "./metadata.js"
import { isEvmChain, isTezosChain, TEZOS_NETWORKS } from "./networks.js"
import type { ProjectRef, TokenRef } from "./refs.js"
import type { ChainReaderConfig, WhitehashToken } from "./types.js"

/**
 * Recover candidate Tezos issuer projects from the gentk token_data big map.
 * Project IDs overlap across issuer versions, so callers should confirm the
 * candidate against the token/project name.
 */
export async function getTezosTokenProjectRefs(
  token: WhitehashToken,
  config: ChainReaderConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ProjectRef[]> {
  if (!isTezosChain(token.chain)) return []
  const network = TEZOS_NETWORKS[token.chain]
  if (!network.gentkContracts.includes(token.contract)) return []
  const base = (config.tzkt?.[token.chain] ?? network.defaultTzktBaseUrl).replace(/\/+$/, "")
  const url =
    `${base}/v1/contracts/${token.contract}/bigmaps/token_data/keys/` +
    encodeURIComponent(token.tokenId)
  const response = await fetchImpl(url)
  if (!response.ok) return []
  const value = (await response.json()) as { value?: { issuer_id?: string | number } }
  const issuerId = value.value?.issuer_id
  if (issuerId === undefined || issuerId === null) return []
  return network.issuerContracts.map(issuer => ({
    type: "project" as const,
    chain: token.chain,
    id: `${issuer.version}:${String(issuerId)}`,
  }))
}

/** Universal direct token read used by typed refs and paste-anything navigation. */
export async function getToken(
  ref: TokenRef,
  config: ChainReaderConfig,
): Promise<WhitehashToken | null> {
  if (isEvmChain(ref.chain)) {
    const [token] = await buildEvmTokensRefreshingStale(ref.chain, config, [
      { contract: ref.contract, tokenId: ref.tokenId, metadata: null },
    ])
    return token ?? null
  }
  if (!isTezosChain(ref.chain)) return null
  const base = (config.tzkt?.[ref.chain] ?? TEZOS_NETWORKS[ref.chain].defaultTzktBaseUrl).replace(
    /\/+$/,
    "",
  )
  const url = `${base}/v1/tokens?contract=${encodeURIComponent(ref.contract)}&tokenId=${encodeURIComponent(ref.tokenId)}&limit=1`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`TzKT HTTP ${response.status} for token ${ref.tokenId}`)
  const [value] = (await response.json()) as Array<{ metadata?: Record<string, unknown> | null }>
  if (!value) return null
  const metadata = normalizeMetadata(value.metadata ?? {})
  return {
    chain: ref.chain,
    contract: ref.contract,
    tokenId: ref.tokenId,
    name: metadata.name,
    description: metadata.description,
    iterationHash: metadata.iterationHash,
    artifactUri: metadata.artifactUri,
    displayUri: metadata.displayUri,
    thumbnailUri: metadata.thumbnailUri,
    generatorUri: metadata.generatorUri,
    attributes: metadata.attributes,
    assigned: metadata.assigned,
    metadataUri: null,
    raw: value.metadata ?? null,
  }
}
