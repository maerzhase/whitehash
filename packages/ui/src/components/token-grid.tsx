import { Children, type ComponentProps, type ReactNode } from "react"
import { cn } from "../lib/cn.js"
import { Card } from "./card.js"
import { Skeleton } from "./feedback.js"

export interface TokenGridProps extends ComponentProps<"div"> {
  loading?: boolean
  skeletonCount?: number
  empty?: ReactNode
}

/** Responsive artwork-card layout. Card content remains entirely consumer-owned. */
export function TokenGrid({
  loading = false,
  skeletonCount = 8,
  empty = null,
  children,
  className,
  ...props
}: TokenGridProps) {
  if (loading) return <TokenGridSkeleton count={skeletonCount} className={className} />
  if (Children.count(children) === 0) return <>{empty}</>
  return (
    <div
      className={cn("mt-8 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function TokenGridSkeleton({
  count = 8,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      className={cn("mt-8 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6", className)}
      aria-hidden
    >
      {Array.from({ length: count }, (_, index) => (
        <Card.Root key={index} className="shadow-[0_1px_2px_rgba(0,0,0,.16)]">
          <Card.Media className="bg-canvas">
            <Skeleton className="absolute inset-5" />
          </Card.Media>
          <Card.Body>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-16" />
          </Card.Body>
        </Card.Root>
      ))}
    </div>
  )
}
