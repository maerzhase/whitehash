/**
 * Market statistics display primitives.
 *
 * Presentational parts over a `MarketIndex`: the parts read money fields as
 * base-unit strings and format them with the index chain's currency, so an
 * application never has to know that Tezos prices are mutez and EVM prices are
 * wei. Compose them freely, or render `MarketStats.Tiles` for the default set.
 *
 * Deliberately no `useRender` slot: these leaves carry no library behavior to
 * merge, matching `card.tsx`.
 */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react"
import {
  chainCurrency,
  formatAddress,
  formatAmount,
  formatPercent,
  formatPrice,
  toDecimal,
  type ChainCurrency,
  type DailyMarketStat,
  type MarketEvent,
  type MarketEventKind,
  type MarketIndex,
  type VolumeSpan,
} from "@whitehash/market"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/cn.js"

interface MarketStatsContextValue {
  index: MarketIndex
  currency: ChainCurrency
}

const MarketStatsContext = createContext<MarketStatsContextValue | null>(null)

function useMarketStatsContext(): MarketStatsContextValue {
  const value = useContext(MarketStatsContext)
  if (!value) throw new Error("MarketStats parts must be rendered inside MarketStats.Root")
  return value
}

export const deltaVariants = cva("font-mono text-[11px] leading-4", {
  variants: {
    direction: {
      up: "text-success",
      down: "text-danger",
      flat: "text-faint",
    },
  },
  defaultVariants: { direction: "flat" },
})

export interface MarketStatsRootProps extends ComponentProps<"div"> {
  index: MarketIndex
}

function Root({ index, className, children, ...props }: MarketStatsRootProps) {
  const value = useMemo(() => ({ index, currency: chainCurrency(index.project.chain) }), [index])
  return (
    <MarketStatsContext.Provider value={value}>
      <div className={cn("flex flex-col gap-4", className)} {...props}>
        {children}
      </div>
    </MarketStatsContext.Provider>
  )
}

export interface DeltaProps extends ComponentProps<"span">, VariantProps<typeof deltaVariants> {
  value: number | null
}

/** Signed percentage change, colored by direction. */
function Delta({ value, className, direction, ...props }: DeltaProps) {
  if (value === null) return null
  const resolved = direction ?? (value > 0 ? "up" : value < 0 ? "down" : "flat")
  return (
    <span className={cn(deltaVariants({ direction: resolved }), className)} {...props}>
      {formatPercent(value)}
    </span>
  )
}

export interface MarketStatTileProps extends ComponentProps<"div"> {
  label: string
  value: string
  /** Percentage change rendered beside the value. */
  delta?: number | null
  /** Secondary line under the value, for caveats or breakdowns. */
  note?: string
}

/** One label/value cell; the building block every stat part renders. */
function Tile({ label, value, delta, note, className, ...props }: MarketStatTileProps) {
  return (
    <div
      className={cn("rounded-card border border-line bg-surface px-4 py-3", className)}
      {...props}
    >
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
        <span className="font-mono text-[15px] text-fg">{value}</span>
        {delta !== undefined && <Delta value={delta} />}
      </div>
      {note && <div className="mt-1 text-xs leading-5 text-faint">{note}</div>}
    </div>
  )
}

const UNAVAILABLE_LISTINGS = "Active listings are off-chain on this chain"

function Floor(props: Omit<MarketStatTileProps, "label" | "value">) {
  const { index, currency } = useMarketStatsContext()
  const { stats } = index
  return (
    <Tile
      label="Floor"
      value={formatPrice(stats.floor, currency)}
      delta={stats.floorChange24h}
      note={stats.listingsAvailable ? undefined : UNAVAILABLE_LISTINGS}
      {...props}
    />
  )
}

function Listed(props: Omit<MarketStatTileProps, "label" | "value">) {
  const { index } = useMarketStatsContext()
  const { stats } = index
  return (
    <Tile label="Listed" value={stats.listingsAvailable ? String(stats.listed) : "—"} {...props} />
  )
}

function Median(props: Omit<MarketStatTileProps, "label" | "value">) {
  const { index, currency } = useMarketStatsContext()
  return (
    <Tile label="Median listing" value={formatPrice(index.stats.median, currency)} {...props} />
  )
}

