import { Award, Crown, Lock, Star } from "lucide-react"
import { useState } from "react"

import { Card } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { StatusPill } from "@/components/ui/status-pill"
import type { Rarity } from "@/lib/achievements"
import { usePageHeader } from "@/lib/page-header"
import { getInitials } from "@/lib/profile"
import { type Achievement, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const STATUS_FILTERS = ["all", "unlocked", "locked"] as const
const RARITY_FILTERS = ["all", "common", "rare", "epic"] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]
type RarityFilter = (typeof RARITY_FILTERS)[number]

const RARITY_CONFIG: Record<
  Rarity,
  { icon: typeof Award; tone: "sage" | "amber" | "coral"; iconBg: string }
> = {
  common: { icon: Award, tone: "sage", iconBg: "bg-sage-bg text-sage-text" },
  rare: { icon: Star, tone: "amber", iconBg: "bg-amber-bg text-amber-text" },
  epic: { icon: Crown, tone: "coral", iconBg: "bg-coral-bg text-coral-text" },
}

// Secret achievements stay hidden until they're earned.
function isHidden(a: Achievement) {
  return !!a.secret && !a.unlocked
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function ProgressBar({ progress, unit }: { progress: NonNullable<Achievement["progress"]>; unit?: string }) {
  const current = Math.min(progress.current, progress.target)
  const pct = Math.round((current / progress.target) * 100)
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.target}
        aria-valuenow={current}
        aria-label={unit ? `${current} of ${progress.target} ${unit}` : `${current} of ${progress.target}`}
      >
        <div className="h-full rounded-full bg-ink-muted/60" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-ink-muted tabular-nums">
        {current} / {progress.target}
        {unit ? ` ${unit}` : ""}
      </span>
    </div>
  )
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly T[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1 rounded-lg bg-surface-muted p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={cn(
            "rounded-md px-3 py-1 text-[12px] font-medium capitalize transition-colors",
            value === option ? "bg-surface text-ink-strong shadow-crisp" : "text-ink-muted hover:text-ink",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function Achievements() {
  usePageHeader(["Smartmap", "Achievements"])
  const { state, totalXp, achievements } = useStore()
  const [status, setStatus] = useState<StatusFilter>("all")
  const [rarity, setRarity] = useState<RarityFilter>("all")
  const [selected, setSelected] = useState<Achievement | null>(null)

  const unlockedCount = achievements.filter((a) => a.unlocked).length

  const visible = achievements
    .filter((a) => status === "all" || (status === "unlocked") === a.unlocked)
    .filter((a) => rarity === "all" || a.rarity === rarity)
    // Unlocked first (newest first), then locked by closest to done.
    .sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
      if (a.unlocked) return (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? "")
      const pa = a.progress ? a.progress.current / a.progress.target : 0
      const pb = b.progress ? b.progress.current / b.progress.target : 0
      return pb - pa
    })

  return (
    <>
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-dark text-[13px] font-semibold text-ink-inverse">
            {getInitials(state.profile.displayName)}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-ink-strong">{state.profile.displayName}</p>
            <p className="text-[12px] text-ink-muted">
              {totalXp.toLocaleString()} XP earned
            </p>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="font-medium text-ink">Unlocked</span>
          <span className="text-ink-muted tabular-nums">
            {unlockedCount} / {achievements.length}
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-label="Achievements unlocked"
          aria-valuemin={0}
          aria-valuemax={achievements.length}
          aria-valuenow={unlockedCount}
        >
          <div
            className="h-full rounded-full bg-sage-text"
            style={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
          />
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <FilterGroup label="Status" options={STATUS_FILTERS} value={status} onChange={setStatus} />
        <FilterGroup label="Rarity" options={RARITY_FILTERS} value={rarity} onChange={setRarity} />
      </div>

      {visible.length === 0 ? (
        <Card className="p-10 text-center text-[13px] text-ink-muted">
          No {status === "all" ? "" : `${status} `}
          {rarity === "all" ? "" : `${rarity} `}achievements.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {visible.map((a) => {
            const config = RARITY_CONFIG[a.rarity]
            const hidden = isHidden(a)
            const Icon = a.unlocked ? config.icon : Lock
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelected(a)}
                className="text-left"
              >
                <Card
                  className={cn(
                    "flex h-full flex-col gap-3 p-4 transition-colors hover:border-ink-muted/30",
                    !a.unlocked && "bg-surface/70",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg",
                        a.unlocked ? config.iconBg : "bg-surface-muted text-ink-muted",
                      )}
                    >
                      <Icon className="size-4" strokeWidth={2} aria-hidden />
                    </div>
                    <StatusPill tone={config.tone}>{a.rarity}</StatusPill>
                  </div>
                  <div className="flex-1">
                    <h3
                      className={cn(
                        "text-[13.5px] font-semibold",
                        a.unlocked ? "text-ink-strong" : "text-ink",
                      )}
                    >
                      {hidden ? "???" : a.title}
                    </h3>
                    <p className="mt-1 text-[12px] leading-snug text-ink-muted">
                      {hidden ? "Hidden achievement" : a.description}
                    </p>
                  </div>
                  {a.unlocked && a.unlockedAt ? (
                    <span className="text-[11px] font-medium text-sage-text">
                      Unlocked {formatDate(a.unlockedAt)} · +{a.xp} XP
                    </span>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {a.progress && !hidden && <ProgressBar progress={a.progress} unit={a.progressUnit} />}
                      <span className="text-[11px] font-medium text-ink-muted">Locked · +{a.xp} XP</span>
                    </div>
                  )}
                </Card>
              </button>
            )
          })}
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? (isHidden(selected) ? "???" : selected.title) : ""}
      >
        {selected && (
          <div className="flex flex-col gap-3">
            <StatusPill tone={RARITY_CONFIG[selected.rarity].tone} className="self-start">
              {selected.rarity}
            </StatusPill>
            <p className="text-[13px] text-ink">
              {isHidden(selected)
                ? "A hidden achievement. Keep going and you'll find out what it is."
                : selected.description}
            </p>
            {selected.progress && !selected.unlocked && !isHidden(selected) && (
              <ProgressBar progress={selected.progress} unit={selected.progressUnit} />
            )}
            <p className="text-[12px] text-ink-muted">
              {selected.unlocked && selected.unlockedAt ? (
                <>
                  Unlocked {formatDate(selected.unlockedAt)} ·{" "}
                  <span className="font-semibold text-ink">+{selected.xp} XP</span> awarded
                </>
              ) : (
                <>
                  Reward: <span className="font-semibold text-ink">+{selected.xp} XP</span>
                </>
              )}
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}

export { Achievements }
