# @whitehash/onchfs-sw

## 0.0.2

### Patch Changes

- 0b94615: Use current public Tezos RPC endpoints so onchfs artwork archives continue to resolve after the retired ECAD endpoints shut down.
- Updated dependencies [0b94615]
  - @whitehash/core@0.0.2

## 0.0.1

### Patch Changes

- 8171937: Add a dependency-free shared core package and consolidate chain IDs, labels, aliases,
  URL slugs, onchfs network metadata, RPC defaults, token contracts, capture settings,
  resolver response shapes, and artwork iframe policies across the monorepo. Existing
  higher-level package entry points keep compatibility re-exports.
- 4134600: Add same-origin, proxy-free onchfs resolution through a browser service worker and make
  it the docs app default. The service-worker mode is chain-scoped so identical content
  identifiers resolve against the correct public network; explicit proxy and disabled
  modes remain available. Rename the live-view state from proxy-specific wording to the
  resolver-neutral `needs-onchfs`, and update React/UI consumers accordingly.
- Updated dependencies [8171937]
  - @whitehash/core@0.0.1
