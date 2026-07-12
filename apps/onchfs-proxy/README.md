# @whitehash/onchfs-proxy

A small, self-hostable HTTP proxy that serves `onchfs://` artworks (on-chain file system,
used by many fxhash pieces — especially on Base) by resolving them directly from Tezos,
Ethereum, and Base RPC nodes.

This is the **only server component** whitehash needs, and it depends on nothing
fxhash-hosted — only public RPC nodes, all overridable via env vars. Many Base artworks
store their generator code in onchfs, so a running proxy is required to view those live.

## Request shape

```
GET /{networkSlug}/{cid}[/path][?query]
```

`networkSlug` is one of: `tezos-mainnet`, `tezos-ghostnet`, `eip155-1`,
`eip155-11155111`, `eip155-8453`, `eip155-84532`. The whitehash viewer builds these URLs
automatically from a token's chain. Example:

```
GET /eip155-8453/6dec8a91…93b62b/   →  200 text/html (the artwork)
GET /health                          →  { ok: true, networks: [...] }
```

Responses are served with permissive CORS and immutable long-lived caching (content is
content-addressed).

## Run locally

```bash
pnpm --filter @whitehash/onchfs-proxy start   # http://localhost:3000
# or with autoreload:
pnpm --filter @whitehash/onchfs-proxy dev
```

## Configuration (env vars)

Each network's RPC list is overridable (comma-separated). Defaults are public nodes.

| Var | Network |
| --- | --- |
| `ONCHFS_TEZOS_RPCS` | Tezos mainnet |
| `ONCHFS_GHOSTNET_RPCS` | Tezos ghostnet |
| `ONCHFS_ETH_RPCS` | Ethereum mainnet |
| `ONCHFS_SEPOLIA_RPCS` | Sepolia |
| `ONCHFS_BASE_RPCS` | Base mainnet |
| `ONCHFS_BASE_SEPOLIA_RPCS` | Base Sepolia |
| `PORT` | HTTP port (Node entry only, default 3000) |

## Deploy

**Vercel** — the `api/[[...route]].ts` catch-all makes this a zero-config Vercel app.
From this directory:

```bash
vercel deploy
```

Set your RPC env vars in the Vercel project settings. Then point the viewer's "onchfs
proxy URL" setting at the deployment.

**Node / any container** — run `pnpm start` behind your reverse proxy of choice.

**Cloudflare Workers / Deno** — `createApp()` returns a standard Hono app; import it into
a Workers/Deno entry and export `app.fetch`. (Verify the onchfs-js + viem bundle fits
your platform's limits.)

## Attribution

Adapted from the fxhash onchfs `http-proxy` example (MIT), generalized to all six
networks and re-hosted on Hono for portable deployment.
