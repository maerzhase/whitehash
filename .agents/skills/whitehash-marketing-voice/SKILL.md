---
name: whitehash-marketing-voice
description: Write or revise Whitehash marketing copy with a direct, calm, technically credible, and lightly playful voice. Use for social posts, release announcements, landing pages, README copy, changelogs, product explanations, calls to action, or claim review when the work does not require a complete X thread-and-visual campaign.
---

# Whitehash Marketing Voice

Make Whitehash copy recognizable without weakening technical accuracy.

## Required references

Read `references/voice.md` and `references/positioning.md` completely before writing
or revising copy.

## Workflow

1. Establish the audience, medium, desired action, and available space.
2. Choose the primary journey and the shortest concrete proof from
   `references/positioning.md`.
3. Inspect the relevant source, tests, documentation, and release state before making
   product claims.
4. Draft and edit with `references/voice.md`. Remove repeated branding, vague nouns,
   unnecessary jargon, and claims broader than the evidence.
5. Confirm that commands, API names, links, outputs, and limitations remain exact.
6. For copy stored in the repository, run from the repository root:

```bash
node .agents/skills/whitehash-marketing-voice/scripts/validate-copy.mjs <copy-file>
```

Fix every error and review warnings deliberately. This deterministic style check does
not replace source-backed claim review.
