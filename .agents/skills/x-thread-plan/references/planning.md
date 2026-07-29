# X thread planning

## Narrative

Use the fewest posts needed to tell the complete story. A simple release may need four
posts; a feature with meaningful modes or limitations may need more.

Prefer this order when applicable:

1. Problem and memorable outcome
2. Smallest working command or action
3. What the product does
4. Output choices or important mental model
5. Trust boundary or limitation
6. Programmatic API or implementation insight
7. Call to action

Merge or omit beats when the story remains complete. Remove repetition before removing
necessary context. Each post should carry one primary idea and remain useful on its own.

## Commands and code

- Use real, tested commands.
- Keep commands in post text copy-pasteable.
- Use `❯` as an optional terminal prompt.
- Avoid prefixing every command line with box characters in post text because that
  harms copying.
- Box-drawing characters such as `┌`, `│`, and `└` are appropriate inside rendered
  visual cards.
- Do not shorten a URL, identifier, or command in a way that looks executable but fails.

## Length

- Keep every post at or below X’s 280-character weighted limit.
- Treat each HTTP(S) URL as 23 characters during validation.
- Leave editing headroom when a final link or mention may still change.
- Do not split a coherent sentence merely to increase the post count.

## Media and accessibility

- Attach a visual only when it teaches or anchors a meaningful beat.
- Write alt text that explains the visual’s information, not its decorative styling.
- Keep alt text outside the post’s character count.
- State the media filename directly beneath its intended post in the draft.
- Avoid full-page screenshots whose content cannot be read on a phone.

## Final review

Confirm that:

- the hook describes the real problem;
- the first action is the smallest successful journey;
- important modes or outcomes are not conflated;
- dependencies and limitations appear next to the feature they qualify;
- every link points to the intended release;
- every post is useful alone and coherent in sequence;
- the thread uses the fewest posts needed for the complete story.
