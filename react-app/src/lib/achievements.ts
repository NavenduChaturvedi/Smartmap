// Achievement catalog and the pure evaluator that decides what's newly
// unlocked. Nothing here touches React, Supabase, or the clock directly -
// "now" comes in through the context - so it's fully unit-testable.
//
// Unlocks are persisted (user_achievements) and permanent: evaluation only
// ever adds. Losing the condition later (e.g. un-checking a task) does not
// re-lock anything, because callers pass in what's already unlocked and
// evaluateAchievements never returns removals.

import { daysBetweenKeys, localDateKey } from "./dates"

type Rarity = "common" | "rare" | "epic"

interface AchievementTask {
  done: boolean
  completedAt: string | null
  createdAt: string
  roadmapId: string
  xp: number
}

interface AchievementRoadmap {
  id: string
  createdAt: string
}

interface AchievementContext {
  tasks: AchievementTask[]
  roadmaps: AchievementRoadmap[]
  currentStreak: number
  longestStreak: number
  viewedAnalytics: boolean
  aiRoadmapsCreated: number
  now: Date
}

interface AchievementDef {
  id: string
  title: string
  description: string
  rarity: Rarity
  xp: number
  // Shown as "???" until unlocked.
  secret?: boolean
  // Earlier ids for the same achievement; a stored row under one counts.
  aliases?: string[]
  check: (ctx: AchievementContext) => boolean
  progress?: (ctx: AchievementContext) => { current: number; target: number }
  // Label for progress numbers, e.g. "roadmaps" in "3 / 5 roadmaps".
  progressUnit?: string
  // When the condition was first met, if the data can tell. Used as
  // unlocked_at so a backfilled achievement shows when it was really earned.
  earnedAt?: (ctx: AchievementContext) => string | null
}

interface NewUnlock {
  id: string
  unlockedAt: string
  xp: number
}

const DAY_MS = 86400000

// ---- shared derivations ------------------------------------------------

function doneCount(ctx: AchievementContext) {
  return ctx.tasks.filter((t) => t.done).length
}

const byTime = (a: string, b: string) => Date.parse(a) - Date.parse(b)

// Recorded completion timestamps, oldest first. For achievements about *when*
// something happened (time of day, which day, gaps, speed), where a guessed
// time could award something that didn't happen.
function completionTimes(ctx: AchievementContext): string[] {
  return ctx.tasks
    .filter((t) => t.done && t.completedAt)
    .map((t) => t.completedAt!)
    .sort(byTime)
}

// When a done task is known to have been done: its completion time, or for
// tasks that never recorded one (legacy imports arrive already done), its
// creation time. For count and threshold achievements, where every done task
// must count and the question is only when the threshold was crossed.
function doneAt(t: AchievementTask): string {
  return t.completedAt ?? t.createdAt
}

// Done tasks, oldest (by doneAt) first.
function doneTasksInOrder(ctx: AchievementContext): AchievementTask[] {
  return ctx.tasks.filter((t) => t.done).sort((a, b) => byTime(doneAt(a), doneAt(b)))
}

function roadmapsByCreation(ctx: AchievementContext) {
  return [...ctx.roadmaps].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
}

// Roadmaps with at least one task where every task is done, oldest finish
// first. finishedAt is when the last task was done (by doneAt); `timed` says
// whether every task recorded a real completion time.
function finishedRoadmaps(ctx: AchievementContext) {
  const out: { roadmap: AchievementRoadmap; finishedAt: string; timed: boolean }[] = []
  for (const roadmap of ctx.roadmaps) {
    const tasks = ctx.tasks.filter((t) => t.roadmapId === roadmap.id)
    if (tasks.length === 0 || !tasks.every((t) => t.done)) continue
    const finishedAt = tasks.map(doneAt).reduce((max, c) => (byTime(c, max) > 0 ? c : max))
    out.push({ roadmap, finishedAt, timed: tasks.every((t) => t.completedAt) })
  }
  return out.sort((a, b) => byTime(a.finishedAt, b.finishedAt))
}

function maxRoadmapXp(ctx: AchievementContext) {
  const xp = new Map<string, number>()
  for (const t of ctx.tasks) {
    if (t.done) xp.set(t.roadmapId, (xp.get(t.roadmapId) ?? 0) + t.xp)
  }
  return Math.max(0, ...xp.values())
}

// When any single roadmap's done-task XP first reached `target`.
function roadmapXpReachedAt(ctx: AchievementContext, target: number): string | null {
  const xp = new Map<string, number>()
  for (const t of doneTasksInOrder(ctx)) {
    const total = (xp.get(t.roadmapId) ?? 0) + t.xp
    xp.set(t.roadmapId, total)
    if (total >= target) return doneAt(t)
  }
  return null
}

