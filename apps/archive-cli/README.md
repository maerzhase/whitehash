# @whitehash/archive

Archive fxhash artwork owned by one or more wallets into a static, self-contained folder.
Discovery uses public TzKT/Blockscout/RPC infrastructure. IPFS generators are downloaded
as CAR files from trustless gateways and every CAR block hash is verified before UnixFS
extraction. Onchfs generators are read directly from their public chain.

```bash
npx @whitehash/archive tz1… --chains tezos:mainnet --out ./whitehash-archive
npx @whitehash/archive 0x… --chains eip155:1,eip155:8453 --out ./whitehash-archive
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
