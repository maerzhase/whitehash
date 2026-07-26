# Contributing to Whitehash

Thanks for contributing. Whitehash is a pnpm and Turborepo monorepo containing
framework-independent blockchain and artwork tooling, React integrations, UI
components, documentation, and self-hostable applications.

## Repository Structure

```text
whitehash/
├── packages/
│   ├── core/          # Shared contracts and supported-network definitions
│   ├── chain-reader/  # Direct blockchain reads
│   ├── resolve/       # Artwork and content resolution
│   ├── runtime/       # Framework-independent runtime
│   ├── capture/       # Capture and preservation tooling
│   ├── onchfs-sw/     # Browser-side onchfs support
│   ├── react/         # Headless React integrations
│   └── ui/            # React UI components
└── apps/
    ├── docs/          # Next.js documentation and live showcases
    ├── archive-cli/   # Archive and offline-replay CLI
    └── onchfs-proxy/  # Optional self-hostable onchfs HTTP bridge
```

Keep shared public types and supported-chain metadata in `@whitehash/core`.
Lower-level packages must remain usable without React, Next.js, or the docs
application.

## Prerequisites

- Node.js `>=20.19.0`
- pnpm `10.33.2`

Use pnpm for all workspace commands. Do not use npm or Yarn.

## Getting Started

1. Fork and clone the repository.
2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Build the workspace:

   ```bash
   pnpm build
   ```

4. Start the development tasks:

   ```bash
   pnpm dev
   ```

To work on the documentation application directly, run:

```bash
pnpm --filter @whitehash/docs dev
```

Package-specific commands can use pnpm's filter syntax:

```bash
pnpm --filter @whitehash/runtime test
pnpm --filter @whitehash/ui build
```

Read the nearest package or application `README.md` before changing its
behavior.

## Development Workflow

### Making Changes

- Create a focused branch from `main`.
- Keep changes scoped and reuse existing utilities and public contracts.
- Follow the existing ESM TypeScript style, including `.js` extensions in
  relative imports.
- Do not add `@fxhash/*` dependencies or fxhash-hosted runtime endpoints.
- Do not edit generated output such as `dist/` or `.next/`.
- Update `pnpm-lock.yaml` only when dependencies or workspace metadata change.
- Use `workspace:*` for dependencies on other packages in this repository.

Add or update focused, deterministic tests for behavior changes and bug fixes.
Tests that require browsers, credentials, public networks, or live
infrastructure must be opt-in. Fast filesystem and local HTTP integration tests
should remain in the default suite.

### Documentation

Documentation is part of a feature's definition of done. When adding or
changing a feature, update the relevant package `README.md`, the guides,
examples, and API reference in `apps/docs`, and
`apps/docs/public/llms.txt`.

### Quality Checks

Run the narrowest relevant package checks while developing. Before opening a
pull request, run the complete validation sequence from the repository root:

```bash
pnpm lint
pnpm format
pnpm build
pnpm check-types
pnpm test
```

Run these commands sequentially. Build-dependent Turbo tasks can clean and read
the same package output directories.

This project uses:

- Biome for linting and formatting
- TypeScript for type checking
- Vitest for tests
- Turborepo for workspace orchestration

To apply safe lint and formatting fixes, run:

```bash
pnpm fix
```

Use `pnpm format:fix` when only formatting should change.

## Changesets and Releases

Whitehash uses [Changesets](https://github.com/changesets/changesets) to version
and publish its public packages.

Add a changeset for every meaningful, releasable package change:

```bash
pnpm changeset
```

Choose the release type according to the user-visible impact:

- `patch` for backwards-compatible bug fixes
- `minor` for backwards-compatible new functionality
- `major` for breaking public API changes

Include every affected published package and commit the generated
`.changeset/*.md` file with the change. Describe the user-visible outcome rather
than the implementation process.

Documentation-only changes, tests, CI updates, formatting, and internal
refactors do not normally need a changeset unless they accompany releasable
behavior.

After changes merge into `main`, GitHub Actions creates or updates a release
pull request. Merging that pull request versions the packages, builds the
workspace, publishes the public packages to npm, and creates GitHub releases.
Do not run `pnpm version-packages`, `pnpm release`, or publish packages as part
of a regular contribution.

## Pull Requests

Before submitting a pull request:

1. Run the complete validation sequence.
2. Add a changeset when the change is releasable.
3. Update the relevant documentation, examples, API reference, and
   `llms.txt`.
4. Review the diff for unrelated or generated changes.

Pull requests should include:

- a clear description of what changed and why
- links to related issues, when applicable
- test and validation results
- screenshots or recordings for visible UI changes
- migration notes for breaking changes

CI installs dependencies with the frozen lockfile and runs the same lint,
format, build, type-check, and test commands listed above.

## Commit Messages

Use concise commit messages that describe the user-facing or developer-facing
change. Keep commits focused so they are straightforward to review and revert.

## License

By contributing, you agree that your contributions will be licensed under the
repository's [MIT License](./LICENSE).
