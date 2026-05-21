// js/app.js - Aegis Shared State & Navigation Manager

const AEGIS_STORAGE_KEY = "aegis_state_v1";

const createTaskId = () => (crypto?.randomUUID ? crypto.randomUUID() : `task_${Date.now()}_${Math.random().toString(16).slice(2)}`);
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getRelativeDateString = (dateString, offsetDays) => {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + offsetDays);
  return getLocalDateString(date);
};
const normalizeTasks = (tasks) => tasks.map((task) => ({
  ...task,
  id: isUuid(task.id) ? task.id : createTaskId(),
  xp: Number(task.xp || 0),
  done: Boolean(task.done),
  completed_at: task.completed_at || (task.done ? task.created_at || null : null)
}));

const mergeLocalTaskMetadata = (remoteTasks, localTasks) => {
  const localById = new Map((localTasks || []).map((task) => [task.id, task]));
  return (remoteTasks || []).map((task) => {
    const localTask = localById.get(task.id);
    if (!localTask) return task;
    return {
      ...localTask,
      ...task,
      created_at: task.created_at || localTask.created_at || null,
      completed_at: task.completed_at || localTask.completed_at || null
    };
  });
};
const sumCompletedXp = (tasks) => tasks.reduce((total, task) => total + (task.done ? task.xp : 0), 0);
const countActiveRoadmaps = (tasks) => new Set(tasks
  .map((task) => task.tag)
  .filter((tag) => typeof tag === "string" && tag.startsWith("RM:"))).size;
const refreshDerivedState = (state) => {
  state.roadmapsActive = Array.isArray(state.roadmaps) && state.roadmaps.length > 0
    ? state.roadmaps.length
    : countActiveRoadmaps(state.tasks || []);
  state.totalXp = sumCompletedXp(state.tasks || []);
  return state;
};

const updateStreakOnCompletion = (state, completionDate = new Date()) => {
  const today = getLocalDateString(completionDate);
  const lastActiveDate = state.settings?.lastActiveDate || null;

  if (lastActiveDate === today) return state;

  const nextStreak = lastActiveDate === getRelativeDateString(today, -1)
    ? Number(state.streak || 0) + 1
    : 1;

  state.streak = nextStreak;
  state.settings = {
    ...state.settings,
    streak: nextStreak,
    lastActiveDate: today
  };

  return state;
};

