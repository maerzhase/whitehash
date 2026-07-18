import { useRender } from "@base-ui-components/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/cn.js"

/**
 * Button — a behavioral primitive. Per the design-system criteria, behavioral
 * components expose a `render` slot (Base UI `useRender`) so library props
 * (onClick / ref / aria-*) merge cleanly with a consumer-supplied element —
 * e.g. `render={<a href=… />}` to become a link without losing button styling
 * or a11y wiring.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium " +
    "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/70 " +
    "disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:bg-primary-hover rounded-md",
        secondary:
          "bg-surface-2 text-fg border border-line hover:border-line-strong rounded-md",
        ghost: "text-muted hover:text-fg hover:bg-surface-2 rounded-md",
        link: "text-primary hover:text-primary-hover underline-offset-4 hover:underline p-0",
        danger: "text-danger hover:bg-danger/10 rounded-md",
        /* Full-bleed clickable card shell — layout reset from the flex base. */
        card:
          "flex flex-col items-stretch justify-start gap-0 p-0 text-left " +
          "bg-surface border border-line rounded-card overflow-hidden " +
          "hover:border-line-strong transition-colors",
      },
      size: {
        sm: "h-8 px-3 text-sm rounded-md",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-base",
        icon: "size-9",
        none: "",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
)

export interface ButtonProps
  extends useRender.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {}

export function Button({
  render = <button />,
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  // `card`/`link` bring their own sizing, so drop the default height/padding.
  const resolvedSize = size ?? (variant === "card" || variant === "link" ? "none" : "md")
  return useRender({
    render,
    props: {
      className: cn(buttonVariants({ variant, size: resolvedSize }), className),
      ...props,
    },
  })
}
