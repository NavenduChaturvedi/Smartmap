import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

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
  achievements: Achievement[]
}

const STORAGE_KEY = "aegis_ui_state_v2"

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function buildSeedState(): AppState {
  const rmPython = uid("rm")
  const rmMma = uid("rm")
  const rmHacking = uid("rm")

  const tasks: Task[] = []

  const addRoot = (
    roadmapId: string,
    title: string,
    xp: number,
    done: boolean,
    daysAgo: number,
  ) => {
    const id = uid("t")
    tasks.push({
      id,
      title,
      xp,
      done,
      roadmapId,
      parentTaskId: null,
      createdAt: daysAgoIso(daysAgo + 3),
      completedAt: done ? daysAgoIso(daysAgo) : null,
    })
    return id
  }

  const addSub = (
    roadmapId: string,
    parentId: string,
    title: string,
    xp: number,
    done: boolean,
    daysAgo: number,
  ) => {
    tasks.push({
      id: uid("t"),
      title,
      xp,
      done,
      roadmapId,
      parentTaskId: parentId,
      createdAt: daysAgoIso(daysAgo + 2),
      completedAt: done ? daysAgoIso(daysAgo) : null,
    })
  }

  // Python roadmap
  const p1 = addRoot(rmPython, "API Data Ingestion Basics", 40, true, 6)
  addSub(rmPython, p1, "Set up virtual environment", 10, true, 6)
  addSub(rmPython, p1, "Write requests.get() wrapper", 15, true, 6)
  const p2 = addRoot(rmPython, "AI Categorization & Extraction", 60, true, 4)
  addSub(rmPython, p2, "Train classifier on sample set", 20, true, 4)
  addSub(rmPython, p2, "Evaluate precision/recall", 20, true, 4)
  const p3 = addRoot(rmPython, "Risk Analysis Threshold Logic", 50, false, 0)
  addSub(rmPython, p3, "Define threshold rules", 15, true, 2)
  addSub(rmPython, p3, "Route flagged records for review", 20, false, 0)
  addRoot(rmPython, "Automated Notification & DB Commit", 45, false, 0)

  // MMA roadmap
  const m1 = addRoot(rmMma, "Base Conditioning Block", 30, true, 8)
  addSub(rmMma, m1, "3x roadwork sessions", 15, true, 8)
  const m2 = addRoot(rmMma, "Striking Fundamentals", 40, true, 3)
  addRoot(rmMma, "Grappling Live Rounds", 55, false, 0)
  addRoot(rmMma, "Fight Camp Taper", 35, false, 0)
  void m2

  // Hacking roadmap
  const h1 = addRoot(rmHacking, "Recon & Enumeration", 35, true, 1)
  addSub(rmHacking, h1, "Nmap sweep of lab range", 15, true, 1)
  addSub(rmHacking, h1, "Service fingerprinting", 20, false, 0)
  addRoot(rmHacking, "Exploit Development Primer", 60, false, 0)
  addRoot(rmHacking, "Privilege Escalation Drills", 45, false, 0)

  return {
    roadmaps: [
      {
        id: rmPython,
        name: "API Data Pipeline (Python)",
        description:
          "Build an end-to-end ingestion, categorization and notification pipeline.",
        createdAt: daysAgoIso(14),
      },
      {
        id: rmMma,
        name: "MMA Fight Camp",
        description: "12-week conditioning, striking and grappling progression.",
        createdAt: daysAgoIso(20),
      },
      {
        id: rmHacking,
        name: "Ethical Hacking Fundamentals",
        description: "Lab-based offensive security skill tree.",
        createdAt: daysAgoIso(9),
      },
    ],
    tasks,
    streak: 6,
    lastActiveDate: new Date().toISOString().slice(0, 10),
    profile: {
      displayName: "Navendu",
      email: "navenduchaturvedi0718@gmail.com",
    },
    settings: {
      fontScale: 100,
      soundEffects: true,
      reducedMotion: false,
      compactDensity: false,
    },
    achievements: [
      { id: "a1", title: "First Contact", description: "Complete your first task.", rarity: "common", xp: 20, unlocked: true },
      { id: "a2", title: "Base Camp", description: "Complete every task in a roadmap's first stage.", rarity: "common", xp: 10, unlocked: true },
      { id: "a3", title: "Quick Start", description: "Complete 10 tasks total.", rarity: "common", xp: 50, unlocked: true },
      { id: "a4", title: "Cartographer", description: "Create 3 roadmaps.", rarity: "common", xp: 40, unlocked: true },
      { id: "a5", title: "Data Analyst", description: "View the analytics page 5 times.", rarity: "common", xp: 60, unlocked: false },
      { id: "a6", title: "Night Watch", description: "Complete a task after midnight.", rarity: "common", xp: 80, unlocked: false },
      { id: "a7", title: "Century Mark", description: "Earn 200 XP in a single roadmap.", rarity: "rare", xp: 200, unlocked: false },
      { id: "a8", title: "Perfectionist", description: "Finish a roadmap with zero pending tasks.", rarity: "rare", xp: 150, unlocked: false },
      { id: "a9", title: "Locked Achievement", description: "Keep progressing to unlock this achievement.", rarity: "locked", xp: 0, unlocked: false },
      { id: "a10", title: "Locked Achievement", description: "Keep progressing to unlock this achievement.", rarity: "locked", xp: 0, unlocked: false },
      { id: "a11", title: "Locked Achievement", description: "Keep progressing to unlock this achievement.", rarity: "locked", xp: 0, unlocked: false },
      { id: "a12", title: "Locked Achievement", description: "Keep progressing to unlock this achievement.", rarity: "locked", xp: 0, unlocked: false },
    ],
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AppState
  } catch {
    // fall through to seed
  }
  return buildSeedState()
}

