# @whitehash/docs

The Next.js documentation and live-showcase app for whitehash. It documents the
framework-free client, headless React hooks, design-system components, configuration,
and deployment while preserving the wallet, project, token, and live-artwork flows.

Product components come from `@whitehash/ui`. Documentation chrome, navigation,
syntax-highlighted code blocks, content, and site composition stay local to this app.
The standalone [QUICKSTART.md](./QUICKSTART.md) is the M14 first-glimpse contract and
contains five copyable scenarios, each no more than 15 lines.

```bash
pnpm --filter @whitehash/docs dev
pnpm --filter @whitehash/docs build
pnpm --filter @whitehash/docs preview
```

`next build` statically exports the site to `out/`. The known guide, API, and settings
routes are prerendered with trailing slashes, so the folder can be hosted on GitHub
Pages, IPFS, or any static file server without a Next.js runtime.
