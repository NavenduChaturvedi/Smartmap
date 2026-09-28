import { describe, expect, it } from "vitest"

import {
  ACHIEVEMENTS,
  canonicalAchievementId,
  evaluateAchievements,
  type AchievementContext,
} from "./achievements"

// Times use an explicit +05:30 offset; the suite runs in IST (vitest.config).
const NOW = new Date("2026-09-28T12:00:00+05:30")

type Ctx = AchievementContext
type TaskInput = Ctx["tasks"][number]

function ctx(overrides: Partial<Ctx> = {}): Ctx {
  return {
    tasks: [],
    roadmaps: [{ id: "r1", createdAt: "2026-09-01T09:00:00+05:30" }],
    currentStreak: 0,
    longestStreak: 0,
    viewedAnalytics: false,
    aiRoadmapsCreated: 0,
    now: NOW,
    ...overrides,
  }
}

function doneTask(completedAt: string | null, extra: Partial<TaskInput> = {}): TaskInput {
  return { done: true, completedAt, roadmapId: "r1", xp: 10, ...extra }
}

function openTask(extra: Partial<TaskInput> = {}): TaskInput {
  return { done: false, completedAt: null, roadmapId: "r1", xp: 10, ...extra }
}

// Completions at 10:00 on consecutive local days starting 2026-09-01.
function dailyTasks(count: number, extra: Partial<TaskInput> = {}) {
  return Array.from({ length: count }, (_, i) =>
    doneTask(`2026-09-${String(i + 1).padStart(2, "0")}T10:00:00+05:30`, extra),
  )
}

const ids = (c: Ctx, unlocked: string[] = []) => evaluateAchievements(c, unlocked).map((u) => u.id)
const unlocks = (c: Ctx, id: string) => ids(c).includes(id)
const find = (c: Ctx, id: string) => evaluateAchievements(c, []).find((u) => u.id === id)

describe("catalog", () => {
  it("has no placeholder achievements", () => {
    expect(ACHIEVEMENTS.every((a) => !a.id.startsWith("locked") && a.check)).toBe(true)
    expect(ACHIEVEMENTS.some((a) => a.title.includes("Locked Achievement"))).toBe(false)
  })

  it("has unique ids and aliases", () => {
    const all = ACHIEVEMENTS.flatMap((a) => [a.id, ...(a.aliases ?? [])])
    expect(new Set(all).size).toBe(all.length)
  })

  it("marks speedrunner as secret", () => {
    expect(ACHIEVEMENTS.find((a) => a.id === "speedrunner")?.secret).toBe(true)
  })
})

