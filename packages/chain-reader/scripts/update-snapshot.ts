/**
 * Regenerate the committed EVM collection snapshots by scanning `ProjectCreated`
 * events from each network's deploy block to head.
 *
 * Usage:
 *   pnpm --filter @whitehash/chain-reader snapshot:update            # all EVM nets
 *   pnpm --filter @whitehash/chain-reader snapshot:update eip155:8453
 *
 * This is a full historical scan and can take many minutes over public RPCs.
 * Run it periodically (or in CI on a cron) so the viewer only scans recent
 * blocks at load time.
 */
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { defaultResolverConfig } from "@whitehash/resolve"
import { discoverEvmCollections } from "../src/evm.js"
import { EVM_NETWORKS } from "../src/networks.js"
import type { ChainId } from "../src/types.js"

const here = dirname(fileURLToPath(import.meta.url))
const snapshotsDir = join(here, "..", "snapshots")

const arg = process.argv[2]
const chains = (arg ? [arg] : Object.keys(EVM_NETWORKS)) as Extract<ChainId, `eip155:${string}`>[]

const config = { resolver: defaultResolverConfig() }

for (const chain of chains) {
  if (!(chain in EVM_NETWORKS)) {
    console.error(`Unknown EVM chain: ${chain}`)
    process.exit(1)
  }
  console.log(`Scanning ${chain} from block ${EVM_NETWORKS[chain].deployBlock}...`)
  const started = Date.now()
  const snapshot = await discoverEvmCollections(chain, config)
  const file = join(snapshotsDir, `${chain.replace(":", "-")}.json`)
  writeFileSync(file, JSON.stringify(snapshot, null, 2) + "\n")
  console.log(
    `  ${snapshot.collections.length} collections, head ${snapshot.lastScannedBlock}, ` +
      `${((Date.now() - started) / 1000).toFixed(1)}s → ${file}`,
  )
}
