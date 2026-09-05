import { NODE_ICON_CENTER } from "./NodeCard"

let connectorId = 0

function Connector() {
  const markerId = `connector-arrow-${connectorId++}`

  return (
    <div className="relative w-10 shrink-0 self-stretch">
      <svg
        className="absolute left-0 w-full overflow-visible"
        style={{ top: NODE_ICON_CENTER - 12 }}
        height={24}
        viewBox="0 0 40 24"
        preserveAspectRatio="none"
      >
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 8 8"
            refX="6"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L8,4 L0,8 Z" className="fill-ink-muted/50" />
          </marker>
        </defs>
        <path
          d="M0,12 Q20,-2 38,12"
          fill="none"
          className="stroke-ink-muted/40"
          strokeWidth={1.5}
          strokeDasharray="3.5 3.5"
          markerEnd={`url(#${markerId})`}
        />
      </svg>
    </div>
  )
}

export { Connector }
