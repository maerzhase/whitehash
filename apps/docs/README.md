# @whitehash/docs

The Next.js documentation and live-showcase app for Whitehash. It documents the
framework-free client, headless React hooks, design-system components, configuration,
and deployment while preserving the wallet, project, token, and live-artwork flows.

Product components come from `@whitehash/ui`. Documentation chrome, navigation,
syntax-highlighted code blocks, content, and site composition stay local to this app.
The standalone [QUICKSTART.md](./QUICKSTART.md) is the M14 first-glimpse contract and
contains one canonical path: mount the zero-config provider, read one token by identity,
and render its preview and live artwork. The web docs expand from that path into the
mental model, task guides, focused API reference, and technical deep dives.

```bash
pnpm --filter @whitehash/docs dev
pnpm --filter @whitehash/docs build
pnpm --filter @whitehash/docs preview
```

`next build` statically exports the site to `out/`. The known guide, API, and settings
routes are prerendered with trailing slashes, so the folder can be hosted on GitHub
Pages, IPFS, or any static file server without a Next.js runtime.

The export also serves [`public/llms.txt`](./public/llms.txt) at `/llms.txt`, giving
language models a compact map of the toolkit, its architecture, domain semantics, and
documentation routes. The same source is rendered in the docs interface at `/llms/`.
