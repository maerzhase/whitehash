# @whitehash/resolve

Turns content-addressed URIs into fetchable HTTP URLs. Zero dependencies.

This is the single source of truth for how whitehash resolves `ipfs://`, `onchfs://`,
bare CIDs, and inline URIs — preserving query strings and fragments, which fxhash
artifact URIs use to carry render state (`ipfs://{cid}/?fxhash=...#0x{params}`).

```ts
import { createResolver, DEFAULT_IPFS_GATEWAYS } from "@whitehash/resolve"

const resolver = createResolver({
  ipfsGateways: DEFAULT_IPFS_GATEWAYS, // ["https://ipfs.io", "https://dweb.link"]
  onchfs: { mode: "service-worker" }, // same-origin /.whitehash/onchfs virtual path
})

resolver.resolveUri("ipfs://Qm.../?fxhash=oo#0xff")
// → "https://ipfs.io/ipfs/Qm.../?fxhash=oo#0xff"

resolver.resolveUri("onchfs://0xabc/index.html", { chain: "eip155:1" })
// → "/.whitehash/onchfs/eip155-1/0xabc/index.html"

await resolver.fetch("ipfs://Qm...") // tries each gateway in order
```

## Resolution rules

| Input | Output |
| --- | --- |
| `data:` / `blob:` / `http(s)://` | returned unchanged |
| `ipfs://<rest>` or a bare CID | `<gateway>/ipfs/<rest>` |
| `onchfs://<rest>` | same-origin worker path, proxy URL, or `null`, according to `onchfs.mode` |
| `temp://...` | `null` (fxhash pre-mint scheme, unsupported by design) |
| unknown scheme / empty | `null` |

## API

| Export | Purpose |
| --- | --- |
| `defaultResolverConfig()` | Public IPFS defaults with onchfs disabled until its worker assets are hosted |
| `resolveUri()` | Resolve one URI through the first configured gateway |
| `resolveUriAll()` | Produce the ordered fallback URL list |
| `fetchWithGatewayFallback()` | Fetch until one configured gateway succeeds |
| `createResolver(config)` | Bind all resolver operations to one config |
| `chainSlug()` | Convert a chain ID for a chain-scoped onchfs path |

Service-worker mode requires `@whitehash/onchfs-sw` assets and registration; the static
docs enable it by default. Use `{ mode: "proxy", baseUrl }` with
[`apps/onchfs-proxy`](../../apps/onchfs-proxy) as a fallback, or `null` to disable onchfs.

## Attribution

Resolution rules are a dependency-free port of the fxhash `proxyUrl` helper (MIT), with
all fxhash-hosted default endpoints removed.

## Versioning

Patches preserve resolution output for supported schemes; compatible schemes/options are
minor; changing existing URI semantics or return contracts is major. ESM-only;
publication is not enabled yet.