describe("boundaries", () => {
  it("first-contact: 0 vs 1 completed task", () => {
    expect(unlocks(ctx({ tasks: [openTask()] }), "first-contact")).toBe(false)
    expect(unlocks(ctx({ tasks: [doneTask("2026-09-02T10:00:00+05:30")] }), "first-contact")).toBe(true)
  })

  it("quick-start: 9 vs 10 completed tasks, dated by the 10th", () => {
    expect(unlocks(ctx({ tasks: dailyTasks(9) }), "quick-start")).toBe(false)
    const hit = find(ctx({ tasks: dailyTasks(10) }), "quick-start")
    expect(hit?.unlockedAt).toBe("2026-09-10T10:00:00+05:30")
  })

  it("quick-start: progress counts done tasks", () => {
    const def = ACHIEVEMENTS.find((a) => a.id === "quick-start")!
    expect(def.progress!(ctx({ tasks: dailyTasks(3) }))).toEqual({ current: 3, target: 10 })
  })

  it("base-camp: 0 vs 1 roadmap", () => {
    expect(unlocks(ctx({ roadmaps: [] }), "base-camp")).toBe(false)
    expect(unlocks(ctx(), "base-camp")).toBe(true)
  })

  it("cartographer: 4 vs 5 roadmaps, dated by the 5th created", () => {
    const roadmaps = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        id: `r${i}`,
        createdAt: `2026-09-0${i + 1}T09:00:00+05:30`,
      }))
    expect(unlocks(ctx({ roadmaps: roadmaps(4) }), "cartographer")).toBe(false)
    expect(find(ctx({ roadmaps: roadmaps(5) }), "cartographer")?.unlockedAt).toBe(
      "2026-09-05T09:00:00+05:30",
    )
  })

  it("data-analyst: follows the analytics-viewed flag", () => {
    expect(unlocks(ctx(), "data-analyst")).toBe(false)
    expect(find(ctx({ viewedAnalytics: true }), "data-analyst")?.unlockedAt).toBe(NOW.toISOString())
  })

  it("architect: 0 vs 1 AI-created roadmap", () => {
    expect(unlocks(ctx(), "architect")).toBe(false)
    expect(unlocks(ctx({ aiRoadmapsCreated: 1 }), "architect")).toBe(true)
  })

  it("night-watch: 00:00 and 04:59 count, 05:00 and 23:59 don't", () => {
    const at = (time: string) => ctx({ tasks: [doneTask(`2026-09-10T${time}+05:30`)] })
    expect(unlocks(at("00:00:00"), "night-watch")).toBe(true)
    expect(unlocks(at("04:59:59"), "night-watch")).toBe(true)
    expect(unlocks(at("05:00:00"), "night-watch")).toBe(false)
    expect(unlocks(at("23:59:59"), "night-watch")).toBe(false)
  })

  it("comeback-kid: needs a previous completion", () => {
    expect(unlocks(ctx({ tasks: [doneTask("2026-09-10T10:00:00+05:30")] }), "comeback-kid")).toBe(false)
  })

  it("comeback-kid: 6 idle days no, 7 idle days yes", () => {
    const pair = (second: string) =>
      ctx({ tasks: [doneTask("2026-09-01T10:00:00+05:30"), doneTask(second)] })
    // Sep 2-7 idle (6 days)
    expect(unlocks(pair("2026-09-08T10:00:00+05:30"), "comeback-kid")).toBe(false)
    // Sep 2-8 idle (7 days)
    expect(find(pair("2026-09-09T10:00:00+05:30"), "comeback-kid")?.unlockedAt).toBe(
      "2026-09-09T10:00:00+05:30",
    )
  })

  it("comeback-kid: counts idle days in local time across IST midnight", () => {
    // Local dates Sep 1 and Sep 9 (7 idle days). In UTC these are Sep 1 and
    // Sep 8, which would only be 6 idle days.
    const c = ctx({
      tasks: [doneTask("2026-09-01T23:30:00+05:30"), doneTask("2026-09-09T00:10:00+05:30")],
    })
    expect(unlocks(c, "comeback-kid")).toBe(true)
  })

  it("deep-work: 4 vs 5 tasks in one local day", () => {
    const sameDay = (n: number) =>
      Array.from({ length: n }, (_, i) => doneTask(`2026-09-10T1${i}:00:00+05:30`))
    expect(unlocks(ctx({ tasks: sameDay(4) }), "deep-work")).toBe(false)
    expect(find(ctx({ tasks: sameDay(5) }), "deep-work")?.unlockedAt).toBe("2026-09-10T14:00:00+05:30")
  })

  it("deep-work: 5 tasks split by IST midnight are two days, not one", () => {
    // All five fall on 2026-09-10 in UTC.
    const c = ctx({
      tasks: [
        doneTask("2026-09-10T22:00:00+05:30"),
        doneTask("2026-09-10T23:00:00+05:30"),
        doneTask("2026-09-10T23:30:00+05:30"),
        doneTask("2026-09-11T00:10:00+05:30"),
        doneTask("2026-09-11T00:20:00+05:30"),
      ],
    })
    expect(unlocks(c, "deep-work")).toBe(false)
  })

  it("summit: a roadmap with every task done; empty or partial roadmaps don't count", () => {
    expect(unlocks(ctx(), "summit")).toBe(false)
    expect(unlocks(ctx({ tasks: [doneTask("2026-09-05T10:00:00+05:30"), openTask()] }), "summit")).toBe(false)
    const c = ctx({
      tasks: [doneTask("2026-09-05T10:00:00+05:30"), doneTask("2026-09-06T10:00:00+05:30")],
    })
    expect(find(c, "summit")?.unlockedAt).toBe("2026-09-06T10:00:00+05:30")
  })

  it("century-mark: 199 vs 200 XP in one roadmap; split across roadmaps doesn't count", () => {
    const one = (xp: number) => ctx({ tasks: [doneTask("2026-09-05T10:00:00+05:30", { xp })] })
    expect(unlocks(one(199), "century-mark")).toBe(false)
    expect(unlocks(one(200), "century-mark")).toBe(true)
    const split = ctx({
      roadmaps: [
        { id: "r1", createdAt: "2026-09-01T09:00:00+05:30" },
        { id: "r2", createdAt: "2026-09-01T09:00:00+05:30" },
      ],
      tasks: [
        doneTask("2026-09-05T10:00:00+05:30", { xp: 150 }),
        doneTask("2026-09-05T10:00:00+05:30", { xp: 150, roadmapId: "r2" }),
      ],
    })
    expect(unlocks(split, "century-mark")).toBe(false)
  })

  it("speedrunner: finished exactly 7 days after creation counts, a minute later doesn't", () => {
    const finish = (at: string) => ctx({ tasks: [doneTask(at)] })
    expect(unlocks(finish("2026-09-08T09:00:00+05:30"), "speedrunner")).toBe(true)
    expect(unlocks(finish("2026-09-08T09:01:00+05:30"), "speedrunner")).toBe(false)
  })

  it("week-warrior and iron-will: best of current and longest streak", () => {
    expect(unlocks(ctx({ longestStreak: 6 }), "week-warrior")).toBe(false)
    expect(unlocks(ctx({ longestStreak: 7 }), "week-warrior")).toBe(true)
    expect(unlocks(ctx({ currentStreak: 7 }), "week-warrior")).toBe(true)
    expect(unlocks(ctx({ longestStreak: 29 }), "iron-will")).toBe(false)
    expect(unlocks(ctx({ longestStreak: 30 }), "iron-will")).toBe(true)
  })
})

