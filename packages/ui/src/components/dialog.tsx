import { Dialog as BaseDialog } from "@base-ui-components/react/dialog"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "../lib/cn.js"

/**
 * Dialog — behavioral overlay (Base UI Dialog): focus trapping, scroll lock,
 * escape/outside-click dismissal, and aria wiring come from the headless layer.
 * `Content` bundles Portal + Backdrop + Popup with a spotlight-style layout
 * (top-centered) and open/close animations driven by Base UI's data-* state
 * attributes.
 */
const Root = BaseDialog.Root
const Trigger = BaseDialog.Trigger
const Close = BaseDialog.Close

function Content({ className, children, ...props }: ComponentProps<typeof BaseDialog.Popup>) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop
        className={cn(
          "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
        )}
      />
      <BaseDialog.Popup
        className={cn(
          "fixed left-1/2 top-[16vh] z-50 w-[min(92vw,560px)] -translate-x-1/2 rounded-md",
          "border border-line bg-surface-2 p-6 shadow-[0_1px_1px_rgba(0,0,0,.02),0_8px_16px_-4px_rgba(0,0,0,.24),0_24px_32px_-8px_rgba(0,0,0,.4)] outline-none",
          "transition-[opacity,transform] duration-200 ease-out",
          "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
          "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
          className,
        )}
        {...props}
      >
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  )
}

function Title({ className, ...props }: ComponentProps<typeof BaseDialog.Title>) {
  return (
    <BaseDialog.Title
      className={cn(
        "font-display text-2xl font-semibold leading-8 tracking-[-0.04em] text-fg",
        className,
      )}
      {...props}
    />
  )
}

export interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

export const Dialog = Object.assign(
  ({ open, onOpenChange, children }: DialogProps) => (
    <Root open={open} onOpenChange={onOpenChange}>
      {children}
    </Root>
  ),
  { Root, Trigger, Content, Title, Close },
)
