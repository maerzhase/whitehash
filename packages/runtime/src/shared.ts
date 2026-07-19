/** Minimal local replacement for the two runtime types formerly imported from ./shared.js. */
export enum BlockchainType {
  ETHEREUM = "ETHEREUM",
  BASE = "BASE",
  TEZOS = "TEZOS",
}

export type RawTokenFeatures = Record<string, unknown>
