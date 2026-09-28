import { AnimatePresence, motion } from "framer-motion"
import { Award, Crown, Star, X } from "lucide-react"
import { useEffect } from "react"
import { Link } from "react-router-dom"

import { StatusPill } from "@/components/ui/status-pill"
import { ACHIEVEMENTS, type Rarity } from "@/lib/achievements"
import { playChime } from "@/lib/chime"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const SHOW_MS = 4000

const RARITY_STYLE: Record<Rarity, { icon: typeof Award; iconBg: string; tone: "sage" | "amber" | "coral" }> = {
  common: { icon: Award, iconBg: "bg-sage-bg text-sage-text", tone: "sage" },
  rare: { icon: Star, iconBg: "bg-amber-bg text-amber-text", tone: "amber" },
  epic: { icon: Crown, iconBg: "bg-coral-bg text-coral-text", tone: "coral" },
}

// Shows queued unlocks one at a time, top-right, ~4s each.
function AchievementToast() {
  const { achievementToasts, dismissAchievementToast, state } = useStore()
  const currentId = achievementToasts[0]
  const def = currentId ? ACHIEVEMENTS.find((a) => a.id === currentId) : undefined
  const waiting = achievementToasts.length - 1

  useEffect(() => {
    if (!currentId) return
    if (state.settings.soundEffects) playChime()
    const timer = window.setTimeout(dismissAchievementToast, SHOW_MS)
    return () => window.clearTimeout(timer)
    // Re-run per toast, not when settings change mid-toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, dismissAchievementToast])

  const style = def ? RARITY_STYLE[def.rarity] : null
  const Icon = style?.icon ?? Award

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 top-3 z-[60] flex justify-end sm:inset-x-auto sm:top-4 sm:right-4"
    >
      <AnimatePresence mode="wait">
        {def && style && (
          <motion.div
            key={def.id}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 pr-2 shadow-[0_8px_32px_rgba(0,0,0,0.14)] sm:w-80"
          >
            <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", style.iconBg)}>
              <Icon className="size-5" strokeWidth={2} aria-hidden />
            </div>
            <Link to="/achievements" onClick={dismissAchievementToast} className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-ink-muted">Achievement unlocked</p>
              <p className="truncate text-[13.5px] font-semibold text-ink-strong">{def.title}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <StatusPill tone={style.tone} dot={false}>
                  {def.rarity}
                </StatusPill>
                <span className="text-[12px] font-semibold text-ink">+{def.xp} XP</span>
                {waiting > 0 && <span className="text-[11px] text-ink-muted">· {waiting} more</span>}
              </div>
            </Link>
            <button
              type="button"
              onClick={dismissAchievementToast}
              aria-label="Dismiss"
              className="flex size-8 shrink-0 items-center justify-center self-start rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { AchievementToast }
