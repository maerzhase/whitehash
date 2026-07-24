# whitehash quickstart

Render one fxhash token with its static preview and correctly seeded live artwork.
You need React 18.3 or newer. You do not need an API key, backend, wallet connection,
or fxhash dependency.

## 1. Install

```bash
pnpm add @whitehash/react @whitehash/ui
```

## 2. Mount the provider

Import the stylesheet and mount the provider once near the root of your app. It works
without configuration: mainnet, bundled third-party endpoints, IPFS fallback, and
browser-persistent caching are selected automatically.

```tsx
import { WhitehashProvider } from "@whitehash/ui"
import "@whitehash/ui/styles.css"

root.render(
  <WhitehashProvider>
    <App />
  </WhitehashProvider>,
)
```

## 3. Read and render one token

Read the token directly from its chain, contract, and token ID. `Artwork` then owns the
distinction between a static preview and executable artwork, builds the correctly seeded
URL, and places the live version in a restricted iframe.

```tsx
import { useToken } from "@whitehash/react"
import { Artwork } from "@whitehash/ui"

export function TokenArtwork() {
  const { token, loading, error } = useToken({
    chain: "tezos:mainnet",
    contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
    tokenId: "16333",
  })

  if (loading) return <p>Loading…</p>
  if (error || !token) return <p>{error ?? "Token not found"}</p>

  return (
    <Artwork.Root token={token}>
      <Artwork.Image />
      <Artwork.Live />
      <Artwork.PlayButton />
      <Artwork.StatusBadge />
    </Artwork.Root>
  )
}
```

The preview appears first. Pressing **Run live** replaces it with the executable,
correctly seeded artwork. Unrevealed tokens and onchfs pieces that need configuration
get an explicit status instead of failing silently.

## Where the token comes from

Whitehash returns the same token shape from every read path:

| You have | Use |
| --- | --- |
| A collector address | `useWalletTokens(address)` |
| A project identity | `useProject({ chain, id })` and select one of its `tokens` |
| Exact token identity | `useToken({ chain, contract, tokenId })` |

Start with the read path your application already has. Refs are optional serialized
values for routes and paste fields; normal reads use identity fields directly.

## Next

- Continue with **Projects and tokens** in the web docs for the data model.
- Use the guides for configuration, onchfs artwork, and variations.
- Install `@whitehash/chain-reader` only if you need the framework-free client.
