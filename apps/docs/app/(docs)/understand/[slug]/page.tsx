import type { Metadata } from "next"
import { DocsRoutePage } from "../../../../src/docs-route-page"
import { pageMetadata, UNDERSTAND_SEO } from "../../../../src/seo"

const SLUGS = ["overview", "data-model", "sources", "urls", "glossary"]

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
  return pageMetadata(`/understand/${slug}`, UNDERSTAND_SEO[slug] ?? UNDERSTAND_SEO.overview!)
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <DocsRoutePage kind="understand" slug={slug} />
}
