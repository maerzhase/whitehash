# @whitehash/viewer

A static, self-hostable web app that shows the fxhash generative art owned by any wallet —
read directly from Tezos, Ethereum, and Base. No backend, no fxhash servers.

Enter a `tz…` or `0x…` address → see the owned tokens → click one to run the live
artwork in a sandboxed iframe, served from public IPFS gateways (and your onchfs proxy for
onchfs artworks).

## Run / build

```bash
pnpm --filter @whitehash/viewer dev       # dev server
pnpm --filter @whitehash/viewer build     # static build → dist/
pnpm --filter @whitehash/viewer preview   # serve the build
```

The build is a fully static bundle (`base: "./"`), deployable to GitHub Pages, Netlify,
or IPFS itself. It uses a hash router so it works from any subpath without server rewrites.

## How it works

- **Tezos**: instant, via the public TzKT API (one query returns holdings with metadata).
- **Ethereum / Base**: ownership is derived from on-chain `Transfer` logs. Public RPCs cap
  log queries, so first-time EVM lookups can be slow (a progress indicator shows per-chain
  status); results are cached in IndexedDB for instant repeat visits. Paste an
  archive-capable RPC in **Settings** for faster EVM scans.

## Settings

All endpoints are user-configurable and persisted to localStorage — nothing fxhash-hosted:

- **Network mode** — mainnet or testnet (ghostnet + Sepolia + Base Sepolia)
- **IPFS gateways** — ordered, with fallback
- **onchfs proxy URL** — required for onchfs artworks (many Base pieces); self-host
  [`apps/onchfs-proxy`](../onchfs-proxy)
- **EVM RPCs** — per network; supply archive-capable RPCs for fast lookups
- **TzKT base URLs** — per Tezos network

## Notes

- Artworks run in a sandboxed iframe (`allow-scripts allow-same-origin allow-modals`),
  matching fxhash's own renderer.
- The viewer faithfully renders each token's actual iteration: gentk v1 tokens store their
  seed in a separate `iterationHash` field, which is applied to the generator URL.
- Unrevealed ("waiting to be signed") tokens are shown with a badge and no live view.
