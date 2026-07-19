import { useState, type ComponentProps, type ReactNode } from "react"
import { Button } from "./button.js"
import { Badge } from "./badge.js"
import { cn } from "../lib/cn.js"

export interface SiteHeaderProps extends ComponentProps<"header"> {
  logoSrc: string
  homeHref?: string
  actions?: ReactNode
}

export function SiteHeader({ logoSrc, homeHref = "#/", actions, className, ...props }: SiteHeaderProps) {
  return (
    <header className={cn("sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md", className)} {...props}>
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 sm:px-6">
        <Button variant="link" render={<a href={homeHref} aria-label="Whitehash Home" />} className="group flex gap-3 no-underline">
          <img className="brand-mark size-8 rounded-sm" src={logoSrc} alt="" />
          <span className="hidden font-display text-base font-semibold tracking-[-0.02em] min-[480px]:block">whitehash</span>
        </Button>
        <nav className="flex items-center gap-1">{actions}</nav>
      </div>
    </header>
  )
}

export interface ToolkitHeroProps extends ComponentProps<"section"> {
  logoSrc: string
  description?: ReactNode
  actions?: ReactNode
}

export function ToolkitHero({ logoSrc, description, actions, className, ...props }: ToolkitHeroProps) {
  return (
    <section className={cn("brand-hero", className)} {...props}>
      <div className="brand-hero-copy">
        <Badge variant="outline" className="mb-6 w-fit">Open-source toolkit</Badge>
        <h1 className="brand-hero-title font-display text-primary"><span>white</span><span>hash</span></h1>
        <p className="brand-hero-description">{description ?? "Embed generative art directly from Tezos, Ethereum, and Base."}</p>
        {actions ? <div className="mt-6 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <img className="brand-hero-logo" src={logoSrc} alt="Whitehash" width="1024" height="1024" fetchPriority="high" />
    </section>
  )
}

export interface DocsNavItem {
  label: string
  href: string
  group?: string
}

export function DocsShell({
  items,
  currentHref,
  children,
}: {
  items: DocsNavItem[]
  currentHref: string
  children: ReactNode
}) {
  const groups = new Map<string, DocsNavItem[]>()
  for (const item of items) {
    const group = item.group ?? "Guide"
    groups.set(group, [...(groups.get(group) ?? []), item])
  }
  return (
    <div className="mx-auto grid max-w-[1440px] gap-10 px-4 pb-24 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden border-r border-line pr-6 pt-10 lg:block">
        <nav className="sticky top-24 flex flex-col gap-7">
          {[...groups].map(([group, links]) => (
            <div key={group}>
              <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-faint">{group}</div>
              <div className="flex flex-col gap-0.5">
                {links.map(item => (
                  <Button
                    key={item.href}
                    variant="ghost"
                    size="sm"
                    render={<a href={item.href} />}
                    className={cn("justify-start", currentHref === item.href && "bg-surface-2 text-fg")}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 pt-10">{children}</main>
    </div>
  )
}

export function DocsPage({ className, ...props }: ComponentProps<"article">) {
  return <article className={cn("mx-auto max-w-4xl", className)} {...props} />
}

export function DocsHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
}) {
  return (
    <header className="border-b border-line pb-10">
      {eyebrow ? <div className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-primary">{eyebrow}</div> : null}
      <h1 className="font-display text-4xl font-semibold leading-tight tracking-[-0.05em] sm:text-6xl">{title}</h1>
      {description ? <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{description}</p> : null}
    </header>
  )
}

export function DocsSection({ title, className, children, ...props }: ComponentProps<"section"> & { title?: ReactNode }) {
  return (
    <section className={cn("border-b border-line py-10 last:border-0", className)} {...props}>
      {title ? <h2 className="mb-5 font-display text-2xl font-semibold tracking-[-0.03em]">{title}</h2> : null}
      {children}
    </section>
  )
}

export function LiveDemo({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("overflow-hidden rounded-md border border-line bg-canvas p-5", className)} {...props} />
}

export function Callout({ className, ...props }: ComponentProps<"aside">) {
  return <aside className={cn("border-l-2 border-primary bg-surface-2 px-4 py-3 text-sm leading-relaxed text-muted", className)} {...props} />
}

export function CodeBlock({ code, language = "tsx", className }: { code: string; language?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }
  return (
    <div className={cn("relative overflow-hidden rounded-md border border-line bg-surface-2", className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs text-faint">
        <span>{language}</span>
        <Button variant="ghost" size="sm" onClick={() => void copy()}>{copied ? "Copied" : "Copy"}</Button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-fg"><code>{code}</code></pre>
    </div>
  )
}
