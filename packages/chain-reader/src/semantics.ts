import { type ResolverConfig, resolveUri } from "@whitehash/resolve"
import type { WhitehashToken } from "./types.js"

/**
 * Return the protocol-native render URI with the token seed applied.
 *
 * gentk v1 stores its seed separately in `iterationHash`; newer Tezos tokens
 * and EVM tokens already carry their render state in the artifact URI.
 */
export function renderArtifactUri(token: WhitehashToken): string | null {
  if (!token.artifactUri) return null
  if (token.iterationHash && !/[?#]/.test(token.artifactUri)) {
    return `${token.artifactUri}?fxhash=${encodeURIComponent(token.iterationHash)}`
  }
  return token.artifactUri
}

/** Resolve a token's live artwork URL for its chain. */
export function artworkUrl(token: WhitehashToken, resolver: ResolverConfig): string | null {
  const uri = renderArtifactUri(token)
  return uri ? resolveUri(uri, resolver, { chain: token.chain }) : null
}

/** Pick a protocol-native image URI, falling back to the other image size. */
export function imageSourceUri(
  token: WhitehashToken,
  prefer: "display" | "thumbnail" = "thumbnail",
): string | null {
  const first = prefer === "thumbnail" ? token.thumbnailUri : token.displayUri
  const second = prefer === "thumbnail" ? token.displayUri : token.thumbnailUri
  return first ?? second ?? null
}

/** Resolve the preferred token image URL for its chain. */
export function imageUrl(
  token: WhitehashToken,
  resolver: ResolverConfig,
  prefer: "display" | "thumbnail" = "thumbnail",
): string | null {
  const uri = imageSourceUri(token, prefer)
  return uri ? resolveUri(uri, resolver, { chain: token.chain }) : null
}

export type LiveViewStatus =
  | { kind: "ok"; url: string }
  | { kind: "unrevealed" }
  | { kind: "needs-onchfs" }
  | { kind: "unavailable" }

/** Explain whether a token can be rendered live and, if not, why. */
export function liveViewStatus(token: WhitehashToken, resolver: ResolverConfig): LiveViewStatus {
  if (!token.assigned) return { kind: "unrevealed" }
  const uri = renderArtifactUri(token)
  if (!uri) return { kind: "unavailable" }
  const url = resolveUri(uri, resolver, { chain: token.chain })
  if (url) return { kind: "ok", url }
  if (/^onchfs:\/\//i.test(uri) && !resolver.onchfs) {
    return { kind: "needs-onchfs" }
  }
  return { kind: "unavailable" }
}

/** True when the artwork is revealed and resolvable with this configuration. */
export function canRenderLive(token: WhitehashToken, resolver: ResolverConfig): boolean {
  return liveViewStatus(token, resolver).kind === "ok"
}

/** Stable identity for a token across every supported chain. */
export function tokenKey(token: WhitehashToken): string {
  return `${token.chain}/${token.contract}/${token.tokenId}`
}
