import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { useAuth } from "./auth-context"
import {
  hasImportableData,
  isLegacyMigrated,
  markLegacyMigrated,
  normalizeLegacyState,
  readLegacyState,
} from "./legacy-migration"
import { supabase } from "./supabase"
import type { Tables } from "./database.types"

interface Task {
  id: string
  title: string
  xp: number
  done: boolean
  roadmapId: string
  parentTaskId: string | null
  createdAt: string
  completedAt: string | null
}

interface Roadmap {
  id: string
  name: string
  description: string
  createdAt: string
}

interface Settings {
  fontScale: number
  soundEffects: boolean
  reducedMotion: boolean
  compactDensity: boolean
}

interface Profile {
  displayName: string
  email: string
}

interface Achievement {
  id: string
  title: string
  description: string
  rarity: "common" | "rare" | "locked"
  xp: number
  unlocked: boolean
}

interface AppState {
  roadmaps: Roadmap[]
  tasks: Task[]
  streak: number
  lastActiveDate: string | null
  profile: Profile
  settings: Settings
}

const EMPTY_STATE: AppState = {
  roadmaps: [],
  tasks: [],
  streak: 0,
  lastActiveDate: null,
  profile: { displayName: "", email: "" },
  settings: { fontScale: 100, soundEffects: true, reducedMotion: false, compactDensity: false },
}

type TaskRow = Tables<"tasks">
type RoadmapRow = Tables<"roadmaps">
type ProfileRow = Tables<"profiles">
type SettingsRow = Tables<"settings">

function taskFromRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title ?? "",
    xp: row.xp ?? 0,
    done: row.done ?? false,
    roadmapId: row.roadmap_id ?? "",
    parentTaskId: row.parent_task_id,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }
}

