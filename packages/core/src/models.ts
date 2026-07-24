import type { ChainId } from "./chains.js"

export interface ArtworkAttribute<Value = string> {
  name: string
  value: Value
}

/** A normalized token, uniform across supported chains. */
export interface WhitehashToken {
  chain: ChainId
  contract: string
  tokenId: string
  name: string | null
  description: string | null
  /** The token's fxhash seed (present once revealed/signed). */
  iterationHash: string | null
  /**
   * Protocol-native render URI, verbatim from metadata: `ipfs://` or
   * `onchfs://`, including its render query and fragment.
   */
  artifactUri: string | null
  /** High-quality preview image URI (protocol-native). */
  displayUri: string | null
  /** Thumbnail image URI (protocol-native). */
  thumbnailUri: string | null
  /** Generator code URI, without render params. */
  generatorUri: string | null
  /** Normalized attributes/features from every supported chain. */
  attributes: ArtworkAttribute[]
  /** False for placeholder/unrevealed tokens that have no real artwork yet. */
  assigned: boolean
  /** The protocol-native metadata URI the token points at, when known. */
  metadataUri: string | null
  /** Untouched source metadata JSON. */
  raw: unknown
}

/** Common shape returned by onchfs-js resolvers. */
export interface OnchfsResponse {
  status: number
  content: Uint8Array
  headers: Record<string, string>
}
