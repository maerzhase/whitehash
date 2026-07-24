# @whitehash/core

Shared, dependency-free contracts used across the whitehash toolkit.

Use this package when an integration only needs stable domain types, supported
chain metadata, onchfs connection defaults, capture settings, or the artwork
iframe security policy. Higher-level packages re-export their relevant legacy
entry points, so existing imports remain valid.

```ts
import {
  CHAIN_DEFINITIONS,
  type ChainId,
  type WhitehashToken,
} from "@whitehash/core"
```

`CHAIN_DEFINITIONS` is the single source of truth for supported network IDs,
labels, URL slugs, aliases, onchfs identifiers, and public RPC defaults.
