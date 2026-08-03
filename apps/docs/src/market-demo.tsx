"use client"

import { useMarketIndex } from "@whitehash/react"
import { MarketStats, Skeleton } from "@whitehash/ui"
import { useEffect, useRef, useState } from "react"

/**
 * The artifact is committed under `public/`, produced by
 * `whitehash-archive market v2:86` — the same project the rest of the site
 * demonstrates. A static file keeps the docs build offline-friendly and shows
 * the shape an application actually hosts, rather than backfilling a project in
 * the browser on every page view.
 *
 * It is fetched, never imported, so a full market history stays out of the
 * bundle no matter how large the project's history grows.
 */
export const DEMO_MARKET_ARTIFACT = "/market-index-demo.json"

/**
 * Defer the request until the section is close to the viewport. The homepage
 * section sits well below the fold, and a project with thousands of events is a
 * sizeable file: nobody should pay for it to read the hero.
 */
function useNearViewport<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element || near) return
    if (typeof IntersectionObserver !== "function") {
      setNear(true)
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) setNear(true)
      },
      { rootMargin: "400px" },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [near])
  return { ref, near }
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
      {Array.from({ length: 8 }, (_, position) => (
        <Skeleton key={position} className="h-[68px] rounded-card" />
      ))}
    </div>
  )
}

export function MarketDemo() {
  const { ref, near } = useNearViewport<HTMLDivElement>()
  const { index, loading, error } = useMarketIndex(near ? DEMO_MARKET_ARTIFACT : null)

  return (
    <div ref={ref}>
      {!near || loading ? (
        <StatsSkeleton />
      ) : error || !index ? (
        <p className="text-sm text-muted">Market index unavailable: {error ?? "not found"}</p>
      ) : (
        <MarketStats.Root index={index}>
          <div className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted">
            <span className="text-fg">{index.project.name}</span>
            <span>
              {index.project.minted ?? "?"} editions · snapshot {index.generatedAt.slice(0, 10)}
            </span>
          </div>
          <MarketStats.Tiles />
          <MarketStats.FloorChart />
          <MarketStats.Events limit={6} />
        </MarketStats.Root>
      )}
    </div>
  )
}