function bestStreak(ctx: AchievementContext) {
  return Math.max(ctx.currentStreak, ctx.longestStreak)
}

// Completions grouped by local day, each day's times oldest first.
function completionsByDay(ctx: AchievementContext) {
  const days = new Map<string, string[]>()
  for (const c of completionTimes(ctx)) {
    const key = localDateKey(new Date(c))
    days.set(key, [...(days.get(key) ?? []), c])
  }
  return days
}

// Nth-oldest item (1-based), or null if there aren't that many.
function nth<T>(items: T[], n: number): T | null {
  return items[n - 1] ?? null
}

const NIGHT_WATCH_END_HOUR = 5 // 00:00-04:59 local
const COMEBACK_IDLE_DAYS = 7
const DEEP_WORK_TASKS = 5
const SPEEDRUN_DAYS = 7

// ---- catalog -----------------------------------------------------------

const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-contact",
    title: "First Contact",
    description: "Complete your first task.",
    rarity: "common",
    xp: 20,
    check: (ctx) => doneCount(ctx) >= 1,
    earnedAt: (ctx) => {
      const task = nth(doneTasksInOrder(ctx), 1)
      return task && doneAt(task)
    },
  },
  {
    id: "base-camp",
    title: "Base Camp",
    description: "Create your first roadmap.",
    rarity: "common",
    xp: 10,
    check: (ctx) => ctx.roadmaps.length >= 1,
    earnedAt: (ctx) => nth(roadmapsByCreation(ctx), 1)?.createdAt ?? null,
  },
  {
    id: "quick-start",
    title: "Quick Start",
    description: "Complete 10 tasks.",
    rarity: "common",
    xp: 50,
    check: (ctx) => doneCount(ctx) >= 10,
    progress: (ctx) => ({ current: doneCount(ctx), target: 10 }),
    progressUnit: "tasks",
    earnedAt: (ctx) => {
      const task = nth(doneTasksInOrder(ctx), 10)
      return task && doneAt(task)
    },
  },
  {
    id: "cartographer",
    title: "Cartographer",
    description: "Create 5 roadmaps.",
    rarity: "common",
    xp: 40,
    check: (ctx) => ctx.roadmaps.length >= 5,
    progress: (ctx) => ({ current: ctx.roadmaps.length, target: 5 }),
    progressUnit: "roadmaps",
    earnedAt: (ctx) => nth(roadmapsByCreation(ctx), 5)?.createdAt ?? null,
  },
  {
    id: "data-analyst",
    title: "Data Analyst",
    description: "Open the Analytics page.",
    rarity: "common",
    xp: 60,
    check: (ctx) => ctx.viewedAnalytics,
  },
  {
    id: "architect",
    title: "Architect",
    description: "Create a roadmap with the AI generator.",
    rarity: "common",
    xp: 40,
    check: (ctx) => ctx.aiRoadmapsCreated >= 1,
  },
  {
    id: "comeback-kid",
    title: "Comeback Kid",
    description: "Complete a task after a week or more with nothing completed.",
    rarity: "common",
    xp: 50,
    // "A week or more idle" = at least 7 whole local days with no completion
    // between two completions, i.e. their dates are 8+ days apart.
    check: (ctx) => comebackAt(ctx) !== null,
    earnedAt: (ctx) => comebackAt(ctx),
  },
  {
    id: "night-watch",
    title: "Night Watch",
    description: "Complete a task between midnight and 5 AM.",
    rarity: "common",
    xp: 80,
    check: (ctx) => nightWatchAt(ctx) !== null,
    earnedAt: (ctx) => nightWatchAt(ctx),
  },
  {
    id: "week-warrior",
    title: "Week Warrior",
    description: "Reach a 7-day streak.",
    rarity: "rare",
    xp: 100,
    check: (ctx) => bestStreak(ctx) >= 7,
    progress: (ctx) => ({ current: bestStreak(ctx), target: 7 }),
    progressUnit: "days",
  },
  {
    id: "deep-work",
    title: "Deep Work",
    description: `Complete ${DEEP_WORK_TASKS} tasks in one day.`,
    rarity: "rare",
    xp: 120,
    check: (ctx) => deepWorkAt(ctx) !== null,
    progress: (ctx) => ({
      current: Math.max(0, ...[...completionsByDay(ctx).values()].map((d) => d.length)),
      target: DEEP_WORK_TASKS,
    }),
    progressUnit: "tasks in a day",
    earnedAt: (ctx) => deepWorkAt(ctx),
  },
  {
    id: "summit",
    aliases: ["perfectionist"],
    title: "Summit",
    description: "Complete your first roadmap.",
    rarity: "rare",
    xp: 150,
    check: (ctx) => finishedRoadmaps(ctx).length > 0,
    earnedAt: (ctx) => finishedRoadmaps(ctx)[0]?.finishedAt ?? null,
  },
  {
    id: "century-mark",
    title: "Century Mark",
    description: "Earn 200 XP in a single roadmap.",
    rarity: "rare",
    xp: 200,
    check: (ctx) => maxRoadmapXp(ctx) >= 200,
    progress: (ctx) => ({ current: maxRoadmapXp(ctx), target: 200 }),
    progressUnit: "XP",
    earnedAt: (ctx) => roadmapXpReachedAt(ctx, 200),
  },
  {
    id: "speedrunner",
    title: "Speedrunner",
    description: `Finish a roadmap within ${SPEEDRUN_DAYS} days of creating it.`,
    rarity: "rare",
    xp: 150,
    secret: true,
    check: (ctx) => speedrunAt(ctx) !== null,
    earnedAt: (ctx) => speedrunAt(ctx),
  },
  {
    id: "iron-will",
    title: "Iron Will",
    description: "Reach a 30-day streak.",
    rarity: "epic",
    xp: 300,
    check: (ctx) => bestStreak(ctx) >= 30,
    progress: (ctx) => ({ current: bestStreak(ctx), target: 30 }),
    progressUnit: "days",
  },
]

