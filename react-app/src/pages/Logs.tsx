import { useMemo, useState } from "react"

import { EventLogTable, type LogRow } from "@/components/dashboard/EventLogTable"
import { Card } from "@/components/ui/card"
import { usePageHeader } from "@/lib/page-header"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

function formatTimestamp(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${d.toLocaleTimeString(
    undefined,
    { hour: "2-digit", minute: "2-digit", second: "2-digit" },
  )}`
}

function humanDuration(startIso: string, endIso: string) {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

function Logs() {
  usePageHeader(["Smartmap", "Node Logs"])
  const { state } = useStore()
  const [roadmapFilter, setRoadmapFilter] = useState<string>("all")

  const executed = useMemo(
    () => state.tasks.filter((t) => t.completedAt).sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1)),
    [state.tasks],
  )

  const filtered =
    roadmapFilter === "all" ? executed : executed.filter((t) => t.roadmapId === roadmapFilter)

  const logs: LogRow[] = filtered.map((t, i) => ({
    timestamp: formatTimestamp(t.completedAt!),
    nodeId: `N-${String(200 - i).padStart(3, "0")}`,
    step: t.title,
    status: "success",
    duration: humanDuration(t.createdAt, t.completedAt!),
    confidence: Math.min(99, 60 + t.xp),
  }))

  const avgConfidence = logs.length
    ? Math.round(logs.reduce((sum, l) => sum + l.confidence, 0) / logs.length)
    : 0

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
            Total Executions
          </p>
          <p className="mt-1.5 text-2xl font-bold text-ink-strong tabular-nums">{executed.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
            Success Rate
          </p>
          <p className="mt-1.5 text-2xl font-bold text-ink-strong tabular-nums">100%</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
            Avg. Confidence
          </p>
          <p className="mt-1.5 text-2xl font-bold text-ink-strong tabular-nums">{avgConfidence}%</p>
        </Card>
      </div>

      <Card className="flex items-center gap-2 p-3">
        <span className="px-1 text-[12px] font-medium text-ink-muted">Roadmap:</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setRoadmapFilter("all")}
            className={cn(
              "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
              roadmapFilter === "all"
                ? "bg-surface-dark text-ink-inverse"
                : "bg-surface-muted text-ink-muted hover:text-ink",
            )}
          >
            All
          </button>
          {state.roadmaps.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRoadmapFilter(r.id)}
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

      <EventLogTable
        title="Node Execution History"
        subtitle={`${logs.length} completed executions`}
        logs={logs}
      />
    </>
  )
}

export { Logs }
