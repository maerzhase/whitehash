import { Field as BaseField } from "@base-ui-components/react/field"
import type { ComponentProps } from "react"
import { cn } from "../lib/cn.js"

/**
 * Field — form-agnostic labelled control grouping. Base UI Field wires the
 * label ↔ control ↔ description a11y relationships without binding to any form
 * library; consumers pass plain value/onChange (or defaultValue). Put an
 * {@link Input} or {@link Textarea} inside via `Field.Control render={<Input/>}`,
 * or use them standalone.
 */
function Root({ className, ...props }: ComponentProps<typeof BaseField.Root>) {
  return <BaseField.Root className={cn("flex flex-col gap-1.5", className)} {...props} />
}

function Label({ className, ...props }: ComponentProps<typeof BaseField.Label>) {
  return (
    <BaseField.Label
      className={cn("text-sm font-medium leading-5 text-fg", className)}
      {...props}
    />
  )
}

function Description({ className, ...props }: ComponentProps<typeof BaseField.Description>) {
  return (
    <BaseField.Description
      className={cn("text-sm leading-snug text-muted", className)}
      {...props}
    />
  )
}

const controlClasses =
  "min-h-10 w-full rounded-sm border border-line bg-canvas px-3 py-2 text-base text-fg sm:text-sm " +
  "placeholder:text-faint outline-none transition-colors " +
  "hover:border-line-strong focus-visible:border-line-strong " +
  "focus-visible:shadow-[0_0_0_2px_#000,0_0_0_4px_var(--color-ring)]"

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClasses, className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(controlClasses, "resize-y font-mono text-[13px] leading-relaxed", className)}
      {...props}
    />
  )
}

const Control = BaseField.Control

export const Field = { Root, Label, Description, Control }
