# whitehash — Implementation Plan

An open-source **toolkit** for building fxhash generative-art experiences into any
website — on **Tezos, Ethereum L1, and Base**, reading everything directly from public
blockchain infrastructure, with **zero dependency on fxhash-hosted services and zero
`@fxhash/*` npm dependencies**.

> **Reframe (July 2026).** whitehash's final outcome is a *library/toolkit*, not an app.
> Integrators get a **low-level API** (framework-free data + protocol packages), a
> **headless React layer** (hooks, no styling), and a **high-level composable components
> API** (drop-in, themeable). The app in this repo is the toolkit's *dev docs and
> showcase* — built with the toolkit itself (dogfooding), demonstrating every piece with
> live examples and copyable code. Everything in §3 (the knowledge base) and the data
> packages is unchanged by this reframe; what changes is that the app's internals get
> promoted into published packages, per §4.7. Toolkit architecture rules live in §4.7;
> milestones M10–M13 in §5 sequence the reframe.

This document is a complete handoff plan. Every contract address, API shape, and source
file path below was verified against the fxhash monorepo (local clone:
`/Users/m3000/repos/monorepo`) in July 2026. An executing agent should not need to
re-research these facts, but MUST re-verify anything marked ⚠️ before relying on it.

---

## 1. Mission & hard constraints

1. **No `@fxhash/*` package dependencies.** Code we need is extracted (vendored) into
   this repo with attribution. Everything we extract is MIT-licensed — keep the original
   copyright notice in vendored file headers (`Copyright (c) fxhash — originally from
   fxhash monorepo, MIT`).
2. **No fxhash-hosted infrastructure anywhere** — not as default, not as fallback. No
   `*.fxhash.xyz` / `*.fxhash2.xyz` URL may appear in the codebase except in docs
   explaining what we replaced. Allowed network dependencies:
   - Any public IPFS gateway (user-configurable; defaults `https://ipfs.io`, `https://dweb.link`)
   - Public RPC nodes (user-configurable)
   - TzKT public API (`https://api.tzkt.io`) — a public-good indexer for Tezos, not fxhash infra
   - The self-hostable onchfs proxy shipped in this repo (`apps/onchfs-proxy`)
3. **Everything browser-side must work fully client-side.** The docs/showcase app is a
   static site (deployable to GitHub Pages / IPFS / any static host), and no toolkit
   package may require a server to function. The onchfs proxy is the only server
   component in the project and is optional (only needed for `onchfs://` artworks).
4. Package namespace: `@whitehash/*`. **Not published to npm for now** — but the repo is
   designed changeset-first: changesets are configured in M0, and the executor adds a
   changeset alongside any meaningful package change, so version history accumulates and
   flipping to public npm later is a config change, not a migration.
5. **Testnets are first-class.** Every network-dependent piece (contracts, endpoints,
   snapshots, viewer) is keyed by network id, supporting Tezos ghostnet, Sepolia, and
   Base Sepolia alongside the three mainnets. The viewer defaults to mainnet with a
   testnet mode toggle. This keeps the door open for later features (e.g. testing
   whitehash against freshly minted testnet tokens).
6. External dep policy: `onchfs` (onchfs-js) is a regular npm dependency — confirmed
   published to npm (standalone MIT protocol library, no fxhash deps: taquito, viem,
   pako, hpack.js, js-sha3, file-type, mime-types). `viem` is the EVM client. No wagmi
   (no wallet connection anywhere — the viewer is read-only by address).

## 2. Repo layout

Target layout after the toolkit reframe (M10–M13). Packages are ordered by layer — each
depends only on layers below it:

```
whitehash/
  PLAN.md                     ← this file
  LICENSE                     ← MIT
  package.json                ← pnpm workspaces root
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json          ← strict: true
  .github/workflows/ci.yml    ← build + typecheck + test on PR
  packages/
    # — Layer 0: framework-free (the low-level API) —
    resolve/                  ← @whitehash/resolve      — URI → HTTP URL resolution
    chain-reader/             ← @whitehash/chain-reader — tokens/projects from chain,
                                token semantics (render URI, live-view status)
    runtime/                  ← @whitehash/runtime      — artwork runtime controller (M6)
    onchfs-sw/                ← @whitehash/onchfs-sw    — client-side onchfs resolution (M9)
    # — Layer 1: headless React (hooks, zero styling) —
    react/                    ← @whitehash/react        — provider, hooks, cache (M10)
    # — Layer 2: THE design system (published) — primitives + domain components —
    ui/                       ← @whitehash/ui           — Button/Card/Dialog/… primitives
                                AND Artwork.*, TokenGrid, gallery blocks (M11)
  apps/
    docs/                     ← dev docs + live showcase (was apps/viewer), Vite + React —
                                assembled EXCLUSIVELY from @whitehash/ui
    onchfs-proxy/             ← Hono middleware, self-hostable
    archive-cli/              ← preservation CLI (M7)
```

Tooling: pnpm workspaces + turbo, TypeScript strict, `vitest` for tests, `tsup` for
package builds, changesets for versioning.

**Toolkit dependency policy** (what integrators inherit): Layer 0 packages depend only on
`viem` / `onchfs` / nothing. Layer 1 adds a `react` peer dep — no styling system, no
component library. Layer 2 is **`@whitehash/ui` — a single published, opinionated design
system** (the whitehash brand look) containing both the generic primitives and the
art-domain components; whoever adopts it gets the consistent whitehash aesthetic out of
the box and restyles through the design-token layer (`theme.css` CSS variables), not by
bringing their own component library. It is consumable **two ways**: (a) non-Tailwind
projects import a **precompiled `@whitehash/ui/styles.css`** (built at package build time
by running Tailwind over the package source — consumers need no Tailwind toolchain);
(b) Tailwind v4 projects import `@whitehash/ui/theme.css` + add an `@source` line for the
package, composing with our tokens/utilities directly. Both paths are first-class and
documented; the docs app uses (b).

---

## 3. Verified facts (the knowledge base)

### 3.1 Chains & networks

