import type { Metadata } from "next"
import { DocsRoutePage } from "../../../../src/docs-route-page"
import { GUIDE_SEO, pageMetadata } from "../../../../src/seo"

const SLUGS = [
  "getting-started",
  "configuration",
  "cli",
  "market",
  "onchfs",
  "theming",
  "variations",
  "capture",
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
  return pageMetadata(`/guide/${slug}`, GUIDE_SEO[slug] ?? GUIDE_SEO["getting-started"]!)
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <DocsRoutePage kind="guide" slug={slug} />
}
