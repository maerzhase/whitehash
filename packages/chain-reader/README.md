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
| `client.listProjects(options)`, `client.getProject(ref)` | Discover and inspect projects without chain-specific methods |
| `client.listProjectTokens(ref, options?)` | Paginated minted iterations on any supported chain |
| `client.getToken(ref)` | Read one normalized token directly from a typed token ref |
| `ProjectRef`, `TokenRef`, `parseRef()`, `formatRef()` | Stable references shared by clients, hooks, components, and routes |
| `resolveInput()` | Classify pasted refs, artwork URLs, CIDs, and addresses |
| `shortAddress()`, `projectLabel()` | Consistent human-readable labels |
| `renderArtifactUri()`, `artworkUrl()` | Correct live URL, including gentk-v1 separate seeds |
| `imageSourceUri()`, `imageUrl()` | Select/resolve display or thumbnail media |
| `liveViewStatus()` | Distinguish runnable, unrevealed, onchfs-proxy, and unavailable states |
| `detectAddressChains()` | Select the mainnet/testnet chain set for an address |
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
import { createWhitehashClient, parseRef } from "@whitehash/chain-reader"

const client = createWhitehashClient(config)
const page = await client.listProjects({ chain: "tezos:mainnet", version: "v3" })
// → [{ ref: { type: "project", chain: "tezos:mainnet", id: "v3:31804" }, … }]

const ref = parseRef("project/tezos%3Amainnet/v3%3A31804", "project")
const iterations = await client.listProjectTokens(ref)
```

Tezos projects come from their project-contract big maps (all versions v0–v3);
iterations are matched by fxhash's universal "{project name} #{n}" naming convention.
EVM projects are the factory's `ProjectCreated` history; iterations via Blockscout token
instances.

## Attribution

Contract addresses and ABI fragments are copied from the fxhash monorepo (MIT).

## Versioning

Patches preserve normalized token/project shapes and network semantics; compatible reads,
fields, and networks are minor; removing fields or changing ownership/render contracts is
major. ESM-only; publication is not enabled yet.
