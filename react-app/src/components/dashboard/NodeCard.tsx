import type { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"

import { StatusPill } from "@/components/ui/status-pill"
import { cn } from "@/lib/utils"

type Tone = "sage" | "coral" | "amber"

const toneIconBg: Record<Tone, string> = {
  sage: "bg-sage-bg text-sage-text",
  coral: "bg-coral-bg text-coral-text",
  amber: "bg-amber-bg text-amber-text",
}

const toneBar: Record<Tone, string> = {
  sage: "bg-sage-text",
  coral: "bg-coral-text",
  amber: "bg-amber-text",
}

/** Vertical center (px, from card top) of the header icon — connectors align to this. */
export const NODE_ICON_CENTER = 34

interface NodeCardProps {
  stage: string
  title: string
  description: string
  icon: LucideIcon
  tone: Tone
  statusLabel: string
  // Percent done: subtasks completed, or 0/100 for a task with none.
  progress: number
  onClick?: () => void
}

function NodeCard({
  stage,
  title,
  description,
  icon: Icon,
  tone,
  statusLabel,
  progress,
  onClick,
}: NodeCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={cn(
        "group relative flex w-[248px] shrink-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-crisp transition-colors hover:border-ink-muted/30",
        onClick && "cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              toneIconBg[tone],
            )}
          >
            <Icon className="size-4" strokeWidth={2} aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-ink-muted uppercase">
              {stage}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[13.5px] font-semibold text-ink-strong">
          {title}
        </h3>
        <p className="mt-1 text-[12px] leading-snug text-ink-muted">
          {description}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <StatusPill tone={tone}>{statusLabel}</StatusPill>
        <span className="text-[11px] font-medium text-ink-muted tabular-nums">
          {progress}% done
        </span>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className={cn("h-full rounded-full", toneBar[tone])}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  )
}

export { NodeCard }
export type { NodeCardProps }
