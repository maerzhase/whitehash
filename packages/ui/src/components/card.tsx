import type { ComponentProps } from "react"
import { cn } from "../lib/cn.js"

/**
 * Card — a purely *presentational* compound. Deliberately no `useRender` slot:
 * the leaves carry no library behavior to merge, so a plain className +
 * element is sufficient (this was the litigated case). When a card needs to be
 * clickable, wrap these leaves in `<Button variant="card">` — the behavioral
 * seam (onClick/focus/a11y) lives in Button, not here.
 */
function Root({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-card border border-line bg-surface",
        className,
      )}
      {...props}
    />
  )
}

/** Square media well for thumbnails / previews. */
function Media({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("relative aspect-square border-b border-line bg-surface-2", className)}
      {...props}
    />
  )
}

function Body({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-h-12 items-center justify-between gap-2 px-4 py-3", className)}
      {...props}
    />
  )
}

function Title({ className, ...props }: ComponentProps<"span">) {
  return (
    <span className={cn("truncate text-sm font-medium text-fg", className)} {...props} />
  )
}

function Meta({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("flex shrink-0 items-center gap-1.5", className)} {...props} />
  )
}

export const Card = { Root, Media, Body, Title, Meta }
