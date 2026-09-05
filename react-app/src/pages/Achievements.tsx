import { Award, Lock, Star } from "lucide-react"
import { useState } from "react"

import { Card } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { StatusPill } from "@/components/ui/status-pill"
import { usePageHeader } from "@/lib/page-header"
import { type Achievement, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const FILTERS = ["all", "rare", "common", "locked"] as const

const RARITY_CONFIG: Record<
  Achievement["rarity"],
  { icon: typeof Award; tone: "sage" | "amber" | "neutral"; iconBg: string }
> = {
  rare: { icon: Star, tone: "amber", iconBg: "bg-amber-bg text-amber-text" },
  common: { icon: Award, tone: "sage", iconBg: "bg-sage-bg text-sage-text" },
  locked: { icon: Lock, tone: "neutral", iconBg: "bg-surface-muted text-ink-muted" },
}

function Achievements() {
  usePageHeader(["RoadmapOS", "Achievements"])
  const { state, totalXp } = useStore()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all")
  const [selected, setSelected] = useState<Achievement | null>(null)

  const unlockedCount = state.achievements.filter((a) => a.unlocked).length
  const visible =
    filter === "all" ? state.achievements : state.achievements.filter((a) => a.rarity === filter)

  return (
    <>
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-dark text-[13px] font-semibold text-ink-inverse">
            {state.profile.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-ink-strong">
              {state.profile.displayName}
            </p>
            <p className="text-[12px] text-ink-muted">{totalXp.toLocaleString()} XP earned</p>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="font-medium text-ink">Completion</span>
          <span className="text-ink-muted tabular-nums">
            {unlockedCount}/{state.achievements.length}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-sage-text"
            style={{ width: `${(unlockedCount / state.achievements.length) * 100}%` }}
          />
        </div>
      </Card>

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[12px] font-medium capitalize transition-colors",
              filter === f
                ? "bg-surface-dark text-ink-inverse"
                : "bg-surface-muted text-ink-muted hover:text-ink",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((a) => {
          const config = RARITY_CONFIG[a.rarity]
          const Icon = config.icon
          const isLocked = a.rarity === "locked"
          return (
            <Card
              key={a.id}
              onClick={() => setSelected(a)}
              className={cn(
                "flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:border-ink-muted/30",
                !a.unlocked && "opacity-60",
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn("flex size-9 items-center justify-center rounded-lg", config.iconBg)}>
                  <Icon className="size-4" strokeWidth={2} />
                </div>
                <StatusPill tone={config.tone}>{a.rarity}</StatusPill>
              </div>
              <div>
                <h3 className="text-[13.5px] font-semibold text-ink-strong">
                  {isLocked ? "Locked Achievement" : a.title}
                </h3>
                <p className="mt-1 text-[12px] leading-snug text-ink-muted">
                  {isLocked ? "Keep progressing to unlock this achievement." : a.description}
                </p>
              </div>
              {!isLocked && (
                <span className="text-[11px] font-medium text-ink-muted">
                  {a.unlocked ? "Unlocked" : `Locked · +${a.xp} XP`}
                </span>
              )}
            </Card>
          )
        })}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.rarity === "locked" ? "Locked Achievement" : (selected?.title ?? "")}
      >
        {selected && (
          <div className="flex flex-col gap-3">
            <StatusPill tone={RARITY_CONFIG[selected.rarity].tone} className="self-start">
              {selected.rarity}
            </StatusPill>
            <p className="text-[13px] text-ink">
              {selected.rarity === "locked" ? "Keep progressing to unlock this achievement." : selected.description}
            </p>
            {selected.rarity !== "locked" && (
              <p className="text-[12px] text-ink-muted">
                Reward: <span className="font-semibold text-ink">+{selected.xp} XP</span>
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}

export { Achievements }
