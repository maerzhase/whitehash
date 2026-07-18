import type { ComponentProps } from "react"
import { Field as BaseField } from "@base-ui-components/react/field"
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
      className={cn("text-sm font-medium text-fg", className)}
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
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg " +
  "placeholder:text-faint outline-none transition-colors " +
  "focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/40"

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
