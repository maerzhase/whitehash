# @whitehash/core

## 0.0.2

### Patch Changes

- 0b94615: Use current public Tezos RPC endpoints so onchfs artwork archives continue to resolve after the retired ECAD endpoints shut down.

## 0.0.1

### Patch Changes

- 8171937: Add a dependency-free shared core package and consolidate chain IDs, labels, aliases,
  URL slugs, onchfs network metadata, RPC defaults, token contracts, capture settings,
  resolver response shapes, and artwork iframe policies across the monorepo. Existing
  higher-level package entry points keep compatibility re-exports.
