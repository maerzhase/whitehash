# Build status

Progress against [PLAN.md](./PLAN.md). Updated 2026-07-12 (rev 4).

## ⤴ Reframe: whitehash is a toolkit, the app is its docs

Decided 2026-07-12: the final outcome is a **library/toolkit** integrators embed in their
own sites — a low-level framework-free API (layer 0), a headless React hooks API
(layer 1, `@whitehash/react`), and **`@whitehash/ui` as the single published design
system** (layer 2): the existing primitives (Button/Card/Dialog/…, the whitehash brand
look) PLUS the art-domain components (Artwork.*, TokenGrid, gallery blocks). The app
becomes `apps/docs`: dev docs + live showcase **assembled exclusively from
`@whitehash/ui`** — anything the docs need that the package lacks gets added to the
package, keeping the toolkit product fully consistent. `@whitehash/ui` ships dual
consumption: precompiled `styles.css` (no Tailwind needed) or `theme.css`+source for
Tailwind projects; retheming = overriding token variables. Full architecture, dependency
policy, and app→package extraction inventory: **PLAN §4.7**; sequencing: **M10 (react
hooks) → M11 (ui = full design system) → M12 (docs app) → M13 (publish readiness)**.
The data layer (resolve/chain-reader/proxy) is unchanged by this.

`pnpm build && pnpm check-types && pnpm test` all green (6 packages, 57 tests + 2 opt-in
live). Live/network tests: `WHITEHASH_LIVE_TEST=1 pnpm --filter @whitehash/chain-reader test`.

## Done — the core viewer works end-to-end

| Milestone | Status | Notes |
| --- | --- | --- |
| M0 scaffold | ✅ | pnpm + turbo + TS strict, changesets (private mode), CI, LICENSE+NOTICE |
| M1 `@whitehash/resolve` | ✅ | 26 tests. URI→URL, query/fragment preserved, chain-aware onchfs |
| M2 chain-reader / Tezos | ✅ | Live vs TzKT. Placeholder detection, big-map fallback |
| M3 chain-reader / EVM | ✅ | Live vs Base. Blockscout-first ownership (RPC scan fallback) |
| M4 onchfs-proxy | ✅ | Hono app; verified serving a real Base + ETH onchfs artwork over HTTP |
| M5 viewer | ✅ | Live in-browser: wallet grid, sandboxed render, browse, settings |

## Post-plan additions (beyond the original M0–M5 plan)

All live-verified in the browser unless noted.

