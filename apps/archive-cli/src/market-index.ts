import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import {
  buildProjectIndex,
  createWhitehashClient,
  indexedProjectMetadata,
  parseRef,
  type ChainId,
  type ProjectRef,
} from "@whitehash/chain-reader"
import { isEvmChain, isTezosChain } from "@whitehash/core"
import {
  backfillEvmMarketEvents,
  backfillTezosMarketEvents,
  buildMarketIndex,
  parseMarketIndex,
  updateMarketIndex,
  type MarketIndex,
} from "@whitehash/market"
import { buildMarketSqlite } from "@whitehash/market/sqlite"
import { DEFAULT_IPFS_GATEWAYS } from "@whitehash/resolve"

export interface WriteMarketIndexOptions {
  project: string
  chain?: ChainId
  outFile: string
  /** Existing market index JSON to update incrementally from its cursors. */
  update?: string
  /** Skip the SQLite sibling artifact. */
  jsonOnly?: boolean
  /** EVM discovery source; omitted lets the backfill choose and fall back. */
  source?: "blockscout" | "rpc"
  gateways?: string[]
  onProgress?: (message: string) => void
}

export interface WriteMarketIndexResult {
  index: MarketIndex
  outFile: string
  sqliteFile: string | null
}

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n"
}

function sqlitePath(outFile: string): string {
  return outFile.replace(/\.json$/, "") + ".sqlite"
}

/**
 * Backfill a project's market history from public chain infrastructure and
 * write portable JSON (and SQLite) artifacts. Tezos projects get the full
 * order book, sales and mints; EVM collections get sales and mints but no
 * active listings, because fxhash EVM listings are off-chain signed orders that
 * public infrastructure cannot reconstruct.
 */
export async function writeMarketIndex(
  options: WriteMarketIndexOptions,
): Promise<WriteMarketIndexResult> {
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

  let existing: MarketIndex | null = null
  if (options.update) {
    if (options.update.endsWith(".sqlite")) {
      throw new Error("--update expects the JSON artifact, not the .sqlite sibling")
    }
    existing = parseMarketIndex(JSON.parse(await readFile(resolve(options.update), "utf8")))
    if (existing.project.chain !== ref.chain || existing.project.id !== ref.id) {
      throw new Error(
        `--update artifact is for ${existing.project.chain}/${existing.project.id}, ` +
          `not ${ref.chain}/${ref.id}`,
      )
    }
    options.onProgress?.(
      `Updating from cursor(s) ${JSON.stringify(existing.cursors)} (${existing.events.length} known events)`,
    )
  }
  const generatedAt = new Date().toISOString()
  const onProgress = (message: string) => options.onProgress?.(`  ${message}`)

  let index: MarketIndex
  if (isTezosChain(ref.chain)) {
    const projectIndex = await buildProjectIndex(client, ref, {
      onProgress: progress => {
        const total = progress.total === null ? "" : ` / ${progress.total}`
        onProgress(`tokens: ${progress.iterations}${total}`)
      },
    })
    const result = await backfillTezosMarketEvents(
      {
        chain: ref.chain,
        projectId: ref.id,
        tokens: projectIndex.iterations.map(iteration => ({
          contract: iteration.token.contract,
          tokenId: iteration.token.tokenId,
        })),
      },
      {
        config: client.config,
        sinceLevel: existing?.cursors[ref.chain]?.height,
        knownOrderIds: existing
          ? [...new Set(existing.events.flatMap(event => (event.orderId ? [event.orderId] : [])))]
          : undefined,
        onProgress,
      },
    )
    index = existing
      ? updateMarketIndex(existing, {
          events: result.events,
          cursors: { [ref.chain]: result.cursor },
          project: projectIndex.project,
          generatedAt,
        })
      : buildMarketIndex({
          project: projectIndex.project,
          events: result.events,
          cursors: { [ref.chain]: result.cursor },
          generatedAt,
        })
  } else if (isEvmChain(ref.chain)) {
    const project = await client.getProject(ref)
    if (!project) throw new Error(`Project not found: ${ref.chain}/${ref.id}`)
    if (!/^0x[0-9a-fA-F]{40}$/.test(ref.id)) {
      throw new Error(`EVM project id must be the collection contract address, got ${ref.id}`)
    }
    onProgress("EVM: sales and mints only, since fxhash listings there are signed off-chain")
    const result = await backfillEvmMarketEvents(
      { chain: ref.chain, contract: ref.id as `0x${string}` },
      {
        config: client.config,
        sinceBlock: existing?.cursors[ref.chain]?.height,
        source: options.source,
        onProgress,
      },
    )
    index = existing
      ? updateMarketIndex(existing, {
          events: result.events,
          cursors: { [ref.chain]: result.cursor },
          project: indexedProjectMetadata(project),
          generatedAt,
        })
      : buildMarketIndex({
          project: indexedProjectMetadata(project),
          events: result.events,
          cursors: { [ref.chain]: result.cursor },
          generatedAt,
        })
  } else {
    throw new Error(`Unsupported chain: ${ref.chain}`)
  }

  const outFile = resolve(options.outFile)
  await mkdir(dirname(outFile), { recursive: true })
  await writeFile(outFile, stringify(index))

  let sqliteFile: string | null = null
  if (!options.jsonOnly) {
    sqliteFile = sqlitePath(outFile)
    await writeFile(sqliteFile, await buildMarketSqlite(index))
  }
  return { index, outFile, sqliteFile }
}
