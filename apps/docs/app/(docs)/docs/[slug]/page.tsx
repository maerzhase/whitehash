import type { Metadata } from "next"
import { DocsRoutePage } from "../../../../src/docs-route-page"
import { apiSeo, pageMetadata } from "../../../../src/seo"

const SLUGS = [
  "whitehash-provider",
  "use-whitehash",
  "use-token",
  "use-wallet-tokens",
  "use-projects",
  "use-project",
  "use-market-index",
  "use-gateway-image",
  "use-artwork-frame",
  "button",
  "card",
  "badge",
  "togglegroup",
  "field",
  "input",
  "textarea",
  "dialog",
  "spinner",
  "skeleton",
  "separator",
  "artwork",
  "market-stats",
  "token-details",
  "wallet-gallery",
  "project-browser",
  "project-gallery",
  "address-search",
  "wallet-search",
  "sort-toggle",
]

export function generateStaticParams() {
  return SLUGS.map(slug => ({ slug }))
}

export const dynamicParams = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  return pageMetadata(`/docs/${slug}`, apiSeo(slug))
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <DocsRoutePage kind="api" slug={slug} />
}
