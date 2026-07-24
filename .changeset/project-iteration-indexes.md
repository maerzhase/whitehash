---
"@whitehash/chain-reader": minor
"@whitehash/archive": minor
"@whitehash/react": minor
"@whitehash/ui": major
"@whitehash/docs": minor
---

Add portable, versioned project iteration and single-token indexes with normalized
display data, original token metadata, direct property access, JSON validation,
and complete paginated project discovery.

Use one shared normalized project summary in both formats. Single-token indexes
enrich EVM collection metadata directly and resolve Tezos parent projects from
gentk contract storage while representing unavailable fields explicitly as null.

Normalize published fxhash capture settings on every project summary. Tezos
single-token indexing follows the gentk token_data issuer ID back to the parent
project so capture mode, trigger, GPU, resolution, selector, delay, and GIF
timing data are available without an fxhash-hosted API.

Add the focused `project`, `token`, `wallet`, and `verify` commands while retaining
earlier implicit forms as compatibility aliases. Project indexing includes an EVM RPC
mode that probes fxhash collection supply and token-ID boundaries before falling back
to canonical mint events.

Document project and token indexing, demonstrate both index formats through the existing
Artwork component, and cover direct chain refreshes and offline archives in the docs app.

Add a focused `useToken` React hook for loading and refreshing a single token index entry.
Remove the public `TokenGrid` layout helper from the UI package so integrators compose
token layouts from `Card` and `Artwork`, while gallery components retain their internal
responsive grid.