const SPAN_LABELS: Record<VolumeSpan, string> = {
  all: "all time",
  "24h": "24h",
  "2d": "2 days",
  "7d": "7 days",
  "14d": "14 days",
  "30d": "30 days",
  "60d": "60 days",
}

export interface SpanTileProps extends Omit<MarketStatTileProps, "label" | "value"> {
  span?: VolumeSpan
}

function Volume({ span = "all", ...props }: SpanTileProps) {
  const { index, currency } = useMarketStatsContext()
  const bucket = index.stats.volume.total[span]
  const delta =
    span === "24h"
      ? index.stats.volumeChange24h
      : span === "7d"
        ? index.stats.volumeChange7d
        : span === "30d"
          ? index.stats.volumeChange30d
          : undefined
  return (
    <Tile
      label={`Volume ${SPAN_LABELS[span]}`}
      value={formatPrice(bucket.volume, currency)}
      delta={delta}
      {...props}
    />
  )
}

function Sales({ span = "all", ...props }: SpanTileProps) {
  const { index } = useMarketStatsContext()
  const { volume } = index.stats
  return (
    <Tile
      label={`Sales ${SPAN_LABELS[span]}`}
      value={String(volume.total[span].sales)}
      note={`${volume.primary[span].sales} primary · ${volume.secondary[span].sales} secondary`}
      {...props}
    />
  )
}

function HighestSale(props: Omit<MarketStatTileProps, "label" | "value">) {
  const { index, currency } = useMarketStatsContext()
  return (
    <Tile label="Highest sale" value={formatPrice(index.stats.highestSale, currency)} {...props} />
  )
}

function LowestSale(props: Omit<MarketStatTileProps, "label" | "value">) {
  const { index, currency } = useMarketStatsContext()
  return (
    <Tile label="Lowest sale" value={formatPrice(index.stats.lowestSale, currency)} {...props} />
  )
}

/** The default stat set, in a responsive grid. */
function Tiles({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2", className)}
      {...props}
    >
      <Floor />
      <Listed />
      <Median />
      <Volume span="24h" />
      <Volume span="7d" />
      <Volume />
      <Sales />
      <HighestSale />
    </div>
  )
}

const CHART_WIDTH = 720
const CHART_HEIGHT = 168
const PAD = { top: 10, right: 10, bottom: 20, left: 54 }
const PLOT_W = CHART_WIDTH - PAD.left - PAD.right
const PLOT_H = CHART_HEIGHT - PAD.top - PAD.bottom

function ticks(max: number): number[] {
  if (max <= 0) return [0]
  const step = 10 ** Math.floor(Math.log10(max))
  const unit = max / step > 5 ? 2 * step : max / step > 2 ? step : step / 2
  const values: number[] = []
  for (let tick = 0; tick <= max; tick += unit) values.push(tick)
  return values
}

/** What the crosshair tooltip shows for the hovered day. */
interface HoveredPoint {
  date: string
  label: string
}

interface ChartFrameProps extends Omit<ComponentProps<"figure">, "children"> {
  title: string
  days: DailyMarketStat[]
  max: number
  hovered: HoveredPoint | undefined
  hoverX: number | null
  onHover: (index: number | null) => void
  children: ReactNode
}

