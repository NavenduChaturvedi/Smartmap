import { CalendarClock, CheckCircle2, ChevronDown, Circle, TriangleAlert } from "lucide-react"
import { useMemo, useState } from "react"

import { Card } from "@/components/ui/card"
import { StatusPill } from "@/components/ui/status-pill"
import { toDateOnlyIso } from "@/lib/task-scheduling"
import { useStore } from "@/lib/store"
import type { Task } from "@/lib/store"
import { cn } from "@/lib/utils"

const COMING_UP_DAYS = 7

function daysOverdue(dueDate: string, todayStr: string): number {
  const ms = new Date(todayStr).getTime() - new Date(dueDate).getTime()
  return Math.max(1, Math.round(ms / 86400000))
}

function TaskRow({
  task,
  roadmapName,
  onToggle,
  trailing,
}: {
  task: Task
  roadmapName: string
  onToggle: () => void
  trailing?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 border-b border-line/70 py-2.5 text-left last:border-0 hover:bg-surface-muted/60"
    >
      {task.done ? (
        <CheckCircle2 className="size-4 shrink-0 text-sage-text" />
      ) : (
        <Circle className="size-4 shrink-0 text-ink-muted" strokeWidth={1.75} />
      )}
      <span
        className={cn(
          "flex-1 truncate text-[13px] font-medium",
          task.done ? "text-ink-muted line-through" : "text-ink",
        )}
      >
        {task.title}
      </span>
      <span className="text-[11px] text-ink-muted">{roadmapName}</span>
      {trailing}
      <StatusPill tone="amber">+{task.xp} XP</StatusPill>
    </button>
  )
}

function TodayView() {
  const { state, toggleTask } = useStore()
  const [comingUpOpen, setComingUpOpen] = useState(false)

  const roadmapName = (roadmapId: string) =>
    state.roadmaps.find((r) => r.id === roadmapId)?.name ?? "Unknown roadmap"

  const { todayTasks, overdueTasks, comingUpTasks, todayStr } = useMemo(() => {
    const todayStr = toDateOnlyIso(new Date())
    const comingUpEnd = new Date()
    comingUpEnd.setDate(comingUpEnd.getDate() + COMING_UP_DAYS)
    const comingUpEndStr = toDateOnlyIso(comingUpEnd)

    const dated = state.tasks.filter((t): t is Task & { dueDate: string } => t.dueDate !== null)

    const todayTasks = dated
      .filter((t) => t.dueDate === todayStr)
      .sort((a, b) => (a.title < b.title ? -1 : 1))

    const overdueTasks = dated
      .filter((t) => t.dueDate < todayStr && !t.done)
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))

    const comingUpTasks = dated
      .filter((t) => t.dueDate > todayStr && t.dueDate <= comingUpEndStr && !t.done)
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))

    return { todayTasks, overdueTasks, comingUpTasks, todayStr }
  }, [state.tasks])

  if (state.roadmaps.length === 0) return null

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div>
        <h2 className="text-sm font-semibold text-ink-strong">Today</h2>
        <p className="text-[12px] text-ink-muted">Scheduled tasks across every roadmap</p>
      </div>

      <div>
        <h3 className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-ink-muted uppercase">
          Today
        </h3>
        {todayTasks.length === 0 ? (
          <p className="py-2 text-[13px] text-ink-muted">Nothing due today.</p>
        ) : (
          <div className="flex flex-col">
            {todayTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                roadmapName={roadmapName(task.roadmapId)}
                onToggle={() => toggleTask(task.id)}
              />
            ))}
          </div>
        )}
      </div>

      {overdueTasks.length > 0 && (
        <div>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold tracking-wide text-coral-text uppercase">
            <TriangleAlert className="size-3.5" />
            Overdue
          </h3>
          <div className="flex flex-col">
            {overdueTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                roadmapName={roadmapName(task.roadmapId)}
                onToggle={() => toggleTask(task.id)}
                trailing={
                  <StatusPill tone="coral" dot={false}>
                    {daysOverdue(task.dueDate, todayStr)}d overdue
                  </StatusPill>
                }
              />
            ))}
          </div>
        </div>
      )}

      {comingUpTasks.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setComingUpOpen((v) => !v)}
            className="flex w-full items-center gap-1.5 text-[11.5px] font-semibold tracking-wide text-ink-muted uppercase hover:text-ink"
          >
            <CalendarClock className="size-3.5" />
            Coming up ({comingUpTasks.length})
            <ChevronDown
              className={cn("size-3.5 transition-transform", comingUpOpen && "rotate-180")}
            />
          </button>
          {comingUpOpen && (
            <div className="mt-1.5 flex flex-col">
              {comingUpTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  roadmapName={roadmapName(task.roadmapId)}
                  onToggle={() => toggleTask(task.id)}
                  trailing={
                    <span className="text-[11px] text-ink-muted tabular-nums">{task.dueDate}</span>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export { TodayView }
