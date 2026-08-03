"use client"

import { useMarketIndex } from "@whitehash/react"
import { MarketStats, Skeleton } from "@whitehash/ui"

/**
 * The artifact is committed under `public/`, produced by
 * `whitehash-archive market v2:2464`. A static file keeps the docs build
 * offline-friendly and shows the shape an application actually hosts, rather
 * than backfilling a project in the browser on every page view.
 */
export const DEMO_MARKET_ARTIFACT = "/market-index-demo.json"

export function MarketDemo() {
  const { index, loading, error } = useMarketIndex(DEMO_MARKET_ARTIFACT)

  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
        {Array.from({ length: 8 }, (_, position) => (
          <Skeleton key={position} className="h-[68px] rounded-card" />
        ))}
      </div>
    )
  }
  if (error || !index) {
    return <p className="text-sm text-muted">Market index unavailable: {error ?? "not found"}</p>
  }

  return (
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
  )
}
