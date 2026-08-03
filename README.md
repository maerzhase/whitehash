# whitehash

An open-source, framework-agnostic toolkit for keeping fxhash generative art available without
relying on third-party infrastructure. Preserve a token locally as a verified offline archive with
the CLI, or load and render it in your own website, gallery, database, or collection with the API
and React layers.

Whitehash reads artwork, metadata, ownership, and live generator information from **Tezos,
Ethereum, and Base** through public chain and configurable content infrastructure. Use the
ready-made React components, or use the plain TypeScript libraries underneath them.

No `@fxhash/*` dependencies. No fxhash-hosted endpoint is used by the toolkit. The docs
site is fully static; `apps/onchfs-proxy` is the only optional server piece.

## Choose your path

### Preserve locally

To preserve one artwork first, paste an identity-bearing fxhash token URL:

```bash
npx @whitehash/archive \
  "https://www.fxhash.xyz/gentk/KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE-16333"
```

This creates a verified offline folder containing the artwork bytes and integrity
hashes. Here, “verified” means deterministic local hashes, completeness, references,
and path safety. It does not mean a fresh blockchain lookup or signed proof. Add
`--json` for a lightweight normalized token index intended for a hosted website; JSON
alone is not an offline copy.

Add `--onchain` to `npx @whitehash/archive verify <folder>` only when you explicitly
want a network-backed comparison with current provider-observed token state. It does not
verify ownership or historical state at the archive creation time.

For a slug-only iteration link, add `--resolver fxhash`. That optional convenience
contacts fxhash's hosted service only to recover the on-chain identity, then creates
the same verified offline archive.

### Render and integrate online

The [quickstart](./apps/docs/QUICKSTART.md) gets one artwork on screen in three steps: install two
packages, add the provider, and pass a token to `Artwork`.

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
| Framework-free | [`@whitehash/resolve`](./packages/resolve), [`@whitehash/chain-reader`](./packages/chain-reader), [`@whitehash/market`](./packages/market), [`@whitehash/runtime`](./packages/runtime), [`@whitehash/onchfs-sw`](./packages/onchfs-sw) | You want plain TypeScript, direct onchfs resolution, market history indexing, a custom renderer, interactive variations, or non-React integration |
| Headless React | [`@whitehash/react`](./packages/react) | You want hooks for fetching, caching, gateway fallback, and iframe state |
| Complete UI | [`@whitehash/ui`](./packages/ui) | You want composable artwork, token, gallery, and search components |

## Apps

| App | Purpose |
| --- | --- |
| [`apps/docs`](./apps/docs) | Statically exported Next.js API docs plus live wallet/project/artwork showcases |
| [`apps/archive-cli`](./apps/archive-cli) | Paste-first single-token archives and JSON indexes, plus project indexing, market history backfill, and wallet preservation with CAR verification |
| [`apps/onchfs-proxy`](./apps/onchfs-proxy) | Optional self-hostable HTTP bridge for `onchfs://` artwork |
| [`apps/playground`](./apps/playground) | Private Vite development playground; loads and visualizes market index artifacts |

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

Changesets record every meaningful package change. Pushes to `main` create or update a
Changesets release pull request through `.github/workflows/release.yml`. Merging that
pull request applies package versions and changelogs, builds the workspace, publishes
the public packages to npm, and creates GitHub releases.

The release workflow requires an `NPM_TOKEN` Actions secret with publish access to the
`@whitehash` npm scope. The private docs and proxy applications are versioned but are
not published.

## Repository skills

The repository includes composable marketing skills for Whitehash voice, X thread
planning, and deterministic social cards. The
[`whitehash-x-launch`](./.agents/skills/whitehash-x-launch/SKILL.md) orchestrator combines
all three into a complete campaign. Invoke it in Codex with:

```text
Use $whitehash-x-launch to create a launch thread for this feature.
```

Use the focused
[`whitehash-marketing-voice`](./.agents/skills/whitehash-marketing-voice/SKILL.md),
[`x-thread-plan`](./.agents/skills/x-thread-plan/SKILL.md), or
[`whitehash-social-cards`](./.agents/skills/whitehash-social-cards/SKILL.md) skill when
only one part of the workflow is needed. The orchestrator adapts the post count to the
story, validates every post, reuses the real Whitehash logo, and defaults campaign
drafts to the untracked `.private/artifacts/` directory.

## Versioning policy

Whitehash follows semantic versioning: patches fix behavior without changing supported
API shapes, minors add compatible APIs, and majors remove or alter public contracts.
The initial public release uses patch Changesets to move packages from `0.0.0` to
`0.0.1`. Later releases follow the normal Changesets major, minor, and patch flow.

## License

MIT; see [LICENSE](./LICENSE) for notices and attribution. Whitehash is not affiliated
with or endorsed by fxhash.
