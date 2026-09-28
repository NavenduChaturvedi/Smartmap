import { Card } from "@/components/ui/card"

import { Connector } from "./Connector"
import { NodeCard, type NodeCardProps } from "./NodeCard"

function RoadmapCanvas({
  title = "Stages",
  subtitle,
  stages,
  emptyMessage = "No stages yet. Add a task to get started.",
}: {
  title?: string
  subtitle: string
  stages: NodeCardProps[]
  emptyMessage?: string
}) {
  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-ink-strong">{title}</h2>
        <p className="text-[12px] text-ink-muted">{subtitle}</p>
      </div>

      {stages.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg bg-surface-muted/60 px-4 text-center text-[13px] text-ink-muted">
          {emptyMessage}
        </div>
      ) : (
        <div className="scrollbar-thin flex items-stretch overflow-x-auto rounded-lg bg-surface-muted/60 p-3 sm:p-5">
          {stages.map((stageProps, i) => (
            <div key={stageProps.title + i} className="flex items-stretch">
              <NodeCard {...stageProps} />
              {i < stages.length - 1 && <Connector />}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export { RoadmapCanvas }
