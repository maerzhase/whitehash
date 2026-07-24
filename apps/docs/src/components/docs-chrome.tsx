"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, type ComponentProps, type ReactNode } from "react"
import { Highlight, themes, type Language } from "prism-react-renderer"
import { Button } from "@whitehash/ui"

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ")
const sectionId = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

export interface DocsNavItem {
  label: string
  href: string
  group?: string
}

export function SiteHeader({ actions }: { actions?: ReactNode }) {
  return (
    <header className="docs-header">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="Whitehash home">
          <img
            src="/logo.png"
            alt=""
            className="size-7 rounded-sm object-cover"
            width="28"
            height="28"
          />
          <span className="font-display text-sm font-semibold tracking-[-0.025em]">whitehash</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Primary navigation">
          {actions}
        </nav>
      </div>
    </header>
  )
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
  const router = useRouter()
  const groups = new Map<string, DocsNavItem[]>()
  for (const item of items) {
    const group = item.group ?? "Guide"
    groups.set(group, [...(groups.get(group) ?? []), item])
  }
  const currentIndex = items.findIndex(item => item.href === currentHref)
  const previous = currentIndex > 0 ? items[currentIndex - 1] : null
  const next = currentIndex >= 0 ? items[currentIndex + 1] : null

  return (
    <div className="mx-auto grid max-w-[1440px] gap-10 px-4 pb-24 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:gap-8 xl:grid-cols-[220px_minmax(0,1fr)_176px]">
      <aside className="hidden border-r border-line pr-6 pt-10 lg:block">
        <nav className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col gap-7 overflow-y-auto pb-6">
          {[...groups].map(([group, links]) => (
            <div key={group}>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
                {group}
              </div>
              <div className="flex flex-col gap-0.5">
                {links.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      "docs-nav-link",
                      currentHref === item.href && "docs-nav-link-active",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <main data-docs-content className="min-w-0 pt-5 lg:pt-10">
        <label className="mb-7 block lg:hidden">
          <span className="sr-only">Documentation page</span>
          <select
            className="h-10 w-full rounded-md border border-line bg-surface-2 px-3 text-sm text-fg"
            value={currentHref}
            onChange={event => router.push(event.target.value)}
          >
            {[...groups].map(([group, links]) => (
              <optgroup key={group} label={group}>
                {links.map(item => (
                  <option key={item.href} value={item.href}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {children}
        {previous || next ? (
          <nav
            className="mx-auto mt-16 grid max-w-4xl gap-3 border-t border-line pt-6 sm:grid-cols-2"
            aria-label="Documentation pagination"
          >
            <div>
              {previous ? (
                <Link
                  className="block rounded-md px-3 py-3 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                  href={previous.href}
                >
                  <span className="block text-xs text-faint">Previous</span>
                  {previous.label}
                </Link>
              ) : null}
            </div>
            <div>
              {next ? (
                <Link
                  className="block rounded-md px-3 py-3 text-right text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                  href={next.href}
                >
                  <span className="block text-xs text-faint">Next</span>
                  {next.label}
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </main>
      <DocsTableOfContents currentHref={currentHref} />
    </div>
  )
}

function DocsTableOfContents({ currentHref }: { currentHref: string }) {
  const [items, setItems] = useState<Array<{ id: string; label: string }>>([])
  const [activeId, setActiveId] = useState("")

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-docs-content] article > section[id]"),
    )
    const nextItems = sections.flatMap(section => {
      const heading = section.querySelector<HTMLElement>(":scope > h2")
      return heading?.textContent ? [{ id: section.id, label: heading.textContent }] : []
    })
    setItems(nextItems)
    setActiveId(nextItems[0]?.id ?? "")

    let frame = 0
    const updateActiveSection = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const atBottom =
          window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
        let current = sections[0]?.id ?? ""
        for (const section of sections) {
          if (section.getBoundingClientRect().top <= 112) current = section.id
        }
        if (atBottom) current = sections.at(-1)?.id ?? current
        setActiveId(current)
      })
    }

    updateActiveSection()
    window.addEventListener("scroll", updateActiveSection, { passive: true })
    window.addEventListener("resize", updateActiveSection)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", updateActiveSection)
      window.removeEventListener("resize", updateActiveSection)
    }
  }, [currentHref])

  return (
    <aside className="hidden pt-10 xl:block">
      {items.length > 1 ? (
        <nav className="sticky top-24" aria-label="On this page">
          <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
            On this page
          </div>
          <div className="border-l border-line">
            {items.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={cx(
                  "-ml-px block border-l px-3 py-1.5 text-xs leading-5 transition-colors",
                  activeId === item.id
                    ? "border-primary text-fg"
                    : "border-transparent text-faint hover:text-muted",
                )}
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      ) : null}
    </aside>
  )
}

export function DocsPage({ className, ...props }: ComponentProps<"article">) {
  return <article className={cx("mx-auto max-w-4xl", className)} {...props} />
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
      {eyebrow ? (
        <div className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
          {eyebrow}
        </div>
      ) : null}
      <h1 className="font-display text-4xl font-semibold leading-tight tracking-[-0.05em] sm:text-6xl">
        {title}
      </h1>
      {description ? (
        <div className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          {description}
        </div>
      ) : null}
    </header>
  )
}

export function DocsSection({
  title,
  className,
  children,
  id,
  ...props
}: ComponentProps<"section"> & { title?: ReactNode }) {
  const anchor = id ?? (typeof title === "string" ? sectionId(title) : undefined)
  return (
    <section
      id={anchor}
      className={cx("scroll-mt-14 border-b border-line py-10 last:border-0", className)}
      {...props}
    >
      {title ? (
        <h2 className="mb-5 font-display text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
      ) : null}
      {children}
    </section>
  )
}

export function LiveDemo({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("overflow-hidden rounded-lg border border-line bg-canvas p-5", className)}
      {...props}
    />
  )
}

export function Callout({ className, ...props }: ComponentProps<"aside">) {
  return (
    <aside
      className={cx(
        "border-l-2 border-primary bg-surface-2 px-4 py-3 text-sm leading-relaxed text-muted",
        className,
      )}
      {...props}
    />
  )
}

export function CodeBlock({
  code,
  language = "tsx",
  className,
}: {
  code: string
  language?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }
  return (
    <div className={cx("code-window group", className)}>
      <div className="flex h-10 items-center justify-between border-b border-line px-4 font-mono text-[11px] text-faint">
        <span>{language}</span>
        <Button variant="ghost" size="sm" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <Highlight theme={themes.vsDark} code={code.trim()} language={language as Language}>
        {({ className: prismClass, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={cx(prismClass, "overflow-x-auto p-4 font-mono text-[13px] leading-6")}
            style={{ ...style, background: "transparent" }}
          >
            {tokens.map((line, index) => (
              <div key={index} {...getLineProps({ line })}>
                {line.map((token, tokenIndex) => (
                  <span key={tokenIndex} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  )
}
