# Whitehash marketing voice

## Product truth

- Whitehash's central promise is to keep fxhash generative art available without relying
  on third-party infrastructure. The two user journeys are CLI-to-offline-archive and
  API/React-to-online-rendering.
- Inspect implementation and tests before making technical claims.
- Separate verified facts from inference.
- Describe `verify` precisely. Archive verification checks local file hashes,
  completeness, local references, and path safety. IPFS CAR blocks are content-hash
  checked during creation. A later verification is not a fresh blockchain lookup or an
  externally signed proof.
- An offline folder contains artwork bytes and is designed for preservation.
- `whitehash-token-index@1` JSON is for loading and displaying a token on a hosted site.
  It is not itself a copy of the artwork bytes.
- Identity-bearing fxhash URLs do not require an fxhash-hosted runtime endpoint.
- Slug resolution is an explicit convenience that depends on the fxhash service being
  available. Say “while the fxhash website is still up” when that temporal dependency
  matters to the story.
- Never imply that Whitehash guesses an EVM chain.
- `/project/...` describes a collection. `/iteration/...` and identity-bearing
  `/gentk/...` URLs describe one token for this workflow.

## Voice

- Sound direct, calm, technically credible, and lightly playful.
- Write for people building with, making, collecting, or exploring generative art.
- Be welcoming without labeling the reader a beginner, dummy, nontechnical user, or
  calling attention to the writing style.
- Lead with a concrete outcome or action. Prefer working examples over adjectives.
- Keep “project” and “token” as the canonical product terms. Use “edition” only to
  clarify what one token represents.
- Avoid hype words such as “revolutionary,” “game-changing,” and “magic.”
- Avoid em dashes. Use a period, colon, parentheses, or a new sentence.
- Explain unfamiliar product or blockchain terms at their first useful appearance.
- Use Whitehash wordplay sparingly. One strong line is better than repeated jokes.
- Do not imitate a named individual’s style.

## Claim discipline

- Put a caveat next to the capability it qualifies.
- Frame “forever” as the preservation goal, not a guarantee that storage maintains
  itself.
- Do not conflate a local archive with a hostable metadata index.
- Do not say a command is available until its package and production documentation are
  released. Use a posting or publication note when release is pending.
- Keep commands and public APIs exact and copy-pasteable.

## Final review

Confirm that:

- the first sentence names a real problem or useful outcome;
- the next action is obvious from the headline, link, or example;
- the desired action is obvious;
- “project” and “token” retain their product meanings;
- each technical claim is supported by source or tests;
- dependencies and limitations are disclosed without burying the value;
- wordplay supports the message instead of competing with it;
- the copy sounds like Whitehash across its intended medium.
