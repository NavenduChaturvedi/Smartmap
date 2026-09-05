import { Card } from "@/components/ui/card"

import { Connector } from "./Connector"
import { NodeCard, type NodeCardProps } from "./NodeCard"

function RoadmapCanvas({
  title = "Interactive Roadmap Canvas",
  subtitle,
  stages,
  healthy = true,
}: {
  title?: string
  subtitle: string
  stages: NodeCardProps[]
  healthy?: boolean
}) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink-strong">{title}</h2>
          <p className="text-[12px] text-ink-muted">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span
              className={
                healthy ? "size-1.5 rounded-full bg-sage-text" : "size-1.5 rounded-full bg-amber-text"
              }
            />
            {healthy ? "Healthy" : "Attention needed"}
          </span>
        </div>
      </div>

      {stages.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg bg-surface-muted/60 text-[13px] text-ink-muted">
          No stages yet — add a node to get started.
        </div>
      ) : (
        <div className="scrollbar-thin flex items-stretch overflow-x-auto rounded-lg bg-surface-muted/60 p-5">
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
