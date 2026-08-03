# @whitehash/react

## 0.1.0

### Minor Changes

- 46a1c76: Add on-demand per-project market history indexing, and the parts to display it.

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

### Patch Changes

- Updated dependencies [46a1c76]
  - @whitehash/market@0.1.0
  - @whitehash/chain-reader@0.1.0

## 0.0.3

### Patch Changes

- Updated dependencies [0b94615]
  - @whitehash/core@0.0.2
  - @whitehash/chain-reader@0.0.3

## 0.0.2

### Patch Changes

- Updated dependencies [f879b13]
- Updated dependencies [915d5a9]
  - @whitehash/chain-reader@0.0.2

## 0.0.1

### Patch Changes

- 8171937: Add a dependency-free shared core package and consolidate chain IDs, labels, aliases,
  URL slugs, onchfs network metadata, RPC defaults, token contracts, capture settings,
  resolver response shapes, and artwork iframe policies across the monorepo. Existing
  higher-level package entry points keep compatibility re-exports.
- 6ab6977: Add the framework-free `createWhitehashClient` facade and move token rendering
  semantics, including the gentk-v1 seed correction, into chain-reader. Introduce
  the headless `@whitehash/react` package with provider context, pluggable cache
  adapters, wallet/project hooks, gateway fallback, and artwork-frame state. Migrate
  the viewer to consume these packages and remove its app-local copies.
- 8224867: Complete package documentation, semver guidance, ESM exports metadata, peer ranges, and
  packed-artifact readiness for the initial maintainer-controlled release.
- 4ac2f08: Redesign the pre-release API around five first-glimpse quickstarts.

  - Keep `useProjects(options)` and `useProject(ref, options)` as parallel hooks because
    browsing a pageable collection and reading one project plus its iterations are
    different data lifecycles; make the distinction obvious with an object argument for
    the list and a typed ref for the detail hook.
  - Remove `useEvmProjectCard` and all chain-named public readers. `useProjects` now emits
    discovered projects immediately and progressively hydrates missing name, supply, and
    preview fields through the universal `client.getProject(ref)` method.
  - Replace opaque project strings and token coordinates with `ProjectRef` and `TokenRef`.
    Add `parseRef`, `formatRef`, `resolveInput`, `tokenRef`, `shortAddress`, and
    `projectLabel` so routes and paste inputs share one documented reference story.
  - Remove `TokenCard`. The canonical token card is the composable `Card` + `Artwork`
    recipe; `TokenGrid` remains only as a responsive layout/loading utility, while gallery
    blocks retain one-line convenience.
  - Make the framework-free client infer mainnet wallet chains by address, accept typed
    refs for project/direct-token reads, and expose only universal method names. The docs
    search now routes addresses, refs, common artwork URLs, and CIDs through `resolveInput`.

- 4134600: Add same-origin, proxy-free onchfs resolution through a browser service worker and make
  it the docs app default. The service-worker mode is chain-scoped so identical content
  identifiers resolve against the correct public network; explicit proxy and disabled
  modes remain available. Rename the live-view state from proxy-specific wording to the
  resolver-neutral `needs-onchfs`, and update React/UI consumers accordingly.
- e20f2f6: Add portable, versioned project iteration and single-token indexes with normalized
  display data, original token metadata, direct property access, JSON validation,
  and complete paginated project discovery.

  Use one shared normalized project summary in both formats. Single-token indexes
  enrich EVM collection metadata directly and resolve Tezos parent projects from
  gentk contract storage while representing unavailable fields explicitly as null.

  Normalize published fxhash capture settings on every project summary. Tezos
  single-token indexing follows the gentk token_data issuer ID back to the parent
  project so capture mode, trigger, GPU, resolution, selector, delay, and GIF
  timing data are available without an fxhash-hosted API.

  Add the focused `project`, `token`, `wallet`, and `verify` commands while retaining
  earlier implicit forms as compatibility aliases. Project indexing includes an EVM RPC
  mode that probes fxhash collection supply and token-ID boundaries before falling back
  to canonical mint events.

  Document project and token indexing, demonstrate both index formats through the existing
  Artwork component, and cover direct chain refreshes and offline archives in the docs app.

  Add a focused `useToken` React hook for loading and refreshing a single token index entry.
  Remove the public `TokenGrid` layout helper from the UI package so integrators compose
  token layouts from `Card` and `Artwork`, while gallery components retain their internal
  responsive grid.

- Updated dependencies [375274a]
- Updated dependencies [8171937]
- Updated dependencies [e20f2f6]
- Updated dependencies [236bf6d]
- Updated dependencies [7087678]
- Updated dependencies [6ab6977]
- Updated dependencies [8224867]
- Updated dependencies [4ac2f08]
- Updated dependencies [4134600]
- Updated dependencies [e20f2f6]
- Updated dependencies [291e948]
  - @whitehash/chain-reader@0.0.1
  - @whitehash/core@0.0.1
