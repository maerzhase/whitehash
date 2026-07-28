# Whitehash social visuals

## Default approach

Prefer deterministic HTML/CSS cards for:

- launch heroes with exact copy;
- CLI commands and terminal output;
- folder trees;
- output comparisons;
- public API snippets;
- small architecture diagrams.

Use generated raster imagery only when an illustration or photographic scene adds real
meaning. Do not use image generation for the Whitehash logo, code, UI, or typography.

## Brand assets

- Use `apps/docs/public/logo.png`.
- Show the logo as supplied. Do not redraw, stylize, crop, recolor, or reinterpret it.
- Do not place a circle, halo, badge, or decorative container around the logo unless
  the user explicitly requests one.
- Use the wordmark `whitehash` in lowercase.

## Composition

- Render social cards at 1280×720 unless another format is requested.
- Design for a small phone screen.
- Use one core message per card.
- Prefer a headline plus one supporting block.
- Keep important type at 18 px or larger; use substantially larger launch headlines.
- Keep exact code large enough to read without zooming.
- Avoid full-page documentation screenshots and dense application screenshots.
- Maintain strong contrast and generous negative space.

## Modular card types

Use only the card types the story needs:

- **Hero:** real logo, one memorable line, one functional subline.
- **CLI:** smallest working command and concise success outcome.
- **Output comparison:** clearly separate distinct output modes.
- **Archive contents:** compact file tree plus verification command.
- **API:** one focused snippet plus no more than three supporting facts.

Do not force every campaign to contain every card.

## Terminal styling

- Use `❯` for a shell prompt.
- Use `┌`, `│`, and `└` to structure terminal cards when it improves scanning.
- Use the real command. Never shorten a contract or URL in a way that looks copyable but
  will fail.
- Keep comments and simulated output visually distinct from the command.

## Render and review

1. Copy `assets/cards.html.template` into the campaign folder as `cards.html`.
2. Remove unused `<section data-card>` blocks.
3. Replace every `{{PLACEHOLDER}}`.
4. Serve the campaign folder over localhost.
5. Capture each `?card=<id>` view at 1280×720.
6. Inspect every screenshot at original resolution.
7. Revise and rerender until:
   - the logo is visible and undistorted;
   - text is readable on a phone;
   - no copy wraps awkwardly;
   - commands and API names are exact;
   - the visual adds information instead of repeating the post.

Use meaningful filenames in posting order, for example `01-hero.jpg`,
`02-cli.jpg`, and `03-outputs.jpg`.
