---
name: whitehash-x-launch
description: Orchestrate a complete Whitehash X/Twitter product-launch campaign with verified claims, brand voice, an adaptive thread, deterministic visual cards, copy-paste commands, alt text, validation, and a posting checklist. Use when a Whitehash feature, release, pull request, CLI workflow, API, or technical milestone needs both finished thread copy and coordinated branded images.
---

# Whitehash X Launch

Compose the repository’s focused marketing skills into one end-to-end launch workflow.

## Required skills

Read these sibling skills completely before starting. Follow their required references:

- `../whitehash-marketing-voice/SKILL.md` for voice and claim discipline;
- `../x-thread-plan/SKILL.md` for narrative, post constraints, accessibility, and
  validation;
- `../whitehash-social-cards/SKILL.md` for deterministic branded visuals.

When a request needs only one of those outcomes, use the focused skill instead of this
orchestrator.

## Workflow

### 1. Establish product truth

Read the repository `AGENTS.md`, relevant README files, implementation, tests, release
note, and current Git status. Determine:

- the user problem and new capability;
- the shortest successful user journey;
- default behavior and opt-in behavior;
- exact commands and public APIs;
- meaningful limitations and external dependencies;
- release state and whether commands are usable publicly yet.

Do not derive security, verification, permanence, or decentralization claims from
marketing copy alone. Confirm them in source and tests.

### 2. Choose the narrative and voice

Apply `x-thread-plan` to choose the fewest posts needed for the complete story. Apply
`whitehash-marketing-voice` to every draft and technical claim.

### 3. Scaffold the campaign

Default to `.private/artifacts/<campaign-slug>/` so drafts remain local-only.

From the skill directory, run:

```bash
node scripts/new-campaign.mjs <output-directory>
```

The script composes assets owned by the focused skills and copies:

- `thread.md`, an adaptive thread skeleton;
- `cards.html`, modular deterministic card layouts;
- the high-resolution Whitehash logo from `apps/docs/public/logo-original.png`.

The scaffold refuses to overwrite a non-empty directory.

### 4. Draft the thread

Follow `x-thread-plan` and `whitehash-marketing-voice`. Explain internal names such as
“paste first” in plain language. Keep the offline archive and hostable JSON outcomes
distinct.

### 5. Build visual cards

Follow `whitehash-social-cards`. Keep only the cards the thread needs and make each
visual teach or anchor a meaningful beat.

### 6. Validate

Run:

```bash
node ../x-thread-plan/scripts/validate-thread.mjs <output-directory>/thread.md
node ../whitehash-marketing-voice/scripts/validate-copy.mjs <output-directory>/thread.md
```

Run the command from this skill directory. Validation does not replace the
product-truth review.

### 7. Deliver

Return:

- a link to `thread.md`;
- links to final visual files;
- the post count and validation result;
- any release prerequisite or intentionally unrun live check;
- confirmation that `.private/` remains untracked, when applicable.

Do not post, schedule, upload, or publish unless the user explicitly asks.
