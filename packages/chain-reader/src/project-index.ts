import type { ListOrder, WhitehashProject } from "./browse.js"
import { type ProjectInput, type ProjectRef, projectRef } from "./refs.js"
import type { WhitehashToken } from "./types.js"

export const PROJECT_INDEX_FORMAT = "whitehash-project-index@1" as const

/** Project metadata shared by project and token index files. */
export interface IndexedProject {
  chain: WhitehashProject["chain"]
  /** Null when a token's metadata does not expose its parent project ID. */
  id: string | null
  name: string | null
  description: string | null
  displayUri: string | null
  thumbnailUri: string | null
  editions: number | null
  minted: number | null
  captureSettings: WhitehashProject["captureSettings"]
}
export interface IndexedIteration {
  /** One-based position in the requested project ordering. */
  position: number
  token: WhitehashToken
}

/**
 * Static, portable output produced from public chain infrastructure.
 *
 * The index carries normalized display metadata so consumers can render an
 * iteration immediately. Original token metadata is preserved because fields
 * not normalized yet (including some fx(params) definitions) can be required
 * by runtimes. `contract + tokenId` remains the canonical identity and can be
 * passed to `getToken()` whenever fresh chain data is required.
 */
export interface ProjectIndex {
  format: typeof PROJECT_INDEX_FORMAT
  generatedAt: string
  order: ListOrder
  project: IndexedProject
  iterations: IndexedIteration[]
  /** True when discovery reached the end rather than a configured page cap. */
  complete: boolean
  /** Opaque continuation cursor when `complete` is false. */
  nextCursor: string | null
}

export interface ProjectIndexReader {
  getProject(input: ProjectInput): Promise<WhitehashProject | null>
  listProjectTokens(
    input: ProjectInput,
    options?: { cursor?: string | null; limit?: number; order?: ListOrder },
  ): Promise<{ tokens: WhitehashToken[]; cursor: string | null }>
}

export interface BuildProjectIndexOptions {
  order?: ListOrder
  pageSize?: number
  maxPages?: number
  generatedAt?: string
  onProgress?: (progress: {
    project: ProjectRef
    pages: number
    iterations: number
    total: number | null
  }) => void
}

export function indexedProjectMetadata(project: WhitehashProject): IndexedProject {
  const { raw: _raw, ...indexed } = project
  return indexed
}

function nullableString(value: unknown): boolean {
  return value === null || typeof value === "string"
}

function nullableNumber(value: unknown): boolean {
  return value === null || typeof value === "number"
}

/** Validate the project summary shared by every portable index format. */
export function isIndexedProjectMetadata(value: unknown): value is IndexedProject {
  if (!value || typeof value !== "object") return false
  const project = value as Partial<IndexedProject>
  return (
    typeof project.chain === "string" &&
    nullableString(project.id) &&
    nullableString(project.name) &&
    nullableString(project.description) &&
    nullableString(project.displayUri) &&
    nullableString(project.thumbnailUri) &&
    nullableNumber(project.editions) &&
    nullableNumber(project.minted) &&
    (project.captureSettings === null ||
      (typeof project.captureSettings === "object" &&
        typeof project.captureSettings.mode === "string"))
  )
}

function positiveInteger(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Expected a positive integer, received ${value}`)
  }
  return value
}

/**
 * Discover a project's iterations page-by-page and collapse them into one
 * deterministic JSON-ready index.
 */
export async function buildProjectIndex(
  reader: ProjectIndexReader,
  input: ProjectInput,
  options: BuildProjectIndexOptions = {},
): Promise<ProjectIndex> {
  const ref = projectRef(input)
  const order = options.order ?? "oldest"
  const pageSize = positiveInteger(options.pageSize, 100)
  const maxPages = positiveInteger(options.maxPages, 10_000)
  const project = await reader.getProject(ref)
  if (!project) throw new Error(`Project not found: ${ref.chain}/${ref.id}`)

  const discovered = new Map<string, WhitehashToken>()
  const cursors = new Set<string>()
  let cursor: string | null = null
  let pages = 0

  do {
    if (pages >= maxPages) break
    if (cursor !== null) {
      if (cursors.has(cursor)) throw new Error(`Project iteration cursor repeated: ${cursor}`)
      cursors.add(cursor)
    }
    const page = await reader.listProjectTokens(ref, { cursor, limit: pageSize, order })
    for (const token of page.tokens) {
      const key = `${token.chain}/${token.contract.toLowerCase()}/${token.tokenId}`
      discovered.set(key, token)
    }
    cursor = page.cursor
    pages += 1
    options.onProgress?.({
      project: ref,
      pages,
      iterations: discovered.size,
      total: project.minted,
    })
  } while (cursor !== null)

  const iterations = [...discovered.values()].map((token, index) => ({
    position: index + 1,
    token,
  }))

  return {
    format: PROJECT_INDEX_FORMAT,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    order,
    project: indexedProjectMetadata(project),
    iterations,
    complete: cursor === null,
    nextCursor: cursor,
  }
}

/** Validate untrusted JSON before using it as a project iteration index. */
export function parseProjectIndex(value: unknown): ProjectIndex {
  if (!value || typeof value !== "object") throw new Error("Project index must be an object")
  const index = value as Partial<ProjectIndex>
  if (index.format !== PROJECT_INDEX_FORMAT) {
    throw new Error(`Unsupported project index format: ${String(index.format)}`)
  }
  if (!index.project || typeof index.project !== "object") {
    throw new Error("Project index is missing its project")
  }
  if (
    !isIndexedProjectMetadata(index.project) ||
    typeof index.generatedAt !== "string" ||
    typeof index.complete !== "boolean" ||
    (index.nextCursor !== null && typeof index.nextCursor !== "string")
  ) {
    throw new Error("Project index header is invalid")
  }
  if (!Array.isArray(index.iterations)) throw new Error("Project index iterations must be an array")
  if (index.order !== "oldest" && index.order !== "newest") {
    throw new Error(`Unsupported project index order: ${String(index.order)}`)
  }
  for (const [arrayIndex, iteration] of index.iterations.entries()) {
    if (
      !iteration ||
      iteration.position !== arrayIndex + 1 ||
      !iteration.token ||
      typeof iteration.token.chain !== "string" ||
      typeof iteration.token.contract !== "string" ||
      typeof iteration.token.tokenId !== "string" ||
      !Array.isArray(iteration.token.attributes)
    ) {
      throw new Error(`Invalid project index iteration at position ${arrayIndex + 1}`)
    }
  }
  return index as ProjectIndex
}
