# Whitehash positioning

## Core idea

Whitehash makes fxhash generative art available without requiring a third party's
infrastructure. It reads the information needed to identify and render artwork from
public chains and configurable infrastructure, then exposes that capability at the
right level for the job.

## The two user journeys

### Preserve locally

Use the CLI to turn an identity-bearing token URL or supported Whitehash reference into
a verified, self-contained offline archive. This is for people who want to keep an
artwork available independently of a hosted platform.

### Render and integrate online

Use the API, plain TypeScript packages, or React bindings and components to load and
render artwork in a website, gallery, museum collection, database-backed application,
or backup service. Infrastructure services are configurable rather than fixed to a
proprietary Whitehash or fxhash endpoint.

## Audience

The audience is anyone who wants to preserve, render, collect, exhibit, or build on
fxhash artwork without being locked into third-party infrastructure. The primary
activation is an API integration. The simplest first success is either one CLI archive
or one React-rendered token.

## Positioning sentence

fxhash was good for releasing art. Whitehash is for keeping it available without
depending on third-party infrastructure.

## Short promise

Preserve an artwork locally, or render it anywhere you build.

## Differentiators

- Chain-first and infrastructure-neutral: public chain and content-addressed services
  are used directly where supported, and service configuration remains caller-owned.
- Two practical paths: a paste-first CLI for preservation and API/React layers for
  online rendering and integration.
- Layered architecture: shared contracts and low-level TypeScript libraries remain
  usable without React, while higher-level React components make common integrations
  straightforward.
- No required API key, wallet connection, backend, `@fxhash/*` dependency, or
  fxhash-hosted runtime endpoint for identity-bearing token workflows.

## Friction to address in copy

The technology includes Web3 and chain-infrastructure concepts. Lead with the outcome
and the smallest working path. Introduce terms such as chain, gateway, onchfs, and
resolver only when they help someone configure or extend an integration.

## Claim boundaries

- Say “without relying on third-party infrastructure” or “infrastructure-neutral,” not
  “permanent,” “guaranteed forever,” or “fully decentralized” without a specific scope.
- A local archive contains artwork bytes and is designed for preservation.
- Archive verification checks local file hashes, completeness, local references, and
  path safety. IPFS CAR blocks are content-hash checked during creation. A later
  verification is not a fresh blockchain lookup or an externally signed proof.
- A `whitehash-token-index@1` JSON file is for loading and displaying a token on a
  hosted site. It is not an offline copy of the artwork bytes.
- Identity-bearing token workflows do not require an fxhash-hosted runtime endpoint.
- Slug-only fxhash resolution is an explicit convenience that depends on fxhash while
  its service is available.
- Never imply that an EVM chain is guessed.
- `/project/...` identifies a project. `/iteration/...` and identity-bearing
  `/gentk/...` URLs identify one token in the archive workflow.
- Do not announce a command as available until its package and production documentation
  are released.
