---
"@whitehash/market": minor
"@whitehash/chain-reader": minor
"@whitehash/react": minor
"@whitehash/ui": minor
"@whitehash/archive": minor
---

Add on-demand per-project market history indexing, and the parts to display it.

`@whitehash/market` backfills a project's listings, offers, sales, and mints from
public infrastructure (TzKT on Tezos; Blockscout/RPC Seaport fills on EVM,
secondary sales only), computes fxhash-compatible statistics, and reads/writes
portable `whitehash-market-index@1` artifacts with resume cursors. The SQLite
converter is a separate `@whitehash/market/sqlite` entry point, so a bundle that
only reads stats never pulls in its WebAssembly SQLite build.

`@whitehash/ui` gains the `MarketStats` compound (tiles, floor and volume charts,
event history) and `@whitehash/react` gains `useMarketIndex` for loading an
artifact from a URL. The archive CLI gains a `market` command with incremental
`--update` runs and live single-line progress.

`@whitehash/chain-reader` newly exports the `tzktFetch`, `tzktBaseUrl`,
`bsFetch`, `blockscoutBaseUrl`, `getLogsAdaptive`, `makeEvmPublicClient`,
`indexedProjectMetadata`, and `isIndexedProjectMetadata` primitives, and
Blockscout requests now back off on rate limits instead of giving up.
