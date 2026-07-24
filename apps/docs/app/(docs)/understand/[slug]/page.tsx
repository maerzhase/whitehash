import { DocsRoutePage } from "../../../../src/docs-route-page"

const SLUGS = ["overview", "data-model", "sources", "urls", "glossary"]

export function generateStaticParams() {
  return SLUGS.map(slug => ({ slug }))
}

export const dynamicParams = false

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <DocsRoutePage kind="understand" slug={slug} />
}
