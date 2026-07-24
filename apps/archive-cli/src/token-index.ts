import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import {
  buildTokenIndex,
  createWhitehashClient,
  type ChainId,
  type TokenIndex,
} from "@whitehash/chain-reader"
import { DEFAULT_IPFS_GATEWAYS } from "@whitehash/resolve"

export interface WriteTokenIndexOptions {
  chain: ChainId
  contract: string
  tokenId: string
  outFile: string
  gateways?: string[]
}

/** Read one token and write its display-ready metadata as portable JSON. */
export async function writeTokenIndex(
  options: WriteTokenIndexOptions,
): Promise<TokenIndex> {
  const client = createWhitehashClient({
    resolver: {
      ipfsGateways: options.gateways ?? [...DEFAULT_IPFS_GATEWAYS],
      onchfs: null,
    },
  })
  const index = await buildTokenIndex(client, {
    chain: options.chain,
    contract: options.contract,
    tokenId: options.tokenId,
  })
  const outFile = resolve(options.outFile)
  await mkdir(dirname(outFile), { recursive: true })
  await writeFile(outFile, JSON.stringify(index, null, 2) + "\n")
  return index
}
