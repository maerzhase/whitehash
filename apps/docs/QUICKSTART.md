# whitehash quickstart

Put one fxhash artwork on a React page. You need React 18.3 or newer. You do not need an API key,
backend, wallet connection, or fxhash dependency.

## 1. Install

```bash
pnpm add @whitehash/react @whitehash/ui
```

## 2. Mount the provider

Import the stylesheet and mount the provider once near the root of your app. It works without
configuration: Whitehash uses mainnet, public data services, backup IPFS gateways, and browser
caching by default.

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

Tell Whitehash where the token lives, then give the result to `Artwork`. It shows the preview
first. When someone clicks **Run live**, it opens the actual generative artwork with the right
seed in a restricted iframe.

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

Unrevealed tokens and onchfs pieces that need extra setup show a clear status instead of failing
silently.

## Where the token comes from

You can start with whatever information your app already has:

| You have | Use |
| --- | --- |
| A collector address | `useWalletTokens(address)` finds the artwork they own |
| A project | `useProject({ chain, id })` lists its tokens (editions) |
| One exact token | `useToken({ chain, contract, tokenId })` reads it directly |

Start with the row that matches what your application already has. The `chain`, `contract`, and
`tokenId` values are simply the token’s address: its network, collection, and edition number.
Refs are optional packed strings for URLs and paste fields.

## Next

- Continue with **Projects and tokens** in the web docs for the data model.
- Use the guides for configuration, onchfs artwork, and variations.
- Install `@whitehash/chain-reader` only if you need the framework-free client.
