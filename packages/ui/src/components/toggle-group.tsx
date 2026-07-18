import type { ReactNode } from "react"
import { ToggleGroup as BaseToggleGroup } from "@base-ui-components/react/toggle-group"
import { Toggle } from "@base-ui-components/react/toggle"
import { cn } from "../lib/cn.js"

/**
 * ToggleGroup — a segmented single-select control. Base UI owns the behavioral
 * ceremony (roving focus, arrow-key nav, aria), which is the payoff of the
 * headless layer. Base UI models the value as an array (for multi-select); we
 * adapt it to a single string and refuse deselect so exactly one item is always
 * active, which is what a segmented control wants.
 */
export interface ToggleGroupProps {
  value: string
  onValueChange: (value: string) => void
  className?: string
  children: ReactNode
  "aria-label"?: string
}

function Root({ value, onValueChange, className, children, ...props }: ToggleGroupProps) {
  return (
    <BaseToggleGroup
      value={[value]}
      onValueChange={groupValue => {
        const next = groupValue[0]
        if (typeof next === "string") onValueChange(next)
      }}
      className={cn(
        "inline-flex gap-1 rounded-lg border border-line bg-surface p-1",
        className,
      )}
      {...props}
    >
      {children}
    </BaseToggleGroup>
  )
}

export interface ToggleGroupItemProps {
  value: string
  className?: string
  children: ReactNode
  title?: string
}

function Item({ className, ...props }: ToggleGroupItemProps) {
  return (
    <Toggle
      className={cn(
        "cursor-pointer rounded-md px-3.5 py-1.5 text-sm text-muted transition-colors",
        "hover:text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
        "data-[pressed]:bg-primary data-[pressed]:text-primary-fg data-[pressed]:hover:text-primary-fg",
        className,
      )}
      {...props}
    />
  )
}

export const ToggleGroup = Object.assign(Root, { Item })
