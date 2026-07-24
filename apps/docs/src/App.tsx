"use client"

import {
  CURATED_PROJECT_EXAMPLES,
  type CuratedProjectExample,
  type ProjectRef,
  parseRef,
  type TokenRef,
  tokenKey,
  type WhitehashToken,
} from "@whitehash/chain-reader"
import { registerOnchfsWorker } from "@whitehash/onchfs-sw"
import { useProject, useWalletTokens, useWhitehash } from "@whitehash/react"
import {
  Artwork,
  Button,
  ProjectGallery,
  Skeleton,
  Spinner,
  TokenDetails,
  WalletGallery,
  WhitehashProvider,
} from "@whitehash/ui"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { type CSSProperties, useEffect, useRef, useState } from "react"
import { CodeBlock, DocsPage, DocsShell, SiteHeader } from "./components/docs-chrome"
import { API_ENTRIES, ApiDocPage, GuidePage, SAMPLE_TOKEN } from "./docs-content"
import { DOC_NAV } from "./docs-navigation"
import { UnderstandPage } from "./understand-content"
import { Variations } from "./variations-demo"

type Route =
  | { name: "home" }
  | { name: "api"; slug: string }
  | { name: "guide"; slug: string }
  | { name: "understand"; slug: string }
  | { name: "project"; ref: ProjectRef }
  | { name: "wallet"; address: string }
  | { name: "token"; address: string; key: string }
  | { name: "direct-token"; ref: TokenRef }

function parsePath(pathname: string, search: URLSearchParams): Route {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent)
  if (parts[0] === "docs" && parts[1]) return { name: "api", slug: parts[1] }
  if (parts[0] === "guide" && parts[1]) return { name: "guide", slug: parts[1] }
  if (parts[0] === "understand" && parts[1]) return { name: "understand", slug: parts[1] }
  if (parts[0] === "p" && parts[1] && parts[2])
    return {
      name: "project",
      ref: { type: "project", chain: parts[1] as ProjectRef["chain"], id: parts[2] },
    }
  if (parts[0] === "w" && parts[1]) {
    const address = parts[1]
    if (parts[2] === "t" && parts[3] && parts[4] && parts[5])
      return { name: "token", address, key: `${parts[3]}/${parts[4]}/${parts[5]}` }
    return { name: "wallet", address }
  }
  const project = search.get("project")
  if (project) {
    try {
      return { name: "project", ref: parseRef(project, "project") }
    } catch {
      /* Invalid input lands on home. */
    }
  }
  const directToken = search.get("tokenRef")
  if (directToken) {
    try {
      return { name: "direct-token", ref: parseRef(directToken, "token") }
    } catch {
      /* Invalid input lands on home. */
    }
  }
  const wallet = search.get("wallet")
  const token = search.get("token")
  if (wallet && token) return { name: "token", address: wallet, key: token }
  if (wallet) return { name: "wallet", address: wallet }
  return { name: "home" }
}

const segment = (value: string) => encodeURIComponent(value)
const walletPath = (address: string) => `/?wallet=${segment(address)}`
const tokenPath = (token: WhitehashToken, address: string) =>
  `/?wallet=${segment(address)}&token=${segment(tokenKey(token))}`

export function App() {
  useEffect(() => {
    void registerOnchfsWorker().catch(error => console.warn("onchfs worker unavailable", error))
  }, [])
  return (
    <WhitehashProvider>
      <DocsApp />
    </WhitehashProvider>
  )
}

