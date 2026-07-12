/**
 * Turn a token into the URLs the UI needs: the live artwork URL (for the
 * sandboxed iframe) and image URLs (for grid/detail previews). The token's
 * chain is threaded through so `onchfs://` artifacts route through the proxy
 * with the correct network.
 */
import { resolveUri, type ResolverConfig } from "@whitehash/resolve"
import type { WhitehashToken } from "@whitehash/chain-reader"

/**
 * The protocol-native render URI with the token's seed applied. Most fxhash
 * tokens (Tezos gentk v2/v3, EVM) already embed `?fxhash=...` in artifactUri,
 * but gentk v1 stores the seed only in `iterationHash` and expects the consumer
 * to append it — without this, a v1 piece renders a random iteration instead of
 * the one the token actually is.
 */
export function renderArtifactUri(token: WhitehashToken): string | null {
  if (!token.artifactUri) return null
  const uri = token.artifactUri
  if (token.iterationHash && !/[?#]/.test(uri)) {
    return `${uri}?fxhash=${encodeURIComponent(token.iterationHash)}`
  }
  return uri
}

export function artworkUrl(
  token: WhitehashToken,
  resolver: ResolverConfig,
): string | null {
  const uri = renderArtifactUri(token)
  if (!uri) return null
  return resolveUri(uri, resolver, { chain: token.chain })
}

export function imageUrl(
  token: WhitehashToken,
  resolver: ResolverConfig,
  prefer: "display" | "thumbnail" = "thumbnail",
): string | null {
  const first = prefer === "thumbnail" ? token.thumbnailUri : token.displayUri
  const second = prefer === "thumbnail" ? token.displayUri : token.thumbnailUri
  const uri = first ?? second
  if (!uri) return null
  return resolveUri(uri, resolver, { chain: token.chain })
}

/** True when the artwork can be shown live (revealed + resolvable). */
export function canRenderLive(token: WhitehashToken, resolver: ResolverConfig): boolean {
  if (!token.assigned) return false
  return artworkUrl(token, resolver) !== null
}

export function tokenKey(token: WhitehashToken): string {
  return `${token.chain}/${token.contract}/${token.tokenId}`
}