- **Blockscout-first EVM** (replaces the plan's RPC-scan default). Blockscout is the EVM
  analog of TzKT — open-source, self-hostable, public instances. Base wallet lookup: all
  133 tokens in ~23s cold (instant from cache), refreshing stale mint-placeholder metadata
  from chain. Pure-RPC Transfer-log scan retained as trustless fallback
  (`evm.ownershipSource: "rpc"`, auto-fallback if Blockscout is down).
- **Contract-first project browser** (`#/browse`). `listProjects` + per-project iterations
  for both chains (Tezos: issuer ledgers v0–v3 + name-prefix iteration match; EVM: factory
  ProjectCreated history + Blockscout instances). Chain tabs, issuer-era selector, project
  grid, iteration grid, inline detail.
- **Sort ordering** (newest/oldest) on project lists and Tezos iteration lists. EVM
  iterations have a fixed Blockscout order, so the toggle is Tezos-only there.
- **EVM browser stale-metadata fix**. Blockscout caches metadata at mint time, so browser
  iterations showed "waiting to be signed" placeholders (no live view). The wallet path's
  tokenURI-refresh was extracted to a shared helper and applied to the browser path.
- **onchfs actionable messaging**. onchfs artworks with no proxy configured now show
  "Stored on onchfs — set a proxy in Settings" (linking there) instead of a dead
  "No live view available". `liveViewStatus()` distinguishes unrevealed / needs-proxy /
  unavailable. (Verified: with a proxy set, ETH "Genomes" renders live.)
- **Gateway-fallback images** (`<GatewayImage>`). Thumbnails/previews/stills advance to the
  next configured IPFS gateway on load *error*, instead of a broken tile. Caveat: catches
  error responses (404/429/5xx/refused), not indefinite hangs.
- **Editions available vs created**. `WhitehashProject` has `editions` (cap) + `minted`
  (created). Tezos: `supply` + `iterations_count` (fallback `supply − balance` pre-v3).
  EVM: `minted` from Blockscout ERC-721 total supply (cap not exposed on-chain). UI shows
  "N / M minted".
- **Logo + favicon** wired into the header and `index.html`.

## Verified facts discovered during implementation

- **FxGenArt721 is NOT ERC721Enumerable** (confirmed on-chain). Ownership uses Transfer
  logs / Blockscout, not `tokenOfOwnerByIndex`.
- **Keyless public RPCs cap `eth_getLogs` at ~10k blocks** → full-history in-browser RPC
  scans are impractical; Blockscout is the default answer, archive-RPC the fallback lever.
- **gentk v1 stores the seed in a separate `iterationHash` field**, not the artifactUri
  query. `renderArtifactUri` applies it so v1 pieces render their real iteration. v2/v3 and
  EVM embed the query already.
- **Many Ethereum/Base artworks are `onchfs://`** → the onchfs proxy (or future M9 SW) is
  required to view them live.
- **Some EVM projects' on-chain `tokenURI` points at `media.fxhash.xyz`** (contract baseURI
  set to fxhash's server, not IPFS). The artifact *inside* is still `ipfs://` so rendering
  is decentralized, but fetching that project's metadata JSON depends on fxhash infra — a
  gap in the "no fxhash infra" guarantee that's baked into the chain, not chosen by us.
  Possible follow-up: reconstruct an IPFS metadata path where one exists.

## Not yet built (from the plan)

Critical path after the reframe:

- **M10** layer sink + `@whitehash/react` — move token semantics (`render.ts`) down into
  chain-reader (+ `createWhitehashClient` facade); extract the app's hooks/provider/cache
  into a headless React package. PLAN §4.7.
- **M11** `@whitehash/ui` → full published design system — add domain components
  (compound `Artwork.*`, `TokenCard`/`TokenGrid`, blocks, `AddressSearch`/`WalletSearch`)
  to the primitives; dual-consumption build (precompiled styles.css / Tailwind source).
  PLAN §4.7.
- **M12** `apps/docs` — viewer becomes the docs/showcase site (per-API pages with live
  demos, theming reference, deploy guides; absorbs M8).
- **M13** publish readiness — package READMEs, exports-map audit, changesets flip;
  publishing itself stays a user decision.

Layer-0 packages, slot in when convenient:

- **M6** `@whitehash/runtime` — runtime controller for live param exploration /
  re-seeding (extraction map in PLAN §4.5); do before M11 if `Artwork.Explore` is wanted.
- **M7** `apps/archive-cli` — wallet → self-contained offline folder (PLAN §4.6).
- **M9** `@whitehash/onchfs-sw` — client-side onchfs via a service worker (PLAN §5 M9).

## Known follow-ups / smaller items

- **EVM snapshots are empty bootstraps** (`packages/chain-reader/snapshots/*.json`,
  `collections: []`). Only matters for the **RPC fallback** path now that Blockscout is the
  default — Blockscout reads full factory history directly. If hardening the RPC path,
  populate via `pnpm --filter @whitehash/chain-reader snapshot:update` (offline) + CI cron.
- **Gateway hangs** (vs. errors) aren't caught by `<GatewayImage>`; a fetch-with-timeout →
  blob approach would cover them. Low priority.
- Viewer bundle ~466 kB (mostly viem); code-splitting the EVM path would speed Tezos-only
  first loads.
- No git remote configured — repo is local-only; push when ready.

## Where things live (for a picking-up agent)

- **[PLAN.md](./PLAN.md)** — the full handoff spec: verified addresses/endpoints (§3),
  package specs (§4), milestones incl. M6–M9 (§5), open items (§6).
- **This file** — current state + what's left.
- Per-package READMEs (`packages/*/README.md`, `apps/*/README.md`) document each unit.
- Changesets in `.changeset/` record every change since init (private mode; not published).
- Commit history on `main` is the chronological record.