function DocsApp() {
  const pathname = usePathname()
  const router = useRouter()
  const search = useSearchParams()
  const route = parsePath(pathname, search)
  const navigate = (to: string) => {
    router.push(to)
    window.scrollTo(0, 0)
  }

  const address = route.name === "wallet" || route.name === "token" ? route.address : null
  const wallet = useWalletTokens(address)

  const docsRoute = route.name === "api" || route.name === "guide" || route.name === "understand"
  return (
    <div className="min-h-screen bg-canvas text-fg">
      <SiteHeader
        actions={
          <>
            <Button variant="ghost" size="sm" render={<Link href="/guide/getting-started" />}>
              Docs
            </Button>
            {address ? (
              <Button variant="ghost" size="sm" onClick={wallet.refresh} disabled={wallet.loading}>
                {wallet.loading ? <Spinner className="size-3.5" /> : null}Refresh
              </Button>
            ) : null}
          </>
        }
      />

      {docsRoute ? (
        <DocsShell items={DOC_NAV} currentHref={pathname}>
          {route.name === "api" ? (
            <ApiDocPage
              entry={API_ENTRIES.find(entry => entry.slug === route.slug) ?? API_ENTRIES[0]!}
            />
          ) : route.name === "understand" ? (
            <UnderstandPage slug={route.slug} />
          ) : (
            <>
              <GuidePage slug={route.slug} />
              {route.slug === "variations" ? (
                <DocsPage>
                  <Variations token={SAMPLE_TOKEN} />
                </DocsPage>
              ) : null}
            </>
          )}
        </DocsShell>
      ) : (
        <main>
          {route.name === "home" ? <HomePage /> : null}
          <div className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-6">
            {route.name === "project" ? (
              <ProjectRoute projectRef={route.ref} onBack={() => navigate("/")} />
            ) : null}
            {route.name === "wallet" && wallet.state ? (
              <WalletGallery.Content
                address={wallet.state.address}
                state={wallet.state}
                loading={wallet.loading}
                onOpenToken={token => navigate(tokenPath(token, wallet.state!.address))}
              />
            ) : null}
            {route.name === "token" && wallet.state ? (
              <TokenRoute
                tokenKeyWanted={route.key}
                tokens={wallet.state.tokens}
                loading={wallet.loading}
                onBack={() => navigate(walletPath(route.address))}
              />
            ) : null}
            {route.name === "direct-token" ? (
              <DirectTokenRoute tokenRef={route.ref} onBack={() => navigate("/")} />
            ) : null}
          </div>
        </main>
      )}
    </div>
  )
}

