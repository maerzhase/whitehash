# @whitehash/onchfs-proxy

## 0.0.2

### Patch Changes

- Updated dependencies [0b94615]
  - @whitehash/core@0.0.2

## 0.0.1

### Patch Changes

- 8171937: Add a dependency-free shared core package and consolidate chain IDs, labels, aliases,
  URL slugs, onchfs network metadata, RPC defaults, token contracts, capture settings,
  resolver response shapes, and artwork iframe policies across the monorepo. Existing
  higher-level package entry points keep compatibility re-exports.
- 7087678: Add the static wallet viewer (address → owned tokens → live sandboxed rendering, with
  IndexedDB caching and mainnet/testnet settings) and the self-hostable onchfs proxy
  (Hono app resolving all six networks, deployable to Node/Vercel/Workers).
- Updated dependencies [8171937]
  - @whitehash/core@0.0.1
