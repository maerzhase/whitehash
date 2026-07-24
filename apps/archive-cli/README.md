# @whitehash/archive

Archive fxhash artwork owned by one or more wallets into a static, self-contained folder.
Discovery uses public TzKT/Blockscout/RPC infrastructure. IPFS generators are downloaded
as CAR files from trustless gateways and every CAR block hash is verified before UnixFS
extraction. Onchfs generators are read directly from their public chain.

## Choose a task

For one project, write a portable JSON index:

```bash
npx @whitehash/archive project v2:13944
```

For one token, write a smaller portable JSON index:

```bash
npx @whitehash/archive token \
  KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE 16333
```

For artwork owned by a wallet, create a complete offline gallery:

```bash
npx @whitehash/archive wallet tz1… --out ./whitehash-archive
```

Run the CLI without arguments whenever you need to see these starting points again:

```bash
npx @whitehash/archive
npx @whitehash/archive help project
npx @whitehash/archive help token
npx @whitehash/archive help wallet
```

## Index a project

Build one portable JSON file containing normalized project metadata and every discovered
minted iteration:

```bash
npx @whitehash/archive project \
  v2:13944 \
  --out ./public/project-index.json
```

The output uses the versioned `whitehash-project-index@1` format. Its normalized
`project` object has the same shape as token-index project metadata. Each iteration includes
its canonical chain, contract, token ID, seed, artifact and preview URIs, assignment
state, normalized attributes, and original token metadata for fields such as fx(params)
that may not be normalized yet. The project reader's provider envelope is omitted.
The project summary includes normalized `captureSettings` whenever the published
project metadata contains fxhash capture configuration.
Consumers can render directly from the JSON or pass its token identity to
`client.getToken()` for a fresh chain read.

Use `--page-size <n>` to tune discovery requests. The command follows every continuation
cursor by default; its progress output compares discovered iterations with the project's
on-chain minted count when that count is available.

For an EVM project, add `--direct` to bypass Blockscout iteration discovery. The
reader probes the deployed fxhash collection's supply and token-ID boundaries, builds
the verified zero- or one-based range, then hydrates those identities through on-chain
`tokenURI` calls. A canonical `Transfer(0x0, owner, tokenId)` scan remains the fallback
for a non-sequential contract:

```bash
npx @whitehash/archive project \
  base:0x50c04A6B066d659Fe2F66F6388Cf8dD394036632 \
  --direct \
  --out ./public/dom2.json
```

Full chain IDs such as `tezos:mainnet` and `eip155:8453` are accepted alongside the
aliases. Existing serialized refs such as `project/tezos:mainnet/v2:13944` also remain
valid, but they are primarily intended for routes and persisted identifiers.

## Index a token

Build a portable `whitehash-token-index@1` JSON file from a contract and token ID:

```bash
npx @whitehash/archive token \
  KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE 16333 \
  --out ./public/token-index.json
```

Tezos `KT1` contracts imply mainnet. Prefix EVM contracts with `base:` or
`ethereum:`, or use `--chain` for a full chain ID. The JSON contains both a
normalized `project` summary and the complete normalized `token`. Tezos token
data resolves its parent issuer project, including normalized capture settings.
EVM capture settings remain `null` when public collection/token metadata does
not publish them. Consumers validate the
file with `parseTokenIndex()` and access the display-ready token directly as
`index.token`.

## Archive wallets

```bash
npx @whitehash/archive wallet tz1… --chains tezos --out ./whitehash-archive
npx @whitehash/archive wallet 0x… --chains ethereum,base --out ./whitehash-archive
```

The output contains a top-level `index.html` and `manifest.json`. Each token directory
contains raw `metadata.json`, available preview images, an `artifact/` tree, an integrity
manifest, and a wrapper that replays `artifact/index.html` with the token's original
query string and fragment. Serve the folder from any static server or open the top-level
index directly. No fxhash-hosted URL is used.

Options:

- `--chains <ids>`: comma-separated chain IDs or `tezos`, `ethereum`, `base` aliases.
- `--out <dir>`: output directory (default `whitehash-archive`).
- `--limit <n>`: archive at most this many discovered tokens, useful for sampling.

The command never deletes its output directory. It replaces files it owns and preserves
unrelated files. Publication is not enabled yet.

The older `index <project>` and implicit-address forms remain accepted for
compatibility, but the resource commands above are the documented API.
