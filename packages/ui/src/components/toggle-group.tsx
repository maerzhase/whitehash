import { Toggle } from "@base-ui-components/react/toggle"
import { ToggleGroup as BaseToggleGroup } from "@base-ui-components/react/toggle-group"
import { type ReactNode, useLayoutEffect, useRef, useState } from "react"
import { cn } from "../lib/cn.js"

/**
 * ToggleGroup — a segmented single-select control with an animated indicator
 * that slides between items. Base UI owns the behavioral ceremony (roving
 * focus, arrow-key nav, aria); we adapt its array value to a single string,
 * refuse deselect (a segmented control always has one item active), and render
 * a shared highlight measured from the active item so it animates as the
 * selection moves rather than each item flashing independently.
 */
export interface ToggleGroupProps {
  value: string
  onValueChange: (value: string) => void
  className?: string
  children: ReactNode
  "aria-label"?: string
}

function Root({ value, onValueChange, className, children, ...props }: ToggleGroupProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const measure = () => {
      const active = root.querySelector<HTMLElement>("[data-pressed]")
      if (!active) return
      const rootBox = root.getBoundingClientRect()
      const box = active.getBoundingClientRect()
      const borderLeft = parseFloat(getComputedStyle(root).borderLeftWidth) || 0
      setIndicator({ left: box.left - rootBox.left - borderLeft, width: box.width })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    return () => observer.disconnect()
  }, [value, children])

  return (
    <BaseToggleGroup
      ref={ref}
      value={[value]}
      onValueChange={groupValue => {
        const next = groupValue[0]
        if (typeof next === "string") onValueChange(next)
      }}
      className={cn(
        "relative inline-flex gap-1 rounded-sm border border-line bg-canvas p-1",
        className,
      )}
      {...props}
    >
      {indicator ? (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-1 top-1 rounded-xs bg-primary transition-[left,width] duration-150 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
        />
      ) : null}
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
        "relative z-10 min-h-11 cursor-pointer rounded-xs px-3 py-1 text-sm font-medium text-muted transition-colors sm:min-h-8",
        "hover:text-fg outline-none focus-visible:shadow-[0_0_0_2px_#000,0_0_0_4px_var(--color-ring)]",
        "data-[pressed]:text-primary-fg data-[pressed]:hover:text-primary-fg",
        className,
      )}
      {...props}
    />
  )
}

export const ToggleGroup = Object.assign(Root, { Item })
