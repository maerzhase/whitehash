import { tokenRef, type TokenInput } from "./refs.js"
import {
  indexedProjectMetadata,
  isIndexedProjectMetadata,
  type IndexedProject,
} from "./project-index.js"
import type { WhitehashProject } from "./browse.js"
import type { WhitehashToken } from "./types.js"

export const TOKEN_INDEX_FORMAT = "whitehash-token-index@1" as const

export interface TokenIndex {
  format: typeof TOKEN_INDEX_FORMAT
  generatedAt: string
  /** Parent project metadata in the same shape used by project indexes. */
  project: IndexedProject
  token: WhitehashToken
}

export interface TokenIndexReader {
  getToken(input: TokenInput): Promise<WhitehashToken | null>
  getTokenProject?(token: WhitehashToken): Promise<WhitehashProject | null>
}

function projectNameFromToken(token: WhitehashToken): string | null {
  if (!token.name) return null
  const match = token.name.match(/^(.*?)\s+#\d+\s*$/u)
  return match?.[1]?.trim() || null
}

async function projectMetadata(
  reader: TokenIndexReader,
  token: WhitehashToken,
): Promise<IndexedProject> {
  if (reader.getTokenProject) {
    const project = await reader.getTokenProject(token)
    if (project) return indexedProjectMetadata(project)
  }

  // Every fxhash EVM project is its own token contract, so the collection
  // address is still useful when project metadata could not be loaded.
  const evmProjectId = token.chain.startsWith("eip155:") ? token.contract : null
  return {
    chain: token.chain,
    id: evmProjectId,
    name: projectNameFromToken(token),
    description: null,
    displayUri: token.displayUri,
    thumbnailUri: token.thumbnailUri,
    editions: null,
    minted: null,
    captureSettings: null,
  }
}

/** Read one token and package its complete normalized data as portable JSON. */
export async function buildTokenIndex(
  reader: TokenIndexReader,
  input: TokenInput,
  options: { generatedAt?: string } = {},
): Promise<TokenIndex> {
  const ref = tokenRef(input)
  const token = await reader.getToken(ref)
  if (!token) {
    throw new Error(`Token not found: ${ref.chain}/${ref.contract}/${ref.tokenId}`)
  }
  return {
    format: TOKEN_INDEX_FORMAT,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    project: await projectMetadata(reader, token),
    token,
  }
}

/** Validate JSON before handing its token to hooks or display components. */
export function parseTokenIndex(value: unknown): TokenIndex {
  if (!value || typeof value !== "object") throw new Error("Token index must be an object")
  const index = value as Partial<TokenIndex>
  if (index.format !== TOKEN_INDEX_FORMAT) {
    throw new Error(`Unsupported token index format: ${String(index.format)}`)
  }
  if (
    typeof index.generatedAt !== "string" ||
    !isIndexedProjectMetadata(index.project) ||
    !index.token ||
    typeof index.token.chain !== "string" ||
    typeof index.token.contract !== "string" ||
    typeof index.token.tokenId !== "string" ||
    !Array.isArray(index.token.attributes)
  ) {
    throw new Error("Token index is invalid")
  }
  return index as TokenIndex
}
