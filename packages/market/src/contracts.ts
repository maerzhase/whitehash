/**
 * fxhash marketplace contract registry and indexing safety constants.
 *
 * Addresses are copied from the fxhash monorepo config (MIT). Marketplace v3
 * is deliberately absent: on-chain it only ever traded fxhash articles, not
 * gentk projects.
 */
import { TEZOS_NETWORKS } from "@whitehash/chain-reader"
import type { TezosChainId } from "@whitehash/core"

export interface TezosMarketplaceContracts {
  /** First-generation marketplace; listings were called "offers" on-chain. */
  v1: string
  /** Second-generation marketplace: listings, offers, collection offers, auctions. */
  v2: string
}

export const TEZOS_MARKETPLACES: Record<TezosChainId, TezosMarketplaceContracts> = {
  "tezos:mainnet": {
    v1: "KT1Xo5B7PNBAeynZPmca4bRh6LQow4og1Zb9",
    v2: "KT1GbyoDi7H1sfXmimXpptZJuCdHMh66WS9u",
  },
  "tezos:ghostnet": {
    v1: "KT1DbivePcuUzCp5RaAQWxPSLV9G2Ys4faUR",
    v2: "KT1HFYtf4vNCr4xRDZxLKc5asUdCsPUTTW9R",
  },
}

/** Ignore EVM blocks this close to head; matches the fxhash indexer's finality rule. */
export const EVM_FINALITY_BUFFER = 100

/** Ignore Tezos levels this close to head; matches the fxhash indexer's reorg rule. */
export const TEZOS_REORG_BUFFER = 2

/**
 * Resolve a marketplace-v2 `gentk.version` ("0" | "1" | "2") to the gentk FA2
 * contract holding that token generation.
 */
export function gentkContractForVersion(chain: TezosChainId, version: string): string | null {
  const index = Number(version)
  if (!Number.isInteger(index) || index < 0) return null
  return TEZOS_NETWORKS[chain].gentkContracts[index] ?? null
}

/** Inverse of {@link gentkContractForVersion}. */
export function gentkVersionForContract(chain: TezosChainId, contract: string): string | null {
  const index = TEZOS_NETWORKS[chain].gentkContracts.indexOf(contract)
  return index === -1 ? null : String(index)
}
