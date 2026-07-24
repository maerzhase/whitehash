---
"@whitehash/chain-reader": patch
"@whitehash/react": patch
"@whitehash/ui": patch
---

Redesign the pre-release API around five first-glimpse quickstarts.

- Keep `useProjects(options)` and `useProject(ref, options)` as parallel hooks because
  browsing a pageable collection and reading one project plus its iterations are
  different data lifecycles; make the distinction obvious with an object argument for
  the list and a typed ref for the detail hook.
- Remove `useEvmProjectCard` and all chain-named public readers. `useProjects` now emits
  discovered projects immediately and progressively hydrates missing name, supply, and
  preview fields through the universal `client.getProject(ref)` method.
- Replace opaque project strings and token coordinates with `ProjectRef` and `TokenRef`.
  Add `parseRef`, `formatRef`, `resolveInput`, `tokenRef`, `shortAddress`, and
  `projectLabel` so routes and paste inputs share one documented reference story.
- Remove `TokenCard`. The canonical token card is the composable `Card` + `Artwork`
  recipe; `TokenGrid` remains only as a responsive layout/loading utility, while gallery
  blocks retain one-line convenience.
- Make the framework-free client infer mainnet wallet chains by address, accept typed
  refs for project/direct-token reads, and expose only universal method names. The docs
  search now routes addresses, refs, common artwork URLs, and CIDs through `resolveInput`.