function nightWatchAt(ctx: AchievementContext): string | null {
  return completionTimes(ctx).find((c) => new Date(c).getHours() < NIGHT_WATCH_END_HOUR) ?? null
}

function comebackAt(ctx: AchievementContext): string | null {
  const times = completionTimes(ctx)
  for (let i = 1; i < times.length; i++) {
    const gap = daysBetweenKeys(
      localDateKey(new Date(times[i - 1])),
      localDateKey(new Date(times[i])),
    )
    if (gap > COMEBACK_IDLE_DAYS) return times[i]
  }
  return null
}

function deepWorkAt(ctx: AchievementContext): string | null {
  let earliest: string | null = null
  for (const times of completionsByDay(ctx).values()) {
    const fifth = nth(times, DEEP_WORK_TASKS)
    if (fifth && (!earliest || Date.parse(fifth) < Date.parse(earliest))) earliest = fifth
  }
  return earliest
}

// Needs real completion times: an imported roadmap whose tasks arrived
// already done would otherwise look like it was finished instantly.
function speedrunAt(ctx: AchievementContext): string | null {
  const hit = finishedRoadmaps(ctx).find(
    ({ roadmap, finishedAt, timed }) =>
      timed && Date.parse(finishedAt) - Date.parse(roadmap.createdAt) <= SPEEDRUN_DAYS * DAY_MS,
  )
  return hit?.finishedAt ?? null
}

const ACHIEVEMENTS_BY_ID = new Map<string, AchievementDef>()
for (const a of ACHIEVEMENTS) {
  ACHIEVEMENTS_BY_ID.set(a.id, a)
  for (const alias of a.aliases ?? []) ACHIEVEMENTS_BY_ID.set(alias, a)
}

// Maps a stored id (possibly an old alias) to its current id, or null if
// the id isn't in the catalog anymore.
function canonicalAchievementId(id: string): string | null {
  return ACHIEVEMENTS_BY_ID.get(id)?.id ?? null
}

// Everything whose condition holds now and isn't unlocked yet. Pure and
// idempotent: feeding the result back in as `alreadyUnlocked` returns [].
function evaluateAchievements(
  ctx: AchievementContext,
  alreadyUnlocked: Iterable<string>,
): NewUnlock[] {
  const unlocked = new Set<string>()
  for (const id of alreadyUnlocked) {
    const canonical = canonicalAchievementId(id)
    if (canonical) unlocked.add(canonical)
  }
  const fallback = ctx.now.toISOString()
  return ACHIEVEMENTS.filter((a) => !unlocked.has(a.id) && a.check(ctx)).map((a) => ({
    id: a.id,
    unlockedAt: a.earnedAt?.(ctx) ?? fallback,
    xp: a.xp,
  }))
}

export { ACHIEVEMENTS, canonicalAchievementId, evaluateAchievements }
export type { AchievementContext, AchievementDef, NewUnlock, Rarity }
