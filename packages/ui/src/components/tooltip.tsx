import { Tooltip as BaseTooltip } from "@base-ui-components/react/tooltip"
import type { ComponentProps } from "react"
import { cn } from "../lib/cn.js"

const Root = BaseTooltip.Root
const Provider = BaseTooltip.Provider
const Trigger = BaseTooltip.Trigger

type PositionerProps = ComponentProps<typeof BaseTooltip.Positioner>

export type TooltipContentProps = ComponentProps<typeof BaseTooltip.Popup> & {
  align?: PositionerProps["align"]
  side?: PositionerProps["side"]
  sideOffset?: PositionerProps["sideOffset"]
}

function Content({
  align = "center",
  side = "top",
  sideOffset = 8,
  className,
  ...props
}: TooltipContentProps) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner align={align} side={side} sideOffset={sideOffset} className="z-50">
        <BaseTooltip.Popup
          className={cn(
            "max-w-72 rounded-sm border border-line bg-[#111] px-2.5 py-1.5 text-xs leading-5 text-fg shadow-xl",
            "origin-[var(--transform-origin)] transition-[opacity,transform] duration-150 ease-out",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            className,
          )}
          {...props}
        />
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  )
}

export const Tooltip = Object.assign(Root, {
  Root,
  Provider,
  Trigger,
  Content,
})