function ChartFrame({
  title,
  days,
  max,
  hovered,
  hoverX,
  onHover,
  className,
  children,
  ...props
}: ChartFrameProps) {
  return (
    <figure
      className={cn(
        "relative m-0 rounded-card border border-line bg-surface px-3 pb-1 pt-3",
        className,
      )}
      {...props}
    >
      <figcaption className="mb-1 text-xs text-muted">{title}</figcaption>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={title}
        className="block h-auto w-full"
        onMouseMove={event => {
          const rect = event.currentTarget.getBoundingClientRect()
          if (days.length === 0) return
          const x = ((event.clientX - rect.left) / rect.width) * CHART_WIDTH
          const ratio = Math.min(1, Math.max(0, (x - PAD.left) / PLOT_W))
          onHover(Math.round(ratio * (days.length - 1)))
        }}
        onMouseLeave={() => onHover(null)}
      >
        {ticks(max).map(tick => {
          const y = PAD.top + PLOT_H - (max === 0 ? 0 : (tick / max) * PLOT_H)
          return (
            <g key={tick}>
              <line
                className="stroke-line"
                strokeWidth={1}
                x1={PAD.left}
                x2={CHART_WIDTH - PAD.right}
                y1={y}
                y2={y}
              />
              <text className="fill-faint text-[10px]" x={PAD.left - 6} y={y + 3} textAnchor="end">
                {formatAmount(tick)}
              </text>
            </g>
          )
        })}
        <line
          className="stroke-line-strong"
          strokeWidth={1}
          x1={PAD.left}
          x2={CHART_WIDTH - PAD.right}
          y1={PAD.top + PLOT_H}
          y2={PAD.top + PLOT_H}
        />
        {days.length > 0 && (
          <>
            <text className="fill-faint text-[10px]" x={PAD.left} y={CHART_HEIGHT - 5}>
              {days[0]?.date}
            </text>
            <text
              className="fill-faint text-[10px]"
              x={CHART_WIDTH - PAD.right}
              y={CHART_HEIGHT - 5}
              textAnchor="end"
            >
              {days[days.length - 1]?.date}
            </text>
          </>
        )}
        {children}
        {hoverX !== null && (
          <line
            className="stroke-muted"
            strokeWidth={1}
            strokeDasharray="3 3"
            pointerEvents="none"
            x1={hoverX}
            x2={hoverX}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
          />
        )}
      </svg>
      {hovered && hoverX !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-elevated px-2 py-0.5 text-xs text-muted"
          style={{ left: `${(hoverX / CHART_WIDTH) * 100}%` }}
        >
          <span className="text-fg">{hovered.date}</span> {hovered.label}
        </div>
      )}
    </figure>
  )
}

function useHover(days: DailyMarketStat[]) {
  const [index, setIndex] = useState<number | null>(null)
  const hoverX = index === null ? null : PAD.left + (index / Math.max(1, days.length - 1)) * PLOT_W
  return { index, hoverX, onHover: setIndex }
}

/** Floor over time; renders nothing when active listings are unavailable. */
function FloorChart(props: Omit<ComponentProps<"figure">, "children">) {
  const { index, currency } = useMarketStatsContext()
  const days = index.stats.daily
  const { index: hoverIndex, hoverX, onHover } = useHover(days)
  const { segments, max } = useMemo(() => {
    const values = days.map(day =>
      day.floor === null ? null : toDecimal(day.floor, currency.decimals),
    )
    const top = Math.max(0, ...values.filter((value): value is number => value !== null))
    const paths: string[] = []
    let current = ""
    values.forEach((value, position) => {
      if (value === null) {
        if (current) paths.push(current)
        current = ""
        return
      }
      const x = PAD.left + (position / Math.max(1, days.length - 1)) * PLOT_W
      const y = PAD.top + PLOT_H - (top === 0 ? 0 : (value / top) * PLOT_H)
      current += `${current ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`
    })
    if (current) paths.push(current)
    return { segments: paths, max: top }
  }, [days, currency.decimals])

  if (!index.stats.listingsAvailable || days.length === 0) return null
  const day = hoverIndex === null ? undefined : days[hoverIndex]
  return (
    <ChartFrame
      title={`Floor (${currency.symbol})`}
      days={days}
      max={max}
      hoverX={hoverX}
      onHover={onHover}
      hovered={
        day && {
          date: day.date,
          label:
            day.floor === null ? "no active listings" : `floor ${formatPrice(day.floor, currency)}`,
        }
      }
      {...props}
    >
      {segments.map(path => (
        <path key={path} className="fill-none stroke-primary" strokeWidth={2} d={path} />
      ))}
    </ChartFrame>
  )
}

