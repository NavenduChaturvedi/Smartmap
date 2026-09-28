// Default values shared by the store and the modules it imports (guest
// storage, legacy migration). They live here, not in store.tsx, so those
// modules don't import store.tsx at runtime - that would be a circular import.

import type { Flags, Settings } from "./store"

const DEFAULT_FLAGS: Flags = { viewedAnalytics: false, aiRoadmapsCreated: 0, longestStreak: 0 }

const DEFAULT_SETTINGS: Settings = {
  fontScale: 100,
  soundEffects: true,
  reducedMotion: false,
  compactDensity: false,
  achievementAlerts: true,
}

export { DEFAULT_FLAGS, DEFAULT_SETTINGS }
