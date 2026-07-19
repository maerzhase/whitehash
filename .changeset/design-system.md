---
"@whitehash/ui": minor
"@whitehash/docs": minor
---

Add `@whitehash/ui`, a composable design system built on Base UI + Tailwind v4: Button
(with `useRender` slot), presentational Card compound, Badge, segmented ToggleGroup,
form-agnostic Field/Input/Textarea, and feedback primitives, over a semantic token theme.
Migrate the whole viewer to it (Tailwind v4 via `@tailwindcss/vite`, hand-rolled CSS
removed) so the app is business logic composing components, and give it a light restyle
(refined gallery-dark palette, logo hero).
