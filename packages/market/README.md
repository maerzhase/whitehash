# @whitehash/market

On-demand fxhash market history indexing from public chain infrastructure. Backfill one
project's listings, offers, collection offers, sales, and mints; compute fxhash-compatible
statistics; and read or write portable JSON and SQLite artifacts — with no indexer, no
database server, and no fxhash-hosted endpoint.

```bash
npm install @whitehash/market
```

Most users want the CLI instead:

```bash
npx @whitehash/archive market v2:13944
```

That writes `market-index-v2-13944.json` and `market-index-v2-13944.sqlite`, and
`--update <existing.json>` extends an artifact incrementally from its saved cursors.

## What it reads

- **Tezos** — the fxhash marketplace v1 and v2 contracts via the public TzKT API.
  Order data is decoded from each operation's inline big-map diffs, exactly like the
  fxhash indexer does, so listings, cancels, accepts, offers, collection offers, and
  issuer mints are all recovered. Marketplace v1's on-chain "offers" are normalized to
  listing events.
- **Ethereum / Base** — secondary sales only. fxhash EVM listings are off-chain signed
  Seaport orders, so the active order book cannot be reconstructed from public data;
  fills can. The backfill walks the collection's own ERC-721 transfers (Blockscout by
  default, trustless JSON-RPC log scan as fallback or via `source: "rpc"`), decodes
  Seaport `OrderFulfilled` events in the same transactions by event signature (covering
  Seaport 1.5, 1.6, and other Seaport-based marketplaces such as OpenSea — but not
  non-Seaport venues), and reconstructs the price from the order's payment items.
  EVM mints (primary volume) are not indexed in this version. Blockscout requests
  back off on rate limits; if it stays unavailable the RPC scan takes over, and
  that path needs an archive-capable endpoint (`config.evm.rpcs`).

## Statistics

`computeMarketStats` follows the fxhash marketstats definitions: floor, median, and
listed count come from listings active at the observation time; volumes are cumulative
primary/secondary buckets over all/24h/2d/7d/14d/30d/60d; period changes compare a span
against the span immediately before it; floor changes replay listing lifecycles at
t−24h/7d/30d. A daily floor/volume series is included for charting.

Deviations from fxhash, by design: highest/lowest sale compare native base units (no
historical fiat rates), and mint volume records the tez actually paid rather than the
pricing-contract price.

## Artifacts

`buildMarketIndex` produces a single `whitehash-market-index@1` JSON document — project
summary, normalized events ascending by level, derived stats, and per-chain resume
cursors. `parseMarketIndex` validates untrusted JSON; `updateMarketIndex` merges a fresh
backfill into an existing index. `buildMarketSqlite`/`readMarketSqlite` convert the same
index to and from a queryable SQLite file (via sql.js — pure WebAssembly, usable in Node
and browsers) with relational `events`, `orders`, and `stats` tables plus the full JSON
embedded for lossless round-trips.

## Programmatic use

```ts
import {
  backfillTezosMarketEvents,
  buildMarketIndex,
  computeMarketStats,
} from "@whitehash/market"

const { events, cursor } = await backfillTezosMarketEvents({
  chain: "tezos:mainnet",
  projectId: "v2:13944",
  tokens, // from @whitehash/chain-reader's buildProjectIndex
})
const index = buildMarketIndex({
  project,
  events,
  cursors: { "tezos:mainnet": cursor },
})
console.log(index.stats.floor, index.stats.volume.total.all)
```

## Limitations

- Tezos token discovery reuses the project index's name-prefix strategy; iterations TzKT
  has not indexed metadata for are not covered.
- EVM floor/median/listed are `null`/`0` with `stats.listingsAvailable: false`, and EVM
  artifacts contain no mints, so their primary volume is always zero.
- EVM discovery starts at the fxhash factory deploy block; collections older than the
  factory would lose earlier history.
- Tezos v3 ticket-based mints record a price of 0 (the payment happened at ticket
  purchase), slightly undercounting primary volume for ticketed projects.
- Tezos marketplace v3 traded only fxhash articles and is intentionally not indexed.
- All prices are native base units (mutez/wei) as decimal strings; no fiat conversion.
- Seaport bundle orders attribute the full payment to the first collection token in the
  order; sibling tokens in the same bundle produce no event.
- Only Seaport fills are decoded. Sales settled on non-Seaport venues are absent, and
  zero-payment NFT-for-NFT barters are skipped rather than counted as sales.
