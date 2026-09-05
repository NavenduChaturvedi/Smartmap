import { Activity, Flame, Target, Zap } from "lucide-react"
import { useMemo } from "react"

import { BarChart } from "@/components/ui/bar-chart"
import { Card } from "@/components/ui/card"
import { usePageHeader } from "@/lib/page-header"
import { useStore } from "@/lib/store"

function Analytics() {
  usePageHeader(["Smartmap", "Analytics"])
  const { state, totalXp } = useStore()

  const completed = state.tasks.filter((t) => t.done)
  const totalCount = state.tasks.length
  const opsRating = totalCount ? Math.round((completed.length / totalCount) * 5 * 10) / 10 : 0

  const weekly = useMemo(() => {
    const days: { label: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const count = state.tasks.filter((t) => t.completedAt?.slice(0, 10) === key).length
      days.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }), value: count })
    }
    return days
  }, [state.tasks])

  const weekTotal = weekly.reduce((a, b) => a + b.value, 0)

  const stats = [
    {
      label: "Task Metrics",
      value: String(completed.length),
      subtext: `+${weekTotal} this week`,
      icon: Target,
    },
    {
      label: "XP Quota",
      value: totalXp.toLocaleString(),
      subtext: "Cumulative total XP",
      icon: Zap,
    },
    {
      label: "Ops Rating",
      value: opsRating.toFixed(1),
      subtext: "Daily throughput / 5.0",
      icon: Activity,
    },
    {
      label: "Streak Val",
      value: String(state.streak),
      subtext: "Max continuity (days)",
      icon: Flame,
    },
  ]

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                {s.label}
              </p>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sage-bg text-sage-text">
                <s.icon className="size-4" strokeWidth={2} />
              </div>
            </div>
            <div>
              <span className="text-2xl font-bold text-ink-strong tabular-nums">{s.value}</span>
              <p className="mt-0.5 text-[12px] text-ink-muted">{s.subtext}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink-strong">Performance Tracking</h2>
            <p className="text-[12px] text-ink-muted">Tasks completed over the last 7 days</p>
          </div>
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10.5px] font-semibold tracking-wide text-ink-muted uppercase">
            7D_RETRO
          </span>
        </div>
        <BarChart data={weekly} />
      </Card>
    </>
  )
}

export { Analytics }
