# @whitehash/docs

The fully static documentation and live-showcase app for whitehash. It documents the
framework-free client, headless React hooks, design-system components, theming, and
deployment while preserving the wallet, project, token, and live-artwork flows.

Every visual component comes from `@whitehash/ui`; this app contains routing, content,
configuration, and composition only.

```bash
pnpm --filter @whitehash/docs dev
pnpm --filter @whitehash/docs build
pnpm --filter @whitehash/docs preview
```

The Vite build uses `base: "./"` and hash routing, so `dist/` can be hosted on GitHub
Pages, an IPFS gateway, or any static file server without rewrite rules.
