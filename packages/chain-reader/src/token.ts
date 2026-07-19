import { buildEvmTokensRefreshingStale } from "./blockscout.js"
import { normalizeMetadata } from "./metadata.js"
import { isEvmChain, isTezosChain, TEZOS_NETWORKS } from "./networks.js"
import type { TokenRef } from "./refs.js"
import type { ChainReaderConfig, WhitehashToken } from "./types.js"

/** Universal direct token read used by typed refs and paste-anything navigation. */
export async function getToken(ref: TokenRef, config: ChainReaderConfig): Promise<WhitehashToken | null> {
  if (isEvmChain(ref.chain)) {
    const [token] = await buildEvmTokensRefreshingStale(ref.chain, config, [
      { contract: ref.contract, tokenId: ref.tokenId, metadata: null },
    ])
    return token ?? null
  }
  if (!isTezosChain(ref.chain)) return null
  const base = (config.tzkt?.[ref.chain] ?? TEZOS_NETWORKS[ref.chain].defaultTzktBaseUrl).replace(/\/+$/, "")
  const url = `${base}/v1/tokens?contract=${encodeURIComponent(ref.contract)}&tokenId=${encodeURIComponent(ref.tokenId)}&limit=1`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`TzKT HTTP ${response.status} for token ${ref.tokenId}`)
  const [value] = await response.json() as Array<{ metadata?: Record<string, unknown> | null }>
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
