# @whitehash/archive

Paste an identity-bearing fxhash token URL to create a verified, self-contained offline
archive:

```bash
npx @whitehash/archive \
  "https://www.fxhash.xyz/gentk/KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE-16333"
```

The default output is `whitehash-token-16333/`, containing the artwork bytes, raw
metadata, available images, integrity hashes, an offline wrapper, and a top-level
gallery. To write the existing lightweight normalized JSON for a hosted website instead:

```bash
npx @whitehash/archive \
  "https://www.fxhash.xyz/gentk/KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE-16333" \
  --json \
  --out ./public/token.json
```

`--json` produces `whitehash-token-index@1`; it is not an offline copy of the artwork
bytes. Identity-bearing URLs are parsed locally, and token data is read through public
chain and content-addressed infrastructure without an fxhash-hosted endpoint. EVM
combined-ID URLs require `--chain base` or `--chain ethereum`. Slug-only fxhash URLs
can be resolved as an explicit hosted convenience while fxhash's service is available:

```bash
npx @whitehash/archive \
  "https://fxhash.xyz/iteration/monogrid-1.1-ce-256" \
  --resolver fxhash
```

The CLI reports that it is contacting fxhash, queries its public GraphQL API first,
and falls back to the iteration page data. It extracts only the on-chain chain,
contract, and token ID, then runs the ordinary verified archive pipeline. The resulting
folder is fully offline, but this initial slug lookup depends on the current fxhash
service; the page fallback can also be blocked by its browser security checkpoint.
Without `--resolver fxhash`, slug-only URLs remain rejected. Identity-bearing URLs
never use this hosted path.

The explicit spelling is also available:

```bash
npx @whitehash/archive save \
  "token/tezos:mainnet/KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE/16333"
```

The resolver also works with `--json` and accepts `--out` normally:

```bash
npx @whitehash/archive \
  "https://fxhash.xyz/iteration/monogrid-1.1-ce-256" \
  --resolver fxhash \
  --json \
  --out ./public/token.json
```

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
npx @whitehash/archive help save
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
contains raw `metadata.json`, recorded `provenance.json`, available preview images, an
`artifact/` tree, an integrity manifest, and a wrapper that replays
`artifact/index.html` with the token's original
query string and fragment. New manifests also retain the normalized iteration hash,
artifact/generator/metadata references, and reveal state observed while archiving so
that a later opt-in current-chain comparison has explicit evidence to compare. Serve the
folder from any static server or open the top-level index directly. No fxhash-hosted URL
is used.

Options:

- `--chains <ids>`: comma-separated chain IDs or `tezos`, `ethereum`, `base` aliases.
- `--out <dir>`: output directory (default `whitehash-archive`).
- `--limit <n>`: archive at most this many discovered tokens, useful for sampling.

The command never deletes its output directory. It replaces files it owns and preserves
unrelated files. Publication is not enabled yet.

## Verify an archive

The ordinary verifier is deterministic and fully offline:

```bash
npx @whitehash/archive verify ./whitehash-archive
```

It checks local integrity hashes, required files, complete local references, and path
safety. It does not contact a blockchain, verify ownership, authenticate a signature,
or prove what chain state existed when the archive was created.

Network-backed comparison is an explicit opt-in mode of the same command:

```bash
npx @whitehash/archive verify ./whitehash-archive --onchain
```

`verify --onchain` runs the offline verifier first, then reads every exact recorded
`chain`, `contract`, and `tokenId` through the existing Whitehash chain reader. It never
guesses an EVM chain. For new archives it compares the current normalized iteration
hash, artifact URI, generator URI, metadata URI, and reveal state with the archived
snapshot.

Results have deliberately narrow meanings:

- `MATCH`: current provider-observed identity and recorded state equal the snapshot.
- `MISMATCH`: the token is absent or current normalized state differs. Reveal and
  metadata/reference changes can be legitimate, so this does not itself imply fraud or
  local corruption.
- `UNAVAILABLE`: an RPC, indexer, or content provider failed; no conclusion is drawn.
- `UNVERIFIABLE`: a legacy archive has no normalized snapshot to compare.

The comparison is against current provider-observed state. Archives do not record a
canonical block/level and block hash, so historical verification at `createdAt` is not
available. Ownership is mutable and is not captured by the archive token model, so it is
explicitly not checked. Public RPCs/indexers and content gateways are trust dependencies;
the result is not a signed proof or provider consensus.

Programmatic callers use `verifyArchiveOnchain(root, { client? })` and receive the same
structured statuses and per-field checks. Inject a configured Whitehash client to choose
infrastructure or to run deterministic local tests.

The existing `project`, `token`, `wallet`, and offline `verify` commands retain their behavior.
The older `index <project>` and implicit-address forms remain accepted for compatibility.
