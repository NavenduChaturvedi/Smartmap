// js/app.js - Aegis Shared State & Navigation Manager

const AEGIS_STORAGE_KEY = "aegis_state_v1";

const defaultState = {
  roadmapsActive: 3,
  streak: 12,
  totalXp: 4250,
  tasks: [
    { id: "t1", title: "Complete CSS Grid module", tag: "RM: FRONTEND_MASTERY_V4", xp: 10, done: true },
    { id: "t2", title: "Review JavaScript patterns", tag: "RM: FRONTEND_MASTERY_V4", xp: 10, done: true },
    { id: "t3", title: "Push code to GitHub", tag: "SYS: GENERAL_REPOS", xp: 10, done: false },
    { id: "t4", title: "Read documentation", tag: "RM: DATA_SCIENCE_CORE", xp: 10, done: false }
  ],
  // Commander profile settings
  commanderName: "COMMANDER_ONE",
  clearanceLevel: "LEVEL_04",
  // UI Settings
  settings: {
    darkMode: true,
    fontScale: 1.0,
    scanlines: true,
    sound: false,
    animations: true
  }
};

const loadState = () => {
  try {
    const raw = localStorage.getItem(AEGIS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...defaultState, ...parsed, tasks: parsed.tasks || defaultState.tasks };
  } catch {
    return { ...defaultState };
  }
};

const saveState = (state) => {
  localStorage.setItem(AEGIS_STORAGE_KEY, JSON.stringify(state));
};

// Expose state API globally
window.Aegis = {
  state: loadState(),
  save: function() {
    saveState(this.state);
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
  getPendingTaskCount: function() {
    return this.state.tasks.filter(t => !t.done).length;
  }
};

// Optional: Document Ready Helper
document.addEventListener("DOMContentLoaded", () => {
  // Navigation active state styling
  const currentPath = window.location.pathname.split('/').pop();
  document.querySelectorAll('nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'dashboard.html')) {
        link.classList.add('bg-surface-variant', 'border-l-2', 'border-primary', 'text-primary');
        link.classList.remove('text-on-surface-variant');
        
        // Remove hover styles that conflict with active state
        link.classList.remove('hover:bg-surface-variant');
    }
  });
});