/** Daily traded volume. */
function VolumeChart(props: Omit<ComponentProps<"figure">, "children">) {
  const { index, currency } = useMarketStatsContext()
  const days = index.stats.daily
  const { index: hoverIndex, hoverX, onHover } = useHover(days)
  const { bars, max } = useMemo(() => {
    const values = days.map(day => toDecimal(day.volume, currency.decimals))
    const top = Math.max(0, ...values)
    const slot = PLOT_W / Math.max(1, days.length)
    const width = Math.max(1, slot - 2) // 2px surface gap between bars
    return {
      bars: values.map((value, position) => {
        const height = top === 0 ? 0 : (value / top) * PLOT_H
        return {
          key: days[position]?.date ?? String(position),
          x: PAD.left + position * slot + 1,
          y: PAD.top + PLOT_H - height,
          width,
          height,
        }
      }),
      max: top,
    }
  }, [days, currency.decimals])

  if (days.length === 0) return null
  const day = hoverIndex === null ? undefined : days[hoverIndex]
  return (
    <ChartFrame
      title={`Daily volume (${currency.symbol})`}
      days={days}
      max={max}
      hoverX={hoverX}
      onHover={onHover}
      hovered={
        day && {
          date: day.date,
          label: `${formatPrice(day.volume, currency)} · ${day.sales} sale${day.sales === 1 ? "" : "s"}`,
        }
      }
      {...props}
    >
      {bars.map(bar =>
        bar.height > 0 ? (
          <rect
            key={bar.key}
            className="fill-primary"
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx={Math.min(2, bar.width / 2)}
          />
        ) : null,
      )}
    </ChartFrame>
  )
}

const EVENT_LABELS: Record<MarketEventKind, string> = {
  listing: "Listing",
  listing_cancel: "Listing cancelled",
  listing_accept: "Sale (listing)",
  offer: "Offer",
  offer_cancel: "Offer cancelled",
  offer_accept: "Sale (offer)",
  collection_offer: "Collection offer",
  collection_offer_cancel: "Collection offer cancelled",
  collection_offer_accept: "Sale (collection offer)",
  auction: "Auction",
  auction_bid: "Auction bid",
  auction_cancel: "Auction cancelled",
  auction_fulfill: "Sale (auction)",
  mint: "Mint",
  sale: "Sale",
}

/** Human-readable label for a market event kind. */
export function marketEventLabel(kind: MarketEventKind): string {
  return EVENT_LABELS[kind]
}

export interface MarketEventsProps extends ComponentProps<"div"> {
  /** Newest events shown; defaults to 25. */
  limit?: number
}

/**
 * Newest-first event history.
 *
 * The party columns are seller and buyer rather than from and to: most events
 * are order lifecycle, not a transfer. A listing has only a seller, an offer
 * only a buyer, and a mint only the minter. Labelling them as transfer
 * endpoints would read backwards for every bid.
 */
function Events({ limit = 25, className, ...props }: MarketEventsProps) {
  const { index, currency } = useMarketStatsContext()
  const rows = useMemo<MarketEvent[]>(
    () => [...index.events].reverse().slice(0, limit),
    [index.events, limit],
  )
  if (rows.length === 0) return null
  return (
    <div
      className={cn("overflow-x-auto rounded-card border border-line bg-surface", className)}
      {...props}
    >
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {["When", "Event", "Token", "Price", "Seller", "Buyer"].map((head, position) => (
              <th
                key={head}
                className={cn(
                  "whitespace-nowrap border-b border-line px-3 py-2 text-left font-medium text-muted",
                  position === 3 && "text-right",
                )}
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(event => (
            <tr key={`${event.sourceId}/${event.kind}`}>
              <td className="whitespace-nowrap border-b border-line px-3 py-2 font-mono text-xs text-muted">
                {event.timestamp.slice(0, 10)}
              </td>
              <td className="whitespace-nowrap border-b border-line px-3 py-2">
                {marketEventLabel(event.kind)}
              </td>
              <td className="whitespace-nowrap border-b border-line px-3 py-2 font-mono text-xs">
                {event.tokenId === null ? "—" : `#${event.tokenId}`}
              </td>
              <td className="whitespace-nowrap border-b border-line px-3 py-2 text-right font-mono text-xs">
                {formatPrice(event.price, currency)}
              </td>
              <td className="whitespace-nowrap border-b border-line px-3 py-2 font-mono text-xs text-muted">
                {formatAddress(event.seller)}
              </td>
              <td className="whitespace-nowrap border-b border-line px-3 py-2 font-mono text-xs text-muted">
                {formatAddress(event.buyer)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const MarketStats = {
  Root,
  Tile,
  Delta,
  Tiles,
  Floor,
  Listed,
  Median,
  Volume,
  Sales,
  HighestSale,
  LowestSale,
  FloorChart,
  VolumeChart,
  Events,
}
