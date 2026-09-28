// Guest mode: someone using the app without an account keeps their data in
// this browser's localStorage. When they sign in or sign up, the store moves
// it into their account (see syncGuestToAccount in store.tsx) and clears it.

import type { AppState } from "./store"

const GUEST_STORAGE_KEY = "smartmap:guest:v1"

const GUEST_DEFAULTS: AppState = {
  roadmaps: [],
  tasks: [],
  profile: { displayName: "Guest", email: "" },
  settings: { fontScale: 100, soundEffects: true, reducedMotion: false, compactDensity: false },
  viewedAnalytics: false,
}

// Storage can throw (private mode, disabled storage, quota), so every access
// is guarded and guest mode degrades to "works, but doesn't persist".
function readGuestState(): AppState | null {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AppState>
    if (!Array.isArray(parsed.roadmaps) || !Array.isArray(parsed.tasks)) return null
    return {
      ...GUEST_DEFAULTS,
      ...parsed,
      profile: { ...GUEST_DEFAULTS.profile, ...parsed.profile },
      settings: { ...GUEST_DEFAULTS.settings, ...parsed.settings },
    }
  } catch {
    return null
  }
}

function loadGuestState(): AppState {
  return readGuestState() ?? GUEST_DEFAULTS
}

function saveGuestState(state: AppState) {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    console.error("Couldn't save guest data to this browser", err)
  }
}

function clearGuestState() {
  try {
    localStorage.removeItem(GUEST_STORAGE_KEY)
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

function hasGuestContent(state: AppState | null): state is AppState {
  return !!state && (state.roadmaps.length > 0 || state.tasks.length > 0 || state.viewedAnalytics)
}

export { clearGuestState, hasGuestContent, loadGuestState, readGuestState, saveGuestState }
