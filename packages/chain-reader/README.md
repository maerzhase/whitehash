# @whitehash/chain-reader

Reads the fxhash generative tokens owned by a wallet address **directly from chain** — no
fxhash indexer, no fxhash-hosted service.

- **Tezos** (mainnet + ghostnet): one TzKT `/tokens/balances` query per page; TzKT indexes
  TZIP-21 metadata inline, so holdings come back with metadata attached.
- **Ethereum / Base** (+ testnets): FxGenArt721 collections are discovered from
  `ProjectCreated` factory events; ownership is derived from `Transfer` logs and confirmed
  with `ownerOf` (FxGenArt721 is not ERC721Enumerable — verified). Metadata via `tokenURI`.

```ts
import { createWhitehashClient, resolveInput } from "@whitehash/chain-reader"
import { defaultResolverConfig } from "@whitehash/resolve"

const client = createWhitehashClient({ resolver: defaultResolverConfig() })
const input = resolveInput("tz1...")
const tokens = input.type === "address"
  ? await client.getWalletTokens(input.address)
  : []
```

Every token is normalized to a uniform `WhitehashToken` with a protocol-native
`artifactUri` (already carrying `?fxhash=...#0x...` render state) and an `assigned` flag
that is `false` for unrevealed "waiting to be signed" placeholders.

## API

| Export | Purpose |
| --- | --- |
| `createWhitehashClient(config)` | Bind wallet/project/resolver/render operations once |
| `client.getWalletTokens(address, options?)` | Address-aware ownership reads; mainnet by default |
| `client.listProjects(options)`, `client.getProject(project)` | Discover projects and inspect one from `{ chain, id }` |
| `client.listProjectTokens(project, options?)` | Paginated minted iterations from `{ chain, id }` |
| `client.getToken(token)` | Read one normalized token from `{ chain, contract, tokenId }` |
| `projectRef()`, `tokenRef()`, `parseRef()`, `formatRef()` | Optional serialization helpers for routes and mixed input |
| `resolveInput()` | Classify pasted refs, artwork URLs, CIDs, and addresses |
| `shortAddress()`, `projectLabel()` | Consistent human-readable labels |
| `renderArtifactUri()`, `artworkUrl()` | Correct live URL, including gentk-v1 separate seeds |
| `imageSourceUri()`, `imageUrl()` | Select/resolve display or thumbnail media |
| `liveViewStatus()` | Distinguish runnable, unrevealed, onchfs-proxy, and unavailable states |
| `detectAddressChains()` | Select the mainnet/testnet chain set for an address |
| `tzktFetch()`, `tzktBaseUrl()`, `bsFetch()`, `blockscoutBaseUrl()` | Retrying TzKT/Blockscout request primitives with the configured base URLs |
| `getLogsAdaptive()`, `makeEvmPublicClient()` | Adaptive `eth_getLogs` chunking over a config-bound viem client |
| `indexedProjectMetadata()`, `isIndexedProjectMetadata()` | Produce/validate the shared portable-index project summary |
| `WhitehashToken`, `WhitehashProject`, `ChainReaderConfig` | Normalized public contracts |

## EVM ownership sources

Two interchangeable sources, selected via `evm.ownershipSource`:

