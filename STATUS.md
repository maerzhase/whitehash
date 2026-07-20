# Build status

Progress against [PLAN.md](./PLAN.md). Updated 2026-07-20 (rev 13).

## M15 complete — the offer, sharpened

Done 2026-07-20 (PLAN §4.9). The docs now lead with the value proposition and expose a
transparency layer:
- **Positioning**: home hero is "Display any fxhash token. The easy way." + "jumps every
  hoop so you just show the art." A home teaser answers the three integrator questions,
  each one click from the landing (`/understand/urls`, `/understand/sources`,
  `/understand/data-model`).
- **Understand section** (`apps/docs/src/understand-content.tsx`, 5 static routes): a
  "What whitehash handles for you" hoops table; a data-model reference with field-level
  provenance + nullability; a "Where the data comes from" page listing every Tezos and
  EVM contract address (verifiable on-chain); an interactive "How URLs are built" page
  (runs the real `resolveUri`); and a glossary mapping whitehash ↔ fxhash ↔ on-chain.
- **IA restructured** to Start / Understand / API (hooks·primitives·domain·blocks) /
  Guides. Verified: nav renders the new groups, all 5 understand routes prerender (45
  static pages total), banned-synonym/jargon grep clean, gates green.

The full plan (M0–M15) is now implemented. Remaining is the maintainer publish decision
(still gated) and the post-M15 web-component stretch.

<details><summary>Original M15 brief</summary>

Added 2026-07-20 (PLAN §4.9): reposition everything around the core value proposition —
**whitehash makes fxhash tokens easy to access and display, anywhere** — with radical
transparency about the hoops it jumps. Deliverables: a "what whitehash handles for you"
hoops table; three Understand pages (data-model reference with field-level provenance;
where the data/contract addresses come from — every `networks.ts` address listed and
verifiable; how URLs are constructed — interactive anatomy via `resolveInput` if
feasible); a glossary enforcing one fxhash-aligned vocabulary (project / token /
iteration / seed / artifact); docs IA restructured into Start / Understand / API /
Guides with a strict per-API page template; landing de-noised. Acceptance: the
three-questions one-click test, vocabulary grep, fresh-agent value-prop readback,
gates green.

</details>

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

`pnpm build && pnpm check-types && pnpm test` all green (9 workspaces, 80 tests + 2
opt-in live). Live/network tests:
`WHITEHASH_LIVE_TEST=1 pnpm --filter @whitehash/chain-reader test`.

## Done — the core viewer works end-to-end

| Milestone | Status | Notes |
| --- | --- | --- |
| M0 scaffold | ✅ | pnpm + turbo + TS strict, changesets (private mode), CI, LICENSE+NOTICE |
| M1 `@whitehash/resolve` | ✅ | 26 tests. URI→URL, query/fragment preserved, chain-aware onchfs |
| M2 chain-reader / Tezos | ✅ | Live vs TzKT. Placeholder detection, big-map fallback |
| M3 chain-reader / EVM | ✅ | Live vs Base. Blockscout-first ownership (RPC scan fallback) |
| M4 onchfs-proxy | ✅ | Hono app; verified serving a real Base + ETH onchfs artwork over HTTP |
| M5 viewer | ✅ | Live in-browser: wallet grid, sandboxed render, browse, settings |
| M10 layer sink + React | ✅ | Token semantics + bound client in L0; provider, cache, hooks in `@whitehash/react`; app-local copies removed |
| M11 full design system | ✅ | Compound domain components + gallery/search blocks in `@whitehash/ui`; precompiled and Tailwind-v4 consumption verified |
| M12 docs app | ✅ | `apps/docs` is a static docs-first site built exclusively from `@whitehash/ui`, with live API pages, guides, and showcases |
| M13 publish readiness | ✅ | READMEs/API tables, semver policy, ESM/style/source exports, Changesets, and packed artifacts audited; nothing published |
| M14 API ergonomics | ✅ | Five-scenario quickstart independently built; typed refs/universal client surface; chain-named/card seams removed |
| M6 runtime | ✅ | Framework-free core + `/react`; injected resolution; live params/new-hash variations acceptance passed |
| M9 client-side onchfs | ✅ | Same-origin worker; Genomes rendered from ETH with no proxy, then reloaded from Cache API with the server stopped |
| M7 archive CLI | ✅ | Known wallet archived through verified IPFS CAR; all local refs/hashes passed and artwork rendered from the output folder |

## M10 complete — the headless React layer

