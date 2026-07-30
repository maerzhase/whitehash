import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { Metadata } from "next"
import Link from "next/link"
import {
  CodeBlock,
  DocsHeading,
  DocsPage,
  DocsSection,
} from "../../../src/components/docs-chrome"
import { pageMetadata } from "../../../src/seo"

export const metadata: Metadata = pageMetadata("/llms", {
  title: "LLM guide",
  description:
    "A machine-readable map of the Whitehash toolkit, architecture, domain semantics, and documentation.",
})

export default async function LlmsPage() {
  const content = await readFile(join(process.cwd(), "public", "llms.txt"), "utf8")

  return (
    <DocsPage>
      <DocsHeading
        eyebrow="Resources"
        title="LLM guide"
        description="A focused map of the Whitehash toolkit for code-generating models."
      />
      <DocsSection title="About this file">
        <div className="docs-prose">
          <p>
            Use this guide to understand Whitehash&rsquo;s purpose, package boundaries, domain rules,
            supported networks, and documentation routes before writing or changing code. The
            machine-readable source is available at{" "}
            <Link className="docs-text-link" href="/llms.txt">
              /llms.txt
            </Link>{" "}
            for direct use in coding tools.
          </p>
        </div>
      </DocsSection>
      <DocsSection title="Full llms.txt">
        <CodeBlock code={content} language="markdown" />
      </DocsSection>
    </DocsPage>
  )
}
