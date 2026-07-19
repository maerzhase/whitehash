---
"@whitehash/chain-reader": minor
"@whitehash/docs": minor
---

Add newest/oldest sort ordering to project and iteration listings (Tezos via TzKT sort
params; EVM project list sorted by creation block — the Blockscout instances endpoint has
a fixed order, so per-project iteration sort is Tezos-only).

Fix EVM project-browser iterations showing no live view: the browse path now refreshes
Blockscout's cached mint-time placeholder metadata from chain (via tokenURI), same as the
wallet path, so revealed artworks render. Project-card previews use a lightweight
single-instance refresh to keep grids cheap.