- **Token semantics live in chain-reader.** `renderArtifactUri` (including the gentk-v1
  separate-seed correction), `imageSourceUri`, `artworkUrl`, `liveViewStatus`, and token
  identity helpers are framework-free exports with unit coverage.
- **One-import low-level facade.** `createWhitehashClient(config)` binds chain reads,
  project browsing, URI resolution, and token semantics once for non-React consumers.
- **`@whitehash/react` is the ceremony layer.** `WhitehashProvider`, pluggable
  IndexedDB/memory caches, `useWalletTokens`, `useProjects`/`useProject`,
  `useGatewayImage`, and `useArtworkFrame` own fetching, progress, cache-first refresh,
  gateway fallback, and sandboxed iframe state without importing styling.
- **Viewer dogfoods the packages.** The former local `render.ts`, `cache.ts`,
  `useWalletTokens.ts`, and `useBrowse.ts` copies are deleted. Browser verification
  loaded 133 tokens for the known Tezos fixture and ran a gentk-v1 artwork live with
  the seed preserved in its iframe URL; console clean. Both opt-in Tezos/Base tests pass.

## M11 complete — the published design system

- **One package, both tiers.** `@whitehash/ui` now exports the existing primitives plus
  compound `Artwork.Root/Image/Live/PlayButton/StatusBadge`, compound `TokenCard`,
  `TokenGrid`, `WalletGallery`, `ProjectBrowser`, `ProjectGallery`, `AddressSearch`, and
  `WalletSearch`. Roots own context/state; behavioral seams use the existing Base UI
  primitives while presentational parts remain plain elements.
- **The app dogfoods the domain layer.** The six local artwork/image/grid/browser/project/
  search component copies named by PLAN §4.7 are deleted. Viewer routing and settings
  remain app composition until the M12 docs conversion.
- **Both style paths work.** The package builds a self-contained `dist/styles.css` for
  consumers with no Tailwind toolchain and exports `theme.css` plus source for Tailwind
  v4 consumers. A fresh Vite fixture with only `@whitehash/ui` as its toolkit dependency
  built from a 14-line entry, loaded the known 133-token wallet, and was rethemed by
  overriding three token variables only.
- **Live browser acceptance.** The packaged project browser, wallet gallery, token card,
  and sandboxed Artwork iframe all ran in the viewer with a clean console. The gentk-v1
  seed remained present in the live URL.

## M12 complete — docs are the product surface

- **Viewer → docs.** `apps/viewer` is now `apps/docs` (`@whitehash/docs`): the landing
  page leads with the toolkit and its three API layers, while browse, wallet, project,
  token, settings, and live-artwork flows remain available as showcases.
- **Package-owned chrome.** `SiteHeader`, `ToolkitHero`, `DocsShell`, `DocsPage`,
  `DocsHeading`, `DocsSection`, `LiveDemo`, `Callout`, `CodeBlock`, and `TokenDetails`
  were added to `@whitehash/ui`. The app has no local visual-component directory or
  component CSS; it contains routing, settings/config, docs content, and composition.
- **Complete API catalog.** Every exported React hook and UI component has a hash route
  with a rendered demo and copyable usage. Guides cover getting started, choosing a
  layer, the full design-token reference, Vite, Next.js, onchfs proxy hosting, GitHub
  Pages/static hosting, and IPFS deployment.
- **Static and live acceptance.** The relative-base Vite build succeeds. Browser checks
  covered the docs landing page, sticky API navigation, copy feedback, Artwork demo,
  known 133-token wallet, token detail, and live sandboxed iframe with a clean console.

## M13 complete — release-ready, publication still gated

- **Package documentation is complete.** The root layer chooser and the READMEs for
  `resolve`, `chain-reader`, `react`, and `ui` document setup, public API tables, ESM
  behavior, style paths where applicable, and semver discipline.
- **Exports are audited.** Every toolkit package has explicit types/import/default ESM
  conditions. UI additionally exposes `/styles.css`, `/theme.css`, and `/source`; pure
  packages are marked side-effect-free while CSS is retained.
- **Packed artifacts are verified.** `pnpm pack` includes declarations, built ESM,
  READMEs, chain snapshots, UI precompiled CSS, and the intentional UI source tree; tests
  and app files are excluded. Workspace dependencies are rewritten to package versions.
- **Changesets is healthy.** Historical app entries follow the viewer→docs rename,
  nonexistent ignores are gone, `changeset status` resolves all six current workspaces,
  and the M10–M13 changesets remain queued for the maintainer-controlled first version.
