#!/usr/bin/env node
import { archiveWallets, verifyArchive } from "./archive.js"
import type { ChainId } from "@whitehash/chain-reader"

const CHAIN_ALIASES: Record<string, ChainId> = {
  tezos: "tezos:mainnet",
  ethereum: "eip155:1",
  eth: "eip155:1",
  base: "eip155:8453",
}

function usage(): never {
  throw new Error("Usage: whitehash-archive <address...> [--chains tezos,eip155:1,eip155:8453] [--out dir] [--limit n]")
}

function parseArgs(args: string[]): { addresses: string[]; chains?: ChainId[]; outDir: string; limit?: number } {
  const addresses: string[] = []
  let chains: ChainId[] | undefined
  let outDir = "whitehash-archive"
  let limit: number | undefined
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!
    if (arg === "--chains") {
      const value = args[++index] ?? usage()
      chains = value.split(",").map(item => CHAIN_ALIASES[item] ?? item as ChainId)
    } else if (arg === "--out") outDir = args[++index] ?? usage()
    else if (arg === "--limit") {
      limit = Number(args[++index] ?? usage())
      if (!Number.isInteger(limit) || limit < 1) usage()
    } else if (arg === "--verify") {
      const root = args[++index] ?? usage()
      void verifyArchive(root).then(result => console.log(`Verified ${result.tokens} tokens and ${result.files} files.`))
      return { addresses: [], outDir: root }
    } else if (arg.startsWith("-")) usage()
    else addresses.push(arg)
  }
  if (addresses.length === 0) usage()
  return { addresses, chains, outDir, limit }
}

const options = parseArgs(process.argv.slice(2))
if (options.addresses.length > 0) {
  archiveWallets({ ...options, onProgress: message => console.log(message) })
    .then(manifest => console.log(`Archived ${manifest.tokens.length} tokens to ${options.outDir}`))
    .catch(error => { console.error(error instanceof Error ? error.stack ?? error.message : error); process.exitCode = 1 })
}

export { archiveWallets, verifyArchive } from "./archive.js"
export { extractCar, writeExtractedCar } from "./car.js"
