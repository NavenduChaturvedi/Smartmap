import type { AppState, Roadmap, Task } from "./store"

// Key the old vanilla-JS app (index/dashboard/roadmap.html etc, js/app.js)
// wrote to localStorage. Only readable once react-app shares an origin with
// those pages (i.e. after the Phase 7 cutover) - written now so it's ready.
const LEGACY_STORAGE_KEY = "aegis_state_v1"

interface LegacyTask {
  id: string
  title?: string | null
  tag?: string | null
  xp?: number | null
  done?: boolean | null
  roadmap_id?: string | null
  parent_task_id?: string | null
  created_at?: string | null
  completed_at?: string | null
}

interface LegacyRoadmap {
  id: string
  name: string
  description?: string | null
  created_at?: string | null
}

interface LegacyState {
  roadmaps?: LegacyRoadmap[]
  tasks?: LegacyTask[]
  streak?: number
  commanderName?: string
  profile?: { displayName?: string; email?: string }
  settings?: { fontScale?: number; soundEffects?: boolean; lastActiveDate?: string | null }
}

// The legacy tag scheme addressed roadmaps/subtasks by string instead of a
// foreign key: "RM: <roadmap name>" for a root task, and
// "RM: <roadmap name> | PARENT: <parent task id>" for a subtask.
function parseLegacyTag(tag: string | null | undefined): { roadmapName: string; parentId: string | null } | null {
  if (!tag) return null
  const match = tag.match(/^RM:\s*([^|]+?)(?:\s*\|\s*PARENT:\s*(.+))?$/)
  if (!match) return null
  return { roadmapName: match[1].trim(), parentId: match[2]?.trim() || null }
}

function readLegacyState(): LegacyState | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LegacyState
  } catch {
    return null
  }
}

function hasImportableData(legacy: LegacyState): boolean {
  return (legacy.roadmaps?.length ?? 0) > 0 || (legacy.tasks?.length ?? 0) > 0
}

function migratedFlagKey(userId: string) {
  return `aegis_legacy_migrated_${userId}`
}

function isLegacyMigrated(userId: string): boolean {
  try {
    return localStorage.getItem(migratedFlagKey(userId)) === "1"
  } catch {
    // If storage is unreadable, don't keep re-prompting on every load.
    return true
  }
}

function markLegacyMigrated(userId: string) {
  try {
    localStorage.setItem(migratedFlagKey(userId), "1")
  } catch {
    // ignore
  }
}

// Converts the vanilla app's local state (either addressing scheme) into
// this app's AppState shape. Caller feeds the result to importState(),
// which handles id remapping and safe (roots-before-children) inserts.
function normalizeLegacyState(legacy: LegacyState): AppState {
  const roadmapById = new Map<string, Roadmap>()
  for (const r of legacy.roadmaps ?? []) {
    roadmapById.set(r.id, {
      id: r.id,
      name: r.name,
      description: r.description ?? "",
      createdAt: r.created_at ?? new Date().toISOString(),
    })
  }

  const roadmapByTagName = new Map<string, Roadmap>()
  const ensureTagRoadmap = (name: string): Roadmap => {
    const existing = roadmapByTagName.get(name)
    if (existing) return existing
    const roadmap: Roadmap = {
      id: `legacy-rm-${roadmapByTagName.size}-${name.slice(0, 20)}`,
      name,
      description: "",
      createdAt: new Date().toISOString(),
    }
    roadmapByTagName.set(name, roadmap)
    return roadmap
  }

  const tasks: Task[] = []
  for (const t of legacy.tasks ?? []) {
    let roadmapId = t.roadmap_id ?? null
    let parentTaskId = t.parent_task_id ?? null

    if (!roadmapId) {
      const parsed = parseLegacyTag(t.tag)
      if (parsed) {
        roadmapId = ensureTagRoadmap(parsed.roadmapName).id
        parentTaskId = parsed.parentId
      }
    }

    // Can't place a task with no roadmap and no recognizable tag anywhere.
    if (!roadmapId) continue

    tasks.push({
      id: t.id,
      title: t.title ?? "",
      xp: t.xp ?? 0,
      done: t.done ?? false,
      roadmapId,
      parentTaskId,
      createdAt: t.created_at ?? new Date().toISOString(),
      completedAt: t.completed_at ?? null,
    })
  }

  return {
    roadmaps: [...roadmapById.values(), ...roadmapByTagName.values()],
    tasks,
    streak: legacy.streak ?? 0,
    lastActiveDate: legacy.settings?.lastActiveDate ?? null,
    profile: {
      displayName: legacy.profile?.displayName || legacy.commanderName || "",
      email: legacy.profile?.email || "",
    },
    settings: {
      fontScale: legacy.settings?.fontScale ?? 100,
      soundEffects: legacy.settings?.soundEffects ?? true,
      reducedMotion: false,
      compactDensity: false,
    },
  }
}

export {
  readLegacyState,
  hasImportableData,
  isLegacyMigrated,
  markLegacyMigrated,
  normalizeLegacyState,
}
export type { LegacyState }
