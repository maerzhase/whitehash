---
"@whitehash/chain-reader": patch
"@whitehash/docs": patch
---

EVM ownership now defaults to Blockscout (open-source public-good indexer — the EVM
analog of TzKT), with stale-placeholder metadata refresh from chain and the pure-RPC
Transfer-log scan as automatic fallback. Adds contract-first project browsing
(listProjects / project iterations) for both chains, surfaced in the viewer as a
"browse" section with project grids and per-project iteration views.
