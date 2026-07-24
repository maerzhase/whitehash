# @whitehash/resolve

## 1.0.0

### Major Changes

- 4134600: Add same-origin, proxy-free onchfs resolution through a browser service worker and make
  it the docs app default. The service-worker mode is chain-scoped so identical content
  identifiers resolve against the correct public network; explicit proxy and disabled
  modes remain available. Rename the live-view state from proxy-specific wording to the
  resolver-neutral `needs-onchfs`, and update React/UI consumers accordingly.

### Minor Changes

- 7087678: Add `@whitehash/resolve`: dependency-free URI resolution for IPFS, onchfs, and inline
  URIs, with query/fragment preservation and gateway-fallback fetching.

### Patch Changes

- 8171937: Add a dependency-free shared core package and consolidate chain IDs, labels, aliases,
  URL slugs, onchfs network metadata, RPC defaults, token contracts, capture settings,
  resolver response shapes, and artwork iframe policies across the monorepo. Existing
  higher-level package entry points keep compatibility re-exports.
- 8224867: Complete package documentation, semver guidance, ESM exports metadata, peer ranges, and
  packed-artifact readiness for the initial maintainer-controlled release.
- 21f922e: Finish the docs migration to a statically exported Next.js app. Documentation-only
  chrome now stays app-local so `prism-react-renderer` is not inherited by UI consumers,
  and IPFS gateway normalization accepts both gateway roots and `/ipfs/` API roots.
- Updated dependencies [8171937]
  - @whitehash/core@0.1.0
