# @whitehash/runtime

## 0.0.1

### Patch Changes

- 8171937: Add a dependency-free shared core package and consolidate chain IDs, labels, aliases,
  URL slugs, onchfs network metadata, RPC defaults, token contracts, capture settings,
  resolver response shapes, and artwork iframe policies across the monorepo. Existing
  higher-level package entry points keep compatibility re-exports.
- 4cdb273: Add the framework-free artwork runtime and optional React subpath. The public connector
  requires caller-owned URI resolution, deliberately removing fxhash-hosted defaults;
  controllers can edit serialized parameters, change seeds, and synchronize an isolated
  iframe. Add a token-level Explore experience and variations guide to the static docs.
- a176c14: Fix runtime parameter consolidation so supplied values are honored without mutating
  the caller's parameter definitions.
- Updated dependencies [8171937]
  - @whitehash/core@0.0.1
