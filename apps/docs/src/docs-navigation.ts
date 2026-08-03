import { API_ENTRIES } from "./docs-content"
import { UNDERSTAND_ENTRIES } from "./understand-content"
import type { DocsNavItem } from "./components/docs-chrome"

export const DOC_NAV: DocsNavItem[] = [
  { label: "Getting started", href: "/guide/getting-started", group: "Guides" },
  { label: "Configuration", href: "/guide/configuration", group: "Guides" },
  { label: "Archive CLI", href: "/guide/cli", group: "Guides" },
  { label: "Market history", href: "/guide/market", group: "Guides" },
  { label: "Onchfs", href: "/guide/onchfs", group: "Guides" },
  { label: "Explore variations", href: "/guide/variations", group: "Guides" },
  { label: "Capture engine", href: "/guide/capture", group: "Guides" },
  { label: "Theming", href: "/guide/theming", group: "Guides" },
  ...UNDERSTAND_ENTRIES.map(entry => ({
    label: entry.title,
    href: `/understand/${entry.slug}`,
    group: "Deep dives",
  })),
  ...[
    "artwork",
    "use-token",
    "use-wallet-tokens",
    "use-projects",
    "use-project",
    "use-market-index",
    "use-gateway-image",
    "use-artwork-frame",
    "whitehash-provider",
    "use-whitehash",
    "market-stats",
    "token-details",
  ].flatMap(slug => {
    const entry = API_ENTRIES.find(candidate => candidate.slug === slug)
    return entry ? [{ label: entry.name, href: `/docs/${entry.slug}`, group: "Reference" }] : []
  }),
  { label: "LLM guide", href: "/llms", group: "Resources" },
]