const defaultState = refreshDerivedState({
  roadmapsActive: 0,
  streak: 0,
  totalXp: 0,
  roadmaps: [],
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
    animations: true,
    streak: 0,
    lastActiveDate: null
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
      roadmaps: Array.isArray(parsed.roadmaps) ? parsed.roadmaps : defaultState.roadmaps,
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

  const [profileRes, settingsRes, roadmapRes, roadmapsRes, tasksRes] = await Promise.all([
    supabase.from("profiles").select("id, display_name, email").eq("id", userId).maybeSingle(),
    supabase.from("settings").select("user_id, theme, font_scale, scanlines, sound_effects, animations, streak, last_active_date").eq("user_id", userId).maybeSingle(),
    supabase.from("roadmap_state").select("user_id, selected_node").eq("user_id", userId).maybeSingle(),
    supabase.from("roadmaps").select("id, name, description, user_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("tasks").select("id, title, tag, xp, done, roadmap_id, parent_task_id").eq("user_id", userId)
  ]);

  const profile = profileRes.data || null;
  const settings = settingsRes.data || null;
  const roadmap = roadmapRes.data || null;
  const roadmaps = roadmapsRes.data || [];
  const tasks = tasksRes.data || [];

  return {
    profile,
    settings,
    roadmap,
    roadmaps,
    tasks: normalizeTasks(tasks)
  };
};

const seedDefaultsForUser = async (user) => {
  const supabase = await getSupabase();
  if (!supabase || !user?.id) return;

  const email = user.email || defaultState.profile.email;
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || defaultState.profile.displayName;
  const existingProfileRes = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const existingDisplayName = existingProfileRes.data?.display_name?.trim();
  const profilePayload = {
    id: user.id,
    email
  };

  if (!existingDisplayName) {
    profilePayload.display_name = displayName;
  }

  const writes = [
    supabase.from("profiles").upsert(profilePayload, { onConflict: "id" }),
    supabase.from("settings").upsert({
      user_id: user.id,
      theme: defaultState.settings.theme,
      font_scale: defaultState.settings.fontScale,
      scanlines: defaultState.settings.scanlines,
      sound_effects: defaultState.settings.soundEffects,
      animations: defaultState.settings.animations,
      streak: defaultState.settings.streak,
      last_active_date: defaultState.settings.lastActiveDate
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

  const normalizedTasks = normalizeTasks(mergeLocalTaskMetadata(remote.tasks || [], window.Aegis.state.tasks || []));
  const profileDisplayName = remote.profile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || window.Aegis.state.profile.displayName;
  const nextState = refreshDerivedState({
    ...window.Aegis.state,
    streak: remote.settings?.streak ?? window.Aegis.state.streak ?? 0,
    commanderName: profileDisplayName,
    profile: {
      displayName: profileDisplayName,
      email: remote.profile?.email || window.Aegis.state.profile.email
    },
    settings: {
      theme: remote.settings?.theme || window.Aegis.state.settings.theme,
      fontScale: remote.settings?.font_scale ?? window.Aegis.state.settings.fontScale,
      scanlines: remote.settings?.scanlines ?? window.Aegis.state.settings.scanlines,
      soundEffects: remote.settings?.sound_effects ?? window.Aegis.state.settings.soundEffects,
      animations: remote.settings?.animations ?? window.Aegis.state.settings.animations,
      streak: remote.settings?.streak ?? window.Aegis.state.settings.streak ?? 0,
      lastActiveDate: remote.settings?.last_active_date ?? window.Aegis.state.settings.lastActiveDate ?? null
    },
    roadmap: {
      selectedNode: remote.roadmap?.selected_node || window.Aegis.state.roadmap.selectedNode
    },
    roadmaps: Array.isArray(remote.roadmaps) ? remote.roadmaps : [],
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
    done: task.done,
    roadmap_id: task.roadmap_id || null,
    parent_task_id: task.parent_task_id || null
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
      animations: state.settings.animations,
      streak: state.settings.streak ?? state.streak ?? 0,
      last_active_date: state.settings.lastActiveDate || null
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
  roadmaps: [],
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
    let transitionedToDone = [];

    // Update the target task
    this.state.tasks = this.state.tasks.map(task => {
      if (task.id === taskId) {
        const currentlyDone = Boolean(task.done);
        if (currentlyDone !== isDone) {
          this.state.totalXp += isDone ? task.xp : -task.xp;
          if (!currentlyDone && isDone) transitionedToDone.push(task.id);
        }
        return {
          ...task,
          done: isDone,
          completed_at: isDone ? (task.completed_at || new Date().toISOString()) : null
        };
      }
      return task;
    });

    // Helper: get children of a task id
    const getChildren = (parentId) => this.state.tasks.filter(t => t.parent_task_id === parentId);

    // Propagate upwards: if all siblings of a parent are done -> mark parent done.
    const tryPropagateUp = (childTaskId) => {
      // find immediate parent
      const child = this.state.tasks.find(t => t.id === childTaskId);
      if (!child || !child.parent_task_id) return;
      let parentId = child.parent_task_id;
      while (parentId) {
        const parent = this.state.tasks.find(t => t.id === parentId);
        if (!parent) break;

        const children = getChildren(parentId);
        const allDone = children.length > 0 && children.every(c => Boolean(c.done));

        if (allDone && !parent.done) {
          // mark parent done
          parent.done = true;
          parent.completed_at = parent.completed_at || new Date().toISOString();
          this.state.totalXp += parent.xp || 0;
          transitionedToDone.push(parent.id);
        } else if (!allDone && parent.done) {
          // some child undone -> unset parent
          parent.done = false;
          parent.completed_at = null;
          this.state.totalXp -= parent.xp || 0;
        }

        // continue to next level up
        parentId = parent.parent_task_id;
      }
    };

    // If we just marked a task done, try to promote its parents
    tryPropagateUp(taskId);

    // If we just marked a task undone, ensure parents are unset
    // (tryPropagateUp already handles both directions because it checks children states)

    // Update streak for each newly completed task (only tasks that transitioned to done)
    if (transitionedToDone.length > 0) {
      // update streak once for this batch of completions
      updateStreakOnCompletion(this.state);
    }

    this.save();
  },
  addTask: function(title, tag = "", xp = 0, roadmap_id = null, parent_task_id = null) {
    const newTask = {
      id: createTaskId(),
      title,
      tag,
      xp: Number(xp),
      done: false,
      roadmap_id: roadmap_id || null,
      parent_task_id: parent_task_id || null,
      created_at: new Date().toISOString(),
      completed_at: null
    };
    this.state.tasks.push(newTask);
    this.save();
    return newTask;
  },
  addTasks: function(tasksData) {
    const newTasks = tasksData.map(data => ({
      id: createTaskId(),
      title: data.title,
      tag: data.tag || "",
      xp: Number(data.xp || 0),
      done: false,
      roadmap_id: data.roadmap_id || null,
      parent_task_id: data.parent_task_id || null,
      created_at: data.created_at || new Date().toISOString(),
      completed_at: null
    }));
    this.state.tasks.push(...newTasks);
    this.save();
    return newTasks;
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
      
      // Auto-migrate legacy task tags to foreign keys
      if (window.AegisApi && window.AegisApi.migrateLegacyTagsToForeignKeys) {
        await window.AegisApi.migrateLegacyTagsToForeignKeys();
      }
    }
    return window.Aegis.state;
  })();
});
