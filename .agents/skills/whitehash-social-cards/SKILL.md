---
name: whitehash-social-cards
description: Create or revise deterministic, phone-readable Whitehash social visual cards with the real repository logo and exact copy, commands, APIs, comparisons, or diagrams. Use for branded launch heroes, CLI cards, output comparisons, archive trees, API cards, and coordinated campaign images without requiring a complete X thread.
---

# Whitehash Social Cards

Create a small, coherent set of branded cards that add information to a campaign.

## Required references

Read these files completely before editing or rendering cards:

- `references/brand-ci.md` for the canonical Whitehash visual identity;
- `references/examples.md` for approved compositions and failure examples;
- `references/visuals.md` for card selection, rendering, and review.

## Workflow

1. Confirm the message, platform, aspect ratio, exact copy, and commands. Inspect
   `apps/docs/app/opengraph-image.tsx`, `apps/docs/src/app.css`, and
   `apps/docs/public/logo-original.png` for CI drift.
2. Copy `assets/cards.html.template` into the output directory as `cards.html`. Copy
   `apps/docs/public/logo-original.png` beside it as `logo.png`.
3. Treat the supplied hero composition as locked CI. Replace its placeholders without
   restructuring it unless the user explicitly requests a new direction. Keep only the
   other card sections the story needs.
4. Prefer HTML/CSS for logos, typography, code, comparisons, trees, and diagrams. Use
   image generation only when a true illustration or photographic bitmap adds meaning.
5. Serve the output directory over localhost and capture each `?card=<id>` view at
   1280×720 unless another format was requested.
6. Inspect every rendered image at original resolution and compare the hero with the
   approved example. Revise until the CI, logo, hierarchy, copy, and code are exact.
7. Deliver meaningful filenames in posting order plus alt text that explains each
   card’s information.

Never regenerate, reinterpret, decorate, or substitute the Whitehash logo. Do not
invent a campaign-specific color palette when the user has not requested one.