| Network | ID | fxhash deployed? |
|---|---|---|
| Tezos mainnet | `NetXdQprcVkpaWU` | yes (gentk v1/v2/v3) |
| Tezos ghostnet | `NetXnHfVqm9iesp` | yes (testnet) |
| Ethereum mainnet | `eip155:1` | yes (FxGenArt721 core; NOT the newer launchpad features) |
| Base mainnet | `eip155:8453` | yes (fullest deployment) |
| Sepolia | `eip155:11155111` | yes (testnet) |
| Base Sepolia | `eip155:84532` | yes (testnet) |

v1 supports all six networks. The viewer UI defaults to mainnet mode; a settings toggle
switches to testnet mode (ghostnet + Sepolia + Base Sepolia). The libraries treat every
network uniformly — network id in, results out.

### 3.2 Tezos contract addresses (mainnet)

Source: monorepo `packages/public/fxhash-package/packages/config/src/contracts/tezos.ts`.

| Contract | Address |
|---|---|
| gentk_v1 (FA2 NFT) | `KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE` |
| gentk_v2 (FA2 NFT) | `KT1U6EHmNxJTkvaWJ4ThczG4FSDaHC21ssvi` |
| gentk_v3 (FA2 NFT, params) | `KT1EfsNuqwLAWDd3o4pvfUx1CAh5GMdTrRvr` |
| onchfs_files | `KT1Ae7dT1gsLw2tRnUMXSCmEyF74KVkM6LUo` |

Ghostnet gentks: v1 `KT1ExHjELnDuat9io3HkDcrBhHmek7h8EVXG`, v2
`KT1NkZho1yRkDdQnN4Mz93sDYyY2pPrEHTNs`, v3 `KT1TtVAyjh4Ahdm8sLZwFnL7tqoLf59XrK2h`;
ghostnet onchfs_files `KT1FA8AGGcJha6S6MqfBUiibwTaYhK8u7s9Q`.

TzKT base URLs: mainnet `https://api.tzkt.io`, ghostnet `https://api.ghostnet.tzkt.io`.

### 3.3 EVM contract addresses

Source: monorepo `config/src/contracts/eth.ts` + `base.ts`. Note: the `eth.ts` file has a
stale "TODO put actual addresses" comment — **the addresses ARE real** (verified against
the production eth-indexer configuration); only the ERC-20 `fx_token` is a `0xTODO`
placeholder on L1 and is irrelevant to us.

| Contract | Ethereum mainnet | Base mainnet |
|---|---|---|
| FxIssuerFactory (`issuer_factory_v1`) | `0x442295de8A31d65026dBc09c29d469F6854f188a` | `0xf05636d65c7a10dF989eC2411D4F3230d3A02f3D` |
| FxContractRegistry | `0x4DAc308c686D747A804B7E95db606695a529A750` | `0xCa6e30B1C7cBE7cF605cE30B334f968C5E2EA016` |
| FxGenArt721 impl | `0x429AC1aA66220573Da6928bcce7384fe50e1284f` | `0xC5769428823C9a0393DC66855DD3817b2A85BEFD` |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` | same (canonical) |
| onchfs FileSystem | `0x9e0f2864c6f125bbf599df6ca6e6c3774c5b2e04` | `0x2983008f292a43f208bba0275afd7e9b3d39af3b` |
| fx_media_factory (optional, M7+) | `0x7FE0F93695FDC9fF438df3e580f3c0B1389d10cD` | `0xCeBda97CEAb732f3e07D87b064aC5f1F17D252E3` |

| Contract | Sepolia | Base Sepolia |
|---|---|---|
| FxIssuerFactory (`issuer_factory_v1`) | `0x4e9ef916F55B5d4a27E6406C7Ce8bcd29c2693d6` | `0x60cFDE3aaf6E938535767794088cf15EaaC50019` |
| FxContractRegistry | `0xb7CFDcDb2c6a1D05D7b85FB4ae7B7bccd028010F` | `0xd44B3b2Ee596613c1aFcF85c9b0E41A0ec8B79E2` |
| FxGenArt721 impl | `0x1feeb359e96E6Dd6F19F1FC98e8FffDdf5AeaD58` | `0x06976f5C039497d8a79Cc0dCE7A95B3E9748164A` |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` | same (canonical) |
| onchfs FileSystem | `0x4f555d39e89f6d768f75831d610b3940fa94c6b1` | `0x3fb48e03291b2490f939c961a1ad088437129f71` |
| fx_media_factory (optional, M7+) | `0x0f6Bf7a0BEB7f6c009Bee7C8d770d4218A5167b8` | `0x65d70d10d7A258c18b3B9768dd27b81455FD224c` |

**Indexing start blocks** (from `eth-indexer/src/config/{eth,base}-config.ts`):
Ethereum mainnet `18762350` (~Dec 2023), Base mainnet `10786140`, Sepolia `5013011`,
Base Sepolia `8763620`.

**Factory event** (from `eth-indexer/abi/FxIssuerFactory.json`):

```solidity
event ProjectCreated(uint96 indexed _projectId, address indexed _genArtToken, address indexed _owner)
```

`_genArtToken` is the address of a newly deployed FxGenArt721 collection. This is how
the set of NFT contracts is discovered — fxhash's own indexer does exactly this
(subscribe to `ProjectCreated`, maintain a set of collection addresses, then attribute
`Transfer` logs by set membership).

**FxGenArt721 ABI functions we need** (extract from monorepo
`packages/public/fxhash-package/packages/eth/src/abi/FxGenArt721.ts` into a plain
viem-compatible const): `balanceOf(address)`, `ownerOf(uint256)`, `tokenURI(uint256)`,
`totalSupply()`, and the `Transfer` event.

**VERIFIED (2026-07-12): FxGenArt721 does NOT implement ERC721Enumerable.**
`supportsInterface(0x780e9d63)` on the deployed Base mainnet implementation
(`0xC5769428823C9a0393DC66855DD3817b2A85BEFD`) returns `false` (while ERC721
`0x80ac58cd` and ERC721Metadata `0x5b5e139f` return `true`; `supportsInterface` here is
a function of code, not storage, so this holds for all cloned collections). There is no
`tokenOfOwnerByIndex` in FxGenArt721's ABI either — a match in the monorepo's generated
`wagmi.ts` belongs to the unrelated `projectTokenAbi`. Therefore **Transfer-log scanning
is the ownership mechanism** (§3.7), not enumeration.

