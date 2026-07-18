# @whitehash/ui

whitehash's design system: composable, headless-first React primitives built on
[Base UI](https://base-ui.com) and styled with Tailwind v4. The app holds business logic;
presentation and interaction ceremony live here.

## Principles

- **Behavioral components expose a `render` slot** (Base UI `useRender`) so library props
  (onClick / ref / aria-*) merge with a consumer element — e.g. `<Button render={<a/>}>`.
- **Presentational leaves don't** — `Card.*` is a plain className compound; no slot
  machinery where there's no behavior to merge.
- **Headless layer owns a11y** — `ToggleGroup` gets roving focus / arrow-key nav / aria
  from Base UI; `Field` wires label↔control↔description.
- **Form-agnostic** — `Field` takes plain value/onChange; no form-library binding.
- Tokens are semantic (`bg-surface`, `text-muted`, `rounded-card`), defined once in
  `theme.css`; components never reference raw hex.

## Components

| Export | Kind | Notes |
| --- | --- | --- |
| `Button` | behavioral | `useRender` slot, CVA variants (primary/secondary/ghost/link/danger/card) + sizes |
| `Card.{Root,Media,Body,Title,Meta}` | presentational | compound; wrap in `Button variant="card"` for clickable cards |
| `Badge` | presentational | status pill (default/accent/warning/success/danger/outline) |
| `ToggleGroup` + `.Item` | behavioral | segmented single-select (Base UI Toggle Group) |
| `Field.{Root,Label,Description,Control}`, `Input`, `Textarea` | form | form-agnostic labelled controls |
| `Spinner`, `Skeleton`, `Separator` | presentational | feedback/layout |
| `cn` | util | clsx + tailwind-merge |

## Usage

The consuming app owns the Tailwind entry and imports the tokens:

```css
@import "tailwindcss";
@import "@whitehash/ui/theme.css";
@source "../../../packages/ui/src/**/*.{ts,tsx}"; /* scan DS classes */
```

```tsx
import { Button, Card, ToggleGroup } from "@whitehash/ui"
```
