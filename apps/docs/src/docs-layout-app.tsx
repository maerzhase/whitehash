"use client"

import { useEffect, useLayoutEffect, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { registerOnchfsWorker } from "@whitehash/onchfs-sw"
import { Button, WhitehashProvider } from "@whitehash/ui"
import { DocsShell, SiteHeader } from "./components/docs-chrome"
import { DOC_NAV } from "./docs-navigation"

export function DocsLayoutApp({ children }: { children: ReactNode }) {
  useEffect(() => {
    void registerOnchfsWorker().catch(error => console.warn("onchfs worker unavailable", error))
  }, [])
  return (
    <WhitehashProvider config={{ resolver: { onchfs: { mode: "service-worker" } } }}>
      <PersistentDocsShell>{children}</PersistentDocsShell>
    </WhitehashProvider>
  )
}

function PersistentDocsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const currentHref = pathname === "/" ? pathname : pathname.replace(/\/+$/, "")

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [pathname])

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <SiteHeader
        actions={
          <>
            <Button variant="ghost" size="sm" render={<Link href="/guide/getting-started" />}>
              Docs
            </Button>
          </>
        }
      />
      <DocsShell items={DOC_NAV} currentHref={currentHref}>
        {children}
      </DocsShell>
    </div>
  )
}