function HomePage() {
  return (
    <>
      <section className="home-hero">
        <div className="home-grid" aria-hidden />
        <div className="hero-inner relative z-10 mx-auto grid min-h-[calc(100svh-3.5rem)] max-w-[1200px] items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
          <div className="hero-copy max-w-2xl">
            <div className="mb-7 flex items-center gap-2 font-mono text-xs text-muted">
              <span className="size-1.5 rounded-full bg-success shadow-[0_0_14px_var(--color-success)]" />{" "}
              Open source · Tezos, Ethereum &amp; Base
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[0.96] tracking-[-0.065em] sm:text-7xl lg:text-[5.25rem]">
              Generative art.
              <br />
              <span className="text-muted">Straight from the source.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              A React API for reading fxhash projects and tokens across Tezos, Ethereum, and Base,
              then resolving their IPFS and onchfs content—without depending on a centralized
              platform backend.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <Button render={<Link href="/guide/getting-started" />}>Getting started</Button>
              <Button variant="secondary" render={<a href="#discover" />}>
                Discover artwork
              </Button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="mb-3 flex items-center justify-between font-mono text-[11px] text-faint">
              <span>live component</span>
              <span>tezos:mainnet</span>
            </div>
            <Artwork.Root token={SAMPLE_TOKEN} className="hero-artwork">
              <Artwork.Image />
              <Artwork.Live />
              <Artwork.PlayButton />
              <Artwork.StatusBadge />
            </Artwork.Root>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-[1200px] divide-y divide-line px-4 sm:px-6 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {[
            [
              "01",
              "Read",
              "Start with a token, wallet, or project. Every chain resolves to one predictable data shape.",
            ],
            [
              "02",
              "Resolve",
              "Load content-addressed IPFS and onchfs artwork through replaceable gateways and RPCs.",
            ],
            [
              "03",
              "Render",
              "Show a resilient preview, then run the correctly seeded artwork in a restricted iframe.",
            ],
          ].map(([number, title, copy]) => (
            <div key={number} className="py-9 lg:px-8 first:pl-0 last:pr-0">
              <div className="font-mono text-[11px] text-faint">{number}</div>
              <h2 className="mt-4 text-lg font-medium">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="discover" className="scroll-mt-16 bg-surface">
        <CapabilityShowcase />
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[.85fr_1.15fr] lg:py-32">
          <div>
            <div className="section-kicker">One direct path</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Token in.
              <br />
              Artwork out.
            </h2>
            <p className="mt-5 max-w-md leading-7 text-muted">
              Read one token by chain, contract, and ID. <code>Artwork</code> handles gateway
              fallback, the correctly seeded live artifact, iframe security, and explicit reveal
              states.
            </p>
            <p className="mt-4 max-w-md text-sm leading-6 text-faint">
              Starting from a wallet or project? Those discovery APIs return the same{" "}
              <code>WhitehashToken</code>.
            </p>
            <Link className="docs-text-link mt-6 inline-block" href="/guide/getting-started">
              Build your first artwork →
            </Link>
          </div>
          <CodeBlock
            language="tsx"
            code={`const { token } = useToken({
  chain: "tezos:mainnet",
  contract: "KT1…",
  tokenId: "16333",
})

return token && (
  <Artwork.Root token={token}>
    <Artwork.Image />
    <Artwork.Live />
    <Artwork.PlayButton />
  </Artwork.Root>
)`}
          />
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:py-32">
          <CodeBlock
            language="tsx"
            code={`const result = await capture({
  url: seededArtworkUrl,
  browser: localProvider({ useGl: "egl" }),
  allowlist: ["https://art.example/"],
  settings: {
    mode: CaptureMode.VIEWPORT,
    resolution: { x: 1024, y: 1024 },
    triggerMode: CaptureTriggerMode.FN_TRIGGER,
  },
})

result.image       // PNG or GIF
result.features    // declared token traits
result.triggeredBy // event, console, or delay`}
          />
          <div>
            <div className="section-kicker">Headless capture</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Artwork URL in.
              <br />
              Pixels out.
            </h2>
            <p className="mt-5 max-w-md leading-7 text-muted">
              Run the original generator in headless Chromium, wait for its <code>fxpreview()</code>{" "}
              signal, and produce a deterministic viewport, canvas, or GIF capture with declared
              features.
            </p>
            <p className="mt-4 max-w-md text-sm leading-6 text-faint">
              Use local Chrome in development, serverless Chromium on functions, or an isolated
              remote browser. Add storage and per-key locks only when your endpoint needs them.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 font-mono text-[11px] text-muted">
              {["viewport", "canvas", "GIF", "features", "Request → Response"].map(label => (
                <span key={label} className="rounded-sm border border-line bg-canvas px-2.5 py-1.5">
                  {label}
                </span>
              ))}
            </div>
            <Link className="docs-text-link mt-7 inline-block" href="/guide/capture">
              Build a capture endpoint →
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 lg:py-28">
          <div className="section-kicker">No required backend</div>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">
            Public data. Replaceable dependencies.
          </h2>
          <p className="mt-5 max-w-2xl leading-7 text-muted">
            Whitehash reads known contracts, normalizes their differences, and resolves
            content-addressed artwork. Every RPC, indexer, gateway, and trusted contract is visible
            and configurable.
          </p>
          <div className="mt-10 border-t border-line">
            {(
              [
                [
                  "Projects and tokens",
                  "The two stable shapes carried through every API.",
                  "/understand/data-model",
                ],
                [
                  "Where the data comes from",
                  "Every fxhash contract and external read path, listed.",
                  "/understand/sources",
                ],
                [
                  "How artwork URLs are built",
                  "Seeds, parameters, IPFS, and onchfs resolution.",
                  "/understand/urls",
                ],
              ] as const
            ).map(([title, copy, href]) => (
              <Link
                key={href}
                href={href}
                className="group grid gap-2 border-b border-line py-6 transition-colors hover:text-primary sm:grid-cols-[.8fr_1.2fr_auto] sm:items-center sm:gap-8"
              >
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm leading-6 text-muted">{copy}</p>
                <span className="text-sm text-faint transition-colors group-hover:text-primary">
                  Read →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="home-footer border-t border-line py-24 text-center sm:py-32">
        <div className="relative z-10 mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="section-kicker">Build from public data</div>
          <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">
            <span className="block">Own the path from</span>
            <span className="mt-2 flex flex-wrap items-center justify-center gap-x-[.18em]">
              <span>crypto</span>
              <span className="home-footer-mark" aria-hidden="true">
                <img src="/logo-original.png" alt="" />
              </span>
              <span>to canvas.</span>
            </span>
          </h2>
          <div className="mt-10">
            <Button render={<Link href="/guide/getting-started" />}>Start building</Button>
          </div>
        </div>
      </footer>
    </>
  )
}

function CapabilityShowcase() {
  const samples: CarouselSample[] = [
    {
      id: "contrapuntos",
      name: SAMPLE_TOKEN.name ?? "contrapuntos",
      captureMode: "live",
      generatorStorage: "ipfs",
      token: SAMPLE_TOKEN,
    },
    ...CURATED_PROJECT_EXAMPLES.map(example => ({
      id: example.slug,
      name: example.name,
      captureMode: example.captureMode,
      generatorStorage: example.generatorStorage,
      example,
    })),
  ]
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [motionDirection, setMotionDirection] = useState<-1 | 1>(1)
  const pointerStart = useRef<number | null>(null)
  const lastWheel = useRef(0)
  const total = samples.length
  const rotate = (step: number) => {
    setMotionDirection(step < 0 ? -1 : 1)
    setSelectedIndex(current => (current + step + total) % total)
  }

  return (
    <div className="gallery-shell py-24 lg:py-32">
      <header className="gallery-heading mx-auto max-w-[1440px] px-4 sm:px-6">
        <div>
          <div className="section-kicker">Rendering field test</div>
          <h2 className="gallery-tagline mt-5 max-w-5xl font-display font-semibold">
            One renderer.
            <br />
            <span className="text-muted">Every artwork.</span>
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-muted sm:text-base sm:leading-7">
          Random editions from real projects put every path through its paces—from legacy IPFS and
          plotter work to onchfs, GPU, audio, and GIF output.
        </p>
      </header>

      <div
        className="carousel-viewport mt-10 lg:mt-14"
        tabIndex={0}
        aria-label="Circular artwork rendering samples. Use left and right arrow keys to rotate."
        onKeyDown={event => {
          if (event.key === "ArrowLeft") rotate(-1)
          if (event.key === "ArrowRight") rotate(1)
        }}
        onWheel={event => {
          if (Math.abs(event.deltaX) < 24 || Math.abs(event.deltaX) < Math.abs(event.deltaY)) return
          const now = Date.now()
          if (now - lastWheel.current < 450) return
          lastWheel.current = now
          rotate(event.deltaX > 0 ? 1 : -1)
        }}
        onPointerDown={event => {
          pointerStart.current = event.clientX
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerUp={event => {
          if (pointerStart.current === null) return
          const distance = event.clientX - pointerStart.current
          pointerStart.current = null
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
          if (Math.abs(distance) > 40) rotate(distance > 0 ? -1 : 1)
        }}
        onPointerCancel={event => {
          pointerStart.current = null
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
        }}
        onDragStart={event => event.preventDefault()}
      >
        <div className="carousel-stage">
          {samples.map((sample, index) => {
            let offset = index - selectedIndex
            if (offset > total / 2) offset -= total
            if (offset < -total / 2) offset += total
            const distance = Math.abs(offset)
            const angle = offset * 0.44
            const x = Number((Math.sin(angle) * 58).toFixed(3))
            const z = Number(((Math.cos(angle) - 1) * 580).toFixed(3))
            const style = {
              "--carousel-x": `${x}vw`,
              "--carousel-z": `${z}px`,
              "--carousel-rotate": `${offset * -18}deg`,
              "--carousel-scale": String(Math.max(0.64, 1 - distance * 0.09)),
              "--carousel-opacity": String(distance <= 2 ? 1 : 0),
              "--carousel-blur": `${distance * 3.5}px`,
              "--carousel-brightness": String(
                distance === 0 ? 1 : distance === 1 ? 0.56 : distance === 2 ? 0.34 : 0.2,
              ),
              zIndex: total - distance,
            } as CSSProperties

            return (
              <CarouselArtwork
                key={sample.id}
                sample={sample}
                active={distance <= 2}
                focused={distance === 0}
                hidden={distance > 2}
                style={style}
                onSelect={() => {
                  if (offset === 0) return
                  setMotionDirection(offset < 0 ? -1 : 1)
                  setSelectedIndex(index)
                }}
              />
            )
          })}
        </div>
        <button
          key={`previous-${selectedIndex}`}
          type="button"
          className={`carousel-arrow carousel-arrow-previous ${motionDirection === -1 ? "carousel-arrow-reacting" : ""}`}
          aria-label="Previous artwork"
          onClick={() => rotate(-1)}
        >
          <span aria-hidden>←</span>
        </button>
        <button
          key={`next-${selectedIndex}`}
          type="button"
          className={`carousel-arrow carousel-arrow-next ${motionDirection === 1 ? "carousel-arrow-reacting" : ""}`}
          aria-label="Next artwork"
          onClick={() => rotate(1)}
        >
          <span aria-hidden>→</span>
        </button>
      </div>
      <div className="carousel-hint mx-auto max-w-[1440px] px-4 sm:px-6">
        <span>Swipe, use arrow keys, or choose a work</span>
        <span aria-hidden>↔</span>
      </div>
    </div>
  )
}

function CarouselArtwork({
  sample,
  active,
  focused,
  hidden,
  style,
  onSelect,
}: {
  sample: CarouselSample
  active: boolean
  focused: boolean
  hidden: boolean
  style: CSSProperties
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={focused ? "carousel-item carousel-item-focused" : "carousel-item"}
      aria-label={`${sample.name}, ${sample.captureMode} rendering sample`}
      aria-current={focused ? "true" : undefined}
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : 0}
      style={style}
      onClick={onSelect}
    >
      {active ? (
        sample.token ? (
          <StaticCarouselArtworkContent sample={sample} />
        ) : sample.example ? (
          <ProjectCarouselArtworkContent example={sample.example} />
        ) : null
      ) : (
        <>
          <div className="carousel-frame">
            <CarouselSkeleton />
          </div>
          <div className="carousel-caption">
            <span>{sample.name}</span>
          </div>
        </>
      )}
    </button>
  )
}

interface CarouselSample {
  id: string
  name: string
  captureMode: string
  generatorStorage: string
  token?: WhitehashToken
  example?: CuratedProjectExample
}

function showcaseChainLabel(chain: string) {
  if (chain === "tezos:mainnet") return "Tezos"
  if (chain === "eip155:1") return "Ethereum"
  if (chain === "eip155:8453") return "Base"
  return chain
}

function CarouselSkeleton() {
  return (
    <Skeleton
      className="carousel-artwork carousel-skeleton"
      role="status"
      aria-label="Loading artwork"
    />
  )
}

function StaticCarouselArtworkContent({
  sample,
}: {
  sample: CarouselSample & { token?: WhitehashToken }
}) {
  if (!sample.token) return null
  return (
    <>
      <div className="carousel-frame">
        <Artwork.Root token={sample.token} className="carousel-artwork">
          <Artwork.Image source="display" draggable={false} />
        </Artwork.Root>
      </div>
      <div className="carousel-caption">
        <span>{sample.name}</span>
        <span>{showcaseChainLabel(sample.token.chain)}</span>
      </div>
    </>
  )
}

function ProjectCarouselArtworkContent({ example }: { example: CuratedProjectExample }) {
  const { tokens } = useProject(example.ref)
  const [iterationIndex, setIterationIndex] = useState(0)

  useEffect(() => {
    if (tokens.length > 0) setIterationIndex(Math.floor(Math.random() * tokens.length))
  }, [tokens.length])

  const token = tokens[iterationIndex] ?? tokens[0] ?? null

  return (
    <>
      <div className="carousel-frame">
        {token ? (
          <Artwork.Root key={tokenKey(token)} token={token} className="carousel-artwork">
            <Artwork.Image source="display" draggable={false} />
          </Artwork.Root>
        ) : (
          <CarouselSkeleton />
        )}
      </div>
      <div className="carousel-caption">
        <span>{example.name}</span>
        <span>{showcaseChainLabel(example.ref.chain)}</span>
      </div>
    </>
  )
}

function ProjectRoute({ projectRef, onBack }: { projectRef: ProjectRef; onBack: () => void }) {
  const [token, setToken] = useState<WhitehashToken | null>(null)
  if (token) return <TokenExperience token={token} onBack={() => setToken(null)} />
  return <ProjectGallery project={projectRef} onOpenToken={setToken} onBack={onBack} />
}

function TokenRoute({
  tokenKeyWanted,
  tokens,
  loading,
  onBack,
}: {
  tokenKeyWanted: string
  tokens: WhitehashToken[]
  loading: boolean
  onBack: () => void
}) {
  const token = tokens.find(value => tokenKey(value) === tokenKeyWanted)
  if (!token)
    return (
      <DocsPage className="pt-8">
        <Button variant="link" onClick={onBack}>
          ← Back
        </Button>
        <p className="mt-3 text-muted">
          {loading ? "Loading…" : "Token not found in this wallet."}
        </p>
      </DocsPage>
    )
  return <TokenExperience token={token} onBack={onBack} />
}

function DirectTokenRoute({ tokenRef, onBack }: { tokenRef: TokenRef; onBack: () => void }) {
  const { client } = useWhitehash()
  const [token, setToken] = useState<WhitehashToken | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setToken(null)
    setError(null)
    void client
      .getToken(tokenRef)
      .then(value => {
        if (alive) setToken(value)
      })
      .catch(cause => {
        if (alive) setError(cause instanceof Error ? cause.message : String(cause))
      })
    return () => {
      alive = false
    }
  }, [client, tokenRef.chain, tokenRef.contract, tokenRef.tokenId])
  if (token) return <TokenExperience token={token} onBack={onBack} />
  return (
    <DocsPage className="pt-8">
      <Button variant="link" onClick={onBack}>
        ← Back
      </Button>
      <p className="mt-3 text-muted">{error ?? "Loading token…"}</p>
    </DocsPage>
  )
}

function TokenExperience({ token, onBack }: { token: WhitehashToken; onBack: () => void }) {
  const [tab, setTab] = useState<"details" | "explore">("details")
  return (
    <DocsPage className="pt-5">
      <Button variant="link" onClick={onBack}>
        ← Back
      </Button>
      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          variant={tab === "details" ? "primary" : "secondary"}
          onClick={() => setTab("details")}
        >
          Details
        </Button>
        <Button
          size="sm"
          variant={tab === "explore" ? "primary" : "secondary"}
          onClick={() => setTab("explore")}
        >
          Explore
        </Button>
      </div>
      {tab === "details" ? (
        <TokenDetails token={token} className="pt-0" />
      ) : (
        <Variations token={token} />
      )}
    </DocsPage>
  )
}
