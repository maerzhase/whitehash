import { useMemo, useRef, useState } from "react"
import type { DailyMarketStat, MarketStats } from "@whitehash/market"
import { formatAmount, toDecimal, type ChainCurrency } from "../lib/format.js"

export function DailyCharts({ stats, currency }: { stats: MarketStats; currency: ChainCurrency }) {
  if (stats.daily.length === 0) return null
  return (
    <section className="charts">
      {stats.listingsAvailable && <FloorChart days={stats.daily} currency={currency} />}
      <VolumeChart days={stats.daily} currency={currency} />
    </section>
  )
}

const WIDTH = 720
const HEIGHT = 180
const PAD = { top: 12, right: 12, bottom: 22, left: 52 }
const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom

interface Hover {
  index: number
  x: number
}

function useHover(days: DailyMarketStat[]) {
  const ref = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<Hover | null>(null)
  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect || days.length === 0) return
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH
    const ratio = Math.min(1, Math.max(0, (x - PAD.left) / PLOT_W))
    const index = Math.round(ratio * (days.length - 1))
    setHover({ index, x: PAD.left + (index / Math.max(1, days.length - 1)) * PLOT_W })
  }
  return { ref, hover, onMove, onLeave: () => setHover(null) }
}

function yTicks(max: number): number[] {
  if (max <= 0) return [0]
  const step = 10 ** Math.floor(Math.log10(max))
  const unit = max / step > 5 ? 2 * step : max / step > 2 ? step : step / 2
  const ticks: number[] = []
  for (let tick = 0; tick <= max; tick += unit) ticks.push(tick)
  return ticks
}

function Frame(props: {
  title: string
  days: DailyMarketStat[]
  max: number
  hover: Hover | null
  hoverText: (day: DailyMarketStat) => string
  children: React.ReactNode
  svgRef: React.RefObject<SVGSVGElement | null>
  onMove: (event: React.MouseEvent<SVGSVGElement>) => void
  onLeave: () => void
}) {
  const { days, hover } = props
  const hovered = hover ? days[hover.index] : undefined
  return (
    <figure className="chart">
      <figcaption>{props.title}</figcaption>
      <svg
        ref={props.svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={props.title}
        onMouseMove={props.onMove}
        onMouseLeave={props.onLeave}
      >
        {yTicks(props.max).map(tick => {
          const y = PAD.top + PLOT_H - (props.max === 0 ? 0 : (tick / props.max) * PLOT_H)
          return (
            <g key={tick}>
              <line className="grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} />
              <text className="axis" x={PAD.left - 6} y={y + 3} textAnchor="end">
                {formatAmount(tick)}
              </text>
            </g>
          )
        })}
        <line
          className="baseline"
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={PAD.top + PLOT_H}
          y2={PAD.top + PLOT_H}
        />
        {days.length > 0 && (
          <>
            <text className="axis" x={PAD.left} y={HEIGHT - 6}>
              {days[0]?.date}
            </text>
            <text className="axis" x={WIDTH - PAD.right} y={HEIGHT - 6} textAnchor="end">
              {days[days.length - 1]?.date}
            </text>
          </>
        )}
        {props.children}
        {hover && hovered && (
          <g pointerEvents="none">
            <line
              className="crosshair"
              x1={hover.x}
              x2={hover.x}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
            />
          </g>
        )}
      </svg>
      {hover && hovered && (
        <div className="tooltip" style={{ left: `${(hover.x / WIDTH) * 100}%` }} role="status">
          <strong>{hovered.date}</strong> {props.hoverText(hovered)}
        </div>
      )}
    </figure>
  )
}

export function FloorChart({
  days,
  currency,
}: {
  days: DailyMarketStat[]
  currency: ChainCurrency
}) {
  const { ref, hover, onMove, onLeave } = useHover(days)
  const { segments, max } = useMemo(() => {
    const values = days.map(day =>
      day.floor === null ? null : toDecimal(day.floor, currency.decimals),
    )
    const top = Math.max(0, ...values.filter((value): value is number => value !== null))
    const paths: string[] = []
    let current = ""
    values.forEach((value, index) => {
      if (value === null) {
        if (current) paths.push(current)
        current = ""
        return
      }
      const x = PAD.left + (index / Math.max(1, days.length - 1)) * PLOT_W
      const y = PAD.top + PLOT_H - (top === 0 ? 0 : (value / top) * PLOT_H)
      current += `${current ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`
    })
    if (current) paths.push(current)
    return { segments: paths, max: top }
  }, [days, currency.decimals])

  return (
    <Frame
      title={`Floor (${currency.symbol})`}
      days={days}
      max={max}
      hover={hover}
      hoverText={day =>
        day.floor === null
          ? "no active listings"
          : `floor ${formatAmount(toDecimal(day.floor, currency.decimals))} ${currency.symbol}`
      }
      svgRef={ref}
      onMove={onMove}
      onLeave={onLeave}
    >
      {segments.map(d => (
        <path key={d} className="line" d={d} />
      ))}
    </Frame>
  )
}

export function VolumeChart({
  days,
  currency,
}: {
  days: DailyMarketStat[]
  currency: ChainCurrency
}) {
  const { ref, hover, onMove, onLeave } = useHover(days)
  const { bars, max } = useMemo(() => {
    const values = days.map(day => toDecimal(day.volume, currency.decimals))
    const top = Math.max(0, ...values)
    const slot = PLOT_W / Math.max(1, days.length)
    const width = Math.max(1, slot - 2) // 2px surface gap between bars
    const rects = values.map((value, index) => {
      const height = top === 0 ? 0 : (value / top) * PLOT_H
      return {
        key: days[index]?.date ?? String(index),
        x: PAD.left + index * slot + 1,
        y: PAD.top + PLOT_H - height,
        width,
        height,
      }
    })
    return { bars: rects, max: top }
  }, [days, currency.decimals])

  return (
    <Frame
      title={`Daily volume (${currency.symbol})`}
      days={days}
      max={max}
      hover={hover}
      hoverText={day =>
        `volume ${formatAmount(toDecimal(day.volume, currency.decimals))} ${currency.symbol} · ${day.sales} sale${day.sales === 1 ? "" : "s"}`
      }
      svgRef={ref}
      onMove={onMove}
      onLeave={onLeave}
    >
      {bars.map(bar =>
        bar.height > 0 ? (
          <rect
            key={bar.key}
            className="bar"
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx={Math.min(2, bar.width / 2)}
          />
        ) : null,
      )}
    </Frame>
  )
}
