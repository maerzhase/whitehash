# Build status

Progress against [PLAN.md](./PLAN.md). Updated 2026-07-12 (rev 2).

## Post-plan additions (rev 2)

- **Blockscout-first EVM** (replaces the plan's RPC-scan default): Blockscout is the EVM
  analog of TzKT — open-source, self-hostable, public instances. Wallet lookup on Base
  went from "3 tokens, bounded scan" to **all 133 tokens in ~23s cold** (instant from
  cache), including refreshing 79 stale mint-placeholder metadata entries from chain.
  Pure-RPC scan retained as trustless fallback (`evm.ownershipSource: "rpc"`). This also
  obsoletes the empty-snapshot problem: discovery reads the factory's full log history
  via Blockscout in a handful of requests.
- **Contract-first project browser**: `listProjects` / project-iteration listing for both
  chains (Tezos: issuer ledger big maps v0–v3 + name-prefix iteration matching; EVM:
  factory history + Blockscout instances), surfaced in the viewer at `#/browse` — chain
  tabs, issuer-era selector, project grid, per-project iteration grid, inline token
  detail. Data layer live-verified on both chains; UI verified by typecheck/build (the
  in-session browser tool disconnected before a visual pass — click through `#/browse`
  to confirm).

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
- **M9** client-side onchfs via a service worker — resolve `onchfs://` in-browser so onchfs
  artworks (many Ethereum/Base pieces) render with zero server setup, removing the need to
  run/point at `apps/onchfs-proxy`. Keep the HTTP proxy as fallback + for archive-cli. See
  PLAN §5 M9 for the approach and acceptance. Optional; the proxy + actionable in-app hint
  ("Stored on onchfs — set a proxy in Settings") is the current answer.

## Known follow-ups

- **EVM snapshots are empty bootstraps.** `packages/chain-reader/snapshots/*.json` have
  `collections: []`, so runtime EVM discovery currently scans from each network's deploy
  block (slow). Run `pnpm --filter @whitehash/chain-reader snapshot:update` (offline, with
  a good RPC) to populate them before real EVM use, and wire it into a CI cron (M8).
- The viewer bundle is ~466 kB (mostly viem); fine, but code-splitting the EVM path could
  cut Tezos-only first loads.
