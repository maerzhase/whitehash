---
"@whitehash/chain-reader": patch
"@whitehash/docs": patch
---

Images now fall back across all configured IPFS gateways: a new `<GatewayImage>`
component advances to the next gateway on load error instead of showing a broken
placeholder, mirroring the metadata-fetch fallback (thumbnails, previews, and stills).

Projects now report editions available vs. iterations created: `WhitehashProject` gains
`editions` (max supply cap) and `minted` (actually created). Tezos reads both from the
issuer ledger (`supply` + `iterations_count`, falling back to `supply − balance` on older
issuers); EVM reports `minted` from Blockscout's ERC-721 total supply (cap not exposed
on-chain). The viewer shows "N / M minted" on project cards and headers.
