import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { Sparkline } from "./Sparkline"

type Tone = "sage" | "coral" | "amber" | "neutral"

const toneStroke: Record<Tone, string> = {
  sage: "stroke-sage-text",
  coral: "stroke-coral-text",
  amber: "stroke-amber-text",
  neutral: "stroke-ink-muted",
}

const toneFill: Record<Tone, string> = {
  sage: "fill-sage-bg",
  coral: "fill-coral-bg",
  amber: "fill-amber-bg",
  neutral: "fill-surface-muted",
}

const toneIconBg: Record<Tone, string> = {
  sage: "bg-sage-bg text-sage-text",
  coral: "bg-coral-bg text-coral-text",
  amber: "bg-amber-bg text-amber-text",
  neutral: "bg-surface-muted text-ink-muted",
}

interface KpiCardProps {
  label: string
  value: string
  unit?: string
  subtext: string
  icon: LucideIcon
  tone: Tone
  trend?: { value: string; direction: "up" | "down" }
  sparkline?: number[]
  progress?: number
}

function KpiCard({
  label,
  value,
  unit,
  subtext,
  icon: Icon,
  tone,
  trend,
  sparkline,
  progress,
}: KpiCardProps) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
            {label}
          </p>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-ink-strong tabular-nums">
              {value}
            </span>
            {unit && (
              <span className="text-[12px] font-medium text-ink-muted">
                {unit}
              </span>
            )}
          </div>
        </div>
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            toneIconBg[tone],
          )}
        >
          <Icon className="size-4" strokeWidth={2} />
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <p className="text-[12px] text-ink-muted">{subtext}</p>
          {trend && (
            <span
              className={cn(
                "flex items-center text-[12px] font-semibold",
                trend.direction === "up" ? "text-sage-text" : "text-coral-text",
              )}
            >
              {trend.direction === "up" ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {trend.value}
            </span>
          )}
        </div>

        {sparkline && (
          <Sparkline
            data={sparkline}
            width={72}
            height={24}
            className="h-6 w-[72px] shrink-0"
            strokeClassName={toneStroke[tone]}
            fillClassName={toneFill[tone]}
          />
        )}
      </div>

      {typeof progress === "number" && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className={cn(
              "h-full rounded-full",
              tone === "sage" && "bg-sage-text",
              tone === "coral" && "bg-coral-text",
              tone === "amber" && "bg-amber-text",
              tone === "neutral" && "bg-ink-muted",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </Card>
  )
}

export { KpiCard }
export type { KpiCardProps }
