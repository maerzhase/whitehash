# @whitehash/ui

The complete whitehash design system: Geist-dark primitives, compound art-domain
components, one-line gallery/search blocks, and documentation chrome. Headless behavior
comes from `@whitehash/react`; this package stays thin, composable, and form-agnostic.

## Install and styles

No Tailwind toolchain is required:

```tsx
import { WalletGallery, WhitehashProvider } from "@whitehash/ui"
import "@whitehash/ui/styles.css"
```

Tailwind v4 consumers can compile against the source and tokens instead:

```css
@import "tailwindcss";
@import "@whitehash/ui/theme.css";
@source "../node_modules/@whitehash/ui/src/**/*.{ts,tsx}";
```

Retheme either path by overriding semantic variables such as `--color-primary`,
`--color-canvas`, `--color-fg`, `--color-line`, and `--radius-card`.

## API

| Export | Kind | Purpose |
| --- | --- | --- |
| `WhitehashProvider` | provider | High-level package entry; configures every domain component |
| `Button` | behavioral primitive | CVA variants and Base UI `render` slot |
| `Card.*`, `Badge` | presentational primitives | Card compound and status pills |
| `ToggleGroup.*`, `Dialog.*` | behavioral primitives | Keyboard/focus/overlay behavior from Base UI |
| `Field.*`, `Input`, `Textarea` | form primitives | Form-library-independent labelled controls |
| `Spinner`, `Skeleton`, `Separator` | feedback/layout | Loading and structural feedback |
| `Artwork.*` | compound domain | Resilient still, sandboxed live iframe, play control, status |
| `TokenCard.*`, `TokenGrid`, `TokenDetails` | token domain | Composable token presentation and detail |
| `WalletGallery` | block | Cache-first wallet lookup and token grid (`.Content` accepts loaded state) |
| `ProjectBrowser`, `ProjectGallery` | blocks | Chain projects and minted iterations with delegated navigation |
| `AddressSearch`, `WalletSearch` | search | Validated form core and spotlight dialog composition |
| `SiteHeader`, `ToolkitHero`, `DocsShell` | site chrome | Package-owned toolkit/docs shell |
| `DocsPage`, `DocsHeading`, `DocsSection` | docs layout | Long-form documentation structure |
| `LiveDemo`, `Callout`, `CodeBlock` | docs content | Demo framing, guidance, and copyable source |

Behavioral parts expose slots only where props, refs, focus, or accessibility wiring must
merge. Presentational leaves use ordinary elements and `className`. Compound roots own
context; parts consume it so adopters can reorder or replace presentation.

## Exports

| Path | Contents |
| --- | --- |
| `@whitehash/ui` | Precompiled ESM and declarations |
| `@whitehash/ui/styles.css` | Complete precompiled theme + component CSS |
| `@whitehash/ui/theme.css` | Tailwind v4 `@theme` tokens |
| `@whitehash/ui/source` | TypeScript source entry for source-consuming toolchains |

## Versioning

Patches preserve component props and compound parts; compatible variants/parts/components
are minor; removing parts, props, tokens, or changing behavioral contracts is major.
Publication is not enabled yet.
