import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import {
  buildProjectIndex,
  createWhitehashClient,
  getEvmProjectTokensViaRpc,
  parseRef,
  type ChainId,
  type ProjectIndexReader,
  type ProjectIndex,
  type ProjectRef,
} from "@whitehash/chain-reader"
import { DEFAULT_IPFS_GATEWAYS } from "@whitehash/resolve"

export interface WriteProjectIndexOptions {
  project: string
  chain?: ChainId
  outFile: string
  pageSize?: number
  source?: "indexer" | "rpc"
  gateways?: string[]
  onProgress?: (message: string) => void
}

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n"
}

/** Discover every minted iteration and write a portable normalized JSON index. */
export async function writeProjectIndex(
  options: WriteProjectIndexOptions,
): Promise<ProjectIndex> {
  const serialized = /^(?:whitehash:\/\/)?\/?project\//.test(options.project)
  const ref: ProjectRef = serialized
    ? parseRef(options.project, "project")
    : options.chain
      ? { type: "project", chain: options.chain, id: options.project }
      : (() => {
          throw new Error("A chain is required when the project ID is not a serialized ref")
        })()
  if (options.chain && ref.chain !== options.chain) {
    throw new Error(`Project ref uses ${ref.chain}, but --chain selected ${options.chain}`)
  }
  const client = createWhitehashClient({
    resolver: {
      ipfsGateways: options.gateways ?? [...DEFAULT_IPFS_GATEWAYS],
      onchfs: null,
    },
  })
  let reader: ProjectIndexReader = client
  if (options.source === "rpc") {
    if (!ref.chain.startsWith("eip155:")) {
      throw new Error("--source rpc currently supports EVM project refs only")
    }
    const tokens = await getEvmProjectTokensViaRpc(
      ref.chain as Extract<ChainId, `eip155:${string}`>,
      ref.id,
      client.config,
      event => options.onProgress?.(`  ${event.message}`),
    )
    reader = {
      getProject: client.getProject,
      listProjectTokens: async (_input, page = {}) => {
        const ordered = page.order === "newest" ? [...tokens].reverse() : tokens
        const offset = page.cursor ? Number(page.cursor) : 0
        const limit = page.limit ?? 100
        const selected = ordered.slice(offset, offset + limit)
        const next = offset + limit < ordered.length ? String(offset + limit) : null
        return { tokens: selected, cursor: next }
      },
    }
  }
  const index = await buildProjectIndex(reader, ref, {
    pageSize: options.pageSize,
    onProgress: progress => {
      const total = progress.total === null ? "" : ` / ${progress.total}`
      options.onProgress?.(
        `  page ${progress.pages}: ${progress.iterations}${total} iterations`,
      )
    },
  })
  const outFile = resolve(options.outFile)
  await mkdir(dirname(outFile), { recursive: true })
  await writeFile(outFile, stringify(index))
  return index
}