function roadmapFromRow(row: RoadmapRow): Roadmap {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    createdAt: row.created_at ?? new Date().toISOString(),
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

interface StoreApi {
  state: AppState
  loading: boolean
  totalXp: number
  achievements: Achievement[]
  rootTasks: (roadmapId: string) => Task[]
  subtasks: (parentId: string) => Task[]
  roadmapProgress: (roadmapId: string) => { completed: number; total: number }
  refresh: () => Promise<void>
  toggleTask: (taskId: string) => Promise<void>
  addRoadmap: (name: string, description: string) => Promise<Roadmap>
  updateRoadmap: (id: string, name: string, description: string) => Promise<void>
  deleteRoadmap: (id: string) => Promise<void>
  addTask: (
    roadmapId: string,
    title: string,
    xp: number,
    parentTaskId?: string | null,
  ) => Promise<void>
  addTasksBulk: (
    roadmapId: string,
    items: { title: string; xp: number; subtasks?: { title: string; xp: number }[] }[],
  ) => Promise<void>
  updateProfile: (profile: Profile) => Promise<void>
  updateSettings: (settings: Partial<Settings>) => Promise<void>
  resetProgress: () => Promise<void>
  importState: (data: AppState) => Promise<void>
  pendingImport: { roadmapCount: number; taskCount: number } | null
  confirmLegacyImport: () => Promise<void>
  dismissLegacyImport: () => void
}

const StoreContext = createContext<StoreApi | null>(null)

function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<AppState>(EMPTY_STATE)
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async (userId: string) => {
    setLoading(true)
    const [profileRes, settingsRes, roadmapsRes, tasksRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("roadmaps").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("tasks").select("*").eq("user_id", userId).order("created_at"),
    ])

    const profileRow = profileRes.data as ProfileRow | null
    const settingsRow = settingsRes.data as SettingsRow | null
    const preferences = (settingsRow?.preferences ?? {}) as {
      reducedMotion?: boolean
      compactDensity?: boolean
    }

    setState({
      roadmaps: (roadmapsRes.data ?? []).map(roadmapFromRow),
      tasks: (tasksRes.data ?? []).map(taskFromRow),
      streak: settingsRow?.streak ?? 0,
      lastActiveDate: settingsRow?.last_active_date ?? null,
      profile: {
        displayName: profileRow?.display_name ?? "",
        email: profileRow?.email ?? "",
      },
      settings: {
        fontScale: settingsRow?.font_scale ?? 100,
        soundEffects: settingsRow?.sound_effects ?? true,
        reducedMotion: preferences.reducedMotion ?? false,
        compactDensity: preferences.compactDensity ?? false,
      },
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user?.id) {
      void loadAll(user.id)
    } else {
      setState(EMPTY_STATE)
      setLoading(false)
    }
  }, [user?.id, loadAll])

  // One-time offer to import data left in this browser's localStorage by the
  // vanilla-JS app (same origin only, i.e. after the Phase 7 cutover). Only
  // offered when this account has no roadmaps yet in Supabase, so a user who
  // already synced for real is never at risk of getting duplicates.
  const [pendingImport, setPendingImport] = useState<{
    roadmapCount: number
    taskCount: number
  } | null>(null)
  const legacyNormalizedRef = useRef<AppState | null>(null)

  useEffect(() => {
    if (loading || !user?.id) return

    if (state.roadmaps.length > 0) {
      // Real data now exists - e.g. the user created a roadmap manually
      // instead of acting on the banner. Withdraw any pending offer rather
      // than leave it showing (confirmLegacyImport also re-checks this at
      // click time as a second line of defense).
      if (legacyNormalizedRef.current) {
        legacyNormalizedRef.current = null
        setPendingImport(null)
      }
      return
    }

    if (isLegacyMigrated(user.id)) return
    const legacy = readLegacyState()
    if (!legacy || !hasImportableData(legacy)) return
    const normalized = normalizeLegacyState(legacy)
    if (normalized.roadmaps.length === 0 && normalized.tasks.length === 0) return
    legacyNormalizedRef.current = normalized
    setPendingImport({
      roadmapCount: normalized.roadmaps.length,
      taskCount: normalized.tasks.length,
    })
  }, [loading, user?.id, state.roadmaps.length])

  const refresh = useCallback(async () => {
    if (user?.id) await loadAll(user.id)
  }, [user?.id, loadAll])

  const totalXp = useMemo(
    () => state.tasks.filter((t) => t.done).reduce((sum, t) => sum + t.xp, 0),
    [state.tasks],
  )

  const rootTasks = useCallback(
    (roadmapId: string) =>
      state.tasks.filter((t) => t.roadmapId === roadmapId && !t.parentTaskId),
    [state.tasks],
  )

  const subtasks = useCallback(
    (parentId: string) => state.tasks.filter((t) => t.parentTaskId === parentId),
    [state.tasks],
  )

  const roadmapProgress = useCallback(
    (roadmapId: string) => {
      const all = state.tasks.filter((t) => t.roadmapId === roadmapId)
      return { completed: all.filter((t) => t.done).length, total: all.length }
    },
    [state.tasks],
  )

  const achievements = useMemo<Achievement[]>(() => {
    const completedCount = state.tasks.filter((t) => t.done).length
    const xpByRoadmap = new Map<string, number>()
    for (const t of state.tasks) {
      if (!t.done) continue
      xpByRoadmap.set(t.roadmapId, (xpByRoadmap.get(t.roadmapId) ?? 0) + t.xp)
    }
    const maxRoadmapXp = Math.max(0, ...xpByRoadmap.values())
    const hasPerfectRoadmap = state.roadmaps.some((r) => {
      const p = roadmapProgress(r.id)
      return p.total > 0 && p.completed === p.total
    })

    return [
      {
        id: "first-contact",
        title: "First Contact",
        description: "Complete your first task.",
        rarity: "common",
        xp: 20,
        unlocked: completedCount >= 1,
      },
      {
        id: "base-camp",
        title: "Base Camp",
        description: "Create your first roadmap.",
        rarity: "common",
        xp: 10,
        unlocked: state.roadmaps.length >= 1,
      },
      {
        id: "quick-start",
        title: "Quick Start",
        description: "Complete 10 tasks total.",
        rarity: "common",
        xp: 50,
        unlocked: completedCount >= 10,
      },
      {
        id: "cartographer",
        title: "Cartographer",
        description: "Create 5 different roadmaps.",
        rarity: "common",
        xp: 40,
        unlocked: state.roadmaps.length >= 5,
      },
      {
        id: "data-analyst",
        title: "Data Analyst",
        description: "View the analytics page.",
        rarity: "common",
        xp: 60,
        unlocked: false,
      },
      {
        id: "night-watch",
        title: "Night Watch",
        description: "Complete a task after midnight.",
        rarity: "common",
        xp: 80,
        unlocked: state.tasks.some((t) => t.completedAt && new Date(t.completedAt).getHours() === 0),
      },
      {
        id: "century-mark",
        title: "Century Mark",
        description: "Earn 200 XP in a single roadmap.",
        rarity: "rare",
        xp: 200,
        unlocked: maxRoadmapXp >= 200,
      },
      {
        id: "perfectionist",
        title: "Perfectionist",
        description: "Finish a roadmap with zero pending tasks.",
        rarity: "rare",
        xp: 150,
        unlocked: hasPerfectRoadmap,
      },
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `locked-${i}`,
        title: "Locked Achievement",
        description: "Keep progressing to unlock this achievement.",
        rarity: "locked" as const,
        xp: 0,
        unlocked: false,
      })),
    ]
  }, [state.tasks, state.roadmaps, roadmapProgress])

  const toggleTask = useCallback(
    async (taskId: string) => {
      if (!user) return
      const target = state.tasks.find((t) => t.id === taskId)
      if (!target) return

      const nowDone = !target.done
      const completedAt = nowDone ? new Date().toISOString() : null

      const { error } = await supabase
        .from("tasks")
        .update({ done: nowDone, completed_at: completedAt })
        .eq("id", taskId)
      if (error) {
        console.error("Failed to update task", error)
        return
      }

      let parentUpdate: { id: string; done: boolean; completedAt: string | null } | null = null
      if (target.parentTaskId) {
        const parent = state.tasks.find((t) => t.id === target.parentTaskId)
        const siblings = state.tasks
          .filter((t) => t.parentTaskId === target.parentTaskId)
          .map((t) => (t.id === taskId ? { ...t, done: nowDone } : t))
        if (parent) {
          const allDone = siblings.every((t) => t.done)
          if (allDone !== parent.done) {
            const parentCompletedAt = allDone ? new Date().toISOString() : null
            const { error: parentError } = await supabase
              .from("tasks")
              .update({ done: allDone, completed_at: parentCompletedAt })
              .eq("id", parent.id)
            if (!parentError) {
              parentUpdate = { id: parent.id, done: allDone, completedAt: parentCompletedAt }
            }
          }
        }
      }

      const today = todayIso()
      let nextStreak = state.streak
      let nextLastActive = state.lastActiveDate
      if (nowDone && state.lastActiveDate !== today) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const wasYesterday = state.lastActiveDate === yesterday.toISOString().slice(0, 10)
        nextStreak = wasYesterday ? state.streak + 1 : 1
        nextLastActive = today
        await supabase
          .from("settings")
          .update({ streak: nextStreak, last_active_date: nextLastActive })
          .eq("user_id", user.id)
      }

      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id === taskId) return { ...t, done: nowDone, completedAt }
          if (parentUpdate && t.id === parentUpdate.id) {
            return { ...t, done: parentUpdate.done, completedAt: parentUpdate.completedAt }
          }
          return t
        }),
        streak: nextStreak,
        lastActiveDate: nextLastActive,
      }))
    },
    [state.tasks, state.streak, state.lastActiveDate, user],
  )

  const addRoadmap = useCallback(
    async (name: string, description: string) => {
      if (!user) throw new Error("Not authenticated")
      const { data, error } = await supabase
        .from("roadmaps")
        .insert({ user_id: user.id, name, description })
        .select()
        .single()
      if (error || !data) throw error ?? new Error("Failed to create roadmap")
      const roadmap = roadmapFromRow(data)
      setState((prev) => ({ ...prev, roadmaps: [...prev.roadmaps, roadmap] }))
      return roadmap
    },
    [user],
  )

  const updateRoadmap = useCallback(async (id: string, name: string, description: string) => {
    const { error } = await supabase.from("roadmaps").update({ name, description }).eq("id", id)
    if (error) throw error
    setState((prev) => ({
      ...prev,
      roadmaps: prev.roadmaps.map((r) => (r.id === id ? { ...r, name, description } : r)),
    }))
  }, [])

  const deleteRoadmap = useCallback(async (id: string) => {
    const { error: taskError } = await supabase.from("tasks").delete().eq("roadmap_id", id)
    if (taskError) throw taskError
    const { error } = await supabase.from("roadmaps").delete().eq("id", id)
    if (error) throw error
    setState((prev) => ({
      ...prev,
      roadmaps: prev.roadmaps.filter((r) => r.id !== id),
      tasks: prev.tasks.filter((t) => t.roadmapId !== id),
    }))
  }, [])

  const addTask = useCallback(
    async (roadmapId: string, title: string, xp: number, parentTaskId: string | null = null) => {
      if (!user) throw new Error("Not authenticated")
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          roadmap_id: roadmapId,
          parent_task_id: parentTaskId,
          title,
          xp,
          done: false,
        })
        .select()
        .single()
      if (error || !data) throw error ?? new Error("Failed to create task")
      const task = taskFromRow(data)
      setState((prev) => ({ ...prev, tasks: [...prev.tasks, task] }))
    },
    [user],
  )

  const addTasksBulk = useCallback(
    async (
      roadmapId: string,
      items: { title: string; xp: number; subtasks?: { title: string; xp: number }[] }[],
    ) => {
      if (!user) throw new Error("Not authenticated")

      // Client-generated ids so subtasks can reference their parent without
      // depending on Postgres returning rows in insert order (unguaranteed).
      // created_at is also set explicitly and staggered by 1ms per row: a
      // multi-row INSERT evaluates now() once for the whole statement, so
      // every row in a batch would otherwise get the identical timestamp -
      // fine for most things, but it makes `.order("created_at")` ambiguous
      // for exactly the ordered "Stage 1/2/3/4" content this function is
      // used for (AI-generated roadmaps, the manual phase builder).
      const baseTime = Date.now()
      const rootIds = items.map(() => crypto.randomUUID())
      const rootRows = items.map((item, i) => ({
        id: rootIds[i],
        user_id: user.id,
        roadmap_id: roadmapId,
        parent_task_id: null,
        title: item.title,
        xp: item.xp,
        done: false,
        created_at: new Date(baseTime + i).toISOString(),
      }))
      const { error: rootError } = await supabase.from("tasks").insert(rootRows)
      if (rootError) throw rootError

      let subtaskOffset = 0
      const subtaskRows = items.flatMap((item, i) =>
        (item.subtasks ?? []).map((sub) => {
          const row = {
            id: crypto.randomUUID(),
            user_id: user.id,
            roadmap_id: roadmapId,
            parent_task_id: rootIds[i],
            title: sub.title,
            xp: sub.xp,
            done: false,
            created_at: new Date(baseTime + rootRows.length + subtaskOffset).toISOString(),
          }
          subtaskOffset += 1
          return row
        }),
      )
      if (subtaskRows.length > 0) {
        const { error: subError } = await supabase.from("tasks").insert(subtaskRows)
        if (subError) throw subError
      }

      const newTasks: Task[] = [...rootRows, ...subtaskRows].map((r) => ({
        id: r.id,
        title: r.title,
        xp: r.xp,
        done: false,
        roadmapId: r.roadmap_id,
        parentTaskId: r.parent_task_id,
        createdAt: r.created_at,
        completedAt: null,
      }))
      setState((prev) => ({ ...prev, tasks: [...prev.tasks, ...newTasks] }))
    },
    [user],
  )

  const updateProfile = useCallback(
    async (profile: Profile) => {
      if (!user) throw new Error("Not authenticated")
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, display_name: profile.displayName, email: profile.email })
      if (error) throw error
      setState((prev) => ({ ...prev, profile }))
    },
    [user],
  )

  const updateSettings = useCallback(
    async (settings: Partial<Settings>) => {
      if (!user) throw new Error("Not authenticated")
      const next = { ...state.settings, ...settings }
      const { error } = await supabase.from("settings").upsert({
        user_id: user.id,
        font_scale: next.fontScale,
        sound_effects: next.soundEffects,
        preferences: { reducedMotion: next.reducedMotion, compactDensity: next.compactDensity },
      })
      if (error) throw error
      setState((prev) => ({ ...prev, settings: next }))
    },
    [user, state.settings],
  )

  const resetProgress = useCallback(async () => {
    if (!user) return
    await supabase.from("tasks").delete().eq("user_id", user.id)
    await supabase.from("roadmaps").delete().eq("user_id", user.id)
    await supabase.from("settings").update({ streak: 0, last_active_date: null }).eq("user_id", user.id)
    setState((prev) => ({ ...prev, roadmaps: [], tasks: [], streak: 0, lastActiveDate: null }))
  }, [user])

  const importState = useCallback(
    async (data: AppState) => {
      if (!user) return

      await supabase.from("tasks").delete().eq("user_id", user.id)
      await supabase.from("roadmaps").delete().eq("user_id", user.id)

      const roadmapIdMap = new Map<string, string>()
      for (const r of data.roadmaps) roadmapIdMap.set(r.id, crypto.randomUUID())

      const roadmapRows = data.roadmaps.map((r) => ({
        id: roadmapIdMap.get(r.id)!,
        user_id: user.id,
        name: r.name,
        description: r.description,
      }))
      if (roadmapRows.length > 0) {
        const { error } = await supabase.from("roadmaps").insert(roadmapRows)
        if (error) throw error
      }

      const taskIdMap = new Map<string, string>()
      for (const t of data.tasks) taskIdMap.set(t.id, crypto.randomUUID())

      const rootTaskRows = data.tasks
        .filter((t) => !t.parentTaskId)
        .map((t) => ({
          id: taskIdMap.get(t.id)!,
          user_id: user.id,
          roadmap_id: roadmapIdMap.get(t.roadmapId) ?? null,
          parent_task_id: null,
          title: t.title,
          xp: t.xp,
          done: t.done,
          completed_at: t.completedAt,
        }))
      const childTaskRows = data.tasks
        .filter((t) => t.parentTaskId)
        .map((t) => ({
          id: taskIdMap.get(t.id)!,
          user_id: user.id,
          roadmap_id: roadmapIdMap.get(t.roadmapId) ?? null,
          parent_task_id: taskIdMap.get(t.parentTaskId!) ?? null,
          title: t.title,
          xp: t.xp,
          done: t.done,
          completed_at: t.completedAt,
        }))

      // Roots must exist before children so the parent_task_id FK resolves.
      if (rootTaskRows.length > 0) {
        const { error } = await supabase.from("tasks").insert(rootTaskRows)
        if (error) throw error
      }
      if (childTaskRows.length > 0) {
        const { error } = await supabase.from("tasks").insert(childTaskRows)
        if (error) throw error
      }

      await supabase.from("settings").upsert({
        user_id: user.id,
        font_scale: data.settings.fontScale,
        sound_effects: data.settings.soundEffects,
        preferences: {
          reducedMotion: data.settings.reducedMotion,
          compactDensity: data.settings.compactDensity,
        },
        streak: data.streak,
        last_active_date: data.lastActiveDate,
      })
      await supabase
        .from("profiles")
        .upsert({ id: user.id, display_name: data.profile.displayName, email: data.profile.email })

      await loadAll(user.id)
    },
    [user, loadAll],
  )

  const confirmLegacyImport = useCallback(async () => {
    if (!user || !legacyNormalizedRef.current) return
    // Re-check at click time, not just when the offer first appeared: if the
    // user created a roadmap manually while the banner was still up (instead
    // of dismissing it), importState's restore-semantics delete-then-insert
    // would wipe that real data out. Refuse rather than risk it.
    if (state.roadmaps.length > 0) {
      legacyNormalizedRef.current = null
      setPendingImport(null)
      return
    }
    await importState(legacyNormalizedRef.current)
    markLegacyMigrated(user.id)
    legacyNormalizedRef.current = null
    setPendingImport(null)
  }, [user, importState, state.roadmaps.length])

  const dismissLegacyImport = useCallback(() => {
    if (user) markLegacyMigrated(user.id)
    legacyNormalizedRef.current = null
    setPendingImport(null)
  }, [user])

  const value: StoreApi = {
    state,
    loading,
    totalXp,
    achievements,
    rootTasks,
    subtasks,
    roadmapProgress,
    refresh,
    toggleTask,
    addRoadmap,
    updateRoadmap,
    deleteRoadmap,
    addTask,
    addTasksBulk,
    updateProfile,
    updateSettings,
    resetProgress,
    importState,
    pendingImport,
    confirmLegacyImport,
    dismissLegacyImport,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}

export { StoreProvider, useStore }
export type { Task, Roadmap, Settings, Profile, Achievement, AppState }
