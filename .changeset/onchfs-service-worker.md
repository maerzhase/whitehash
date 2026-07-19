---
"@whitehash/onchfs-sw": major
"@whitehash/resolve": major
"@whitehash/chain-reader": major
"@whitehash/react": minor
"@whitehash/ui": minor
---

Add same-origin, proxy-free onchfs resolution through a browser service worker and make
it the docs app default. The service-worker mode is chain-scoped so identical content
identifiers resolve against the correct public network; explicit proxy and disabled
modes remain available. Rename the live-view state from proxy-specific wording to the
resolver-neutral `needs-onchfs`, and update React/UI consumers accordingly.
