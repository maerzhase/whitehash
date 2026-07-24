---
"@whitehash/chain-reader": patch
"@whitehash/react": patch
"@whitehash/docs": patch
---

Add the framework-free `createWhitehashClient` facade and move token rendering
semantics, including the gentk-v1 seed correction, into chain-reader. Introduce
the headless `@whitehash/react` package with provider context, pluggable cache
adapters, wallet/project hooks, gateway fallback, and artwork-frame state. Migrate
the viewer to consume these packages and remove its app-local copies.
