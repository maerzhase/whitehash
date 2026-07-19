# @whitehash/resolve

Turns content-addressed URIs into fetchable HTTP URLs. Zero dependencies.

This is the single source of truth for how whitehash resolves `ipfs://`, `onchfs://`,
bare CIDs, and inline URIs — preserving query strings and fragments, which fxhash
artifact URIs use to carry render state (`ipfs://{cid}/?fxhash=...#0x{params}`).

```ts
import { createResolver, DEFAULT_IPFS_GATEWAYS } from "@whitehash/resolve"

const resolver = createResolver({
  ipfsGateways: DEFAULT_IPFS_GATEWAYS, // ["https://ipfs.io", "https://dweb.link"]
  onchfsProxy: "https://my-onchfs-proxy.example", // or null if unsupported
})

resolver.resolveUri("ipfs://Qm.../?fxhash=oo#0xff")
// → "https://ipfs.io/ipfs/Qm.../?fxhash=oo#0xff"

resolver.resolveUri("onchfs://0xabc/index.html")
// → "https://my-onchfs-proxy.example/0xabc/index.html"

await resolver.fetch("ipfs://Qm...") // tries each gateway in order
```

## Resolution rules

| Input | Output |
| --- | --- |
| `data:` / `blob:` / `http(s)://` | returned unchanged |
| `ipfs://<rest>` or a bare CID | `<gateway>/ipfs/<rest>` |
| `onchfs://<rest>` | `<onchfsProxy>/<rest>`, or `null` if no proxy configured |
| `temp://...` | `null` (fxhash pre-mint scheme, unsupported by design) |
| unknown scheme / empty | `null` |

## API

| Export | Purpose |
| --- | --- |
| `defaultResolverConfig()` | Public IPFS defaults with onchfs deliberately disabled |
| `resolveUri()` | Resolve one URI through the first configured gateway |
| `resolveUriAll()` | Produce the ordered fallback URL list |
| `fetchWithGatewayFallback()` | Fetch until one configured gateway succeeds |
| `createResolver(config)` | Bind all resolver operations to one config |
| `chainSlug()` | Convert a chain ID for the onchfs proxy path |

`onchfsProxy` has no default — there is no fxhash-independent public onchfs gateway to
default to. Self-host one with [`apps/onchfs-proxy`](../../apps/onchfs-proxy).

## Attribution

Resolution rules are a dependency-free port of the fxhash `proxyUrl` helper (MIT), with
all fxhash-hosted default endpoints removed.

## Versioning

Patches preserve resolution output for supported schemes; compatible schemes/options are
minor; changing existing URI semantics or return contracts is major. ESM-only;
publication is not enabled yet.
