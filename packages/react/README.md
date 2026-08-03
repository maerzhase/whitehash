# @whitehash/react

Headless React bindings for whitehash. Hooks own asynchronous ceremony—configuration,
cache-first reads, progress, gateway fallback, and secure iframe state—without importing
CSS or rendering visual components.

```tsx
import { WhitehashProvider, useToken } from "@whitehash/react"

function Token() {
  const result = useToken({
    chain: "tezos:mainnet",
    contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
    tokenId: "16333",
  })
  return <p>{result.loading ? "Loading…" : result.token?.name ?? result.error}</p>
}

root.render(<WhitehashProvider><Token /></WhitehashProvider>)
```

## API

| Export | Purpose |
| --- | --- |
| `WhitehashProvider`, `useWhitehash` | Provide/read the bound client, cache, and network mode |
| `useToken({ chain, contract, tokenId }, options?)` | One normalized token, loading/error state, and refresh |
| `useWalletTokens(address, options?)` | Cache-first multi-chain wallet tokens, progress, loading state, and refresh |
| `useProjects({ chain, version?, order?, limit? })` | Paginated discovery with progressive preview hydration on every chain |
| `useProject(project, options?)` | Project metadata, iterations, pagination, and sort from `{ chain, id }` |
| `useMarketIndex(source, options?)` | A validated market index artifact from a URL, a loader, or one you already hold, with loading/error state and refresh |
| `useGatewayImage(uri, chain)` | Ordered gateway URL with an `onError` fallback handler |
| `useArtworkFrame(token)` | Live-view status, play/stop state, and sandboxed iframe props |
| `createIndexedDbCache()` | Browser-persistent `WhitehashCache` implementation |
| `createMemoryCache()` | SSR/test-safe in-memory cache |
| `createDefaultCache()` | IndexedDB in browsers, memory when IndexedDB is unavailable |

Pass a custom `WhitehashCache` or `WhitehashClient` to `WhitehashProvider` for SSR,
testing, instrumentation, or another persistence layer. The package peers React
`>=18.3 <20` and is ESM-only.

## Versioning

Patch releases preserve hook return shapes and cache contracts; compatible hooks and
options are minor releases; removing fields or changing provider/cache semantics is
major. Publication is not enabled yet.
