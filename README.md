# whitehash

An open-source toolkit for embedding fxhash generative art from **Tezos, Ethereum, and
Base** into any React site. Whitehash reads ownership, projects, metadata, and artwork
directly from public blockchain infrastructure and content-addressed storage.

No `@fxhash/*` dependencies. No fxhash-hosted endpoint is used by the toolkit. The docs
site is fully static; `apps/onchfs-proxy` is the only optional server piece.

## Start with one artwork

The [quickstart](./apps/docs/QUICKSTART.md) shows the core contract: mount the
zero-config provider, read one token by identity, and hand it to `Artwork`.

```tsx
import { useToken } from "@whitehash/react"
import { Artwork, WhitehashProvider } from "@whitehash/ui"
import "@whitehash/ui/styles.css"

function TokenArtwork() {
  const { token, loading, error } = useToken({
    chain: "tezos:mainnet",
    contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
    tokenId: "16333",
  })
  if (loading) return <p>Loading…</p>
  if (error || !token) return <p>{error ?? "Token not found"}</p>

  return <Artwork.Root token={token}>
    <Artwork.Image />
    <Artwork.Live />
    <Artwork.PlayButton />
    <Artwork.StatusBadge />
  </Artwork.Root>
}

root.render(
  <WhitehashProvider>
    <TokenArtwork />
  </WhitehashProvider>,
)
```

The provider defaults to mainnet, bundled public endpoints, IPFS fallback, and
browser-persistent caching. Configure only what you want to change.

## Choose an API layer

| Layer | Package | Use it when |
| --- | --- | --- |
| Shared contracts | [`@whitehash/core`](./packages/core) | You only need stable types, supported-network metadata, capture contracts, or browser security defaults |
| Framework-free | [`@whitehash/resolve`](./packages/resolve), [`@whitehash/chain-reader`](./packages/chain-reader), [`@whitehash/runtime`](./packages/runtime), [`@whitehash/onchfs-sw`](./packages/onchfs-sw) | You want plain TypeScript, direct onchfs resolution, a custom renderer, interactive variations, or non-React integration |
| Headless React | [`@whitehash/react`](./packages/react) | You want hooks for fetching, caching, gateway fallback, and iframe state |
| Complete UI | [`@whitehash/ui`](./packages/ui) | You want composable artwork, token, gallery, and search components |

## Apps

| App | Purpose |
| --- | --- |
| [`apps/docs`](./apps/docs) | Statically exported Next.js API docs plus live wallet/project/artwork showcases |
| [`apps/archive-cli`](./apps/archive-cli) | Project/token index generation plus wallet-to-folder preservation with CAR verification and offline replay |
| [`apps/onchfs-proxy`](./apps/onchfs-proxy) | Optional self-hostable HTTP bridge for `onchfs://` artwork |

Supported networks are Tezos mainnet/ghostnet, Ethereum/Sepolia, and Base/Base Sepolia.
All configuration is network-keyed, so testnets use the same public API shapes.

## Development

```bash
pnpm install
pnpm build
pnpm check
pnpm check-types
pnpm test
pnpm fix
pnpm format
pnpm --filter @whitehash/docs dev
```

Biome linting and formatting checks run in CI. Use `pnpm fix` for safe combined fixes,
or `pnpm format:fix` for a formatting-only pass.

Changesets record every meaningful package change. Package publication remains disabled
until the maintainer explicitly approves scope ownership, initial versions, and public
access.

Pushes to `main` create or update a Changesets release pull request through
`.github/workflows/release.yml`. Merging that pull request applies package versions and
changelogs; npm publication remains a separate, explicitly approved step.

## Versioning policy

Whitehash follows semantic versioning: patches fix behavior without changing supported
API shapes, minors add compatible APIs, and majors remove or alter public contracts.
Until the first public release, versions stay at `0.0.0` and Changesets run in private
mode. Publishing is intentionally a separate maintainer decision.

## License

MIT; see [LICENSE](./LICENSE) for notices and attribution. Whitehash is not affiliated
with or endorsed by fxhash.
