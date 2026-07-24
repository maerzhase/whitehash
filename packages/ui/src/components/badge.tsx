import { cva, type VariantProps } from "class-variance-authority"
import type { ComponentProps } from "react"
import { cn } from "../lib/cn.js"

/** Badge / chip — presentational status pill. */
export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-normal leading-4",
  {
    variants: {
      variant: {
        default: "border-line bg-surface-2 text-muted",
        outline: "border-line-strong bg-transparent text-muted",
        accent: "border-primary/20 bg-primary/10 text-primary",
        warning: "border-warning/40 bg-warning/10 text-warning",
        success: "border-success/40 bg-success/10 text-success",
        danger: "border-danger/40 bg-danger/10 text-danger",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

export interface BadgeProps extends ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
