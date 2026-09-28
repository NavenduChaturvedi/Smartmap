import { CheckCircle2 } from "lucide-react"
import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"
import { StatusPill } from "@/components/ui/status-pill"
import type { Task } from "@/lib/store"

function formatCompletedAt(iso: string | null) {
  if (!iso) return "Date not recorded"
  const d = new Date(iso)
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${d.toLocaleTimeString(
    undefined,
    { hour: "numeric", minute: "2-digit" },
  )}`
}

function ActivityTable({
  title,
  subtitle,
  tasks,
  roadmapName,
  action,
  emptyMessage = "Nothing completed yet. Tick off a task and it shows up here.",
}: {
  title: string
  subtitle: string
  tasks: Task[]
  roadmapName: (roadmapId: string) => string
  action?: ReactNode
  emptyMessage?: string
}) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line p-4">
        <div>
          <h2 className="text-sm font-semibold text-ink-strong">{title}</h2>
          <p className="text-[12px] text-ink-muted">{subtitle}</p>
        </div>
        {action}
      </div>

      {tasks.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-ink-muted">{emptyMessage}</p>
      ) : (
        <ul>
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line/70 px-4 py-2.5 last:border-0"
            >
              <CheckCircle2 className="size-4 shrink-0 text-sage-text" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">{task.title}</p>
                <p className="truncate text-[11.5px] text-ink-muted">
                  {roadmapName(task.roadmapId)} · {formatCompletedAt(task.completedAt)}
                </p>
              </div>
              <StatusPill tone="sage" dot={false}>
                +{task.xp} XP
              </StatusPill>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export { ActivityTable }
