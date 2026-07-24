import type { DocsNavItem } from "./components/docs-chrome"
import { API_ENTRIES } from "./docs-content"
import { UNDERSTAND_ENTRIES } from "./understand-content"

export const DOC_NAV: DocsNavItem[] = [
  { label: "Getting started", href: "/guide/getting-started", group: "Start" },
  ...UNDERSTAND_ENTRIES.filter(entry => ["overview", "data-model"].includes(entry.slug)).map(
    entry => ({ label: entry.title, href: `/understand/${entry.slug}`, group: "Understand" }),
  ),
  { label: "Configuration", href: "/guide/configuration", group: "Guides" },
  { label: "Archive CLI", href: "/guide/cli", group: "Guides" },
  { label: "Onchfs artwork", href: "/guide/onchfs", group: "Guides" },
  { label: "Explore variations", href: "/guide/variations", group: "Guides" },
  { label: "Capture engine", href: "/guide/capture", group: "Guides" },
  { label: "Theming", href: "/guide/theming", group: "Guides" },
  ...[
    "artwork",
    "use-token",
    "use-wallet-tokens",
    "use-projects",
    "use-project",
    "use-gateway-image",
    "use-artwork-frame",
    "whitehash-provider",
    "use-whitehash",
    "token-details",
  ].flatMap(slug => {
    const entry = API_ENTRIES.find(candidate => candidate.slug === slug)
    return entry ? [{ label: entry.name, href: `/docs/${entry.slug}`, group: "Reference" }] : []
  }),
  ...UNDERSTAND_ENTRIES.filter(entry => ["sources", "urls", "glossary"].includes(entry.slug)).map(
    entry => ({ label: entry.title, href: `/understand/${entry.slug}`, group: "Deep dives" }),
  ),
  { label: "LLM guide", href: "/llms", group: "Resources" },
]
