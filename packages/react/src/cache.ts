import { del, get, set } from "idb-keyval"
import type { ChainId, WhitehashToken } from "@whitehash/chain-reader"

const CACHE_VERSION = "v1"

export interface CachedWalletTokens {
  tokens: WhitehashToken[]
  cachedAt: number
}

/** Pluggable persistence used by `useWalletTokens`. */
export interface WhitehashCache {
  getWalletTokens(
    chain: ChainId,
    address: string,
  ): Promise<CachedWalletTokens | undefined>
  setWalletTokens(
    chain: ChainId,
    address: string,
    tokens: WhitehashToken[],
  ): Promise<void>
  deleteWalletTokens(chain: ChainId, address: string): Promise<void>
}

function cacheKey(chain: ChainId, address: string): string {
  return `whitehash.tokens.${CACHE_VERSION}.${chain}.${address.toLowerCase()}`
}

/** Browser IndexedDB adapter. This is the default when IndexedDB is present. */
export function createIndexedDbCache(): WhitehashCache {
  return {
    async getWalletTokens(chain, address) {
      return (await get(cacheKey(chain, address))) as CachedWalletTokens | undefined
    },
    async setWalletTokens(chain, address, tokens) {
      await set(cacheKey(chain, address), { tokens, cachedAt: Date.now() })
    },
    async deleteWalletTokens(chain, address) {
      await del(cacheKey(chain, address))
    },
  }
}

/** In-memory adapter for SSR, tests, or deliberately ephemeral sessions. */
export function createMemoryCache(): WhitehashCache {
  const entries = new Map<string, CachedWalletTokens>()
  return {
    async getWalletTokens(chain, address) {
      return entries.get(cacheKey(chain, address))
    },
    async setWalletTokens(chain, address, tokens) {
      entries.set(cacheKey(chain, address), { tokens, cachedAt: Date.now() })
    },
    async deleteWalletTokens(chain, address) {
      entries.delete(cacheKey(chain, address))
    },
  }
}

export function createDefaultCache(): WhitehashCache {
  return typeof globalThis.indexedDB === "undefined"
    ? createMemoryCache()
    : createIndexedDbCache()
}
