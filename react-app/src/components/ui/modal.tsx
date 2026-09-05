import { X } from "lucide-react"
import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

function Modal({
  open,
  onClose,
  title,
  description,
  className,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  className?: string
  children: React.ReactNode
}) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-surface-dark/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-line bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
          className,
        )}
      >
        <div className="flex items-start justify-between border-b border-line p-5">
          <div>
            <h2 className="text-sm font-semibold text-ink-strong">{title}</h2>
            {description && (
              <p className="mt-0.5 text-[12.5px] text-ink-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="scrollbar-thin overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export { Modal }
