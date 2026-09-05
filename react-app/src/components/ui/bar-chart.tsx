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
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d) => {
        const pct = (d.value / max) * 100
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end">
              <div
                className={cn(
                  "w-full rounded-t-md bg-surface-dark transition-[height] duration-300",
                  d.value === 0 && "bg-surface-muted",
                )}
                style={{ height: `${Math.max(pct, d.value > 0 ? 4 : 2)}%` }}
              />
            </div>
            <span className="text-[10.5px] font-medium text-ink-muted">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export { BarChart }
