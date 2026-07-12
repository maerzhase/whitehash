# Build status

Progress against [PLAN.md](./PLAN.md). Updated 2026-07-12.

## Done (M0–M5) — the core viewer works end-to-end

| Milestone | Status | Notes |
| --- | --- | --- |
| M0 scaffold | ✅ | pnpm + turbo + TS strict, changesets (private mode), CI, LICENSE+NOTICE |
| M1 `@whitehash/resolve` | ✅ | 26 tests. URI→URL, query/fragment preserved, chain-aware onchfs |
| M2 chain-reader / Tezos | ✅ | Verified live vs TzKT. Placeholder detection, big-map fallback |
| M3 chain-reader / EVM | ✅ | Verified live vs Base. Transfer-log ownership + `ownerOf` confirm |
| M4 onchfs-proxy | ✅ | Hono app; verified serving a real Base onchfs artwork over HTTP |
| M5 viewer | ✅ | Verified live in-browser: 133 real Tezos tokens, live sandboxed render |

`pnpm build && pnpm check-types && pnpm test` all green (6 packages).
Live/network tests are opt-in: `WHITEHASH_LIVE_TEST=1 pnpm --filter @whitehash/chain-reader test`.

## Verified facts discovered during implementation

- **FxGenArt721 is NOT ERC721Enumerable** (confirmed on-chain). Ownership uses Transfer
  logs, not `tokenOfOwnerByIndex`.
- **Keyless public RPCs cap `eth_getLogs` at ~10k blocks.** Full-history EVM scans are
  impractical in-browser over public RPCs → chosen strategy (per user): archive-RPC +
  IndexedDB caching, with an optional archive RPC field in viewer settings. Tezos is
  unaffected (TzKT is one query).
- **gentk v1 stores the seed in a separate `iterationHash` field**, not the artifactUri
  query. The viewer applies it (`renderArtifactUri`) so v1 pieces render their real
  iteration, not a random one. v2/v3 and EVM embed the query already.
- **Many Base artworks are `onchfs://`** → the onchfs proxy is required to view them.

## Not yet built (M6–M8)

- **M6** `@whitehash/runtime` — extract fxhash runtime controller for live param
  exploration / re-seeding (extraction map in PLAN §4.5). Not required for viewing.
- **M7** `apps/archive-cli` — download a wallet's artworks to an offline folder (PLAN §4.6).
- **M8** deploy docs — GitHub Pages / IPFS guide, Vercel proxy button, snapshot-refresh cron.

## Known follow-ups

- **EVM snapshots are empty bootstraps.** `packages/chain-reader/snapshots/*.json` have
  `collections: []`, so runtime EVM discovery currently scans from each network's deploy
  block (slow). Run `pnpm --filter @whitehash/chain-reader snapshot:update` (offline, with
  a good RPC) to populate them before real EVM use, and wire it into a CI cron (M8).
- The viewer bundle is ~466 kB (mostly viem); fine, but code-splitting the EVM path could
  cut Tezos-only first loads.
