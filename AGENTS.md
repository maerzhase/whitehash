# Repository instructions

These instructions apply to the entire monorepo. A more specific `AGENTS.md` in a
subdirectory may add to or override them for that subtree.

## Project conventions

- Use Node.js 20 or newer and pnpm 10.33.2. Do not use npm or Yarn.
- This is a pnpm/Turbo monorepo. Applications live in `apps/*`; reusable packages
  live in `packages/*`.
- Keep shared contracts and network definitions in `@whitehash/core`. Avoid
  duplicating public types or supported-chain metadata in downstream packages.
- Preserve the framework boundaries: lower-level packages should remain usable
  without React, Next.js, or the docs application.
- Do not add `@fxhash/*` dependencies or fxhash-hosted runtime endpoints.
- Follow the existing ESM TypeScript style, including `.js` extensions in relative
  imports.

## Making changes

- Read the nearest package README and existing tests before changing behavior.
- Design and implement features with downstream library users in mind. Preserve
  existing public APIs, behavior, interoperability, and reasonable upgrade paths.
- Treat breaking changes as a last resort. Before introducing one, verify that a
  backward-compatible alternative, deprecation period, or migration path is not
  practical, and document the justification.
- Clearly announce every breaking change in the changeset and relevant documentation
  or release notes. Describe who is affected, what changed, and how consumers should
  migrate.
- Store temporary plans, handoff notes, and session reports in `.private/plans/`,
  and retain useful agent-generated audits under `.private/artifacts/`. The
  `.private/` directory is local-only and must never be committed.
- Keep changes focused. Do not modify unrelated files in a dirty worktree.
- Reuse existing utilities and public contracts before introducing new abstractions.
- Add or update focused tests for behavior changes and bug fixes. Prefer deterministic
  tests that do not require public networks or external services.
- Integration tests that need browsers, credentials, or live infrastructure must be
  opt-in. Filesystem and local HTTP integration tests should run in the default suite
  when they are fast and isolated.
- Do not edit generated output such as `dist/` or `.next/`. Regenerate committed
  snapshots through their package scripts.
- Update `pnpm-lock.yaml` only when dependencies or workspace metadata change.

## Changesets

- Add a file under `.changeset/` for every meaningful, releasable package change.
- Use `patch` for compatible bug fixes, `minor` for compatible new functionality,
  and `major` for breaking public API changes.
- Include every affected published package in the changeset. Describe the
  user-visible outcome, not the implementation process.
- Test-only, documentation-only, CI, formatting, and internal refactors do not need a
  changeset unless they accompany a releasable behavior change.
- Do not run `pnpm version-packages` or publish packages unless explicitly requested
  by a maintainer.

Example:

```md
---
"@whitehash/runtime": patch
---

Preserve caller-owned parameter definitions when consolidating runtime values.
```

## Validation

Run the narrowest relevant checks while iterating, then validate the completed change
from the repository root:

```bash
pnpm lint
pnpm format
pnpm build
pnpm check-types
pnpm test
```

Do not run root Turbo commands concurrently: build-dependent tasks may clean and read
the same package `dist/` directories. Run them sequentially.

If a check cannot run because it requires unavailable credentials, browsers, or
network access, report that explicitly. Do not silently treat a skipped integration
suite as passing coverage.

## Git

- Do not commit, push, create branches, or open pull requests unless explicitly asked.
- When asked to commit, stage only the files in scope and use a concise conventional
  commit message.
- Never discard or overwrite unrelated user changes.
