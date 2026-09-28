import { BarChart3, Flame, PieChart, Target, Zap } from "lucide-react"
import { useEffect, useMemo } from "react"

import { BarChart } from "@/components/ui/bar-chart"
import { Card } from "@/components/ui/card"
import { localDateKey } from "@/lib/dates"
import { usePageHeader } from "@/lib/page-header"
import { useStore } from "@/lib/store"

function Analytics() {
  usePageHeader(["Smartmap", "Analytics"])
  const { state, totalXp, streak, completedTasks, markAnalyticsViewed } = useStore()

  useEffect(() => {
    void markAnalyticsViewed()
  }, [markAnalyticsViewed])

  const totalCount = state.tasks.length
  const completionRate = totalCount ? Math.round((completedTasks.length / totalCount) * 100) : 0

  const weekly = useMemo(() => {
    const days: { label: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = localDateKey(d)
      const count = completedTasks.filter(
        (t) => t.completedAt && localDateKey(new Date(t.completedAt)) === key,
      ).length
      days.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }), value: count })
    }
    return days
  }, [completedTasks])

  const weekTotal = weekly.reduce((a, b) => a + b.value, 0)

  const stats = [
    {
      label: "Tasks completed",
      value: completedTasks.length.toLocaleString(),
      subtext: `${weekTotal} in the last 7 days`,
      icon: Target,
    },
    {
      label: "Total XP",
      value: totalXp.toLocaleString(),
      subtext: "Earned from completed tasks",
      icon: Zap,
    },
    {
      label: "Completion rate",
      value: `${completionRate}%`,
      subtext: `${completedTasks.length} of ${totalCount} tasks done`,
      icon: PieChart,
    },
    {
      label: "Current streak",
      value: `${streak} ${streak === 1 ? "day" : "days"}`,
      subtext: "Days in a row with a completed task",
      icon: Flame,
    },
  ]

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12px] font-medium text-ink-muted">{s.label}</p>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sage-bg text-sage-text">
                <s.icon className="size-4" strokeWidth={2} aria-hidden />
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
        <div>
          <h2 className="text-sm font-semibold text-ink-strong">Tasks completed per day</h2>
          <p className="text-[12px] text-ink-muted">Last 7 days</p>
        </div>
        {weekTotal === 0 ? (
          <div className="flex h-[180px] flex-col items-center justify-center gap-2 rounded-lg bg-surface-muted/60 text-center">
            <BarChart3 className="size-6 text-ink-muted" strokeWidth={1.5} aria-hidden />
            <p className="text-[13px] font-medium text-ink">No tasks completed in the last 7 days</p>
            <p className="max-w-xs text-[12px] text-ink-muted">
              Complete a task from the dashboard or a roadmap and this chart fills in.
            </p>
          </div>
        ) : (
          <BarChart data={weekly} />
        )}
      </Card>
    </>
  )
}

export { Analytics }
