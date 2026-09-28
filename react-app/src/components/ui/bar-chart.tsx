import { cn } from "@/lib/utils"

function BarChart({
  data,
  height = 180,
}: {
  data: { label: string; value: number }[]
  height?: number
}) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div
      className="flex items-stretch gap-3"
      style={{ height }}
      role="img"
      aria-label={data.map((d) => `${d.label}: ${d.value}`).join(", ")}
    >
      {data.map((d) => {
        const pct = (d.value / max) * 100
        return (
          // Each column fills the chart's fixed height; the track takes what
          // the label leaves. Bars are absolutely positioned in the track so
          // their percentage height resolves against a real box - as a plain
          // child of a content-sized wrapper it computed to 0px.
          <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col items-center gap-2">
            <div className="relative w-full flex-1">
              <div
                className={cn(
                  "absolute inset-x-0 bottom-0 rounded-t-md bg-surface-dark transition-[height] duration-300",
                  d.value === 0 && "bg-surface-muted",
                )}
                style={{ height: `${Math.max(pct, d.value > 0 ? 4 : 2)}%` }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
            <span className="text-[10.5px] font-medium text-ink-muted" aria-hidden>
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export { BarChart }
