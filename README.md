# whitehash

An open-source toolkit for embedding fxhash generative art from **Tezos, Ethereum, and
Base** into any React site. Whitehash reads ownership, projects, metadata, and artwork
directly from public blockchain infrastructure and content-addressed storage.

No `@fxhash/*` dependencies. No fxhash-hosted endpoint is used by the toolkit. The docs
site is fully static; `apps/onchfs-proxy` is the only optional server piece.

## Choose an API layer

Start with the [five-scenario quickstart](./apps/docs/QUICKSTART.md) to see the public
surface for one artwork, a wallet, project browsing, iterations, and plain TypeScript.

| Layer | Package | Use it when |
| --- | --- | --- |
| Framework-free | [`@whitehash/resolve`](./packages/resolve), [`@whitehash/chain-reader`](./packages/chain-reader), [`@whitehash/runtime`](./packages/runtime) | You want plain TypeScript, a custom renderer, interactive variations, or non-React integration |
| Headless React | [`@whitehash/react`](./packages/react) | You want hooks for fetching, caching, gateway fallback, and iframe state |
| Complete UI | [`@whitehash/ui`](./packages/ui) | You want composable artwork, token, gallery, and search components |

```tsx
import { WalletGallery, WhitehashProvider } from "@whitehash/ui"
import "@whitehash/ui/styles.css"

const config = {
  resolver: {
    ipfsGateways: ["https://ipfs.io", "https://dweb.link"],
    onchfsProxy: null,
  },
}

root.render(
  <WhitehashProvider config={config}>
    <WalletGallery address="tz1…" />
  </WhitehashProvider>,
)
```

## Apps

| App | Purpose |
| --- | --- |
| [`apps/docs`](./apps/docs) | Statically exported Next.js API docs plus live wallet/project/artwork showcases |
| [`apps/onchfs-proxy`](./apps/onchfs-proxy) | Optional self-hostable HTTP bridge for `onchfs://` artwork |

Supported networks are Tezos mainnet/ghostnet, Ethereum/Sepolia, and Base/Base Sepolia.
All configuration is network-keyed, so testnets use the same public API shapes.

## Development

```bash
pnpm install
pnpm build
pnpm check-types
pnpm test
pnpm --filter @whitehash/docs dev
```

Changesets record every meaningful package change. Package publication remains disabled
until the maintainer explicitly approves scope ownership, initial versions, and public
access. See [PLAN.md](./PLAN.md) and [STATUS.md](./STATUS.md).

## Versioning policy

Whitehash follows semantic versioning: patches fix behavior without changing supported
API shapes, minors add compatible APIs, and majors remove or alter public contracts.
Until the first public release, versions stay at `0.0.0` and Changesets run in private
mode. Publishing is intentionally a separate maintainer decision.

## License

MIT; see [LICENSE](./LICENSE) for notices and attribution. Whitehash is not affiliated
with or endorsed by fxhash.
