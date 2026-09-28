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
  clearGuestState,
  hasGuestContent,
  loadGuestState,
  readGuestState,
  saveGuestState,
} from "./guest-storage"
import {
  hasImportableData,
  isLegacyMigrated,
  markLegacyMigrated,
  normalizeLegacyState,
  readLegacyState,
} from "./legacy-migration"
import { resolveDisplayName } from "./profile"
import { computeStreak } from "./streak"
import { supabase } from "./supabase"
import { assignDueDates } from "./task-scheduling"
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
  // Top-level tasks only (v1 scope) - null means "unscheduled", not "today".
  dueDate: string | null
}

interface Roadmap {
  id: string
  name: string
  description: string
  createdAt: string
}

// A roadmap is "completed" when it has tasks and every task and subtask is
// done. It's derived, not stored, so adding a task to a completed roadmap
// moves it back to active on its own.
interface CompletedRoadmap extends Roadmap {
  completedAt: string
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
  profile: Profile
  settings: Settings
  // One-off milestones that can't be derived from tasks/roadmaps (e.g. the
  // "Data Analyst" achievement). Persisted in settings.preferences.
  viewedAnalytics: boolean
}

const EMPTY_STATE: AppState = {
  roadmaps: [],
  tasks: [],
  profile: { displayName: "", email: "" },
  settings: { fontScale: 100, soundEffects: true, reducedMotion: false, compactDensity: false },
  viewedAnalytics: false,
}

// A type alias, not an interface, so it's assignable to the Json column type.
type Preferences = {
  reducedMotion?: boolean
  compactDensity?: boolean
  viewedAnalytics?: boolean
}