- **`"blockscout"` (default)** — the EVM analog of TzKT: [Blockscout](https://blockscout.com)
  is an open-source, self-hostable, public-good indexer with public instances for all four
  supported networks. One paginated call lists an address's NFTs (with metadata); the
  factory's full `ProjectCreated` history comes from its logs endpoint with no block-range
  limits. Stale cached metadata (mint-time placeholders) is detected and re-read from
  chain via `tokenURI`. Instance URLs are overridable via `evm.blockscout` (point them at
  your own Blockscout if you self-host one).
- **`"rpc"`** — fully trustless Transfer-log scan over plain JSON-RPC. Keyless public RPCs
  cap `eth_getLogs` at ~10,000 blocks, so full-history scans are slow without an
  archive-capable RPC (`evm.rpcs`). Used automatically as fallback when Blockscout is
  unreachable. Committed snapshots (`snapshots/*.json`, regenerate via `snapshot:update`)
  and `evm.maxBlock` bound the work.

## Browsing projects (contract-first)

Beyond wallet lookups, the library can enumerate everything published on the contracts:

```ts
import { createWhitehashClient } from "@whitehash/chain-reader"

const client = createWhitehashClient(config)
const page = await client.listProjects({ chain: "tezos:mainnet", version: "v3" })
// → [{ chain: "tezos:mainnet", id: "v3:31804", name: "…", … }]

const iterations = await client.listProjectTokens(page.projects[0])
```

Tezos projects come from their project-contract big maps (all versions v0–v3);
iterations are matched by fxhash's universal "{project name} #{n}" naming convention.
EVM projects are the factory's `ProjectCreated` history; iterations via Blockscout token
instances.

## Portable project indexes

Collapse every discovery page into a versioned, JSON-ready index:

```ts
import {
  buildProjectIndex,
} from "@whitehash/chain-reader"

const index = await buildProjectIndex(client, {
  chain: "tezos:mainnet",
  id: "v2:13944",
})

const token = index.iterations[24]?.token
```

The index contains a normalized `project` summary plus normalized tokens with their
original metadata, while omitting the project reader's provider envelope.
Published fxhash `capture` metadata is normalized as `project.captureSettings`,
including mode, trigger, GPU requirement, resolution, delay, canvas selector,
and GIF timing fields.
`parseProjectIndex()` validates untrusted JSON. Its return value is an ordinary
object: access `index.project` and `index.iterations` directly.

For fxhash EVM collections, `discoverEvmProjectTokenRefsViaRpc()` probes the deployed
contract's supply and token-ID boundaries and enumerates the verified range directly.
Non-sequential contracts fall back to mint-event discovery.

## Portable token indexes

Package one known token into a smaller versioned JSON file:

```ts
import {
  buildTokenIndex,
  parseTokenIndex,
} from "@whitehash/chain-reader"

const index = await buildTokenIndex(client, {
  chain: "tezos:mainnet",
  contract: "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE",
  tokenId: "16333",
})

const { project, token } = parseTokenIndex(index)
```

The `whitehash-token-index@1` file contains the complete normalized token,
including its original metadata, and the same normalized `project` summary used
by project indexes. EVM collection contracts resolve directly to full project
metadata when public infrastructure exposes it. Tezos gentk `token_data`
resolves the parent issuer project directly, including its normalized capture
settings. Fields unavailable from public project/token metadata remain
explicitly `null`. Access `project` and `token` directly on the parsed object;
use the existing `tokenRef(token)` helper only when a canonical identity is
needed for a fresh chain read.

## Curated real-world examples

`CURATED_PROJECT_EXAMPLES` contains eleven stable mainnet project refs selected to cover
different chains, storage schemes, runtimes, and artwork behaviors. The `ref` is ready for
`useProject`, `client.getProject`, and the UI `ProjectGallery`; current project/token
metadata is still read from chain instead of being copied into the package.

```tsx
import { CURATED_PROJECT_EXAMPLES } from "@whitehash/chain-reader"
import { ProjectGallery } from "@whitehash/ui"

const example = CURATED_PROJECT_EXAMPLES.find(item => item.slug === "dom2")!
return <ProjectGallery project={example.ref} />
```

Each entry also classifies generator/metadata storage, capture mode, project kind, and
searchable behaviors such as audio, GPU rendering, plotting, cross-chain interaction, or
open-form minting. This keeps demos and visual QA intentional without pinning mutable
marketplace values or individual token metadata.

## Attribution

Contract addresses and ABI fragments are copied from the fxhash monorepo (MIT).

## Versioning

Patches preserve normalized token/project shapes and network semantics; compatible reads,
fields, and networks are minor; removing fields or changing ownership/render contracts is
major. ESM-only; publication is not enabled yet.
