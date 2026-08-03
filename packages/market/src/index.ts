/**
 * @whitehash/market — on-demand fxhash market history indexing from public
 * chain infrastructure. Backfill a project's listings, offers, and sales
 * (TzKT on Tezos; collection transfers + Seaport fills on EVM), compute
 * fxhash-compatible statistics, and read/write portable JSON and SQLite
 * artifacts.
 */
export { TEZOS_MARKETPLACES, type TezosMarketplaceContracts } from "./contracts.js"
export {
  MARKET_EVENT_KINDS,
  isMarketEvent,
  mergeMarketEvents,
  type MarketEvent,
  type MarketEventKind,
  type Marketplace,
} from "./events.js"
export {
  VOLUME_SPANS,
  computeMarketStats,
  type ComputeMarketStatsOptions,
  type DailyMarketStat,
  type MarketStats,
  type OrderState,
  type OrderStatus,
  type VolumeBucket,
  type VolumeBuckets,
  type VolumeSpan,
} from "./stats.js"
export {
  MARKET_INDEX_FORMAT,
  buildMarketIndex,
  parseMarketIndex,
  updateMarketIndex,
  type BuildMarketIndexOptions,
  type MarketIndex,
  type MarketIndexCursor,
} from "./market-index.js"
export {
  backfillTezosMarketEvents,
  type TezosBackfillOptions,
  type TezosBackfillResult,
  type TezosBackfillTarget,
} from "./tezos-backfill.js"
export {
  backfillEvmMarketEvents,
  type EvmBackfillOptions,
  type EvmBackfillResult,
  type EvmBackfillTarget,
} from "./evm-backfill.js"
export { buildMarketSqlite, readMarketSqlite, type MarketSqliteOptions } from "./sqlite.js"
