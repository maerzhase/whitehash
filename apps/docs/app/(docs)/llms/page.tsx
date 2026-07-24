import type { Metadata } from "next"
import Link from "next/link"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import {
  Callout,
  CodeBlock,
  DocsHeading,
  DocsPage,
  DocsSection,
} from "../../../src/components/docs-chrome"

export const metadata: Metadata = {
  title: "LLM guide",
  description:
    "A machine-readable map of the Whitehash toolkit, architecture, domain semantics, and documentation.",
}

export default async function LlmsPage() {
  const content = await readFile(join(process.cwd(), "public", "llms.txt"), "utf8")

  return (
    <DocsPage>
      <DocsHeading
        eyebrow="Resources"
        title="LLM guide"
        description="The complete machine-readable overview of Whitehash, shown exactly as language models receive it."
      />
      <DocsSection title="About this file">
        <div className="docs-prose">
          <p>
            This page mirrors the canonical{" "}
            <Link className="docs-text-link" href="/llms.txt">
              /llms.txt
            </Link>{" "}
            file. It explains the toolkit&rsquo;s purpose, layers, data flow, supported networks,
            domain rules, and constraints for code-generating models.
          </p>
        </div>
        <Callout className="mt-5">
          The raw text endpoint is the source of truth. This page reads it during the static build,
          so the two versions cannot drift.
        </Callout>
      </DocsSection>
      <DocsSection title="Full llms.txt">
        <CodeBlock code={content} language="markdown" />
      </DocsSection>
    </DocsPage>
  )
}
