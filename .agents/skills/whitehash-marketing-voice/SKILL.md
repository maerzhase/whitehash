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
2. Inspect the relevant source, tests, documentation, and release state before making
   product claims.
3. Separate confirmed facts from inference. Qualify external dependencies where the
   reader encounters them.
4. Lead with the useful outcome or next action. Draft the clearest useful version first,
   then add at most one memorable or playful line.
5. Keep the product vocabulary stable. Use “project” and “token” as the canonical terms;
   explain “edition” as a supporting gloss when it helps.
6. Remove hype, unexplained jargon, audience labels, and claims broader than the
   evidence.
7. Confirm that commands, API names, links, outputs, and limitations remain exact.
8. For copy stored in a file, run:

```bash
node scripts/validate-copy.mjs <copy-file>
```

Fix every error and review warnings deliberately. This deterministic style check does
not replace source-backed claim review.

Do not imitate a named person's voice. Apply the Whitehash voice and use general
principles such as concise hooks, concrete examples, progressive disclosure, and honest
constraints.
