import { Eye, ListFilter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StatusPill } from "@/components/ui/status-pill"

type LogStatus = "success" | "warning" | "error"

interface LogRow {
  timestamp: string
  nodeId: string
  step: string
  status: LogStatus
  duration: string
  confidence: number
}

const STATUS_CONFIG: Record<LogStatus, { label: string; tone: "sage" | "amber" | "coral" }> = {
  success: { label: "Success", tone: "sage" },
  warning: { label: "Pending", tone: "amber" },
  error: { label: "Failed", tone: "coral" },
}

function EventLogTable({
  title = "Live Event Log",
  subtitle = "Node execution history · real-time",
  logs,
}: {
  title?: string
  subtitle?: string
  logs: LogRow[]
}) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line p-4">
        <div>
          <h2 className="text-sm font-semibold text-ink-strong">{title}</h2>
          <p className="text-[12px] text-ink-muted">{subtitle}</p>
        </div>
        <Button variant="ghost" size="sm">
          <ListFilter className="size-3.5" />
          Filter
        </Button>
      </div>

      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              {["Timestamp", "Node ID / Step", "Status", "Duration", "AI Confidence", ""].map(
                (col) => (
                  <th
                    key={col}
                    className="px-4 py-2.5 text-[10.5px] font-semibold tracking-wider text-ink-muted uppercase"
                  >
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[13px] text-ink-muted">
                  No executions logged yet.
                </td>
              </tr>
            ) : (
              logs.map((log, i) => {
                const status = STATUS_CONFIG[log.status]
                return (
                  <tr
                    key={`${log.nodeId}-${i}`}
                    className="group border-b border-line/70 last:border-0 hover:bg-surface-muted/70"
                  >
                    <td className="px-4 py-2.5 font-mono text-[12px] text-ink-muted tabular-nums">
                      {log.timestamp}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink-muted">
                          {log.nodeId}
                        </span>
                        <span className="text-[12.5px] font-medium text-ink">{log.step}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    </td>
                    <td className="px-4 py-2.5 text-[12.5px] text-ink-muted tabular-nums">
                      {log.duration}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-14 overflow-hidden rounded-full bg-surface-muted">
                          <div
                            className="h-full rounded-full bg-ink-strong"
                            style={{ width: `${log.confidence}%` }}
                          />
                        </div>
                        <span className="text-[12px] text-ink-muted tabular-nums">
                          {log.confidence}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        className="inline-flex size-7 items-center justify-center rounded-md text-ink-muted opacity-0 transition-opacity hover:bg-surface hover:text-ink group-hover:opacity-100"
                        aria-label="Inspect execution"
                      >
                        <Eye className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export { EventLogTable }
export type { LogRow, LogStatus }
