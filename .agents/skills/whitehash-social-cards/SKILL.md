---
name: whitehash-social-cards
description: Create or revise deterministic, phone-readable Whitehash social visual cards with the real repository logo and exact copy, commands, APIs, comparisons, or diagrams. Use for branded launch heroes, CLI cards, output comparisons, archive trees, API cards, and coordinated campaign images without requiring a complete X thread.
---

# Whitehash Social Cards

Create a small, coherent set of branded cards that add information to a campaign.

## Required reference

Read `references/visuals.md` completely before editing or rendering cards.

## Workflow

1. Confirm the message, platform, aspect ratio, exact copy, commands, and required
   repository-native brand assets.
2. Copy `assets/cards.html.template` into the output directory as `cards.html`. Copy
   `apps/docs/public/logo.png` beside it as `logo.png`.
3. Keep only the card sections the story needs and replace every
   `{{PLACEHOLDER}}`.
4. Prefer HTML/CSS for logos, typography, code, comparisons, trees, and diagrams. Use
   image generation only when a true illustration or photographic bitmap adds meaning.
5. Serve the output directory over localhost and capture each `?card=<id>` view at
   1280×720 unless another format was requested.
6. Inspect every rendered image at original resolution. Revise until the logo is
   undistorted, type is phone-readable, hierarchy is clear, and all code is exact.
7. Deliver meaningful filenames in posting order plus alt text that explains each
   card’s information.

Never regenerate, reinterpret, or decorate the Whitehash logo.
