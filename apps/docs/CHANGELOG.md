# @whitehash/docs

## 0.0.3

### Patch Changes

- Updated dependencies [94fe0b6]
  - @whitehash/ui@0.1.0

## 0.0.2

### Patch Changes

- Updated dependencies [f879b13]
- Updated dependencies [915d5a9]
  - @whitehash/chain-reader@0.0.2
  - @whitehash/react@0.0.2
  - @whitehash/ui@0.0.2

## 0.0.1

### Patch Changes

- 375274a: EVM ownership now defaults to Blockscout (open-source public-good indexer — the EVM
  analog of TzKT), with stale-placeholder metadata refresh from chain and the pure-RPC
  Transfer-log scan as automatic fallback. Adds contract-first project browsing
  (listProjects / project iterations) for both chains, surfaced in the viewer as a
  "browse" section with project grids and per-project iteration views.
- e20f2f6: Add a curated registry of ten real mainnet fxhash project references for demos,
  integration tests, and visual QA. Each ref is classified by chain, project kind,
  generator and metadata storage, capture mode, and notable runtime behaviors.

  Add a live project-specimens guide that lets readers switch between the curated
  projects and render one current minted iteration through the production hooks and
  Artwork component.

- a444676: Add `@whitehash/ui`, a composable design system built on Base UI + Tailwind v4: Button
  (with `useRender` slot), presentational Card compound, Badge, segmented ToggleGroup,
  form-agnostic Field/Input/Textarea, and feedback primitives, over a semantic token theme.
  Migrate the whole viewer to it (Tailwind v4 via `@tailwindcss/vite`, hand-rolled CSS
  removed) so the app is business logic composing components, and give it a light restyle
  (refined gallery-dark palette, logo hero).
- 236bf6d: Images now fall back across all configured IPFS gateways: a new `<GatewayImage>`
  component advances to the next gateway on load error instead of showing a broken
  placeholder, mirroring the metadata-fetch fallback (thumbnails, previews, and stills).

  Projects now report editions available vs. iterations created: `WhitehashProject` gains
  `editions` (max supply cap) and `minted` (actually created). Tezos reads both from the
  issuer ledger (`supply` + `iterations_count`, falling back to `supply − balance` on older
  issuers); EVM reports `minted` from Blockscout's ERC-721 total supply (cap not exposed
  on-chain). The viewer shows "N / M minted" on project cards and headers.

- 7087678: Add the static wallet viewer (address → owned tokens → live sandboxed rendering, with
  IndexedDB caching and mainnet/testnet settings) and the self-hostable onchfs proxy
  (Hono app resolving all six networks, deployable to Node/Vercel/Workers).
- 6ab6977: Add the framework-free `createWhitehashClient` facade and move token rendering
  semantics, including the gentk-v1 seed correction, into chain-reader. Introduce
  the headless `@whitehash/react` package with provider context, pluggable cache
  adapters, wallet/project hooks, gateway fallback, and artwork-frame state. Migrate
  the viewer to consume these packages and remove its app-local copies.
- f1d523c: Publish the complete whitehash design system: compound artwork and token components,
  wallet/project gallery blocks, address search, and dual precompiled/Tailwind-v4 styles.
- 35278e6: Add the package-owned documentation chrome and convert the viewer into a fully static,
  docs-first site with per-API live demos, guides, and preserved gallery showcases.
- e20f2f6: Add portable, versioned project iteration and single-token indexes with normalized
  display data, original token metadata, direct property access, JSON validation,
  and complete paginated project discovery.

  Use one shared normalized project summary in both formats. Single-token indexes
  enrich EVM collection metadata directly and resolve Tezos parent projects from
  gentk contract storage while representing unavailable fields explicitly as null.

  Normalize published fxhash capture settings on every project summary. Tezos
  single-token indexing follows the gentk token_data issuer ID back to the parent
  project so capture mode, trigger, GPU, resolution, selector, delay, and GIF
  timing data are available without an fxhash-hosted API.

  Add the focused `project`, `token`, `wallet`, and `verify` commands while retaining
  earlier implicit forms as compatibility aliases. Project indexing includes an EVM RPC
  mode that probes fxhash collection supply and token-ID boundaries before falling back
  to canonical mint events.

  Document project and token indexing, demonstrate both index formats through the existing
  Artwork component, and cover direct chain refreshes and offline archives in the docs app.

  Add a focused `useToken` React hook for loading and refreshing a single token index entry.
  Remove the public `TokenGrid` layout helper from the UI package so integrators compose
  token layouts from `Card` and `Artwork`, while gallery components retain their internal
  responsive grid.

- f59d7e8: Rework navigation: the project browser is now the home page, and wallet lookup is a
  spotlight-style search dialog opened from the nav ("Search wallet") or a keyboard
  shortcut (Cmd/Ctrl+K or "/"). Add a Dialog primitive to @whitehash/ui (Base UI Dialog:
  focus trap, scroll lock, dismissal, animated backdrop/popup). The browse surface is kept
  mounted across navigation so its filters, loaded projects, and scroll position survive
  drilling into a project and back (with manual scroll restoration taking over from the
  browser's).
- 291e948: Add newest/oldest sort ordering to project and iteration listings (Tezos via TzKT sort
  params; EVM project list sorted by creation block — the Blockscout instances endpoint has
  a fixed order, so per-project iteration sort is Tezos-only).

  Fix EVM project-browser iterations showing no live view: the browse path now refreshes
  Blockscout's cached mint-time placeholder metadata from chain (via tokenURI), same as the
  wallet path, so revealed artworks render. Project-card previews use a lightweight
  single-instance refresh to keep grids cheap.

- Updated dependencies [375274a]
- Updated dependencies [8171937]
- Updated dependencies [e20f2f6]
- Updated dependencies [a444676]
- Updated dependencies [236bf6d]
- Updated dependencies [7087678]
- Updated dependencies [7087678]
- Updated dependencies [6ab6977]
- Updated dependencies [f1d523c]
- Updated dependencies [35278e6]
- Updated dependencies [8224867]
- Updated dependencies [4ac2f08]
- Updated dependencies [4134600]
- Updated dependencies [e20f2f6]
- Updated dependencies [f59d7e8]
- Updated dependencies [4cdb273]
- Updated dependencies [291e948]
- Updated dependencies [21f922e]
- Updated dependencies [a176c14]
  - @whitehash/chain-reader@0.0.1
  - @whitehash/onchfs-sw@0.0.1
  - @whitehash/react@0.0.1
  - @whitehash/resolve@0.0.1
  - @whitehash/runtime@0.0.1
  - @whitehash/ui@0.0.1
