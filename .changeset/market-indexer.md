---
"@whitehash/market": minor
"@whitehash/chain-reader": minor
"@whitehash/archive": minor
---

Add on-demand per-project market history indexing. The new `@whitehash/market`
package backfills a project's listings, offers, sales, and mints from public
infrastructure (TzKT on Tezos; Blockscout/RPC Seaport fills on EVM, secondary
sales only), computes fxhash-compatible statistics, and reads/writes portable
`whitehash-market-index@1` JSON and SQLite artifacts with resume cursors. The
archive CLI gains a `market` command with incremental `--update` runs and live
single-line progress reporting on a terminal.
`@whitehash/chain-reader` newly exports the `tzktFetch`, `tzktBaseUrl`,
`bsFetch`, `blockscoutBaseUrl`, `getLogsAdaptive`, `makeEvmPublicClient`,
`indexedProjectMetadata`, and `isIndexedProjectMetadata` primitives, and
Blockscout requests now fail fast on non-retryable HTTP errors instead of
retrying 4xx responses.
