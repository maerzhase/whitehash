# @whitehash/react

Headless React bindings for whitehash. Hooks own asynchronous ceremony—configuration,
cache-first reads, progress, gateway fallback, and secure iframe state—without importing
CSS or rendering visual components.

```tsx
import { WhitehashProvider, useWalletTokens } from "@whitehash/react"

function Wallet({ address }: { address: string }) {
  const { state, loading, refresh } = useWalletTokens(address)
  return <button onClick={refresh}>{loading ? "Loading…" : `${state?.tokens.length ?? 0} tokens`}</button>
}

root.render(<WhitehashProvider config={config}><Wallet address="tz1…" /></WhitehashProvider>)
```

## API

| Export | Purpose |
| --- | --- |
| `WhitehashProvider`, `useWhitehash` | Provide/read the bound client, cache, and network mode |
| `useWalletTokens(address, options?)` | Cache-first multi-chain wallet tokens, progress, loading state, and refresh |
| `useProjects({ chain, version?, order?, limit? })` | Paginated discovery with progressive preview hydration on every chain |
| `useProject(ref, options?)` | Project metadata, iterations, pagination, and sort; the typed ref carries its chain |
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
