import type { ComponentProps } from "react"
import { cn } from "../lib/cn.js"

/** Indeterminate loading spinner. */
export function Spinner({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-line border-t-primary",
        className,
      )}
      {...props}
    />
  )
}

/** Placeholder shimmer for content that hasn't loaded. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-surface-2", className)}
      {...props}
    />
  )
}

export function Separator({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="separator"
      className={cn("h-px w-full bg-line", className)}
      {...props}
    />
  )
}