interface StoreApi {
  state: AppState
  totalXp: number
  rootTasks: (roadmapId: string) => Task[]
  subtasks: (parentId: string) => Task[]
  roadmapProgress: (roadmapId: string) => { completed: number; total: number }
  toggleTask: (taskId: string) => void
  addRoadmap: (name: string, description: string) => Roadmap
  updateRoadmap: (id: string, name: string, description: string) => void
  deleteRoadmap: (id: string) => void
  addTask: (
    roadmapId: string,
    title: string,
    xp: number,
    parentTaskId?: string | null,
  ) => void
  addTasksBulk: (
    roadmapId: string,
    items: { title: string; xp: number; subtasks?: { title: string; xp: number }[] }[],
  ) => void
  updateProfile: (profile: Profile) => void
  updateSettings: (settings: Partial<Settings>) => void
  resetProgress: () => void
  importState: (data: AppState) => void
}

const StoreContext = createContext<StoreApi | null>(null)

function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore quota errors
    }
  }, [state])

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

  const toggleTask = useCallback((taskId: string) => {
    setState((prev) => {
      const tasks = [...prev.tasks]
      const idx = tasks.findIndex((t) => t.id === taskId)
      if (idx === -1) return prev
      const target = tasks[idx]
      const nowDone = !target.done
      tasks[idx] = {
        ...target,
        done: nowDone,
        completedAt: nowDone ? new Date().toISOString() : null,
      }

      // propagate up to parent: if all siblings done, auto-complete parent
      if (target.parentTaskId) {
        const siblings = tasks.filter((t) => t.parentTaskId === target.parentTaskId)
        const parentIdx = tasks.findIndex((t) => t.id === target.parentTaskId)
        if (parentIdx !== -1) {
          const allDone = siblings.every((t) => t.done)
          const parent = tasks[parentIdx]
          if (allDone && !parent.done) {
            tasks[parentIdx] = { ...parent, done: true, completedAt: new Date().toISOString() }
          } else if (!allDone && parent.done) {
            tasks[parentIdx] = { ...parent, done: false, completedAt: null }
          }
        }
      }

      const today = new Date().toISOString().slice(0, 10)
      let streak = prev.streak
      if (nowDone && prev.lastActiveDate !== today) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const wasYesterday = prev.lastActiveDate === yesterday.toISOString().slice(0, 10)
        streak = wasYesterday ? prev.streak + 1 : 1
      }

      return { ...prev, tasks, streak, lastActiveDate: nowDone ? today : prev.lastActiveDate }
    })
  }, [])

  const addRoadmap = useCallback((name: string, description: string) => {
    const roadmap: Roadmap = { id: uid("rm"), name, description, createdAt: new Date().toISOString() }
    setState((prev) => ({ ...prev, roadmaps: [...prev.roadmaps, roadmap] }))
    return roadmap
  }, [])

  const updateRoadmap = useCallback((id: string, name: string, description: string) => {
    setState((prev) => ({
      ...prev,
      roadmaps: prev.roadmaps.map((r) => (r.id === id ? { ...r, name, description } : r)),
    }))
  }, [])

  const deleteRoadmap = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      roadmaps: prev.roadmaps.filter((r) => r.id !== id),
      tasks: prev.tasks.filter((t) => t.roadmapId !== id),
    }))
  }, [])

  const addTask = useCallback(
    (roadmapId: string, title: string, xp: number, parentTaskId: string | null = null) => {
      setState((prev) => ({
        ...prev,
        tasks: [
          ...prev.tasks,
          {
            id: uid("t"),
            title,
            xp,
            done: false,
            roadmapId,
            parentTaskId,
            createdAt: new Date().toISOString(),
            completedAt: null,
          },
        ],
      }))
    },
    [],
  )

  const addTasksBulk = useCallback(
    (
      roadmapId: string,
      items: { title: string; xp: number; subtasks?: { title: string; xp: number }[] }[],
    ) => {
      setState((prev) => {
        const newTasks: Task[] = []
        for (const item of items) {
          const rootId = uid("t")
          newTasks.push({
            id: rootId,
            title: item.title,
            xp: item.xp,
            done: false,
            roadmapId,
            parentTaskId: null,
            createdAt: new Date().toISOString(),
            completedAt: null,
          })
          for (const sub of item.subtasks ?? []) {
            newTasks.push({
              id: uid("t"),
              title: sub.title,
              xp: sub.xp,
              done: false,
              roadmapId,
              parentTaskId: rootId,
              createdAt: new Date().toISOString(),
              completedAt: null,
            })
          }
        }
        return { ...prev, tasks: [...prev.tasks, ...newTasks] }
      })
    },
    [],
  )

  const updateProfile = useCallback((profile: Profile) => {
    setState((prev) => ({ ...prev, profile }))
  }, [])

  const updateSettings = useCallback((settings: Partial<Settings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...settings } }))
  }, [])

  const resetProgress = useCallback(() => {
    setState(buildSeedState())
  }, [])

  const importState = useCallback((data: AppState) => {
    setState(data)
  }, [])

  const value: StoreApi = {
    state,
    totalXp,
    rootTasks,
    subtasks,
    roadmapProgress,
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
