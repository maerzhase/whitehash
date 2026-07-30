---
name: x-thread-plan
description: Plan, draft, revise, and validate concise X/Twitter product threads from verified facts. Use when the request is for thread copy, narrative order, adaptive post count, copy-paste commands, media placement, alt text, character-limit checks, or a posting checklist without requiring Whitehash-specific branded images.
---

# X Thread Plan

Turn verified product facts into the shortest complete X thread.

## Required reference

Read `references/planning.md` completely before drafting.

## Workflow

1. Collect the confirmed problem, outcome, shortest working journey, important modes,
   trust boundaries, limitations, release state, desired call to action, and any
   campaign-specific positioning or voice guidance.
2. Choose an adaptive narrative. Do not target a predetermined number of posts.
3. Copy `assets/thread.md` to the campaign directory and add, merge, or remove numbered
   sections as the story requires.
4. Draft one primary idea per post. Lead with the outcome or next action and keep
   commands and API names copy-pasteable.
5. Place media only where it teaches or anchors a meaningful beat. Add useful alt text
   for every attachment.
6. Add posting notes for release prerequisites, link replacement, and intentionally
   unrun live checks.
7. Validate with:

```bash
node scripts/validate-thread.mjs <campaign-directory>/thread.md
```

Fix every error. The validator checks structure and delivery constraints, not whether
product claims are true.
