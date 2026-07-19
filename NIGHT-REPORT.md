# Overnight report

Run date: 2026-07-19 (Europe/Lisbon)

## Shipped

- Phase 0: committed the in-flight Vite-to-Next docs migration as `21f922e`. The docs
  build uses `output: "export"`, unoptimized images, trailing slashes, 40 prerendered
  routes, and app-local docs chrome. A plain static server returned HTTP 200 for `/`,
  `/guide/getting-started/`, `/docs/use-wallet-tokens/`, and `/settings/`.
- Phase 1 / M14: redesigned the public first-glimpse API around chain-neutral
  `ProjectRef`/`TokenRef` values, universal client methods, progressively hydrated
  project lists, and composable `Card` + `Artwork` token recipes. Removed the public
  `useEvmProjectCard` and `TokenCard` seams, updated every docs/app/package call site,
  and added a five-scenario quickstart.
- Phase 2 / M6: added `@whitehash/runtime` as a framework-free attributed extraction
  with an optional `/react` entry, caller-injected content resolution, parameter codecs,
  runtime controls, and iframe synchronization. Token details now have an Explore tab,
  and the static docs include a live variations guide.

## Decisions

- M14 hooks: keep two clearly parallel hooks. `useProjects({ chain, ...filters })`
  represents a pageable collection; `useProject(projectRef)` represents one project and
  its iterations. Unifying them would give a misleading 0-or-1 array and erase the
  detail hook's distinct pagination lifecycle.
- M14 enrichment: remove `useEvmProjectCard`; `useProjects` progressively hydrates any
  project missing preview fields through chain-neutral `client.getProject(ref)`.
- M14 references: use discriminated `ProjectRef`/`TokenRef` objects and readable,
  percent-encoded `project/...` and `token/...` strings. `resolveInput` classifies refs,
  common pasted URLs, CIDs, and addresses without a network request.
- M14 cards: remove `TokenCard`. `Card` owns the shell, `Artwork` owns artwork behavior,
  gallery blocks own shortcuts, and `TokenGrid` earns its place only as responsive
  layout plus loading skeletons.
- M14 client: expose `getWalletTokens`, `listProjects`, `getProject`,
  `listProjectTokens`, and `getToken` as universal methods. Network-specific readers
  remain implementation details; callers identify data with refs instead of learning
  per-chain lookup ceremonies.
- M14 input routing: make `resolveInput` a synchronous classifier for serialized refs,
  wallet/contract addresses, CIDs/content URIs, and common pasted token/project URL
  paths. This keeps routing deterministic and avoids introducing an indexer or an
  fxhash-hosted runtime dependency.
- M6 connector: require the caller to inject `resolveUri`; accept optional explicit
  self-hosted emulator/legacy bases, but provide no fxhash-hosted default. This keeps
  the runtime portable and preserves the toolkit's infrastructure hard line.
- M6 package boundary: keep React optional behind `@whitehash/runtime/react`; the core
  build contains no React import. Small deep-clone/merge/debounce helpers are local so
  the extracted state semantics stay framework-free without expanding the dependency
  surface.

## Verification evidence

- Phase 0: `pnpm build && pnpm check-types && pnpm test` — green; 6/6 build tasks,
  10/10 type tasks, 10/10 test tasks; 67 tests passed and 2 opt-in live tests skipped.
- Static export: `pnpm --filter @whitehash/docs build` — 40/40 pages generated in
  `apps/docs/out`; four representative routes returned HTTP 200 from a static server.
- M14 quickstart acceptance: the first fresh agent, given only the quickstart text,
  exposed missing install/config/provider details. After those were corrected, a
  second genuinely fresh agent built all five scenarios unaided in an isolated Vite
  app: production build green, 601 modules transformed. Each scenario is 15 lines or
  fewer (11, 7, 15, 11, 11).
- M14 repository gate: `pnpm build && pnpm check-types && pnpm test` — green; docs
  static export generated 38/38 routes, 6/6 build tasks passed, 10/10 type tasks
  passed, and 10/10 test tasks passed (74 tests passed, 2 opt-in live tests skipped).
- M6 controller acceptance: `pnpm --filter @whitehash/runtime test` exercises a fake
  iframe end to end: changing Density changes serialized input bytes and its navigation
  URL; changing the seed produces a second distinct URL.
- M6 browser acceptance: served the 39-route static export, opened the live variations
  guide, changed Density from 1 to 7 (fragment changed from
  `#0x3ff0000000000000` to `#0x401c000000000000`), then clicked New hash and observed a
  distinct render URL. The iframe reloaded and browser console warnings/errors were 0.
- M6 repository gate: `pnpm build && pnpm check-types && pnpm test` — green; 7/7 build
  tasks, 12/12 type tasks, and 12/12 test tasks; 75 tests passed and 2 opt-in live tests
  skipped. `pnpm install --lockfile-only --offline --frozen-lockfile` also accepted the
  regenerated lockfile.

## Parked or incomplete

- M9, M7, and closeout remain at this checkpoint.

## Morning: look at these first

1. M14 API decisions and the five-scenario quickstart.
2. Milestone verification/partial status below once later phases finish.
3. Any parked risk findings, especially M9 service-worker behavior.
