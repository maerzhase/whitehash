---
"@whitehash/resolve": patch
"@whitehash/ui": patch
---

Finish the docs migration to a statically exported Next.js app. Documentation-only
chrome now stays app-local so `prism-react-renderer` is not inherited by UI consumers,
and IPFS gateway normalization accepts both gateway roots and `/ipfs/` API roots.
