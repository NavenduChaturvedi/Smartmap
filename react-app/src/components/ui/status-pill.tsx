import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const statusPillVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
  {
    variants: {
      tone: {
        sage: "bg-sage-bg text-sage-text",
        coral: "bg-coral-bg text-coral-text",
        amber: "bg-amber-bg text-amber-text",
        neutral: "bg-surface-muted text-ink-muted",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
)

const dotVariants = cva("size-1.5 rounded-full", {
  variants: {
    tone: {
      sage: "bg-sage-text",
      coral: "bg-coral-text",
      amber: "bg-amber-text",
      neutral: "bg-ink-muted",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
})

function StatusPill({
  className,
  tone,
  dot = true,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof statusPillVariants> & { dot?: boolean }) {
  return (
    <span
      data-slot="status-pill"
      className={cn(statusPillVariants({ tone }), className)}
      {...props}
    >
      {dot && <span className={cn(dotVariants({ tone }))} />}
      {children}
    </span>
  )
}

export { StatusPill, statusPillVariants }
