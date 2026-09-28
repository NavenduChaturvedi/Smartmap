// Parses and validates a Settings > Export file before anything is replaced.
// Import is destructive, so a file that isn't a real Smartmap export must be
// rejected up front, not halfway through.

import { DEFAULT_SETTINGS } from "./app-defaults"
import type { AppState, Roadmap, Task } from "./store"

class BackupError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback)

function parseBackup(text: string): AppState {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError("That file isn't valid JSON.")
  }
  if (!isObject(raw) || !Array.isArray(raw.roadmaps) || !Array.isArray(raw.tasks)) {
    throw new BackupError("That file isn't a Smartmap export (no roadmaps or tasks).")
  }

  const now = new Date().toISOString()
  const roadmaps: Roadmap[] = raw.roadmaps.map((r, i) => {
    if (!isObject(r) || typeof r.id !== "string" || typeof r.name !== "string" || !r.name.trim()) {
      throw new BackupError(`Roadmap #${i + 1} in the file is missing its id or name.`)
    }
    return { id: r.id, name: r.name, description: str(r.description), createdAt: str(r.createdAt, now) }
  })
  const roadmapIds = new Set(roadmaps.map((r) => r.id))

  const tasks: Task[] = raw.tasks.map((t, i) => {
    if (!isObject(t) || typeof t.id !== "string" || typeof t.roadmapId !== "string") {
      throw new BackupError(`Task #${i + 1} in the file is missing its id or roadmap.`)
    }
    if (!roadmapIds.has(t.roadmapId)) {
      throw new BackupError(`Task "${str(t.title, `#${i + 1}`)}" belongs to a roadmap that isn't in the file.`)
    }
    const done = t.done === true
    const xp = typeof t.xp === "number" && Number.isFinite(t.xp) ? Math.max(0, Math.round(t.xp)) : 0
    return {
      id: t.id,
      title: str(t.title),
      xp,
      done,
      roadmapId: t.roadmapId,
      parentTaskId: typeof t.parentTaskId === "string" ? t.parentTaskId : null,
      createdAt: str(t.createdAt, now),
      completedAt: done && typeof t.completedAt === "string" ? t.completedAt : null,
      dueDate: typeof t.dueDate === "string" ? t.dueDate : null,
    }
  })
  const taskIds = new Set(tasks.map((t) => t.id))
  for (const t of tasks) {
    if (t.parentTaskId && !taskIds.has(t.parentTaskId)) {
      throw new BackupError(`Subtask "${t.title}" belongs to a task that isn't in the file.`)
    }
  }

  const settings = isObject(raw.settings) ? raw.settings : {}
  const profile = isObject(raw.profile) ? raw.profile : {}
  return {
    roadmaps,
    tasks,
    profile: { displayName: str(profile.displayName), email: str(profile.email) },
    settings: {
      fontScale: typeof settings.fontScale === "number" ? settings.fontScale : DEFAULT_SETTINGS.fontScale,
      soundEffects: typeof settings.soundEffects === "boolean" ? settings.soundEffects : DEFAULT_SETTINGS.soundEffects,
      reducedMotion: typeof settings.reducedMotion === "boolean" ? settings.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
      compactDensity:
        typeof settings.compactDensity === "boolean" ? settings.compactDensity : DEFAULT_SETTINGS.compactDensity,
      achievementAlerts:
        typeof settings.achievementAlerts === "boolean"
          ? settings.achievementAlerts
          : DEFAULT_SETTINGS.achievementAlerts,
    },
    // Achievements and milestones are earned, never restored from a file.
    flags: { viewedAnalytics: false, aiRoadmapsCreated: 0, longestStreak: 0 },
    unlocks: {},
  }
}

export { BackupError, parseBackup }
