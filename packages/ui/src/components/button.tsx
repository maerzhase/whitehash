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
    "transition-[color,background-color,border-color,box-shadow] duration-150 outline-none " +
    "focus-visible:shadow-[0_0_0_2px_#000,0_0_0_4px_var(--color-ring)] " +
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-faint cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary: "rounded-sm bg-primary text-primary-fg hover:bg-primary-hover",
        secondary:
          "rounded-sm border border-line bg-canvas text-fg hover:border-line-strong hover:bg-surface-2",
        ghost: "rounded-sm text-muted hover:bg-surface-2 hover:text-fg",
        link: "min-h-11 p-0 text-fg underline-offset-4 hover:underline sm:min-h-0",
        danger: "rounded-sm bg-danger text-white hover:brightness-90",
        /* Full-bleed clickable card shell — layout reset from the flex base. */
        card:
          "flex flex-col items-stretch justify-start gap-0 p-0 text-left " +
          "overflow-hidden rounded-card border border-line bg-surface hover:border-line-strong",
      },
      size: {
        sm: "h-11 px-2.5 text-sm rounded-sm sm:h-8",
        md: "h-10 px-2.5 text-sm",
        lg: "h-12 px-3.5 text-base",
        icon: "size-10",
        none: "",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
)

export interface ButtonProps
  extends useRender.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {}

export function Button({ render = <button />, className, variant, size, ...props }: ButtonProps) {
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
