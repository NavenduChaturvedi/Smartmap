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
import { useNavigate } from "react-router-dom"

import { EventLogTable, type LogRow } from "@/components/dashboard/EventLogTable"
import { KpiRow } from "@/components/dashboard/KpiRow"
import type { KpiCardProps } from "@/components/dashboard/KpiCard"
import type { NodeCardProps } from "@/components/dashboard/NodeCard"
import { RoadmapCanvas } from "@/components/dashboard/RoadmapCanvas"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ProgressRing } from "@/components/ui/progress-ring"
import { StatusPill } from "@/components/ui/status-pill"
import { usePageHeader } from "@/lib/page-header"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const STAGE_ICONS = [Webhook, BrainCircuit, SplitSquareHorizontal, BellRing]

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function humanDuration(startIso: string, endIso: string) {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

function Dashboard() {
  const navigate = useNavigate()
  const { state, totalXp, rootTasks, subtasks, roadmapProgress, toggleTask } = useStore()

  usePageHeader(["RoadmapOS", "Command Center"], {
    label: "New Node / Step",
    onClick: () => navigate("/workflows"),
  })

  const pendingTasks = state.tasks.filter((t) => !t.done)
  const last7 = useMemo(() => {
    const days: number[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push(state.tasks.filter((t) => t.completedAt?.slice(0, 10) === key).length)
    }
    return days
  }, [state.tasks])

  const kpis: KpiCardProps[] = [
    {
      label: "Active Roadmaps",
      value: String(state.roadmaps.length),
      unit: `/ ${state.tasks.filter((t) => !t.parentTaskId).length} milestones`,
      subtext: "On track this sprint",
      icon: Waypoints,
      tone: "sage",
      progress: state.tasks.length
        ? Math.round((state.tasks.filter((t) => t.done).length / state.tasks.length) * 100)
        : 0,
    },
    {
      label: "Tasks Pending",
      value: String(pendingTasks.length),
      subtext: "Across all roadmaps",
      icon: ListChecks,
      tone: pendingTasks.length > 0 ? "amber" : "sage",
    },
    {
      label: "Active Streak",
      value: String(state.streak),
      unit: "day streak",
      subtext: "Keep the momentum",
      icon: Flame,
      tone: "sage",
      sparkline: last7,
    },
    {
      label: "Total Experience",
      value: totalXp.toLocaleString(),
      unit: "XP",
      subtext: "Lifetime earned",
      icon: Zap,
      tone: "sage",
      trend: { value: `+${last7.reduce((a, b) => a + b, 0)} this wk`, direction: "up" },
    },
  ]

  const focusRoadmap = useMemo(() => {
    if (state.roadmaps.length === 0) return null
    const withActivity = state.roadmaps
      .map((r) => {
        const tasks = state.tasks.filter((t) => t.roadmapId === r.id)
        const lastActivity = tasks.reduce<string>((max, t) => {
          const ts = t.completedAt ?? t.createdAt
          return ts > max ? ts : max
        }, r.createdAt)
        return { roadmap: r, lastActivity }
      })
      .sort((a, b) => (a.lastActivity < b.lastActivity ? 1 : -1))
    return withActivity[0]?.roadmap ?? null
  }, [state.roadmaps, state.tasks])

  const stages: NodeCardProps[] = focusRoadmap
    ? rootTasks(focusRoadmap.id).map((task, i) => {
        const subs = subtasks(task.id)
        const doneSubs = subs.filter((s) => s.done).length
        const confidence = subs.length
          ? Math.round((doneSubs / subs.length) * 100)
          : task.done
            ? 100
            : 0
        return {
          stage: `Stage ${i + 1}`,
          title: task.title,
          description: subs.length
            ? `${doneSubs}/${subs.length} sub-steps complete`
            : task.done
              ? "Stage complete"
              : "Awaiting execution",
          icon: STAGE_ICONS[i % STAGE_ICONS.length],
          tone: task.done ? "sage" : "amber",
          statusLabel: task.done ? "Active" : subs.length ? `${subs.length - doneSubs} Pending` : "Pending",
          confidence,
          onClick: () => navigate(`/roadmap/${focusRoadmap.id}`),
        }
      })
    : []

  const recentLogs: LogRow[] = state.tasks
    .filter((t) => t.completedAt)
    .sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1))
    .slice(0, 6)
    .map((t, i) => ({
      timestamp: formatTime(t.completedAt!),
      nodeId: `N-${String(100 - i).padStart(3, "0")}`,
      step: t.title,
      status: "success",
      duration: humanDuration(t.createdAt, t.completedAt!),
      confidence: Math.min(99, 60 + t.xp),
    }))

  const objectives = pendingTasks
    .filter((t) => !t.parentTaskId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    .slice(0, 6)

  return (
    <>
      <KpiRow items={kpis} />

      <RoadmapCanvas
        subtitle={focusRoadmap ? `${focusRoadmap.name} · ${stages.length} linked stages` : "No active roadmap yet"}
        stages={stages}
        healthy={pendingTasks.length < 6}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col gap-1 p-5 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink-strong">Current Objectives</h2>
              <p className="text-[12px] text-ink-muted">Top pending tasks across roadmaps</p>
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
                    <span className="flex-1 text-[13px] font-medium text-ink">{task.title}</span>
                    <span className="text-[11px] text-ink-muted">{roadmap?.name}</span>
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
            {state.roadmaps.slice(0, 3).map((r) => {
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
                      {completed}/{total} nodes completed
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
          </div>
        </Card>
      </div>

      <EventLogTable logs={recentLogs} />
    </>
  )
}

export { Dashboard }
