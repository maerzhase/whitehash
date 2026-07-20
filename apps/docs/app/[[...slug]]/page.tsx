import { Suspense } from "react"
import { App } from "../../src/App"

const GUIDE_SLUGS = ["getting-started", "how-it-works", "configuration", "onchfs", "theming", "variations", "next", "proxy"]
const API_SLUGS = [
  "whitehash-provider", "use-whitehash", "use-wallet-tokens", "use-projects", "use-project",
  "use-gateway-image", "use-artwork-frame", "button", "card", "badge",
  "togglegroup", "field", "input", "textarea", "dialog", "spinner", "skeleton", "separator",
  "artwork", "token-grid", "token-grid-skeleton", "token-details", "wallet-gallery",
  "project-browser", "project-gallery", "address-search", "wallet-search", "sort-toggle",
]

export function generateStaticParams() {
  return [
    { slug: [] },
    { slug: ["settings"] },
    ...GUIDE_SLUGS.map(slug => ({ slug: ["guide", slug] })),
    ...API_SLUGS.map(slug => ({ slug: ["docs", slug] })),
  ]
}

export const dynamicParams = false

export default function Page() {
  return <Suspense><App /></Suspense>
}
