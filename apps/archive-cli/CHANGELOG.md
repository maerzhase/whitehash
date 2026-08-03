# @whitehash/archive

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

## 0.0.4

### Patch Changes

- 0b94615: Make the archive CLI launch correctly when invoked through package-manager binaries such as `npx`.
- 0b94615: Use current public Tezos RPC endpoints so onchfs artwork archives continue to resolve after the retired ECAD endpoints shut down.
- Updated dependencies [0b94615]
  - @whitehash/core@0.0.2
  - @whitehash/onchfs-sw@0.0.2
  - @whitehash/chain-reader@0.0.3
  - @whitehash/resolve@0.0.2

## 0.0.3

### Patch Changes

- 2ad3920: Make the archive CLI launch correctly when invoked through package-manager binaries such as `npx`.

## 0.0.2

### Patch Changes

- e64be2a: Make archive verification output easier to understand, with plain-language success
  summaries and actionable guidance for local integrity mismatches.
- e64be2a: Add opt-in onchain archive verification that compares recorded token state with current
  public chain data while preserving the existing deterministic offline verifier.
- f879b13: Archive one fxhash token from an identity-bearing URL as either a verified offline
  folder or portable JSON index, with optional hosted resolution for slug-only iteration
  links.
- Updated dependencies [f879b13]
- Updated dependencies [915d5a9]
  - @whitehash/chain-reader@0.0.2

## 0.0.1

### Patch Changes

- 8171937: Add a dependency-free shared core package and consolidate chain IDs, labels, aliases,
  URL slugs, onchfs network metadata, RPC defaults, token contracts, capture settings,
  resolver response shapes, and artwork iframe policies across the monorepo. Existing
  higher-level package entry points keep compatibility re-exports.
- e271919: Add the wallet-to-offline-folder archive CLI. It discovers normalized tokens through the
  public chain reader, downloads IPFS generator DAGs as trustless-gateway CAR files,
  verifies every SHA-256 multihash before extracting UnixFS, reads onchfs generators
  directly from public chains, preserves metadata and previews, and emits local replay
  wrappers plus integrity manifests. The initial release deliberately implements the CAR
  and UnixFS verification boundary locally so archiving does not add an unreviewed or
  network-fetched dependency during the unattended run.
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
- Updated dependencies [7087678]
- Updated dependencies [6ab6977]
- Updated dependencies [8224867]
- Updated dependencies [4ac2f08]
- Updated dependencies [4134600]
- Updated dependencies [e20f2f6]
- Updated dependencies [291e948]
- Updated dependencies [21f922e]
  - @whitehash/chain-reader@0.0.1
  - @whitehash/core@0.0.1
  - @whitehash/onchfs-sw@0.0.1
  - @whitehash/resolve@0.0.1