- **No release action taken.** Versions remain `0.0.0`, Changesets remains in private
  versioning mode with restricted access, scope availability remains unverified, and no
  npm command that publishes or changes package versions has run.

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
- **onchfs actionable messaging**. `liveViewStatus()` distinguishes unrevealed,
  needs-onchfs-resolution, and unavailable states. The static docs register the
  same-origin resolver by default and retain a self-hosted proxy setting as fallback.
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
- **Many Ethereum/Base artworks are `onchfs://`** → the M9 same-origin worker resolves
  them directly from public chains; the HTTP proxy remains a compatibility fallback.
- **Some EVM projects' on-chain `tokenURI` points at `media.fxhash.xyz`** (contract baseURI
  set to fxhash's server, not IPFS). The artifact *inside* is still `ipfs://` so rendering
  is decentralized, but fetching that project's metadata JSON depends on fxhash infra — a
  gap in the "no fxhash infra" guarantee that's baked into the chain, not chosen by us.
  Possible follow-up: reconstruct an IPFS metadata path where one exists.

## Critical-path reframe complete

M10–M13 are complete. The toolkit layers, complete published design-system package,
static docs/showcase app, and release artifacts are ready for maintainer review. npm
scope verification, initial versioning, public-access configuration, and publication are
explicitly deferred until the maintainer gives separate approval.

## M14 complete — API ergonomics & composability review

The README-driven redesign is complete. `ProjectRef`/`TokenRef`, `parseRef`/`formatRef`,
`resolveInput`, and universal client methods now form the public data vocabulary.
`useProjects` and `useProject` remain deliberately parallel list/detail hooks;
progressive hydration replaced `useEvmProjectCard`; token cards are documented
`Card` + `Artwork.*` recipes while `TokenGrid` owns layout only. A fresh agent built all
five quickstart scenarios in an isolated Vite app using only the quickstart text.

Layer-0 packages, slot in when convenient:

- **M6 complete** — `@whitehash/runtime` provides the attributed framework-free runtime
  extraction plus `/react`. URI resolution is injected, the docs expose token-level
  Explore and a live variations guide, and browser acceptance verified both parameter
  serialization/re-rendering and a distinct new-hash variation.
- **M9 complete** — `@whitehash/onchfs-sw` ships same-origin registration and worker
  assets. The default resolver creates chain-scoped virtual paths, decompresses gzip
  responses, and caches immutable files. Genomes #2953 rendered with no proxy and
  reloaded after the static server was stopped.
- **M7 complete** — `@whitehash/archive` discovers wallet tokens, persists raw metadata
  and previews, verifies trustless-gateway CAR block hashes before UnixFS extraction,
  reads onchfs directly, and emits local wrappers/gallery/integrity manifests. A known
  Tezos wallet token replayed entirely from the generated folder.

## Known follow-ups / smaller items

- **EVM snapshots are empty bootstraps** (`packages/chain-reader/snapshots/*.json`,
  `collections: []`). Only matters for the **RPC fallback** path now that Blockscout is the
  default. A weekly/manual CI matrix now refreshes each network serially and attaches the
  reviewed JSON for 14 days; it deliberately has read-only repository permissions and
  never auto-commits generated chain data.
- **Gateway hangs** (vs. errors) aren't caught by `Artwork.Image`/card media; a fetch-with-timeout →
  blob approach would cover them. Low priority.
- Docs bundle ~635 kB minified / 200 kB gzip (mostly viem); code-splitting the EVM path would speed Tezos-only
  first loads.
- No git remote configured — repo is local-only; push when ready.

## PLAN §6 findings closed

- The configured keyless RPC fallbacks are browser-compatible. Empirical provider limits
  remain near 10,000 blocks, so `eth_getLogs` starts at 9,000, halves adaptively on range
  or result-size errors, and batches contract address arrays at 1,000. Blockscout avoids
  this full-history cost in the default path.
- TzKT returned inline metadata for all 133 balances in the known mainnet fixture on
  2026-07-20. The big-map lookup remains only for index lag/missing metadata.

## Where things live (for a picking-up agent)

- **[PLAN.md](./PLAN.md)** — the full handoff spec: verified addresses/endpoints (§3),
  package specs (§4), milestones incl. M6–M9 (§5), open items (§6).
- **This file** — current state + what's left.
- Per-package READMEs (`packages/*/README.md`, `apps/*/README.md`) document each unit.
- Changesets in `.changeset/` record every change since init (private mode; not published).
- Commit history on `main` is the chronological record.
