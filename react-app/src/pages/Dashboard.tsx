import {
  BellRing,
  BrainCircuit,
  Circle,
  Flame,
  ListChecks,
  Plus,
  SplitSquareHorizontal,
  Waypoints,
  Webhook,
  Zap,
} from "lucide-react"
import { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"

import { ActivityTable } from "@/components/dashboard/ActivityTable"
import { KpiRow } from "@/components/dashboard/KpiRow"
import type { KpiCardProps } from "@/components/dashboard/KpiCard"
import type { NodeCardProps } from "@/components/dashboard/NodeCard"
import { RoadmapCanvas } from "@/components/dashboard/RoadmapCanvas"
import { TodayView } from "@/components/dashboard/TodayView"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ProgressRing } from "@/components/ui/progress-ring"
import { StatusPill } from "@/components/ui/status-pill"
import { localDateKey } from "@/lib/dates"
import { usePageHeader } from "@/lib/page-header"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const STAGE_ICONS = [Webhook, BrainCircuit, SplitSquareHorizontal, BellRing]

function Dashboard() {
  const navigate = useNavigate()
  const {
    state,
    totalXp,
    streak,
    completedTasks,
    rootTasks,
    subtasks,
    roadmapProgress,
    activeRoadmaps,
    completedRoadmaps,
    toggleTask,
  } = useStore()

  usePageHeader(["Smartmap", "Dashboard"], {
    label: "New Roadmap",
    onClick: () => navigate("/workflows"),
  })

  // Completed roadmaps and their tasks live on the Roadmaps page, not here.
  const activeTasks = useMemo(() => {
    const activeIds = new Set(activeRoadmaps.map((r) => r.id))
    return state.tasks.filter((t) => activeIds.has(t.roadmapId))
  }, [activeRoadmaps, state.tasks])

  const pendingTasks = activeTasks.filter((t) => !t.done)
  // Tasks completed on each of the last 7 local days, plus the XP they earned.
  const last7 = useMemo(() => {
    const keys: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      keys.push(localDateKey(d))
    }
    const counts = keys.map(() => 0)
    let xp = 0
    for (const t of completedTasks) {
      if (!t.completedAt) continue
      const idx = keys.indexOf(localDateKey(new Date(t.completedAt)))
      if (idx === -1) continue
      counts[idx] += 1
      xp += t.xp
    }
    return { counts, xp }
  }, [completedTasks])

  const doneActive = activeTasks.filter((t) => t.done).length

  const kpis: KpiCardProps[] = [
    {
      label: "Active roadmaps",
      value: String(activeRoadmaps.length),
      subtext: activeTasks.length
        ? `${doneActive} of ${activeTasks.length} tasks done`
        : completedRoadmaps.length
          ? `${completedRoadmaps.length} completed, none in progress`
          : "Create one to get started",
      icon: Waypoints,
      tone: "sage",
      progress: activeTasks.length ? Math.round((doneActive / activeTasks.length) * 100) : undefined,
    },
    {
      label: "Tasks pending",
      value: String(pendingTasks.length),
      subtext: "In active roadmaps",
      icon: ListChecks,
      tone: pendingTasks.length > 0 ? "amber" : "sage",
    },
    {
      label: "Streak",
      value: String(streak),
      unit: streak === 1 ? "day" : "days",
      subtext: streak > 0 ? "Tasks done, last 7 days" : "Complete a task to start one",
      icon: Flame,
      tone: streak > 0 ? "sage" : "neutral",
      sparkline: last7.counts,
    },
    {
      label: "Total XP",
      value: totalXp.toLocaleString(),
      unit: "XP",
      subtext: "Lifetime",
      icon: Zap,
      tone: "sage",
      trend: last7.xp > 0 ? { value: `+${last7.xp} this week`, direction: "up" } : undefined,
    },
  ]

  const focusRoadmap = useMemo(() => {
    if (activeRoadmaps.length === 0) return null
    const withActivity = activeRoadmaps
      .map((r) => {
        const tasks = activeTasks.filter((t) => t.roadmapId === r.id)
        const lastActivity = tasks.reduce<string>((max, t) => {
          const ts = t.completedAt ?? t.createdAt
          return ts > max ? ts : max
        }, r.createdAt)
        return { roadmap: r, lastActivity }
      })
      .sort((a, b) => (a.lastActivity < b.lastActivity ? 1 : -1))
    return withActivity[0]?.roadmap ?? null
  }, [activeRoadmaps, activeTasks])

  const stages: NodeCardProps[] = focusRoadmap
    ? rootTasks(focusRoadmap.id).map((task, i) => {
        const subs = subtasks(task.id)
        const doneSubs = subs.filter((s) => s.done).length
        const progress = subs.length
          ? Math.round((doneSubs / subs.length) * 100)
          : task.done
            ? 100
            : 0
        return {
          stage: `Stage ${i + 1}`,
          title: task.title,
          description: subs.length
            ? `${doneSubs}/${subs.length} subtasks done`
            : task.done
              ? "Done"
              : "Not started",
          icon: STAGE_ICONS[i % STAGE_ICONS.length],
          tone: task.done ? "sage" : "amber",
          statusLabel: task.done ? "Done" : subs.length ? `${subs.length - doneSubs} left` : "To do",
          progress,
          onClick: () => navigate(`/roadmap/${focusRoadmap.id}`),
        }
      })
    : []

  const roadmapName = (id: string) =>
    state.roadmaps.find((r) => r.id === id)?.name ?? "Deleted roadmap"

  const objectives = pendingTasks
    .filter((t) => !t.parentTaskId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    .slice(0, 6)

  return (
    <>
      <KpiRow items={kpis} />

      <TodayView />

      <RoadmapCanvas
        title="Current roadmap"
        subtitle={
          focusRoadmap
            ? `${focusRoadmap.name} · ${stages.length} stage${stages.length === 1 ? "" : "s"}`
            : state.roadmaps.length > 0
              ? "All roadmaps completed"
              : "No roadmap yet"
        }
        stages={stages}
        emptyMessage={
          state.roadmaps.length > 0
            ? "Every roadmap is finished. Start a new one to see its stages here."
            : "Create a roadmap to see its stages here."
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col gap-1 p-5 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink-strong">Up next</h2>
              <p className="text-[12px] text-ink-muted">Oldest open tasks across your roadmaps</p>
            </div>
          </div>
          {objectives.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-[13px] text-ink-muted">
              All caught up — nothing pending.
            </div>
          ) : (
            <div className="flex flex-col">
              {objectives.map((task) => {
                const roadmap = state.roadmaps.find((r) => r.id === task.roadmapId)
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center gap-3 border-b border-line/70 py-2.5 text-left last:border-0 hover:bg-surface-muted/60"
                  >
                    <Circle className="size-4 shrink-0 text-ink-muted" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{task.title}</span>
                    <span className="hidden text-[11px] text-ink-muted sm:inline">{roadmap?.name}</span>
                    <StatusPill tone="amber">+{task.xp} XP</StatusPill>
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-strong">Roadmaps</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/roadmap")}>
              View all
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {activeRoadmaps.slice(0, 3).map((r) => {
              const { completed, total } = roadmapProgress(r.id)
              const pct = total ? Math.round((completed / total) * 100) : 0
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => navigate(`/roadmap/${r.id}`)}
                  className="flex items-center gap-3 rounded-lg border border-line p-3 text-left hover:bg-surface-muted/60"
                >
                  <ProgressRing percent={pct} size={40} strokeWidth={4}>
                    <span className="text-[10px] font-bold text-ink-strong">{pct}%</span>
                  </ProgressRing>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{r.name}</p>
                    <p className="text-[11px] text-ink-muted">
                      {completed}/{total} tasks done
                    </p>
                  </div>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => navigate("/workflows")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-2.5 text-[12.5px] font-medium text-ink-muted hover:border-ink-muted/40 hover:text-ink",
              )}
            >
              <Plus className="size-3.5" />
              Create New Roadmap
            </button>
            {completedRoadmaps.length > 0 && (
              <button
                type="button"
                onClick={() => navigate("/roadmap")}
                className="text-center text-[12px] font-medium text-ink-muted hover:text-ink"
              >
                {completedRoadmaps.length} completed — view
              </button>
            )}
          </div>
        </Card>
      </div>

      <ActivityTable
        title="Recent activity"
        subtitle={`${completedTasks.length} task${completedTasks.length === 1 ? "" : "s"} completed in total`}
        tasks={completedTasks.slice(0, 6)}
        roadmapName={roadmapName}
        action={
          completedTasks.length > 0 ? (
            <Link
              to="/logs"
              className="shrink-0 text-[12.5px] font-medium text-ink-muted hover:text-ink"
            >
              View all
            </Link>
          ) : undefined
        }
      />
    </>
  )
}

export { Dashboard }
