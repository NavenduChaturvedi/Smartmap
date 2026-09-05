import * as React from "react"

import { cn } from "@/lib/utils"

function IconTooltip({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("group relative flex", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full ml-2 top-1/2 z-50 -translate-y-1/2 translate-x-1 rounded-md bg-surface-dark px-2 py-1 text-[11px] font-medium whitespace-nowrap text-ink-inverse opacity-0 shadow-crisp transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100"
      >
        {label}
      </span>
    </div>
  )
}

export { IconTooltip }
