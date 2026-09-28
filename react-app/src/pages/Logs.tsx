import { useState } from "react"

import { ActivityTable } from "@/components/dashboard/ActivityTable"
import { Card } from "@/components/ui/card"
import { usePageHeader } from "@/lib/page-header"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

function Logs() {
  usePageHeader(["Smartmap", "Activity"])
  const { state, completedTasks, totalXp } = useStore()
  const [roadmapFilter, setRoadmapFilter] = useState<string>("all")

  const filtered =
    roadmapFilter === "all"
      ? completedTasks
      : completedTasks.filter((t) => t.roadmapId === roadmapFilter)

  const weekAgo = Date.now() - 7 * 86400000
  const thisWeek = completedTasks.filter(
    (t) => t.completedAt && new Date(t.completedAt).getTime() >= weekAgo,
  ).length

  const roadmapName = (id: string) =>
    state.roadmaps.find((r) => r.id === id)?.name ?? "Deleted roadmap"

  const stats = [
    { label: "Tasks completed", value: completedTasks.length.toLocaleString() },
    { label: "Last 7 days", value: thisWeek.toLocaleString() },
    { label: "XP earned", value: totalXp.toLocaleString() },
  ]

  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[12px] font-medium text-ink-muted">{s.label}</p>
            <p className="mt-1.5 text-2xl font-bold text-ink-strong tabular-nums">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <span className="px-1 text-[12px] font-medium text-ink-muted">Roadmap:</span>
        <div className="flex flex-wrap gap-1.5">
          {[{ id: "all", name: "All" }, ...state.roadmaps].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRoadmapFilter(r.id)}
              aria-pressed={roadmapFilter === r.id}
              className={cn(
                "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
                roadmapFilter === r.id
                  ? "bg-surface-dark text-ink-inverse"
                  : "bg-surface-muted text-ink-muted hover:text-ink",
              )}
            >
              {r.name}
            </button>
          ))}
        </div>
      </Card>

      <ActivityTable
        title="Completed tasks"
        subtitle={`${filtered.length} task${filtered.length === 1 ? "" : "s"}, newest first`}
        tasks={filtered}
        roadmapName={roadmapName}
      />
    </>
  )
}

export { Logs }