describe("persistence semantics", () => {
  it("is idempotent: evaluating again with the result unlocks nothing new", () => {
    const c = ctx({ tasks: dailyTasks(10), viewedAnalytics: true })
    const first = ids(c)
    expect(first.length).toBeGreaterThan(0)
    expect(ids(c, first)).toEqual([])
  })

  it("never re-locks: un-checking the task behind an unlock returns no change", () => {
    const before = ctx({ tasks: [doneTask("2026-09-02T10:00:00+05:30")] })
    const unlocked = ids(before)
    expect(unlocked).toContain("first-contact")
    // The task is un-checked; evaluation only ever returns additions.
    const after = ctx({ tasks: [openTask()] })
    expect(ids(after, unlocked)).toEqual([])
  })

  it("treats the old perfectionist id as summit", () => {
    expect(canonicalAchievementId("perfectionist")).toBe("summit")
    const c = ctx({ tasks: [doneTask("2026-09-05T10:00:00+05:30")] })
    expect(ids(c, ["perfectionist"])).not.toContain("summit")
  })

  it("ignores stored ids that aren't in the catalog", () => {
    expect(canonicalAchievementId("locked-0")).toBeNull()
    expect(() => evaluateAchievements(ctx(), ["locked-0"])).not.toThrow()
  })

  it("awards each achievement's catalog XP", () => {
    const hit = find(ctx({ tasks: dailyTasks(10) }), "quick-start")
    expect(hit?.xp).toBe(50)
  })
})

describe("backfill of an existing account", () => {
  // Shaped like the real data: a finished roadmap from early September, a
  // legacy-imported task with no completion time, and an analytics visit.
  const existing = ctx({
    roadmaps: [
      { id: "r1", createdAt: "2026-09-05T08:00:00+05:30" },
      { id: "r2", createdAt: "2026-09-05T08:05:00+05:30" },
    ],
    tasks: [
      ...Array.from({ length: 9 }, (_, i) =>
        doneTask(`2026-09-05T20:1${i}:00+05:30`, { xp: 50, roadmapId: "r1" }),
      ),
      doneTask(null, { xp: 100, roadmapId: "r2" }),
      doneTask(null, { xp: 100, roadmapId: "r2" }),
    ],
    viewedAnalytics: true,
  })

  it("unlocks everything the data already qualifies for", () => {
    expect(new Set(ids(existing))).toEqual(
      new Set([
        "first-contact",
        "base-camp",
        "quick-start",
        "data-analyst",
        "deep-work",
        "summit",
        "century-mark",
        "speedrunner",
      ]),
    )
  })

  it("dates each unlock by the task that earned it, else now", () => {
    const at = (id: string) => find(existing, id)?.unlockedAt
    expect(at("first-contact")).toBe("2026-09-05T20:10:00+05:30")
    expect(at("base-camp")).toBe("2026-09-05T08:00:00+05:30")
    expect(at("deep-work")).toBe("2026-09-05T20:14:00+05:30")
    // Roadmap r1 finished at its last completion.
    expect(at("summit")).toBe("2026-09-05T20:18:00+05:30")
    // Only 9 tasks carry a completion time, so the 10th is unknown.
    expect(at("quick-start")).toBe(NOW.toISOString())
    expect(at("data-analyst")).toBe(NOW.toISOString())
  })

  it("is safe to run twice", () => {
    expect(ids(existing, ids(existing))).toEqual([])
  })
})
