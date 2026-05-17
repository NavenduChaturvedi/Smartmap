const renderStats = () => {
  const state = window.Aegis.state;
  const pending = state.tasks.filter((task) => !task.done).length;

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  };

  setText("stat-roadmaps", String(state.roadmapsActive).padStart(2, "0"));
  setText("stat-pending", String(pending).padStart(2, "0"));
  setText("stat-streak", String(state.streak));
  setText("stat-xp", state.totalXp.toLocaleString());
  setText("objective-status", pending > 0 ? "STATUS: NOMINAL" : "STATUS: CLEAR");
};

const renderTasks = () => {
  const state = window.Aegis.state;
  const list = document.getElementById("objectives-list");
  if (!list) return;

  list.innerHTML = state.tasks.map((task) => {
    const base = "glass-panel p-4 flex items-center gap-4 transition-all cursor-pointer";
    const doneClass = task.done ? "border-l-4 border-primary aegis-glow" : "border-l-4 border-outline-variant hover:border-primary group";
    const icon = task.done ? "check_circle" : "circle";
    const titleClass = task.done ? "font-body-md text-on-surface opacity-40 line-through" : "font-body-md text-on-surface";
    const xpClass = task.done ? "font-label-mono text-primary text-xs" : "font-label-mono text-on-surface-variant text-xs group-hover:text-primary";
    const iconClass = task.done ? "material-symbols-outlined text-primary" : "material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors";
    const roadmapLabel = task.roadmap_id ? `RM:${String(task.roadmap_id).slice(0,8)}` : (task.tag || '');
    return `
      <button class="${base} ${doneClass}" data-task-id="${task.id}" type="button">
        <span class="${iconClass}">${icon}</span>
        <div class="flex-1 text-left">
          <p class="${titleClass}">${task.title}</p>
          <p class="font-label-mono text-[10px] text-on-surface-variant uppercase">${roadmapLabel}</p>
        </div>
        <div class="${xpClass}">+${task.xp}_XP</div>
      </button>
    `;
  }).join("");

  list.querySelectorAll("[data-task-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const taskId = button.dataset.taskId;
      const stateRef = window.Aegis.state;
      stateRef.tasks = stateRef.tasks.map((task) => {
        if (task.id !== taskId) return task;
        const nextDone = !task.done;
        stateRef.totalXp += nextDone ? task.xp : -task.xp;
        return { ...task, done: nextDone };
      });
      window.Aegis.save();
      renderStats();
      renderTasks();
    });
  });
};

const getRoadmapStats = () => {
  const state = window.Aegis.state;
  const roadmapMap = new Map();

  state.tasks.forEach((task) => {
    let key = null;
    let displayName = null;
    if (task.roadmap_id) {
      key = task.roadmap_id;
      displayName = null;
    } else if (task.tag && typeof task.tag === "string" && task.tag.startsWith("RM:")) {
      key = task.tag.replace("RM:", "").trim();
      displayName = key;
    }

    if (!key) return;
    if (!roadmapMap.has(key)) {
      roadmapMap.set(key, { id: task.roadmap_id || null, name: displayName || null, total: 0, completed: 0 });
    }
    const stats = roadmapMap.get(key);
    stats.total += 1;
    if (task.done) stats.completed += 1;
  });

  return Array.from(roadmapMap.values()).map((row) => ({
    name: row.name || String(row.id).slice(0, 8),
    total: row.total,
    completed: row.completed,
    percentage: Math.round((row.completed / row.total) * 100),
    id: row.id
  }));
};

const renderRoadmaps = () => {
  const roadmaps = getRoadmapStats();
  const list = document.getElementById("roadmaps-list");
  if (!list) return;

  if (roadmaps.length === 0) {
    list.innerHTML = '<p class="text-sm text-on-surface-variant text-center py-6">No roadmaps yet. Create your first one!</p>';
    return;
  }

  list.innerHTML = roadmaps.map((rm) => {
    const circumference = 125.6;
    const offset = circumference - (rm.percentage / 100) * circumference;
    const key = rm.id || rm.name;
    return `
      <div class="glass-panel p-4 rounded-xl flex items-center gap-4 group cursor-pointer roadmap-card" data-roadmap="${key}">
        <div class="relative w-12 h-12 flex-shrink-0">
          <svg class="w-full h-full transform -rotate-90">
            <circle class="text-surface-variant" cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" stroke-width="3"></circle>
            <circle class="text-primary aegis-glow" cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" stroke-width="3"></circle>
          </svg>
          <span class="absolute inset-0 flex items-center justify-center text-[10px] font-label-mono text-primary">${rm.percentage}%</span>
        </div>
        <div class="flex-1">
          <p class="font-body-md font-bold text-on-surface group-hover:text-primary transition-colors">${rm.name}</p>
          <p class="text-[9px] text-on-surface-variant uppercase tracking-widest">${rm.completed} / ${rm.total} NODES COMPLETED</p>
        </div>
        <span class="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-all">arrow_forward_ios</span>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".roadmap-card").forEach((card) => {
    card.addEventListener("click", () => {
      const roadmapKey = card.dataset.roadmap;
      const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}/i.test(roadmapKey);
      if (isId) {
        window.location.href = `roadmap.html?roadmap_id=${encodeURIComponent(roadmapKey)}`;
      } else {
        window.location.href = `roadmap.html?roadmap=${encodeURIComponent(roadmapKey)}`;
      }
    });
  });
};

const handleCreateRoadmap = () => {
  window.location.href = "roadmap-create.html";
};

const initDashboard = () => {
  renderStats();
  renderTasks();
  renderRoadmaps();
};

const createBtn = document.getElementById("create-roadmap-btn");
if (createBtn) {
  createBtn.addEventListener("click", handleCreateRoadmap);
}

Promise.resolve(window.Aegis?.ready).then(initDashboard);
window.addEventListener("aegis:state-updated", initDashboard);