### 3.4 Token metadata lifecycle (CRITICAL — applies to both chains)

Two-phase lifecycle:
1. **At mint**, the token points at shared **placeholder metadata** ("This Gentk is
   waiting to be signed by Fxhash Signer module"). EVM: contract `metadataInfo().baseURI
   == "0x"` sentinel. Tezos: gentk minted with `assigned = false`, `token_metadata`
   big-map points at a shared placeholder document.
2. **After reveal/signing**, real metadata exists: EVM `baseURI = ipfs://{CID}` is set
   on-chain (per-token metadata at `ipfs://{CID}/{tokenId}/metadata.json`); Tezos
   `assign_metadata` rewrites the `token_metadata` big map to the token's own
   `ipfs://Qm…` metadata.

The viewer must detect and gracefully display unsigned tokens (badge "not yet revealed",
show placeholder image, no live view). Detection: metadata JSON lacking `iterationHash`
or with the known placeholder description; on EVM also `tokenURI` reverting or baseURI
sentinel.

### 3.5 Signed-token metadata JSON shape (both chains, shared builder upstream)

```
name                // "{project} #{iteration}"
description
iterationHash       // the token's fxhash seed
generatorUri        // ipfs://{cid} or onchfs://{cid} — generator code, NO query params
artifactUri         // generatorUri + "/?fxhash=…&fxiteration=…&fxminter=…&fxchain=…"
                    //   plus params: "#0x{inputBytes}" (new snippets) or "&fxparams=…" (old)
displayUri          // ipfs:// HQ preview image
thumbnailUri        // ipfs:// thumbnail
displayStillUri?    // ipfs:// still (for animated pieces)
attributes          // EVM: [{trait_type, value}] (OpenSea shape); Tezos may use [{name, value}]
authenticityHash, symbol ("GENTK"), version, snippetVersion
// EVM additionally (OpenSea fields):
image, animation_url, external_url
```

**Key consequence: `artifactUri` is self-contained.** The full render URL (hash,
iteration, minter, chain, param bytes) is already embedded. The viewer does NOT need the
fxhash runtime controller to display a minted token — resolve `artifactUri` to an HTTP
URL (preserving query string AND fragment) and load it in a sandboxed iframe.

⚠️ Caveat: `animation_url` on EVM tokens whose artifact is `onchfs://` was rewritten by
fxhash to point at **their** onchfs proxy (`https://onchfs.fxhash2.xyz/...`). Always
prefer `artifactUri` (protocol-native) over `animation_url`, and route `onchfs://`
through OUR resolver. Never use `animation_url` when `artifactUri` exists.

Old Tezos tokens (gentk v1 era) have simpler `artifactUri` like
`ipfs://{cid}?fxhash={hash}` — the same "resolve and preserve query" logic covers them.

### 3.6 Tezos reading via TzKT

- **Holdings in one call** (metadata included — TzKT indexes TZIP-21):
  `GET https://api.tzkt.io/v1/tokens/balances?account={address}&balance.ne=0&token.contract.in={gentk_v1},{gentk_v2},{gentk_v3}&limit=200&offset={n}`
  Response items: `{ token: { contract: {address}, tokenId, metadata: {…TZIP-21 JSON…} }, balance }`.
  Paginate by `offset` until fewer than `limit` items return.
- If `token.metadata` is missing/null (TzKT occasionally hasn't indexed it), fall back to
  reading the metadata URI from the big map:
  `GET /v1/contracts/{contract}/bigmaps/token_metadata/keys/{tokenId}` → value
  `token_info[""]` is hex-encoded UTF-8 of the URI (e.g. `ipfs://Qm…`); hex-decode, fetch
  via resolver.
- Tezos gentk `inputBytes` (v3 params tokens) live in the `token_data` big map field
  `input_bytes` — but we don't need them separately for viewing since they're already
  embedded in `artifactUri`. Only the M6 runtime/explore mode reads them.

### 3.7 EVM reading via RPC (no indexer)

Discovery of collections + ownership, pure `viem`:

- `getLogs({ address: issuerFactory, event: ProjectCreated, fromBlock, toBlock })`,
  chunked (public RPCs limit ranges; default chunk 10,000 blocks, halve on error, make
  configurable). From start blocks in §3.3.
- **Snapshot strategy** (important for UX): scanning ~2.5 years of blocks on first page
  load is unacceptable. `packages/chain-reader` ships committed snapshots, one per EVM
  network (`snapshots/eip155-1.json`, `snapshots/eip155-8453.json`,
  `snapshots/eip155-11155111.json`, `snapshots/eip155-84532.json`):
  `{ chainId, lastScannedBlock, collections: [{ address, projectId, createdAtBlock }] }`
  generated by a repo script (`pnpm --filter @whitehash/chain-reader snapshot:update`)
  that runs the same discovery code. At runtime the library loads the snapshot and scans
  only `lastScannedBlock → head` (seconds, not minutes). Snapshots are refreshed by CI
  cron or manually before releases. Document that a user can always pass
  `{ snapshot: null }` to force a full trustless scan.
- **Ownership** (FxGenArt721 is NOT Enumerable — verified, §3.3): derive holdings from
  `Transfer` logs. `getLogs` accepts an **address array** in viem — query all snapshot
  collection addresses at once (chunk the address list at ~1,000 per call if the RPC
  complains), once with `topics[2] = pad(owner)` (received) and once with
  `topics[1] = pad(owner)` (sent), over `startBlock → head`. Because owner-topic-filtered
  results are tiny, use **adaptive block ranges**: attempt the widest range the RPC
  allows first and halve on error, rather than fixed small chunks (fixed 10k-block chunks
  would mean thousands of requests on Base). Diff received−sent per (contract, tokenId)
  to get candidate holdings, then confirm each with a multicalled `ownerOf` (batches of
  500) — this also catches transfers the log scan window missed. `balanceOf` multicall
  across collections can serve as a cheap cross-check but cannot list token ids.
- **Metadata**: multicall `tokenURI(tokenId)` for owned tokens. Expect
  `ipfs://{CID}/{tokenId}/metadata.json` for revealed tokens; also handle `https://`,
  `onchfs://`, and `data:application/json;base64,` defensively. Fetch through the
  resolver. Reverts / `baseURI == "0x"` → unsigned state (§3.4).

### 3.8 onchfs

`onchfs` npm package (onchfs-js): `Onchfs.resolver.create([{blockchain, rpcs, contract?}])`
returns `resolve(path) → {status, headers, content}`. Supported network identifiers:
`tezos:NetXdQprcVkpaWU`, `tezos:NetXnHfVqm9iesp`, `eip155:1`, `eip155:5`,
`eip155:11155111`, `eip155:8453`, `eip155:84532` — with **built-in default onchfs
contract addresses for all of them** (verified in onchfs-js `src/config.ts`). Reference
Express proxy: monorepo `packages/public/onchfs/examples/http-proxy/src/index.ts`.

`onchfs` is published to npm (confirmed by the maintainer) — use it as a regular
dependency. Still sanity-check with `npm view onchfs` that the published version
includes the resolver API described above (the monorepo copy is the source of truth if
the npm version lags).

### 3.9 What we deliberately do NOT support

- Marketplace data (listings, prices) — requires an indexer; out of scope.
- Project/collection browsing beyond a wallet's holdings — out of scope for v1.
- fx mint tickets (ERC-721 but not artworks), ArtCoins (ERC-20), articles — out of scope.
- fx(media) collective media tokens — optional stretch (M7+), addresses in §3.3.
- Pre-mint preview (`temp://` / fsEmulator URIs) — fxhash-infra-bound, excluded entirely.

---

## 4. Package specifications

### 4.1 `@whitehash/resolve`

Tiny, zero-dependency. The single source of truth for URI → HTTP URL.

```ts
interface ResolverConfig {
  ipfsGateways: string[]        // ordered; default ["https://ipfs.io", "https://dweb.link"]
  onchfs: { mode: "service-worker"; basePath?: string }
    | { mode: "proxy"; baseUrl: string }
    | null
}
createResolver(config): {
  resolveUri(uri: string): string | null   // null = unresolvable (e.g. onchfs w/o proxy, temp://)
  resolveUriAll(uri: string): string[]     // one URL per gateway, for fallback fetching
}
fetchWithGatewayFallback(uri, config, init?): Promise<Response>  // tries gateways in order
```

Resolution rules (port of monorepo `config/src/utils/ipfs.ts` `proxyUrl`, 76 LOC, minus
fxhash defaults):
- `data:`, `blob:`, `http(s)://` → as-is
- `ipfs://{cid}[/path][?query][#fragment]` and bare CIDs →
  `{gateway}/ipfs/{cid}[/path][?query][#fragment]` — **query and fragment MUST be
  preserved** (artifact URIs carry `?fxhash=…#0x…`)
- `onchfs://{cid}[/path][?query][#fragment]` → a chain-scoped same-origin worker path
  by default, or `{proxyBase}/{cid}…` in proxy mode (same preservation)
- `temp://` → null (fxhash pre-mint emulator, unsupported by design)

Tests: table-driven over all URI shapes incl. query+fragment preservation, v1-era
`ipfs://{cid}?fxhash=…` (query directly on CID, no path).

### 4.2 `@whitehash/chain-reader`

Deps: `viem`, `@whitehash/resolve`. No taquito needed — Tezos side is pure `fetch`
against TzKT.

```ts
type ChainId =
  | "tezos:mainnet" | "tezos:ghostnet"
  | "eip155:1" | "eip155:11155111"          // eth mainnet / sepolia
  | "eip155:8453" | "eip155:84532"          // base mainnet / base sepolia

interface WhitehashToken {
  chain: ChainId
  contract: string
  tokenId: string
  name: string | null
  description: string | null
  iterationHash: string | null
  artifactUri: string | null      // protocol-native (ipfs:// | onchfs://), verbatim from metadata
  displayUri: string | null
  thumbnailUri: string | null
  generatorUri: string | null
  attributes: { name: string; value: string }[]   // normalized from both shapes (§3.5)
  assigned: boolean               // false = placeholder/unrevealed (§3.4)
  metadataUri: string | null
  raw: unknown                    // untouched metadata JSON
}

interface ChainReaderConfig {
  resolver: ResolverConfig
  tzkt?: Partial<Record<"tezos:mainnet" | "tezos:ghostnet", string>>
    // defaults: https://api.tzkt.io / https://api.ghostnet.tzkt.io
  evm?: {
    rpcs?: Partial<Record<ChainId, string[]>>            // best-practice keyless public defaults per
                                                         // network (e.g. base → https://mainnet.base.org);
                                                         // executor picks CORS-friendly ones and verifies
                                                         // eth_getLogs limits empirically
    logChunkSize?: number                                // default 10_000
    snapshot?: EvmSnapshot | null                        // default: bundled; null = full scan
  }
  concurrency?: number                                   // metadata fetch parallelism, default 8
}

getWalletTokens(address: string, chains: ChainId[], config, onProgress?): Promise<WhitehashToken[]>
// plus exported internals for the CLI/scripts:
discoverEvmCollections(chain, config): Promise<EvmSnapshot>
detectAddressChains(address, mode: "mainnet" | "testnet"): ChainId[]
  // tz1|tz2|tz3 → tezos network of the mode; 0x… → both EVM networks of the mode.
  // An address is valid on mainnet and testnet alike, so the caller picks the mode
  // (the viewer's mainnet/testnet toggle) rather than scanning all six networks.
```

Implementation per §3.6/§3.7. Address validation up front (checksum EVM, base58 Tezos).
All fetches: retry with backoff on 429/5xx; TzKT politeness delay between pages.

Tests: unit tests with recorded JSON fixtures (TzKT response, tokenURI results,
metadata JSONs incl. one placeholder) + one opt-in live integration test
(`WHITEHASH_LIVE_TEST=1`) that finds a currently-active holder by querying recent
transfers (Tezos: `GET /v1/tokens/transfers?token.contract={gentk_v3}&limit=1&sort.desc=id`
→ use `to.address`; EVM: latest `Transfer` log on any snapshot collection) and asserts
`getWalletTokens` returns ≥1 token with a resolvable `artifactUri`.

### 4.3 `apps/onchfs-proxy`

Hono app (runs on Vercel functions, Cloudflare Workers, Deno, and plain Node without
code changes — export the fetch handler, provide thin per-platform entries).

- `GET /*` → `resolve(path)` via onchfs-js resolver configured for all six networks:
  `tezos:NetXdQprcVkpaWU`, `tezos:NetXnHfVqm9iesp`, `eip155:1`, `eip155:11155111`,
  `eip155:8453`, `eip155:84532` (contracts default from the lib; RPC lists from env vars
  `ONCHFS_TEZOS_RPCS`, `ONCHFS_GHOSTNET_RPCS`, `ONCHFS_ETH_RPCS`, `ONCHFS_SEPOLIA_RPCS`,
  `ONCHFS_BASE_RPCS`, `ONCHFS_BASE_SEPOLIA_RPCS`, comma-separated, with public defaults).
- Response headers from the resolver, plus `Cache-Control: public, max-age=31536000,
  immutable` on 200s (content-addressed → safe) and permissive CORS (`*`).
- `GET /health` → 200.
- README with one-click Vercel deploy button + `npx` local run instructions.
- ⚠️ Node runtime caveat: onchfs-js uses taquito/viem — check bundle works within
  Vercel's function size limits; if Workers build fails on Node built-ins, ship the
  Vercel/Node targets only and say so in the README.

Verification: deploy locally, resolve a known mainnet onchfs URI — take any Base or
Tezos onchfs-rendered project's `generatorUri` found during M3 testing; expect 200 +
HTML. (An executing agent can find one by scanning fetched metadata for `onchfs://`.)

### 4.4 `apps/viewer` → becomes `apps/docs` (see §4.7 / M12)

> Post-reframe: this app is the toolkit's docs + showcase. The spec below remains valid
> as the showcase flows' behavior; the app's *internals* migrate to packages per §4.7.

Vite + React + TypeScript, `@tanstack/react-query`, tailwind. Static build, no server.
Routes (hash-router so it works from any static host/IPFS without rewrites):

- `#/` — address input (accepts tz…/0x…, auto-detect chains, allow multiple addresses
  comma-separated), chain checkboxes, mainnet/testnet mode indicator, "recent addresses"
  from localStorage.
- `#/wallet/{address}` — grid of tokens (lazy-loaded `thumbnailUri`/`displayUri` images
  via resolver with gateway fallback; unsigned badge; chain badge; progress indicator
  streaming in per-chain results via `onProgress`).
- `#/token/{chain}/{contract}/{tokenId}` — detail: sandboxed live view iframe
  (`sandbox="allow-scripts allow-same-origin allow-modals"`,
  `allow="accelerometer; camera; gyroscope; microphone; xr-spatial-tracking"` — values
  from fxhash's own `ArtworkIframe`), play/pause toggle between `displayUri` image and
  live iframe, metadata panel (attributes, hash, links to raw metadata/artifact on a
  gateway), "open fullscreen" (direct resolved URL).
- `#/settings` — mainnet/testnet mode toggle, IPFS gateway list (orderable), onchfs
  proxy URL, per-network RPC URLs, TzKT base URLs; persisted to localStorage; "reset to
  defaults"; export/import JSON.
- Security note in code: path-style public gateways share origin across artworks; the
  iframe sandbox mitigates; document subdomain-gateway option in README.

No wallet connect, no signing, no fxhash branding (name it plainly "whitehash viewer").

### 4.5 `@whitehash/runtime` (M6 — enhancement, not needed for viewing)

Purpose: interactive exploration — re-render a token with a different hash/params, live
param controls (the fxhash "variations" experience), driving artworks via postMessage.

Extraction map (source paths relative to `/Users/m3000/repos/monorepo`, all MIT):

| Source | → Destination | Changes |
|---|---|---|
| `packages/public/fxhash-package/packages/core/src/project/runtime/*` (8 files, 1,179 LOC) | `packages/runtime/src/` | `connectors.ts` is the ONLY file importing `@fxhash/config`: replace with injected `{ resolveUri, fsEmulatorBase?: null, legacyWrapperBase?: null }` (drop temp/legacy paths — fxhash-infra-bound) |
| `packages/react/src/components/Artwork/Iframe.tsx` (49 LOC) | `packages/runtime/src/react/ArtworkIframe.tsx` | replace `@fxhash/ui` `cn` with `clsx` |
| `packages/client-react/src/hooks/useRuntimeController.ts` (107 LOC) | `packages/runtime/src/react/useRuntimeController.ts` | repoint imports from `@fxhash/sdk` to local; no other changes (verified: no Apollo/GraphQL imports) |
| `packages/params/src/types.ts` + `utils.ts` (~700 LOC; skip `validation.ts` → drops the zod dep) | `packages/runtime/src/params/` | none |
| `packages/utils/src/`: `events.ts` (134), `control-flows/initialization.ts` (173), `hash.ts` (105), `address.ts` (65), `bytes.ts` (49), `float.ts` (30), `cleanup.ts` (33), `errors.ts` (21), `BASE58_CHARSET` const, `DeepPartial` type | `packages/runtime/src/vendor/` | none (all self-contained, zero external deps) |
| `@fxhash/shared` usage | local | replace with 5-line local `enum BlockchainType { ETHEREUM="ETHEREUM", BASE="BASE", TEZOS="TEZOS" }` + `type RawTokenFeatures = Record<string, any>` — do NOT vendor the package |

npm deps carried: `lodash.clonedeep`, `lodash.mergewith`, `lodash.debounce`, `semver`;
peer: `react` (React exports in a `/react` subpath so the core stays framework-free).
React exports: `ArtworkIframe`, `useRuntimeController`. Core: `createRuntimeController`
and the existing public API of `_index.ts`.

Viewer integration: an "explore" tab on the token detail page — inputs from the token's
metadata (`generatorUri` → cid, `iterationHash`, params `inputBytes` parsed from the
`artifactUri` fragment/query, `snippetVersion`), controller re-renders on new hash /
param edits.

### 4.6 `apps/archive-cli` (M7)

`npx @whitehash/archive <address...> [--chains tezos,eip155:1,eip155:8453] [--out dir]`

Per token, write `{out}/{chain}/{contract}/{tokenId}/`:
- `metadata.json` (raw), `thumbnail.*` + `display.*` (fetched via resolver)
- `artifact/` — the full generator:
  - IPFS: fetch the generator CID as a **CAR via trustless gateway** (`{gateway}/ipfs/{cid}?format=car`,
    IPIP-402; supported by ipfs.io/dweb.link) and unpack with `ipfs-car`/`@helia/car` —
    this preserves the whole directory tree AND lets us verify content hashes (real
    preservation). Fallback for gateways without CAR: recursive fetch is NOT reliable;
    just try the next gateway.
  - onchfs: walk via onchfs-js resolver directly (no proxy needed in Node).
- `index.html` — a wrapper that opens `artifact/index.html` with the token's original
  query string + fragment, so the folder replays offline.
- Top-level `index.html` gallery over everything archived + `manifest.json`.

### 4.7 The toolkit reframe: API layers & extraction map

whitehash's product is the toolkit; the app is its documentation. Integrators choose
their altitude:

```
Layer 0  @whitehash/resolve · chain-reader · runtime · onchfs-sw   (framework-free JS)
Layer 1  @whitehash/react                                          (headless hooks)
Layer 2  @whitehash/ui                                             (the design system:
                                                                    primitives + domain)
Docs     apps/docs                                                 (showcase, built solely
                                                                    from @whitehash/ui)
```

**Layer 0 — the low-level API (framework-free).** Already largely built. Additions:

- Move the pure token semantics currently living in the app (`apps/viewer/src/render.ts`)
  **down into `@whitehash/chain-reader`**: `renderArtifactUri` (applies the gentk-v1
  separate-`iterationHash` seed — hard-won correctness that must not stay app-private),
  `imageSourceUri`, `artworkUrl`, `liveViewStatus`. These are chain/domain logic, not UI.
- Add a `createWhitehashClient(config)` facade in `@whitehash/chain-reader` bundling the
  per-call config threading (`getWalletTokens`/`listProjects`/`resolveUri`/… as bound
  methods) — the one-import entry point for non-React consumers.
- `@whitehash/runtime` (M6) ships framework-free with a `/react` subpath export.
- `@whitehash/onchfs-sw` (M9) becomes a package (SW registration + virtual-path resolver)
  rather than an app feature.

**Layer 1 — `@whitehash/react`, the headless React API (M10).** Extracted from the app;
zero styling; peer-dep `react` only. Per the composable-component criteria: *headless
hooks own the ceremony* (fetching, caching, progress, gateway fallback, iframe state);
components at layer 2 stay thin.

- `<WhitehashProvider config={…}>` — context carrying `ChainReaderConfig`/resolver +
  pluggable cache. Every hook reads it (overridable per-call).
- `useWalletTokens(address)` — from `apps/viewer/src/useWalletTokens.ts`: per-chain
  progress states, cache-first + live refresh.
- `useProjects({chain, version?, order?, limit?})` / `useProject(projectRef, opts)` —
  parallel list/detail lifecycles from `useBrowse.ts`; list results progressively hydrate
  missing preview fields through the universal client API.
- `useGatewayImage(uri, chain)` — the multi-gateway fallback as a hook (from
  `GatewayImage.tsx`): returns `{src, onError, failed}` so any `<img>` gets resilience.
- `useArtworkFrame(token)` — live-view state machine (from `ArtworkFrame.tsx`):
  `{status, playing, play, stop, iframeProps}` where `iframeProps` carries the artwork
  URL + the sandbox/allow attribute set — the a11y/security ceremony in one place.
- Cache: the IndexedDB wallet cache (from `cache.ts`) behind a `WhitehashCache`
  interface (pluggable; default `idb-keyval` implementation, `memory` for SSR/tests).

**Layer 2 — `@whitehash/ui`, the published design system (M11).** ONE package holding
both tiers, so adopters get a fully consistent product:

- **Primitives** (exist today): `Button` (useRender slot), `Card`, `Badge`, `Dialog`,
  `ToggleGroup` (animated indicator), `Field`/`Input`/`Textarea`, `Spinner`/`Skeleton`/
  `Separator`, `cn`, plus the design tokens (`theme.css`). The whitehash brand look
  (surf-print system) ships as the default; theming = overriding token variables.
- **Domain components** (extracted from the app in M11), compound Root/Part per the
  established criteria (Root owns state via context; parts consume; slots only on
  behavioral parts); internally they consume `@whitehash/react` hooks and compose the
  primitives above:
  - `<Artwork.Root token>` + `Artwork.Image` (gateway-fallback still) / `Artwork.Live`
    (sandboxed iframe) / `Artwork.PlayButton` / `Artwork.StatusBadge` — the ArtworkFrame
    decomposed so integrators recompose or restyle any part.
  - Token cards are the documented `Card.*` + `Artwork.*` composition recipe, not a
    second compound family. `TokenGrid` is layout/loading only and owns no token markup.
  - Blocks: `<WalletGallery address>`, `<ProjectBrowser chain>`, `<ProjectGallery chain
    ref>` — one-liner embeds wrapping hooks + grids (the current BrowseView/ProjectView/
    WalletView, generalized: navigation delegated to callbacks/slots, never hardcoded).
  - `<AddressSearch onSubmit>` — wallet-search input with validation + recents (and the
    spotlight `WalletSearch` dialog composition, since Dialog is in the package).
- Package deps: `@whitehash/react` + layer 0 + `@base-ui-components/react`, CVA, clsx,
  tailwind-merge; `react` as peer. Ships precompiled `styles.css` AND `theme.css` +
  source for Tailwind consumers (see §2 dependency policy).

**Extraction inventory** (current app file → toolkit home):

| Today (`apps/viewer/src/`) | Toolkit home |
| --- | --- |
| `render.ts` (renderArtifactUri, liveViewStatus, …) | `@whitehash/chain-reader` (L0) |
| `cache.ts` (IndexedDB wallet cache) | `@whitehash/react` cache impl (L1) |
| `useWalletTokens.ts` | `@whitehash/react` (L1) |
| `useBrowse.ts` (useProjects/useProject/useEvmProjectCard) | `@whitehash/react` (L1) |
| `components/GatewayImage.tsx` | hook → L1; styled part → `Artwork.Image` (L2) |
| `components/ArtworkFrame.tsx` (incl. sandbox/allow constants) | `useArtworkFrame` (L1) + `Artwork.*` (L2) |
| `components/TokenGrid.tsx` | private block recipe using `Card`/`Artwork`; `TokenGrid` layout utility (L2) |
| `components/BrowseView.tsx`, `ProjectView.tsx`, `WalletView` (in App) | blocks tier (L2), nav via callbacks |
| `components/WalletSearch.tsx` | `AddressSearch` + `WalletSearch` dialog (L2, in `@whitehash/ui`) |
| `settings.ts` (settings → config mapping) | docs app only; integrators construct config directly |
| `App.tsx` routing/scroll keep-alive | docs app only |

**apps/docs (M12)** — the reframed app: docs-first structure (getting started; choose
your layer; per-hook and per-component pages with live example + copyable code; theming
guide with the design-token variable reference; guides for Vite/Next/self-hosting the
onchfs proxy), plus the existing browse/wallet/token flows kept as full-app showcases.
**Hard rule: the docs app is assembled exclusively from `@whitehash/ui`** for toolkit
and product UI — it contains routing, docs content, and composition only; no bespoke
toolkit component CSS (page-layout glue at most). **Explicit docs-chrome exception:**
`SiteHeader`, `DocsShell`, `CodeBlock`, and related documentation-only presentation stay
app-local. In particular, syntax highlighting (currently `prism-react-renderer`) must
not become a dependency of `@whitehash/ui`. These components explain the product but
are not part of the embeddable design-system surface.

### 4.8 API ergonomics & composability review (M14) — the "first glimpse" bar

The toolkit's API must be the most natural one possible: **understandable at first
glimpse, guessable without docs**. The current surface grew by extraction from the app,
which preserved behavior but fossilized some app-shaped seams. M14 is a deliberate
review-and-break pass over every public export — done BEFORE the first npm publish,
while breaking changes are free (`0.0.0`, nothing published). First publish is gated on
M14.

**Method (README-driven design):**
1. Write the ideal quickstart snippets FIRST — five scenarios, each ≤15 lines: (a) show
   one artwork on a blog page; (b) wallet gallery; (c) browse projects with filters;
   (d) one project's iterations; (e) non-React usage via `createWhitehashClient`. Derive
   the API from what those snippets *want* to say, then reshape the packages to match.
2. Inventory every export of `chain-reader`/`react`/`ui`; each must justify its
   existence and its name to a first-time reader. Naming rules: no chain names in public
   API names (chain is a *value*, never an identifier), no internal jargon
   (issuer/gentk/ledger stay internal), verbs for actions, nouns for data.
3. Acceptance: a fresh agent/person given ONLY the quickstart page (no source, no other
   docs) reproduces all five scenarios; every removed/renamed export has a changeset
   documenting the break.

**Known critiques to resolve (recorded 2026-07-19; each needs an explicit decision in
code + a line in the M14 changeset):**

1. **`useProjects` vs `useProject` — why two hooks?** Review whether list-vs-single is
   just data shape, not two concepts. Candidate direction: one `useProjects(chain,
   {ref?, limit, cursor, order})` where passing `ref` narrows to one project (same
   return shape, array of 0..n) — or keep two hooks but make `useProject` purely "one
   project + its iterations" with obviously parallel naming/signatures. Decide by
   writing scenario (c) and (d) snippets both ways; pick what reads naturally.
2. **`useEvmProjectCard` — chain-specific leakage, opaque name.** EVM factory logs carry
   no name/preview, so the app grew a lazy-enrichment hook. The chain difference must
   disappear inside the data layer: EITHER `useProjects` progressively hydrates missing
   fields itself (projects emit updates as enrichment lands — preferred), OR a universal
   `useProjectPreview(project)` that no-ops when data is already present. No public API
   may encode "Evm"/"Tezos" in its name.
3. **Refs/addresses are opaque.** `v2:11104` and bare contract addresses leak internals.
   Introduce a first-class reference story: a documented `ProjectRef`/`TokenRef` shape
   used consistently across hooks, components, and docs routes; `parseRef`/`formatRef`
   helpers; display helpers (short address, human name resolution); and a
   `resolveInput(string)` utility that accepts what users actually paste — an fxhash
   URL, a bare CID, a contract address, or a ref — and returns the typed ref (reuses the
   §3.5 metadata knowledge; this also powers a paste-anything search box in the docs).
4. **`TokenCard` duplicates `Card` + `Artwork` — collapse the middle tier.** A token
   card should be a *recipe*, not a bespoke component: `Artwork.Root` parts must compose
   inside `Card.Root` (e.g. `Card.Media><Artwork.Image/>`), and the docs show that
   composition as the canonical card. Keep `TokenGrid` only if it earns its place as a
   layout utility (responsive grid + loading skeletons); otherwise it becomes a
   documented CSS recipe. The blocks tier (`WalletGallery` etc.) stays as the one-liner
   convenience layer — the middle bespoke tier is what goes. One concept = one component
   family: `Card` is the shell, `Artwork` is the art, blocks are the shortcuts.

**Framework-agnostic embed (stretch, post-M13):** a web component
(`<whitehash-artwork chain contract token-id>`) wrapping layer 0 + a minimal renderer,
for non-React sites and blog embeds.

---

## 5. Milestones & order

Each milestone ends with: typecheck clean, tests green, and the stated acceptance check.
M0–M5 are complete (plus substantial post-plan work — see STATUS.md). **After the toolkit
reframe (§4.7), the critical path is M10 → M11 → M12 → M13**; M6/M7/M9 slot in as layer-0
packages whenever convenient (M6 before M11 if `Artwork.Explore` parts are wanted); M8
folds into M12.

- **M0 — scaffold**: repo layout §2, CI, LICENSE (MIT, with NOTICE section crediting
  fxhash for vendored code), root README stating mission + the two hard constraints,
  changesets configured (private mode — versioning/changelogs without npm publishing).
  From here on: add a changeset with every meaningful package change.
- **M1 — `@whitehash/resolve`**: full test table. Acceptance: resolves the §3.5 artifact
  URI shapes incl. fragment preservation.
- **M2 — chain-reader / Tezos**: mainnet + ghostnet. Acceptance: live test (§4.2)
  returns real tokens with metadata for a discovered active holder; placeholder tokens
  correctly `assigned:false`.
- **M3 — chain-reader / EVM**: discovery + snapshot script + committed initial snapshots
  (all four EVM networks) + Transfer-log ownership (§3.7) + metadata. Acceptance: live
  test on eip155:1 and eip155:8453 at minimum.
- **M4 — onchfs-proxy**: Acceptance: local run resolves a real mainnet onchfs generator
  (200 + correct content-type).
- **M5 — viewer** ✅ (now the seed of apps/docs): Acceptance: enter a known collector
  address → grid renders; open a token → live artwork runs in the iframe from a public
  gateway; works with `pnpm build && npx serve dist` (no dev server); settings persist.
- **M6 — runtime extraction + explore mode** ✅ (§4.5; ships as layer-0 `@whitehash/runtime`
  with a `/react` subpath). Acceptance: for a params token, editing a param re-renders
  live; new-hash button produces a different variation.
- **M7 — archive-cli**. Acceptance: archive a wallet, disconnect network, open the
  folder's `index.html` — artworks replay offline.
- **M8 — deploy & release hygiene** (folds into M12): deploy guides (docs site → GitHub
  Pages/IPFS, proxy → Vercel button), snapshot-refresh CI cron, `changeset version` flow.
- **M9 — client-side onchfs (service worker)** ✅: resolve `onchfs://` entirely in the
  browser so onchfs artworks render with zero server setup — removing the one piece of
  friction that currently requires running/pointing at `apps/onchfs-proxy`. Approach: a
  service worker intercepts requests to a virtual path (e.g. `/onchfs/{network}/{cid}/…`),
  runs the `onchfs` resolver (viem + fetch, browser-compatible) against the user's
  configured RPCs, and responds with the resolved bytes + headers — the same contract the
  Hono proxy fulfills, but in-page. The iframe then loads that same-origin virtual URL.
  Notes for the executor: (1) keep the HTTP proxy as the fallback for browsers without SW
  support and for the archive-cli; (2) the SW must be served same-origin and registered
  with a scope covering the virtual path; (3) `@whitehash/resolve` gains an onchfs mode
  that points at the SW virtual path instead of a proxy base; (4) verify content-encoding
  (onchfs serves gzip) and CORS/CSP interplay with the artwork iframe's sandbox;
  (5) cache resolved inodes/chunks in the SW (Cache API / IndexedDB) since content is
  immutable. Acceptance: with no onchfs proxy configured, a known onchfs piece (e.g.
  "Genomes", ETH mainnet, `0xBb47…78E`) renders live. Ships as `@whitehash/onchfs-sw`.
- **M10 — layer sink + `@whitehash/react`** (§4.7): move `render.ts` semantics down into
  `chain-reader` (+ `createWhitehashClient` facade); extract hooks/provider/cache from
  the app into `@whitehash/react`; app consumes the package. Acceptance: the app has no
  local copy of any hook or token-semantics function; `@whitehash/react` has unit tests
  with a mock cache and no styling imports; typecheck/test green.
- **M11 — `@whitehash/ui` becomes the full published design system** (§4.7): add the
  domain components (compound `Artwork.*`, `TokenCard`/`TokenGrid`, blocks
  `WalletGallery`/`ProjectBrowser`/`ProjectGallery`, `AddressSearch`/`WalletSearch`) to
  the existing primitives; set up the dual consumption build (precompiled `styles.css`
  via Tailwind at build time + `theme.css`/source for Tailwind consumers). Acceptance:
  a fresh Vite app with ONLY `@whitehash/ui` (+ its deps) and a config renders a working
  wallet gallery in <20 lines **without a Tailwind toolchain** (styles.css path);
  overriding token variables alone rethemes it; the docs app imports every visual
  component from the package (no local copies).
- **M12 — apps/docs** (absorbs M8): rename/restructure `apps/viewer` → `apps/docs` per
  §4.7 (getting started, layer chooser, per-API pages with live examples + code, theming
  reference, deploy guides). Docs chrome (nav, hero, code block, page shell) is built as
  `@whitehash/ui` components, not app code. Acceptance: every exported hook and component
  has a page with a live demo; the site builds statically; the full browse/wallet
  showcase still passes the M5 acceptance; grep proves the app imports all visual
  components from `@whitehash/ui` (no `apps/docs/src/components/*` visual leftovers).
- **M13 — publish readiness**: toolkit packages get READMEs with API tables, semver
  discipline notes, `exports` maps audited (ESM, `/styles.css`, `/react` subpaths),
  changesets flipped from private mode when the user green-lights npm publishing
  (`@whitehash` scope availability ⚠️ still unverified). Publishing remains a user
  decision — prepare everything, do not publish without an explicit go. **The first
  publish is additionally gated on M14** — do not release an API that hasn't passed the
  first-glimpse review.
- **M14 — API ergonomics & composability review** (§4.8): README-driven redesign pass
  over every public export; resolve the four recorded critiques (hook unification,
  chain-name leakage, opaque refs + `resolveInput`, collapsing `TokenCard` into
  `Card`+`Artwork` composition). Breaking changes expected and free (pre-publish).
  Acceptance: the five quickstart scenarios each read naturally in ≤15 lines; a fresh
  agent reproduces them from the quickstart page alone; no public export carries a chain
  name or internal fxhash jargon; docs updated to the new surface; all gates green.
- **Stretch (post-M14)** — `<whitehash-artwork>` web component for non-React sites.

## 6. Open items the executor must resolve (and record in code/docs)

1. Default public RPC choice per network (keyless, CORS-friendly from browsers — verify
   `eth_getLogs` range/address-array limits empirically and tune the adaptive-range
   defaults in §3.7).
2. Whether TzKT's inline `token.metadata` is complete enough in practice or the big-map
   fallback (§3.6) is frequently needed — measure during M2 and tune.
