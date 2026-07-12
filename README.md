# whitehash

A standalone, open-source, self-hostable NFT viewer and preservation toolkit for
[fxhash](https://fxhash.xyz) generative art on **Tezos, Ethereum, and Base**.

whitehash reads everything **directly from public blockchain infrastructure** — no
fxhash indexer, no fxhash-hosted services, no `@fxhash/*` dependencies. Point it at a
wallet address and it enumerates the owned generative tokens straight from chain and
renders them live from IPFS / onchfs.

## Why

Generative art on-chain is only as durable as the infrastructure that serves it. If a
platform's indexer, gateway, or renderer goes away, the art can become hard to view even
though the tokens still exist on-chain. whitehash is a minimal, forkable stack that keeps
working as long as *any* RPC node and IPFS gateway exist.

## Hard constraints

1. **No `@fxhash/*` package dependencies.** Code we need is extracted (vendored) with
   attribution — everything is MIT-licensed. See [NOTICE](./LICENSE).
2. **No fxhash-hosted infrastructure**, ever — not as a default, not as a fallback. The
   only network dependencies are public IPFS gateways, public RPC nodes, the public TzKT
   API, and the self-hostable onchfs proxy shipped in this repo.
3. **The viewer is a fully static client-side app** — deployable to GitHub Pages, IPFS,
   or any static host. The onchfs proxy is the only (optional) server component.

## Packages

| Package | What it does |
| --- | --- |
| [`@whitehash/resolve`](./packages/resolve) | URI → HTTP URL resolution (`ipfs://`, `onchfs://`, gateways) |
| [`@whitehash/chain-reader`](./packages/chain-reader) | Wallet address → owned fxhash tokens, read directly from chain |
| [`@whitehash/runtime`](./packages/runtime) | Extracted artwork runtime controller (live re-render / param exploration) |

## Apps

| App | What it does |
| --- | --- |
| [`apps/viewer`](./apps/viewer) | Static web viewer — enter an address, see and play the artworks |
| [`apps/onchfs-proxy`](./apps/onchfs-proxy) | Self-hostable middleware that serves `onchfs://` artworks over HTTP |
| [`apps/archive-cli`](./apps/archive-cli) | Download a wallet's artworks to a self-contained offline folder |

## Networks

Mainnets: Tezos, Ethereum, Base. Testnets: Tezos ghostnet, Sepolia, Base Sepolia.

## Development

```bash
pnpm install
pnpm build
pnpm check-types
pnpm test
```

This repo uses [changesets](https://github.com/changesets/changesets) for versioning.
Add a changeset with any meaningful package change:

```bash
pnpm changeset
```

npm publishing is currently deferred; changesets run in private mode (versioning and
changelogs only).

## Status

Under active construction. See [PLAN.md](./PLAN.md) for the full implementation plan.

## License

MIT — see [LICENSE](./LICENSE). Not affiliated with or endorsed by fxhash.
