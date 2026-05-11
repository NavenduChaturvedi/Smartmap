// js/app.js - Aegis Shared State & Navigation Manager

const AEGIS_STORAGE_KEY = "aegis_state_v1";

const createTaskId = () => (crypto?.randomUUID ? crypto.randomUUID() : `task_${Date.now()}_${Math.random().toString(16).slice(2)}`);
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const normalizeTasks = (tasks) => tasks.map((task) => ({
  ...task,
  id: isUuid(task.id) ? task.id : createTaskId(),
  xp: Number(task.xp || 0),
  done: Boolean(task.done)
}));
const sumCompletedXp = (tasks) => tasks.reduce((total, task) => total + (task.done ? task.xp : 0), 0);
const countActiveRoadmaps = (tasks) => new Set(tasks
  .map((task) => task.tag)
  .filter((tag) => typeof tag === "string" && tag.startsWith("RM:"))).size;
const refreshDerivedState = (state) => {
  state.roadmapsActive = countActiveRoadmaps(state.tasks || []);
  state.totalXp = sumCompletedXp(state.tasks || []);
  return state;
};

const defaultState = refreshDerivedState({
  roadmapsActive: 0,
  streak: 0,
  totalXp: 0,
  tasks: [],
  roadmap: {
    selectedNode: "NODE_01"
  },
  // Commander profile settings
  commanderName: "COMMANDER_ONE",
  clearanceLevel: "LEVEL_01",
  profile: {
    displayName: "Commander",
    email: "commander@aegis.dev"
  },
  // UI Settings
  settings: {
    theme: "dark",
    fontScale: 100,
    scanlines: true,
    soundEffects: false,
    animations: true
  }
});

