# Whitehash brand CI

## Canonical sources

Treat these repository files as the source of truth and inspect them for drift before
rendering:

- `apps/docs/app/opengraph-image.tsx` for the social composition;
- `apps/docs/src/app.css` for visual behavior;
- the theming tokens in `apps/docs/src/docs-content.tsx`;
- `apps/docs/public/logo-original.png` for the high-resolution hash mark.

Do not infer a new identity from a previous campaign.

## Fixed visual language

Use:

- canvas: `#000`;
- foreground: `#f4e7d8`;
- secondary text: `#a0a0a0`;
- subdued headline: `#777`;
- surface: `#080808` or `#1a1a1a`;
- line: `#ffffff24`;
- strong line: `#ffffff3d`;
- electric-blue glow or focus accent: `#47a8ff`;
- Geist Sans for copy and Geist Mono for commands, with system fallbacks only when the
  repository font is unavailable.

Use blue as a restrained glow, focus line, or functional accent. Do not turn it into a
large text fill. Do not introduce teal, beige, gradients, or campaign-specific colors
unless the user explicitly asks.

## Logo treatment

- Use `logo-original.png`, never a generated approximation.
- Preserve its transparency, aspect ratio, texture, and warm-white color.
- Let the large mark touch or leave the frame edge when the composition calls for it.
- Do not put it inside a circle, badge, card, halo, or border.
- Do not add ornamental shadows other than the restrained black drop shadow used by the
  canonical Open Graph image.
- Pair a 42px mark with the lowercase `whitehash` wordmark in the top-left brand lockup.

## Canonical social composition

The repository Open Graph image is the baseline:

1. Pure-black canvas with a subtle 64px white grid at roughly seven percent opacity.
2. Small logo and lowercase wordmark at the top left.
3. Large, warm-white headline aligned left with tight Geist spacing.
4. Secondary headline line in subdued grey.
5. Large high-resolution hash mark anchored at the bottom right.
6. Restrained electric-blue radial glow behind the large mark.

The hero template encodes this composition. Change copy first, not layout.
