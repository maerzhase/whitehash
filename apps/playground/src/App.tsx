import type { MarketIndex } from "@whitehash/market"
import { Badge, Button, MarketStats, WhitehashProvider } from "@whitehash/ui"
import { useCallback, useState } from "react"
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
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
    <WhitehashProvider>
      <main
        className={
          dragging
            ? "mx-auto max-w-4xl px-5 pb-20 pt-8 outline outline-2 -outline-offset-8 outline-dashed outline-primary"
            : "mx-auto max-w-4xl px-5 pb-20 pt-8"
        }
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
      >
        <header>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em]">whitehash playground</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Load a market index produced by{" "}
            <code className="font-mono text-[13px]">whitehash-archive market &lt;project&gt;</code>.
            Drop the <code className="font-mono text-[13px]">.json</code> or{" "}
            <code className="font-mono text-[13px]">.sqlite</code> artifact anywhere, pick a file,
            or fetch a URL.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex">
              <Button render={<span />} disabled={busy}>
                {busy ? "Loading…" : "Open artifact"}
              </Button>
              <input
                type="file"
                className="hidden"
                accept=".json,.sqlite,application/json"
                onChange={event => onFiles(event.target.files)}
                disabled={busy}
              />
            </label>
            <form
              className="flex min-w-[260px] flex-1 gap-2"
              onSubmit={event => {
                event.preventDefault()
                if (url.trim()) void load(loadMarketIndexUrl(url.trim()), url.trim())
              }}
            >
              <input
                type="url"
                className="flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-fg placeholder:text-faint"
                placeholder="https://…/market-index.json"
                value={url}
                onChange={event => setUrl(event.target.value)}
                disabled={busy}
              />
              <Button type="submit" disabled={busy || !url.trim()}>
                Fetch
              </Button>
            </form>
          </div>
          {error && (
            <p className="mt-3 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </header>

        {loaded && <Market key={loaded.source + loaded.index.generatedAt} loaded={loaded} />}
      </main>
    </WhitehashProvider>
  )
}

function Market({ loaded }: { loaded: Loaded }) {
  const { index } = loaded
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">
          {index.project.name ?? index.project.id ?? "Untitled project"}
        </h2>
        <Badge>{index.project.chain}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted">
        {index.project.minted ?? "?"} of {index.project.editions ?? "?"} editions · indexed{" "}
        {index.generatedAt.slice(0, 16).replace("T", " ")} UTC · {loaded.source}
      </p>
      <MarketStats.Root index={index} className="mt-4">
        <MarketStats.Tiles />
        <MarketStats.FloorChart />
        <MarketStats.VolumeChart />
        <MarketStats.Events limit={100} />
      </MarketStats.Root>
    </section>
  )
}