const loadState = () => {
  try {
    const raw = localStorage.getItem(AEGIS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return refreshDerivedState({
      ...defaultState,
      ...parsed,
      profile: { ...defaultState.profile, ...(parsed.profile || {}) },
      settings: { ...defaultState.settings, ...(parsed.settings || {}) },
      roadmap: { ...defaultState.roadmap, ...(parsed.roadmap || {}) },
      tasks: normalizeTasks(parsed.tasks || defaultState.tasks)
    });
  } catch {
    return refreshDerivedState({ ...defaultState });
  }
};

const saveState = (state) => {
  localStorage.setItem(AEGIS_STORAGE_KEY, JSON.stringify(state));
};

const emitStateUpdate = () => {
  window.dispatchEvent(new CustomEvent("aegis:state-updated", { detail: window.Aegis.state }));
};

const waitForSupabase = (timeoutMs = 2000) => new Promise((resolve) => {
  const start = Date.now();
  const tick = () => {
    if (window.AegisSupabase) return resolve(window.AegisSupabase);
    if (Date.now() - start >= timeoutMs) return resolve(null);
    setTimeout(tick, 50);
  };
  tick();
});

const getSupabase = async () => waitForSupabase();

const getSessionUser = async () => {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.user || null;
};

const fetchUserState = async (userId) => {
  const supabase = await getSupabase();
  if (!supabase || !userId) return null;

  const [profileRes, settingsRes, roadmapRes, tasksRes] = await Promise.all([
    supabase.from("profiles").select("id, display_name, email").eq("id", userId).maybeSingle(),
    supabase.from("settings").select("user_id, theme, font_scale, scanlines, sound_effects, animations").eq("user_id", userId).maybeSingle(),
    supabase.from("roadmap_state").select("user_id, selected_node").eq("user_id", userId).maybeSingle(),
    supabase.from("tasks").select("id, title, tag, xp, done").eq("user_id", userId)
  ]);

  const profile = profileRes.data || null;
  const settings = settingsRes.data || null;
  const roadmap = roadmapRes.data || null;
  const tasks = tasksRes.data || [];

  return {
    profile,
    settings,
    roadmap,
    tasks: normalizeTasks(tasks)
  };
};

const seedDefaultsForUser = async (user) => {
  const supabase = await getSupabase();
  if (!supabase || !user?.id) return;

  const email = user.email || defaultState.profile.email;
  const displayName = email.split("@")[0] || defaultState.profile.displayName;

  const writes = [
    supabase.from("profiles").upsert({
      id: user.id,
      display_name: displayName,
      email
    }, { onConflict: "id" }),
    supabase.from("settings").upsert({
      user_id: user.id,
      theme: defaultState.settings.theme,
      font_scale: defaultState.settings.fontScale,
      scanlines: defaultState.settings.scanlines,
      sound_effects: defaultState.settings.soundEffects,
      animations: defaultState.settings.animations
    }, { onConflict: "user_id" }),
    supabase.from("roadmap_state").upsert({
      user_id: user.id,
      selected_node: defaultState.roadmap.selectedNode
    }, { onConflict: "user_id" })
  ];

  await Promise.all(writes);
};

const hydrateStateFromSupabase = async () => {
  const user = await getSessionUser();
  if (!user) return null;

  let remote = await fetchUserState(user.id);
  const hasProfile = remote?.profile;
  const hasSettings = remote?.settings;
  const hasRoadmap = remote?.roadmap;
  const hasTasks = remote?.tasks && remote.tasks.length > 0;

  if (!hasProfile || !hasSettings || !hasRoadmap || !hasTasks) {
    await seedDefaultsForUser(user);
    remote = await fetchUserState(user.id);
  }

  if (!remote) return null;

  const normalizedTasks = normalizeTasks(remote.tasks || []);
  const nextState = refreshDerivedState({
    ...window.Aegis.state,
    streak: normalizedTasks.length > 0 ? window.Aegis.state.streak : 0,
    profile: {
      displayName: remote.profile?.display_name || window.Aegis.state.profile.displayName,
      email: remote.profile?.email || window.Aegis.state.profile.email
    },
    settings: {
      theme: remote.settings?.theme || window.Aegis.state.settings.theme,
      fontScale: remote.settings?.font_scale ?? window.Aegis.state.settings.fontScale,
      scanlines: remote.settings?.scanlines ?? window.Aegis.state.settings.scanlines,
      soundEffects: remote.settings?.sound_effects ?? window.Aegis.state.settings.soundEffects,
      animations: remote.settings?.animations ?? window.Aegis.state.settings.animations
    },
    roadmap: {
      selectedNode: remote.roadmap?.selected_node || window.Aegis.state.roadmap.selectedNode
    },
    tasks: normalizedTasks
  });

  window.Aegis.state = nextState;
  saveState(nextState);
  emitStateUpdate();
  return nextState;
};

const syncStateToSupabase = async () => {
  const supabase = await getSupabase();
  if (!supabase) return;
  const user = await getSessionUser();
  if (!user) return;

  const state = window.Aegis.state;
  const taskPayload = normalizeTasks(state.tasks).map((task) => ({
    id: task.id,
    user_id: user.id,
    title: task.title,
    tag: task.tag,
    xp: task.xp,
    done: task.done
  }));

  await Promise.all([
    supabase.from("profiles").upsert({
      id: user.id,
      display_name: state.profile.displayName,
      email: state.profile.email
    }, { onConflict: "id" }),
    supabase.from("settings").upsert({
      user_id: user.id,
      theme: state.settings.theme,
      font_scale: state.settings.fontScale,
      scanlines: state.settings.scanlines,
      sound_effects: state.settings.soundEffects,
      animations: state.settings.animations
    }, { onConflict: "user_id" }),
    supabase.from("roadmap_state").upsert({
      user_id: user.id,
      selected_node: state.roadmap?.selectedNode || defaultState.roadmap.selectedNode
    }, { onConflict: "user_id" }),
    supabase.from("tasks").upsert(taskPayload, { onConflict: "id" })
  ]);
};

// Expose state API globally
const resetLocalState = () => refreshDerivedState({
  ...defaultState,
  profile: { ...defaultState.profile },
  settings: { ...defaultState.settings },
  roadmap: { ...defaultState.roadmap },
  tasks: []
});

window.Aegis = {
  storageKey: AEGIS_STORAGE_KEY,
  defaultState,
  state: loadState(),
  ready: Promise.resolve(),
  save: async function() {
    refreshDerivedState(this.state);
    saveState(this.state);
    emitStateUpdate();
    await syncStateToSupabase();
  },
  signOut: async function() {
    const supabase = await getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(AEGIS_STORAGE_KEY);
    this.state = resetLocalState();
    window.location.href = "index.html";
  },
  updateTask: function(taskId, isDone) {
    this.state.tasks = this.state.tasks.map(task => {
      if (task.id === taskId) {
        // Adjust XP
        const currentlyDone = task.done;
        if (currentlyDone !== isDone) {
          this.state.totalXp += isDone ? task.xp : -task.xp;
        }
        return { ...task, done: isDone };
      }
      return task;
    });
    this.save();
  },
  addTask: function(title, tag = "", xp = 0) {
    const newTask = {
      id: createTaskId(),
      title,
      tag,
      xp: Number(xp),
      done: false
    };
    this.state.tasks.push(newTask);
    this.save();
    return newTask;
  },
  getPendingTaskCount: function() {
    return this.state.tasks.filter(t => !t.done).length;
  }
};

// Optional: Document Ready Helper
document.addEventListener("DOMContentLoaded", () => {
  // Navigation active state styling
  const currentPath = window.location.pathname.split('/').pop();
  const isAuthPage = currentPath === "" || currentPath === "index.html";
  document.querySelectorAll('nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'dashboard.html')) {
        link.classList.add('bg-surface-variant', 'border-l-2', 'border-primary', 'text-primary');
        link.classList.remove('text-on-surface-variant');
        
        // Remove hover styles that conflict with active state
        link.classList.remove('hover:bg-surface-variant');
    }
  });

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("#aegis-signout-btn");
    if (!button || !window.Aegis?.signOut) return;
    event.preventDefault();
    await window.Aegis.signOut();
  });

  window.Aegis.ready = (async () => {
    const user = await getSessionUser();
    if (!user && !isAuthPage) {
      window.location.href = "index.html";
      return null;
    }
    if (user) {
      await hydrateStateFromSupabase();
    }
    return window.Aegis.state;
  })();
});
