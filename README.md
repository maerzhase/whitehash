# whitehash

An open-source toolkit for showing and preserving fxhash generative art from **Tezos, Ethereum,
and Base**. Give Whitehash a token, project, or collector address and it finds the artwork,
metadata, ownership, and live generator directly from public blockchain data. Use the ready-made
React components, or use the plain TypeScript libraries underneath them.

You do not need an API key, backend, wallet connection, or `@fxhash/*` dependency. Whitehash does
not require an fxhash-hosted endpoint either. The docs site is fully static; the optional
`apps/onchfs-proxy` app is only needed for some onchfs deployments.

## Start with one artwork

To save one artwork for later, paste its fxhash token URL:

```bash
npx @whitehash/archive \
  "https://www.fxhash.xyz/gentk/KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE-16333"
```

This creates a verified offline folder with the artwork files and checks that they have not
changed. Add `--json` if you only want a small JSON record for a website; JSON alone is not an
offline copy of the artwork.

If your link only has a project slug, add `--resolver fxhash`. Whitehash will use fxhash once to
look up the token identity, then create the same verified offline archive.

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

The provider starts with mainnet and sensible public defaults, including backup IPFS gateways and
browser caching. Configure only the parts you want to change.

## Choose an API layer

| Layer | Package | Use it when |
| --- | --- | --- |
| Shared types | [`@whitehash/core`](./packages/core) | You are building your own integration and only need common types and settings |
| Plain TypeScript | [`@whitehash/resolve`](./packages/resolve), [`@whitehash/chain-reader`](./packages/chain-reader), [`@whitehash/runtime`](./packages/runtime), [`@whitehash/onchfs-sw`](./packages/onchfs-sw) | You are not using React, or you want to build your own renderer |
| React hooks | [`@whitehash/react`](./packages/react) | You want ready-made data fetching and state management |
| React UI | [`@whitehash/ui`](./packages/ui) | You want artwork, gallery, token, and search components ready to drop in |

## Apps

| App | Purpose |
| --- | --- |
| [`apps/docs`](./apps/docs) | Statically exported Next.js API docs plus live wallet/project/artwork showcases |
| [`apps/archive-cli`](./apps/archive-cli) | Paste-first single-token archives and JSON indexes, plus project indexing and wallet preservation with CAR verification |
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
