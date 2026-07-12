/**
 * IndexedDB cache of per-wallet token results, keyed by (mode, chain, address).
 * EVM lookups are slow over public RPCs, so caching makes repeat visits instant.
 */
import { del, get, set } from "idb-keyval"
import type { ChainId, WhitehashToken } from "@whitehash/chain-reader"

const VERSION = "v1"

export interface CachedResult {
  tokens: WhitehashToken[]
  cachedAt: number
}

function key(chain: ChainId, address: string): string {
  return `whitehash.tokens.${VERSION}.${chain}.${address.toLowerCase()}`
}

export async function readCache(
  chain: ChainId,
  address: string,
): Promise<CachedResult | undefined> {
  return (await get(key(chain, address))) as CachedResult | undefined
}

export async function writeCache(
  chain: ChainId,
  address: string,
  tokens: WhitehashToken[],
): Promise<void> {
  const payload: CachedResult = { tokens, cachedAt: Date.now() }
  await set(key(chain, address), payload)
}

export async function clearCache(chain: ChainId, address: string): Promise<void> {
  await del(key(chain, address))
}
