import type { ReactNode } from "react"
import { DocsLayoutApp } from "../../src/docs-layout-app"

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <DocsLayoutApp>{children}</DocsLayoutApp>
}
