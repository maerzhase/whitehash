# Onboarding Audit: Whitehash Archive CLI

**Date:** 2026-07-23  
**Surface:** `whitehash-archive` command and `/guide/cli`

## First Impression Score

**Before: 2/5.** A new user had to understand serialized project references,
chain identifiers, indexer selection, and pagination before running the first
useful command.

**After: 5/5.** The CLI starts with resource-oriented tasks—`project`, `token`,
and `wallet`—and provides a working example for each.

## Missing Guidance

| Location | Gap | Resolution |
| --- | --- | --- |
| No arguments | Printed an error instead of orientation | Show concise help and three starting commands |
| `--help` | Unsupported | Add general and command-specific help |
| Project input | Exposed URL-serialized refs and mandatory chain flags | Infer Tezos; accept `base:` and `ethereum:` prefixes |
| Token input | No focused way to persist one token | Add `token <contract> <token-id>` with chain inference |
| Direct discovery | Exposed `--source rpc` immediately | Add the task-oriented `--direct` shortcut |
| Wallet archive | Address was an implicit command | Add explicit `wallet` command |
| Invalid input | Printed a JavaScript stack trace | Explain the correction and point back to help |
| Output file | Generic filename | Derive a recognizable filename from the project ID |

## Progressive Disclosure

The first-run path contains only:

1. Choose the resource: `project`, `token`, or `wallet`.
2. Paste the native project ID, token identity, or wallet address.
3. Optionally choose an output path.

Indexer modes, page sizes, full CAIP chain IDs, and serialized refs remain
available under advanced help for automation and infrastructure control.

## Compatibility

The legacy `index <project>` and implicit wallet-address syntax remain accepted
as aliases. Serialized Whitehash project and token refs also remain valid.
