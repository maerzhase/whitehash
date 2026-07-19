# whitehash quickstart

Start with a Vite React + TypeScript app (React 18.3–19), then install the four public
layers used below:

```bash
pnpm add @whitehash/resolve @whitehash/chain-reader @whitehash/react @whitehash/ui
```

Keep Vite's generated `src/vite-env.d.ts`; if your scaffold omits it, create it with
`/// <reference types="vite/client" />`. Then define one complete configuration:

```ts
// src/config.ts
import { defaultResolverConfig } from "@whitehash/resolve"

export const config = {
  mode: "mainnet" as const,
  resolver: defaultResolverConfig(),
}
```

Mount the provider once in the generated Vite entry (all four React scenarios render
below it):

```tsx
// src/main.tsx
import { createRoot } from "react-dom/client"
import { WhitehashProvider } from "@whitehash/ui"
import { config } from "./config"
import { App } from "./App"
import "@whitehash/ui/styles.css"

createRoot(document.getElementById("root")!).render(
  <WhitehashProvider config={config}><App /></WhitehashProvider>,
)
```

The `token` prop in scenario 1 is a normalized `WhitehashToken` returned by
`useWalletTokens`, `useProject`, or `client.getToken(tokenRef)`.
Serialized token refs use `token/{chain}/{contract}/{tokenId}`; project refs use
`project/{chain}/{id}`. `parseRef` accepts either form and `formatRef` creates it.

## 1. Show one artwork on a blog page

```tsx
import { Artwork, Card } from "@whitehash/ui"
import type { WhitehashToken } from "@whitehash/chain-reader"

export function BlogArtwork({ token }: { token: WhitehashToken }) {
  return <Card.Root>
    <Card.Media><Artwork.Root token={token}>
      <Artwork.Image /><Artwork.Live /><Artwork.PlayButton />
    </Artwork.Root></Card.Media>
    <Card.Body><Card.Title>{token.name}</Card.Title></Card.Body>
  </Card.Root>
}
```

## 2. Render a wallet gallery

```tsx
import { WalletGallery } from "@whitehash/ui"

export function Collection({ address }: { address: string }) {
  return <WalletGallery address={address} onOpenToken={console.log} />
}

// <Collection address="tz1c3hFmjFSwunjLHECnYyjr42KRt5YiHrGX" />
```

## 3. Browse filtered projects

```tsx
import { useProjects } from "@whitehash/react"
import { formatRef, projectLabel } from "@whitehash/chain-reader"

export function RecentProjects() {
  const result = useProjects({
    chain: "tezos:mainnet", version: "v3", order: "newest", limit: 12,
  })
  return <>
    {result.projects.map(project => <a key={formatRef(project.ref)}
      href={`/projects/${formatRef(project.ref)}`}>
      {projectLabel(project)}
    </a>)}
    {result.hasMore && <button onClick={result.loadMore}>More</button>}
  </>
}
```

## 4. Show one project's iterations

```tsx
import { parseRef } from "@whitehash/chain-reader"
import { ProjectGallery } from "@whitehash/ui"

const project = parseRef(
  "project/tezos:mainnet/v3%3A13623",
  "project",
)

export function Iterations() {
  return <ProjectGallery project={project} onOpenToken={console.log} />
}
```

## 5. Use whitehash without React

```ts
import { createWhitehashClient, resolveInput } from "@whitehash/chain-reader"
import { config } from "./config"

const client = createWhitehashClient(config)

export async function inspect(pastedText: string) {
  const input = resolveInput(pastedText)
  if (input.type !== "address") return input
  const tokens = await client.getWalletTokens(input.address)
  return tokens.map(token => client.artworkUrl(token))
}
```
