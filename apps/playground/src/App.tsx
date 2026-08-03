import { useCallback, useState } from "react"
import type { MarketIndex } from "@whitehash/market"
import { DailyCharts } from "./components/DailyCharts.js"
import { EventsTable } from "./components/EventsTable.js"
import { StatTiles } from "./components/StatTiles.js"
import { chainCurrency } from "./lib/format.js"
import { loadMarketIndexFile, loadMarketIndexUrl } from "./lib/load.js"

interface Loaded {
  index: MarketIndex
  source: string
}

export function App() {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [url, setUrl] = useState("")

  const load = useCallback(async (work: Promise<MarketIndex>, source: string) => {
    setBusy(true)
    setError(null)
    try {
      setLoaded({ index: await work, source })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }, [])

  const onFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (file) void load(loadMarketIndexFile(file), file.name)
    },
    [load],
  )

  return (
    <main
      onDragOver={event => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={event => {
        event.preventDefault()
        setDragging(false)
        onFiles(event.dataTransfer.files)
      }}
      className={dragging ? "dragging" : undefined}
    >
      <header>
        <h1>whitehash playground</h1>
        <p className="muted">
          Load a market index produced by <code>whitehash-archive market &lt;project&gt;</code> —
          drop the <code>.json</code> or <code>.sqlite</code> artifact anywhere, pick a file, or
          fetch a URL.
        </p>
        <div className="loader">
          <label className="ghost file-button">
            {busy ? "Loading…" : "Open artifact"}
            <input
              type="file"
              accept=".json,.sqlite,application/json"
              onChange={event => onFiles(event.target.files)}
              disabled={busy}
            />
          </label>
          <form
            onSubmit={event => {
              event.preventDefault()
              if (url.trim()) void load(loadMarketIndexUrl(url.trim()), url.trim())
            }}
          >
            <input
              type="url"
              placeholder="https://…/market-index.json"
              value={url}
              onChange={event => setUrl(event.target.value)}
              disabled={busy}
            />
            <button type="submit" className="ghost" disabled={busy || !url.trim()}>
              Fetch
            </button>
          </form>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </header>

      {loaded && <Market key={loaded.source + loaded.index.generatedAt} loaded={loaded} />}
    </main>
  )
}

function Market({ loaded }: { loaded: Loaded }) {
  const { index } = loaded
  const currency = chainCurrency(index.project.chain)
  return (
    <>
      <section className="project">
        <h2>{index.project.name ?? index.project.id ?? "Untitled project"}</h2>
        <p className="muted">
          {index.project.chain} · {index.project.minted ?? "?"} of {index.project.editions ?? "?"}{" "}
          editions · indexed {index.generatedAt.slice(0, 16).replace("T", " ")} UTC ·{" "}
          {loaded.source}
        </p>
        <StatTiles stats={index.stats} currency={currency} />
      </section>
      <DailyCharts stats={index.stats} currency={currency} />
      <EventsTable events={index.events} currency={currency} />
    </>
  )
}
