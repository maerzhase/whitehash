"use client"

import { API_ENTRIES, ApiDocPage, GuidePage, SAMPLE_TOKEN } from "./docs-content"
import { UNDERSTAND_ENTRIES, UnderstandPage } from "./understand-content"
import { DocsPage } from "./components/docs-chrome"
import { Variations } from "./variations-demo"

export function DocsRoutePage({
  kind,
  slug,
}: {
  kind: "api" | "guide" | "understand"
  slug: string
}) {
  if (kind === "api")
    return <ApiDocPage entry={API_ENTRIES.find(entry => entry.slug === slug) ?? API_ENTRIES[0]!} />
  if (kind === "understand")
    return (
      <UnderstandPage
        slug={
          UNDERSTAND_ENTRIES.some(entry => entry.slug === slug) ? slug : UNDERSTAND_ENTRIES[0]!.slug
        }
      />
    )
  return (
    <>
      <GuidePage slug={slug} />
      {slug === "variations" ? (
        <DocsPage>
          <Variations token={SAMPLE_TOKEN} />
        </DocsPage>
      ) : null}
    </>
  )
}
