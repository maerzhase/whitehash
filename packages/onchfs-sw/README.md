# @whitehash/onchfs-sw

Resolves `onchfs://` artwork directly from public chains in the browser. A same-origin
service worker intercepts virtual artwork URLs, uses the published `onchfs` resolver,
decompresses encoded files, and caches immutable results with the Cache API.

## Install and host

Copy both package assets to the same public directory; they must stay next to each other
and be served from the same origin as the app:

- `@whitehash/onchfs-sw/worker.js` → `/onchfs-sw.js`
- `@whitehash/onchfs-sw/onchfs.global.js` → `/onchfs.global.js`

Then register the worker once from client-side code:

```ts
import { registerOnchfsWorker } from "@whitehash/onchfs-sw"

await registerOnchfsWorker()
```

Configure `@whitehash/resolve` with `{ onchfs: { mode: "service-worker" } }`. The
generated chain-scoped URLs live below `/.whitehash/onchfs/`, which the worker's root
scope covers. The docs app enables this mode by default; the generic resolver default
remains disabled so consumers opt in only after hosting and registering the assets.

Registration requires HTTPS in production (localhost is allowed). If service workers
are unavailable, configure `{ mode: "proxy", baseUrl }` and host
[`apps/onchfs-proxy`](../../apps/onchfs-proxy), or set `onchfs: null`.

## API

| Export | Purpose |
| --- | --- |
| `registerOnchfsWorker(options?)` | Register the same-origin worker and wait for control |
| `ONCHFS_VIRTUAL_PATH` | Default virtual-path prefix |
| `ONCHFS_CACHE` | Cache API namespace |
| `ONCHFS_WORKER_NETWORKS` | Supported public-chain resolver configuration |

The package ships ESM registration code plus two browser assets. It has no fxhash-hosted
runtime defaults and makes no request to a whitehash server.

## Versioning

Worker registration and network additions are minor. Changes to virtual-path or cache
semantics are major. Publication is not enabled yet.
