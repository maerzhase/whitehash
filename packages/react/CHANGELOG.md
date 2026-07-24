# @whitehash/react

## 1.0.0

### Major Changes

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

### Minor Changes

- 6ab6977: Add the framework-free `createWhitehashClient` facade and move token rendering
  semantics, including the gentk-v1 seed correction, into chain-reader. Introduce
  the headless `@whitehash/react` package with provider context, pluggable cache
  adapters, wallet/project hooks, gateway fallback, and artwork-frame state. Migrate
  the viewer to consume these packages and remove its app-local copies.
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

### Patch Changes

- 8171937: Add a dependency-free shared core package and consolidate chain IDs, labels, aliases,
  URL slugs, onchfs network metadata, RPC defaults, token contracts, capture settings,
  resolver response shapes, and artwork iframe policies across the monorepo. Existing
  higher-level package entry points keep compatibility re-exports.
- 8224867: Complete package documentation, semver guidance, ESM exports metadata, peer ranges, and
  packed-artifact readiness for the initial maintainer-controlled release.
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
  - @whitehash/chain-reader@1.0.0
  - @whitehash/core@0.1.0