function preferencesPayload(settings: Settings, viewedAnalytics: boolean): Preferences {
  return {
    reducedMotion: settings.reducedMotion,
    compactDensity: settings.compactDensity,
    viewedAnalytics,
  }
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
    dueDate: row.due_date,
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

// Moves a guest's browser data into their account. Rows keep the ids they
// were created with (crypto.randomUUID, so they can't collide) and are
// upserted, which makes this safe to retry after a partial failure or to run
// twice from two tabs: the second run rewrites the same rows instead of
// duplicating them. Existing account data is never touched.
async function syncGuestToAccount(userId: string, guest: AppState) {
  if (guest.roadmaps.length > 0) {
    const { error } = await supabase.from("roadmaps").upsert(
      guest.roadmaps.map((r) => ({
        id: r.id,
        user_id: userId,
        name: r.name,
        description: r.description,
        created_at: r.createdAt,
      })),
    )
    if (error) throw error
  }

  // A task whose roadmap is gone would fail the foreign key; drop it.
  const roadmapIds = new Set(guest.roadmaps.map((r) => r.id))
  const tasks = guest.tasks.filter((t) => roadmapIds.has(t.roadmapId))
  const taskIds = new Set(tasks.map((t) => t.id))
  const toRow = (t: Task) => ({
    id: t.id,
    user_id: userId,
    roadmap_id: t.roadmapId,
    parent_task_id: t.parentTaskId && taskIds.has(t.parentTaskId) ? t.parentTaskId : null,
    title: t.title,
    xp: t.xp,
    done: t.done,
    created_at: t.createdAt,
    completed_at: t.completedAt,
    due_date: t.dueDate,
  })
  const rows = tasks.map(toRow)
  // Parents before children so parent_task_id resolves.
  const roots = rows.filter((r) => !r.parent_task_id)
  const children = rows.filter((r) => r.parent_task_id)
  for (const batch of [roots, children]) {
    if (batch.length === 0) continue
    const { error } = await supabase.from("tasks").upsert(batch)
    if (error) throw error
  }

  if (guest.viewedAnalytics) {
    const { data } = await supabase
      .from("settings")
      .select("preferences")
      .eq("user_id", userId)
      .maybeSingle()
    const current = (data?.preferences ?? {}) as Preferences
    if (!current.viewedAnalytics) {
      const { error } = await supabase
        .from("settings")
        .upsert({ user_id: userId, preferences: { ...current, viewedAnalytics: true } })
      if (error) throw error
    }
  }
}

// Progress of moving guest data into an account, for the banner in AppShell.
interface GuestSync {
  status: "syncing" | "done" | "error"
  roadmapCount: number
  taskCount: number
}

const GUEST_OWNER = "guest"

interface StoreApi {
  state: AppState
  loading: boolean
  // No account: data lives in this browser only.
  isGuest: boolean
  guestSync: GuestSync | null
  retryGuestSync: () => Promise<void>
  dismissGuestSync: () => void
  totalXp: number
  streak: number
  // Every done task, newest first; tasks with no completion time (e.g. from
  // the legacy import) sort last. The single source for activity views and
  // completion counts, so every screen agrees.
  completedTasks: Task[]
  achievements: Achievement[]
  rootTasks: (roadmapId: string) => Task[]
  subtasks: (parentId: string) => Task[]
  roadmapProgress: (roadmapId: string) => { completed: number; total: number }
  activeRoadmaps: Roadmap[]
  completedRoadmaps: CompletedRoadmap[]
  isRoadmapComplete: (roadmapId: string) => boolean
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
  // v1 scope: top-level tasks only - not exposed in the UI for subtasks.
  updateTaskDueDate: (taskId: string, dueDate: string | null) => Promise<void>
  updateProfile: (profile: Profile) => Promise<void>
  updateSettings: (settings: Partial<Settings>) => Promise<void>
  resetProgress: () => Promise<void>
  markAnalyticsViewed: () => Promise<void>
  importState: (data: AppState) => Promise<void>
  pendingImport: { roadmapCount: number; taskCount: number } | null
  confirmLegacyImport: () => Promise<void>
  dismissLegacyImport: () => void
}

const StoreContext = createContext<StoreApi | null>(null)

function StoreProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [state, setState] = useState<AppState>(EMPTY_STATE)
  const [loading, setLoading] = useState(true)
  // Whose data `state` holds: GUEST_OWNER, a user id, or null mid-switch.
  // Set in the same batch as the state itself, so guest persistence can
  // never write an account's data into browser storage during sign-out.
  const [stateOwner, setStateOwner] = useState<string | null>(null)
  const [guestSync, setGuestSync] = useState<GuestSync | null>(null)
  const syncRef = useRef<{ userId: string; promise: Promise<void> } | null>(null)
  const isGuest = !user
  // The account whose data we should be showing right now. A fetch that
  // resolves after a sign-out or account switch is dropped, so an account's
  // data can never land in (and be persisted as) guest state.
  const currentUserIdRef = useRef<string | null>(null)

  // `silent` refreshes in place: the page keeps showing the current data
  // instead of dropping back to the full-page loading state.
  const loadAll = useCallback(async (userId: string, fallbackName: string, silent = false) => {
    if (!silent) setLoading(true)
    const [profileRes, settingsRes, roadmapsRes, tasksRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("roadmaps").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("tasks").select("*").eq("user_id", userId).order("created_at"),
    ])

    if (currentUserIdRef.current !== userId) return

    const profileRow = profileRes.data as ProfileRow | null
    const settingsRow = settingsRes.data as SettingsRow | null
    const preferences = (settingsRow?.preferences ?? {}) as Preferences
    const email = profileRow?.email ?? ""

    setState({
      roadmaps: (roadmapsRes.data ?? []).map(roadmapFromRow),
      tasks: (tasksRes.data ?? []).map(taskFromRow),
      profile: {
        displayName: resolveDisplayName(profileRow?.display_name ?? "", email, fallbackName),
        email,
      },
      settings: {
        fontScale: settingsRow?.font_scale ?? 100,
        soundEffects: settingsRow?.sound_effects ?? true,
        reducedMotion: preferences.reducedMotion ?? false,
        compactDensity: preferences.compactDensity ?? false,
      },
      viewedAnalytics: preferences.viewedAnalytics ?? false,
    })
    setLoading(false)
  }, [])

  // The name given at sign-up, used when the profile row only has an email.
  const metadataName = (user?.user_metadata?.full_name as string | undefined) ?? ""

  // Runs at most once per sign-in: StrictMode's double effect and a later
  // retry all share the same in-flight promise. Browser data is cleared only
  // after the upload succeeds; on failure it stays put for a retry.
  const runGuestSync = useCallback((userId: string) => {
    if (syncRef.current?.userId === userId) return syncRef.current.promise
    const promise = (async () => {
      const guest = readGuestState()
      if (!hasGuestContent(guest)) return
      const counts = { roadmapCount: guest.roadmaps.length, taskCount: guest.tasks.length }
      setGuestSync({ status: "syncing", ...counts })
      try {
        await syncGuestToAccount(userId, guest)
        clearGuestState()
        setGuestSync({ status: "done", ...counts })
      } catch (err) {
        console.error("Failed to move guest data into the account", err)
        setGuestSync({ status: "error", ...counts })
      }
    })()
    syncRef.current = { userId, promise }
    return promise
  }, [])

  useEffect(() => {
    if (authLoading) return
    currentUserIdRef.current = user?.id ?? null
    setStateOwner(null)

    if (!user?.id) {
      syncRef.current = null
      setGuestSync(null)
      setState(loadGuestState())
      setStateOwner(GUEST_OWNER)
      setLoading(false)
      return
    }

    const userId = user.id
    let cancelled = false
    setLoading(true)
    void (async () => {
      await runGuestSync(userId)
      if (cancelled) return
      await loadAll(userId, metadataName)
      if (!cancelled) setStateOwner(userId)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, loadAll, runGuestSync])

  useEffect(() => {
    if (stateOwner === GUEST_OWNER) saveGuestState(state)
  }, [state, stateOwner])

  const retryGuestSync = useCallback(async () => {
    if (!user) return
    syncRef.current = null
    await runGuestSync(user.id)
    await loadAll(user.id, metadataName, true)
  }, [user, runGuestSync, loadAll, metadataName])

  const dismissGuestSync = useCallback(() => setGuestSync(null), [])

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
    if (!user?.id) {
      // Signed out: an offer made to the previous account no longer applies.
      legacyNormalizedRef.current = null
      setPendingImport(null)
      return
    }
    if (loading) return

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
    if (user?.id) await loadAll(user.id, metadataName, true)
  }, [user?.id, metadataName, loadAll])

  const totalXp = useMemo(
    () => state.tasks.filter((t) => t.done).reduce((sum, t) => sum + t.xp, 0),
    [state.tasks],
  )

  const streak = useMemo(() => computeStreak(state.tasks), [state.tasks])

  const completedTasks = useMemo(
    () =>
      state.tasks
        .filter((t) => t.done)
        .sort((a, b) => {
          if (a.completedAt === b.completedAt) return 0
          if (!a.completedAt) return 1
          if (!b.completedAt) return -1
          return a.completedAt < b.completedAt ? 1 : -1
        }),
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

  const { activeRoadmaps, completedRoadmaps } = useMemo(() => {
    const active: Roadmap[] = []
    const completed: CompletedRoadmap[] = []
    for (const r of state.roadmaps) {
      const tasks = state.tasks.filter((t) => t.roadmapId === r.id)
      if (tasks.length > 0 && tasks.every((t) => t.done)) {
        const completedAt = tasks.reduce((max, t) => (t.completedAt && t.completedAt > max ? t.completedAt : max), "")
        completed.push({ ...r, completedAt: completedAt || r.createdAt })
      } else {
        active.push(r)
      }
    }
    completed.sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))
    return { activeRoadmaps: active, completedRoadmaps: completed }
  }, [state.roadmaps, state.tasks])

  const isRoadmapComplete = useCallback(
    (roadmapId: string) => completedRoadmaps.some((r) => r.id === roadmapId),
    [completedRoadmaps],
  )

  const achievements = useMemo<Achievement[]>(() => {
    const completedCount = state.tasks.filter((t) => t.done).length
    const xpByRoadmap = new Map<string, number>()
    for (const t of state.tasks) {
      if (!t.done) continue
      xpByRoadmap.set(t.roadmapId, (xpByRoadmap.get(t.roadmapId) ?? 0) + t.xp)
    }
    const maxRoadmapXp = Math.max(0, ...xpByRoadmap.values())
    const hasPerfectRoadmap = completedRoadmaps.length > 0

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
        unlocked: state.viewedAnalytics,
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
  }, [state.tasks, state.roadmaps, state.viewedAnalytics, completedRoadmaps])

  const toggleTask = useCallback(
    async (taskId: string) => {
      const target = state.tasks.find((t) => t.id === taskId)
      if (!target) return

      const nowDone = !target.done
      const completedAt = nowDone ? new Date().toISOString() : null

      if (user) {
        const { error } = await supabase
          .from("tasks")
          .update({ done: nowDone, completed_at: completedAt })
          .eq("id", taskId)
        if (error) {
          console.error("Failed to update task", error)
          return
        }
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
            const { error: parentError } = user
              ? await supabase
                  .from("tasks")
                  .update({ done: allDone, completed_at: parentCompletedAt })
                  .eq("id", parent.id)
              : { error: null }
            if (!parentError) {
              parentUpdate = { id: parent.id, done: allDone, completedAt: parentCompletedAt }
            }
          }
        }
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
      }))
    },
    [state.tasks, user],
  )

  const addRoadmap = useCallback(
    async (name: string, description: string) => {
      if (!user) {
        const roadmap: Roadmap = {
          id: crypto.randomUUID(),
          name,
          description,
          createdAt: new Date().toISOString(),
        }
        setState((prev) => ({ ...prev, roadmaps: [...prev.roadmaps, roadmap] }))
        return roadmap
      }
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

  const updateRoadmap = useCallback(
    async (id: string, name: string, description: string) => {
      if (user) {
        const { error } = await supabase.from("roadmaps").update({ name, description }).eq("id", id)
        if (error) throw error
      }
      setState((prev) => ({
        ...prev,
        roadmaps: prev.roadmaps.map((r) => (r.id === id ? { ...r, name, description } : r)),
      }))
    },
    [user],
  )

  const deleteRoadmap = useCallback(
    async (id: string) => {
      if (user) {
        const { error: taskError } = await supabase.from("tasks").delete().eq("roadmap_id", id)
        if (taskError) throw taskError
        const { error } = await supabase.from("roadmaps").delete().eq("id", id)
        if (error) throw error
      }
      setState((prev) => ({
        ...prev,
        roadmaps: prev.roadmaps.filter((r) => r.id !== id),
        tasks: prev.tasks.filter((t) => t.roadmapId !== id),
      }))
    },
    [user],
  )

  const addTask = useCallback(
    async (roadmapId: string, title: string, xp: number, parentTaskId: string | null = null) => {
      if (!user) {
        const task: Task = {
          id: crypto.randomUUID(),
          title,
          xp,
          done: false,
          roadmapId,
          parentTaskId,
          createdAt: new Date().toISOString(),
          completedAt: null,
          dueDate: null,
        }
        setState((prev) => ({ ...prev, tasks: [...prev.tasks, task] }))
        return
      }
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
      // Auto-schedule top-level tasks by detecting a "Day N" / "Week N"
      // pattern across every title (AI-generated plans and the manual
      // builder's phase labels both commonly have one) and spreading them
      // evenly across the implied duration, starting today. A roadmap with
      // no clear day/week structure gets null due dates across the board -
      // that's "unscheduled", not an error.
      const dueDates = assignDueDates(
        items.map((item) => item.title),
        new Date(),
      )
      const rootRows = items.map((item, i) => ({
        id: rootIds[i],
        user_id: user?.id ?? "",
        roadmap_id: roadmapId,
        parent_task_id: null,
        title: item.title,
        xp: item.xp,
        done: false,
        created_at: new Date(baseTime + i).toISOString(),
        due_date: dueDates[i],
      }))

      let subtaskOffset = 0
      const subtaskRows = items.flatMap((item, i) =>
        (item.subtasks ?? []).map((sub) => {
          const row = {
            id: crypto.randomUUID(),
            user_id: user?.id ?? "",
            roadmap_id: roadmapId,
            parent_task_id: rootIds[i],
            title: sub.title,
            xp: sub.xp,
            done: false,
            created_at: new Date(baseTime + rootRows.length + subtaskOffset).toISOString(),
            due_date: null as string | null,
          }
          subtaskOffset += 1
          return row
        }),
      )
      if (user) {
        const { error: rootError } = await supabase.from("tasks").insert(rootRows)
        if (rootError) throw rootError
        if (subtaskRows.length > 0) {
          const { error: subError } = await supabase.from("tasks").insert(subtaskRows)
          if (subError) throw subError
        }
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
        dueDate: r.due_date,
      }))
      setState((prev) => ({ ...prev, tasks: [...prev.tasks, ...newTasks] }))
    },
    [user],
  )

  const updateTaskDueDate = useCallback(
    async (taskId: string, dueDate: string | null) => {
      if (user) {
        const { error } = await supabase.from("tasks").update({ due_date: dueDate }).eq("id", taskId)
        if (error) throw error
      }
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, dueDate } : t)),
      }))
    },
    [user],
  )

  const updateProfile = useCallback(
    async (profile: Profile) => {
      if (user) {
        const { error } = await supabase
          .from("profiles")
          .upsert({ id: user.id, display_name: profile.displayName, email: profile.email })
        if (error) throw error
      }
      setState((prev) => ({ ...prev, profile }))
    },
    [user],
  )

  const updateSettings = useCallback(
    async (settings: Partial<Settings>) => {
      const next = { ...state.settings, ...settings }
      if (user) {
        const { error } = await supabase.from("settings").upsert({
          user_id: user.id,
          font_scale: next.fontScale,
          sound_effects: next.soundEffects,
          preferences: preferencesPayload(next, state.viewedAnalytics),
        })
        if (error) throw error
      }
      setState((prev) => ({ ...prev, settings: next }))
    },
    [user, state.settings, state.viewedAnalytics],
  )

  const markAnalyticsViewed = useCallback(async () => {
    if (state.viewedAnalytics) return
    // Optimistic: the achievement unlocks immediately; a failed write just
    // means it gets re-marked on the next visit.
    setState((prev) => ({ ...prev, viewedAnalytics: true }))
    if (!user) return
    const { error } = await supabase.from("settings").upsert({
      user_id: user.id,
      preferences: preferencesPayload(state.settings, true),
    })
    if (error) console.error("Failed to record analytics visit", error)
  }, [user, state.settings, state.viewedAnalytics])

  const resetProgress = useCallback(async () => {
    if (user) {
      await supabase.from("tasks").delete().eq("user_id", user.id)
      await supabase.from("roadmaps").delete().eq("user_id", user.id)
    }
    setState((prev) => ({ ...prev, roadmaps: [], tasks: [] }))
  }, [user])

  const importState = useCallback(
    async (data: AppState) => {
      if (!user) {
        // Same replace-everything semantics as for an account, with fresh
        // ids so a re-imported backup can't collide with synced rows later.
        const roadmapIds = new Map(data.roadmaps.map((r) => [r.id, crypto.randomUUID()]))
        const taskIds = new Map(data.tasks.map((t) => [t.id, crypto.randomUUID()]))
        setState((prev) => ({
          ...prev,
          roadmaps: data.roadmaps.map((r) => ({ ...r, id: roadmapIds.get(r.id)! })),
          tasks: data.tasks
            .filter((t) => roadmapIds.has(t.roadmapId))
            .map((t) => ({
              ...t,
              id: taskIds.get(t.id)!,
              roadmapId: roadmapIds.get(t.roadmapId)!,
              parentTaskId: t.parentTaskId ? (taskIds.get(t.parentTaskId) ?? null) : null,
            })),
          settings: { ...prev.settings, ...data.settings },
          profile: { ...prev.profile, displayName: data.profile?.displayName || prev.profile.displayName },
          viewedAnalytics: prev.viewedAnalytics || !!data.viewedAnalytics,
        }))
        return
      }

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
          due_date: t.dueDate,
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
          due_date: null as string | null, // v1 scope: subtasks never carry a due date
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
        preferences: preferencesPayload(
          data.settings,
          data.viewedAnalytics ?? state.viewedAnalytics,
        ),
      })
      await supabase
        .from("profiles")
        .upsert({ id: user.id, display_name: data.profile.displayName, email: data.profile.email })

      await loadAll(user.id, metadataName)
    },
    [user, metadataName, loadAll, state.viewedAnalytics],
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
    isGuest,
    guestSync,
    retryGuestSync,
    dismissGuestSync,
    totalXp,
    streak,
    completedTasks,
    achievements,
    rootTasks,
    subtasks,
    roadmapProgress,
    activeRoadmaps,
    completedRoadmaps,
    isRoadmapComplete,
    refresh,
    toggleTask,
    addRoadmap,
    updateRoadmap,
    deleteRoadmap,
    addTask,
    addTasksBulk,
    updateTaskDueDate,
    updateProfile,
    updateSettings,
    resetProgress,
    markAnalyticsViewed,
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
export type { Task, Roadmap, CompletedRoadmap, Settings, Profile, Achievement, AppState, GuestSync }
