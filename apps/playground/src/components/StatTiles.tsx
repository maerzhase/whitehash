import type { MarketStats } from "@whitehash/market"
import {
  formatAmount,
  formatPercent,
  formatPrice,
  toDecimal,
  type ChainCurrency,
} from "../lib/format.js"

function Delta({ value }: { value: number | null }) {
  if (value === null) return null
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat"
  return (
    <span className={`delta delta-${direction}`} aria-label={`change ${formatPercent(value)}`}>
      {formatPercent(value)}
    </span>
  )
}

function Tile(props: { label: string; value: string; delta?: number | null; note?: string }) {
  return (
    <div className="tile">
      <div className="tile-label">{props.label}</div>
      <div className="tile-value">
        {props.value}
        {props.delta !== undefined && <Delta value={props.delta} />}
      </div>
      {props.note && <div className="tile-note">{props.note}</div>}
    </div>
  )
}

export function StatTiles({ stats, currency }: { stats: MarketStats; currency: ChainCurrency }) {
  const volume = (span: "24h" | "7d" | "30d" | "all") =>
    `${formatAmount(toDecimal(stats.volume.total[span].volume, currency.decimals))} ${currency.symbol}`
  return (
    <div className="tiles">
      <Tile
        label="Floor"
        value={formatPrice(stats.floor, currency)}
        delta={stats.floorChange24h}
        note={
          stats.listingsAvailable ? undefined : "Listings unavailable on EVM (off-chain orders)"
        }
      />
      <Tile label="Listed" value={stats.listingsAvailable ? String(stats.listed) : "—"} />
      <Tile label="Median listing" value={formatPrice(stats.median, currency)} />
      <Tile label="Volume 24h" value={volume("24h")} delta={stats.volumeChange24h} />
      <Tile label="Volume 7d" value={volume("7d")} delta={stats.volumeChange7d} />
      <Tile
        label="Volume all"
        value={volume("all")}
        note={`${stats.volume.total.all.sales} sales · ${stats.volume.primary.all.sales} primary / ${stats.volume.secondary.all.sales} secondary`}
      />
      <Tile label="Highest sale" value={formatPrice(stats.highestSale, currency)} />
      <Tile label="Lowest sale" value={formatPrice(stats.lowestSale, currency)} />
    </div>
  )
}
