# whitehash — Implementation Plan

A standalone, open-source, self-hostable NFT viewer and preservation toolkit for fxhash
generative art on **Tezos, Ethereum L1, and Base** — reading everything directly from
public blockchain infrastructure, with **zero dependency on fxhash-hosted services and
zero `@fxhash/*` npm dependencies**.

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
3. **The viewer must be a fully static client-side app** (deployable to GitHub Pages /
   IPFS / any static host). The onchfs proxy is the only server component in the project
   and is optional (only needed for `onchfs://` artworks).
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
    resolve/                  ← @whitehash/resolve    — URI → HTTP URL resolution
    chain-reader/             ← @whitehash/chain-reader — wallet → tokens, both chains
    runtime/                  ← @whitehash/runtime    — extracted artwork runtime (M6)
  apps/
    onchfs-proxy/             ← Hono middleware, self-hostable
    viewer/                   ← Vite + React static app
    archive-cli/              ← preservation CLI (M7)
```

Tooling: pnpm workspaces + turbo (same as the fxhash monorepo, familiar), TypeScript
strict, `vitest` for tests, `tsup` for package builds, changesets for versioning.
No tailwind requirement in packages; the viewer may use it.

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
  onchfsProxy: string | null    // e.g. "https://my-proxy.vercel.app"; null → onchfs unsupported
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
- `onchfs://{cid}[/path][?query][#fragment]` → `{onchfsProxy}/{cid}…` (same preservation)
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

### 4.4 `apps/viewer`

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

---

## 5. Milestones & order

Each milestone ends with: typecheck clean, tests green, and the stated acceptance check.
Do them in order; M3 and M4 can run in parallel after M2.

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
- **M5 — viewer**: Acceptance: enter a known collector address → grid renders; open a
  token → live artwork runs in the iframe from a public gateway; works with `pnpm build
  && npx serve dist` (no dev server); settings persist.
- **M6 — runtime extraction + explore mode** (§4.5). Acceptance: for a params token,
  editing a param re-renders live; new-hash button produces a different variation.
- **M7 — archive-cli**. Acceptance: archive a wallet, disconnect network, open the
  folder's `index.html` — artworks replay offline.
- **M8 — deploy docs & release hygiene**: viewer deploy guide (GitHub Pages + IPFS),
  proxy deploy guide (Vercel button), snapshot-refresh CI cron, `changeset version`
  release flow documented. npm publishing is explicitly deferred — do not publish.
- **M9 — client-side onchfs (service worker)**: resolve `onchfs://` entirely in the
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
  "Genomes", ETH mainnet, `0xBb47…78E`) renders live. Optional (not required for viewing).

## 6. Open items the executor must resolve (and record in code/docs)

1. Default public RPC choice per network (keyless, CORS-friendly from browsers — verify
   `eth_getLogs` range/address-array limits empirically and tune the adaptive-range
   defaults in §3.7).
2. Whether TzKT's inline `token.metadata` is complete enough in practice or the big-map
   fallback (§3.6) is frequently needed — measure during M2 and tune.
