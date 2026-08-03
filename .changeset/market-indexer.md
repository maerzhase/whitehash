---
"@whitehash/market": patch
"@whitehash/chain-reader": patch
"@whitehash/react": patch
"@whitehash/ui": patch
"@whitehash/archive": patch
---

Add on-demand per-project market history indexing, and the parts to display it.

`@whitehash/market` backfills a project's listings, offers, sales, and mints from
public infrastructure: TzKT on Tezos, and on Ethereum and Base the collection's
own transfers plus the Seaport and minter logs in those transactions, matched by
event signature so no marketplace or minter address is hardcoded. Active listings
are unavailable on EVM, where fxhash listings are signed off-chain. It computes
fxhash-compatible statistics and reads/writes portable
`whitehash-market-index@1` artifacts with resume heights. The SQLite converter is
a separate `@whitehash/market/sqlite` entry point, so a bundle that only reads
stats never pulls in its WebAssembly SQLite build.

Tezos token discovery is exact: it reads the project's gentk mint operations,
which record `issuer_id` and `token_id`, so the token set is every token the
project minted on whichever gentk contract it landed, rather than iterations
whose names match a prefix.

`@whitehash/ui` gains the `MarketStats` compound (tiles, floor and volume charts,
event history; its event table labels the two parties Seller and Buyer, since
most rows are order lifecycle rather than a transfer) and `@whitehash/react` gains `useMarketIndex`, which loads an
artifact from a URL, from a keyed loader for any other transport, or from an
index already in memory. The archive CLI gains a `market` command with incremental
`--update` runs, live single-line progress, and `--resolver fxhash` for project
slugs. An unknown subcommand now reports itself instead of being parsed as a
wallet address.

`@whitehash/chain-reader` newly exports the `tzktFetch`, `tzktBaseUrl`,
`bsFetch`, `blockscoutBaseUrl`, `getLogsAdaptive`, `makeEvmPublicClient`,
`indexedProjectMetadata`, and `isIndexedProjectMetadata` primitives, and
Blockscout requests now back off on rate limits instead of giving up.
