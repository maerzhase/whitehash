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
  listing events. Mints are searched across every issuer generation, because fxhash
  consolidated older projects into the v2 ledger while their mint operations stayed on
  the contract they originally ran on.
- **Ethereum / Base** — sales and mints, but no active listings: fxhash EVM listings are
  off-chain signed Seaport orders, so the order book cannot be reconstructed from public
  data. Fills can. The backfill walks the collection's own ERC-721 transfers (Blockscout
  by default, trustless JSON-RPC log scan as fallback or via `source: "rpc"`) and decodes
  the logs in those transactions by event signature: Seaport `OrderFulfilled` for
  secondary sales (covering Seaport 1.5, 1.6, and other Seaport-based marketplaces such
  as OpenSea, but not non-Seaport venues), and the minters' `Purchase` for primary sales.
  Both carry the collection in an indexed topic, so no marketplace or minter address is
  hardcoded. Blockscout requests back off on rate limits; if it stays unavailable the RPC
  scan takes over, and that path needs an archive-capable endpoint (`config.evm.rpcs`).

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
backfill into an existing index.

`@whitehash/market/sqlite` converts the same index to and from a queryable SQLite file
with relational `events`, `orders`, and `stats` tables, plus the full JSON embedded for
lossless round-trips:

```ts
import { buildMarketSqlite, readMarketSqlite } from "@whitehash/market/sqlite"
```

It is a separate entry point on purpose. The converter carries a WebAssembly SQLite
build (sql.js, usable in Node and browsers), which has no business in a bundle that only
reads stats, so the main entry stays free of it.

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
- EVM floor/median/listed are `null`/`0` with `stats.listingsAvailable: false`.
- An EVM mint with no `Purchase` log is skipped rather than priced from the transaction
  value: owner mints, airdrops, ticket redemptions and ranked-auction settlements all
  arrive that way and carry no price on chain at that point. Ticket-based projects price
  the ticket, not the collection, so their mints are absent too.
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
