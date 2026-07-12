# @whitehash/chain-reader

Reads the fxhash generative tokens owned by a wallet address **directly from chain** — no
fxhash indexer, no fxhash-hosted service.

- **Tezos** (mainnet + ghostnet): one TzKT `/tokens/balances` query per page; TzKT indexes
  TZIP-21 metadata inline, so holdings come back with metadata attached.
- **Ethereum / Base** (+ testnets): FxGenArt721 collections are discovered from
  `ProjectCreated` factory events; ownership is derived from `Transfer` logs and confirmed
  with `ownerOf` (FxGenArt721 is not ERC721Enumerable — verified). Metadata via `tokenURI`.

```ts
import { getWalletTokens, detectAddressChains } from "@whitehash/chain-reader"
import { defaultResolverConfig } from "@whitehash/resolve"

const config = { resolver: defaultResolverConfig() }
const chains = detectAddressChains("tz1...", "mainnet") // → ["tezos:mainnet"]
const tokens = await getWalletTokens("tz1...", chains, config, e => console.log(e.message))
```

Every token is normalized to a uniform `WhitehashToken` with a protocol-native
`artifactUri` (already carrying `?fxhash=...#0x...` render state) and an `assigned` flag
that is `false` for unrevealed "waiting to be signed" placeholders.

## EVM performance note

Keyless public RPCs cap `eth_getLogs` to ~10,000 blocks. Discovering the full collection
set (and scanning a wallet's entire transfer history) therefore takes many requests over
public RPCs. Two mechanisms address this:

- **Snapshots** (`snapshots/*.json`): committed collection lists so the library only scans
  *new* collections at read time. Regenerate with `pnpm --filter @whitehash/chain-reader
  snapshot:update` (a full historical scan; run it offline / on a cron).
- **`evm.maxBlock`**: cap the scanned head (for tests / bounded scans).

Runtime ownership scanning still walks a wallet's transfer history from the earliest
relevant block. For a responsive browser experience, configure an archive-capable RPC
(one that permits wide `eth_getLogs` ranges) via `evm.rpcs`, and cache results. See
PLAN.md §3.7 and the viewer's settings.

## Attribution

Contract addresses and ABI fragments are copied from the fxhash monorepo (MIT).
