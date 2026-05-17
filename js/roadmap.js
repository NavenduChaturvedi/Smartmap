  const getUrlParam = (param) => new URL(window.location).searchParams.get(param);

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  const getRoadmapName = () => getUrlParam("roadmap") || null;

  const normalizeRoadmapName = (value) => value.trim();

  const getRoadmapFromTag = (tag) => {
    if (!tag || !tag.startsWith("RM:")) return null;
    const [, rest = ""] = tag.split("RM:");
    return rest.split("|")[0].trim();
  };

  const getParentTaskIdFromTag = (tag) => {
    if (!tag || !tag.includes("PARENT:")) return null;
    const match = tag.match(/PARENT:\s*([^|]+)/i);
    return match ? match[1].trim() : null;
  };

  const getRoadmapTasks = (roadmapName) => {
    if (!roadmapName) return [];
    return window.Aegis.state.tasks.filter((task) => getRoadmapFromTag(task.tag) === roadmapName);
  };

  const getRoadmaps = () => {
    const map = new Map();

    window.Aegis.state.tasks.forEach((task) => {
      const roadmapName = getRoadmapFromTag(task.tag);
      if (!roadmapName) return;

      if (!map.has(roadmapName)) {
        map.set(roadmapName, {
          name: roadmapName,
          total: 0,
          completed: 0,
          rootCount: 0
        });
      }

      const stats = map.get(roadmapName);
      stats.total += 1;
      if (task.done) stats.completed += 1;
      if (!getParentTaskIdFromTag(task.tag)) stats.rootCount += 1;
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getRoadmapProgress = (roadmapName) => {
    const tasks = getRoadmapTasks(roadmapName);
    const completed = tasks.filter((task) => task.done).length;
    const total = tasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { tasks, completed, total, percentage };
  };

  let selectedTaskId = null;
  let currentTargetParentId = null;

  const getSubtaskRowMarkup = () => `
    <div class="flex items-center gap-2 subtask-row">
      <input type="text" class="flex-1 bg-surface-container p-2 rounded-lg border border-outline-variant/30 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm" placeholder="Subtask Title" required>
      <input type="number" class="w-20 bg-surface-container p-2 rounded-lg border border-outline-variant/30 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm" placeholder="XP" value="0" min="0">
      <button type="button" class="material-symbols-outlined text-outline-variant hover:text-error transition-colors remove-subtask-row-btn">delete</button>
    </div>
  `;

  const setupModals = () => {
    const taskModal = document.getElementById("add-task-modal");
    const subtaskModal = document.getElementById("add-single-subtask-modal");
    
    // Add Task Modal Setup
    const closeTaskModalBtn = document.getElementById("close-task-modal-btn");
    const addTaskForm = document.getElementById("add-task-form");
    const addSubtaskRowBtn = document.getElementById("modal-add-subtask-row-btn");
    const subtasksContainer = document.getElementById("modal-subtasks-container");

    closeTaskModalBtn?.addEventListener("click", () => {
      taskModal.classList.add("hidden");
    });

    addSubtaskRowBtn?.addEventListener("click", () => {
      const template = document.createElement("template");
      template.innerHTML = getSubtaskRowMarkup().trim();
      const row = template.content.firstChild;
      
      row.querySelector(".remove-subtask-row-btn").addEventListener("click", () => {
        row.remove();
      });
      
      subtasksContainer.appendChild(row);
    });

    addTaskForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const roadmapName = getRoadmapName();
      if (!roadmapName) return;

      const titleInput = document.getElementById("task-title-input");
      const xpInput = document.getElementById("task-xp-input");
      const taskTitle = titleInput.value.trim();
      const xp = Number.parseInt(xpInput.value, 10) || 0;

      if (!taskTitle) return;

      const tag = `RM: ${roadmapName}`;
      // Add the parent task
      window.Aegis.addTask(taskTitle, tag, xp);
      
      // Look up the newly created task (it will be the last one added with that tag)
      // This is a bit of a hack since addTask doesn't return the ID immediately,
      // but in window.Aegis.state it becomes available right away since it's synchronous logic
      const createdParent = [...window.Aegis.state.tasks].reverse().find(t => t.title === taskTitle && t.tag === tag);

      if (createdParent) {
        // Add subtasks
        const subtaskRows = subtasksContainer.querySelectorAll(".subtask-row");
        subtaskRows.forEach(row => {
          const inputs = row.querySelectorAll("input");
          const stTitle = inputs[0].value.trim();
          const stXp = Number.parseInt(inputs[1].value, 10) || 0;
          if (stTitle) {
            window.Aegis.addTask(stTitle, `RM: ${roadmapName} | PARENT: ${createdParent.id}`, stXp);
          }
        });
      }

      taskModal.classList.add("hidden");
      addTaskForm.reset();
      subtasksContainer.innerHTML = '';
      renderDetailTaskPanel(roadmapName);
    });

    // Add Single Subtask Modal Setup
    const closeSingleSubtaskBtn = document.getElementById("close-single-subtask-modal-btn");
    const addSingleSubtaskForm = document.getElementById("add-single-subtask-form");

    closeSingleSubtaskBtn?.addEventListener("click", () => {
      subtaskModal.classList.add("hidden");
    });

    addSingleSubtaskForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const roadmapName = getRoadmapName();
      if (!roadmapName || !currentTargetParentId) return;

      const titleInput = document.getElementById("subtask-title-input");
      const xpInput = document.getElementById("subtask-xp-input");
      const stTitle = titleInput.value.trim();
      const stXp = Number.parseInt(xpInput.value, 10) || 0;

      if (stTitle) {
        window.Aegis.addTask(stTitle, `RM: ${roadmapName} | PARENT: ${currentTargetParentId}`, stXp);
      }

      subtaskModal.classList.add("hidden");
      addSingleSubtaskForm.reset();
      renderDetailTaskPanel(roadmapName);
    });
  };

  const openTaskModal = () => {
    const taskModal = document.getElementById("add-task-modal");
    const subtasksContainer = document.getElementById("modal-subtasks-container");
    if (taskModal) {
      document.getElementById("add-task-form").reset();
      subtasksContainer.innerHTML = '';
      taskModal.classList.remove("hidden");
    }
  };

  const openSubtaskModal = (parentTaskId) => {
    currentTargetParentId = parentTaskId;
    const subtaskModal = document.getElementById("add-single-subtask-modal");
    if (subtaskModal) {
      document.getElementById("add-single-subtask-form").reset();
      subtaskModal.classList.remove("hidden");
    }
  };

  // Replaced direct addTask logic to rely on Modals instead
  const addTask = (roadmapName, parentTaskId = null) => {
    if (parentTaskId) {
      openSubtaskModal(parentTaskId);
    } else {
      openTaskModal();
    }
  };

  const renderRoadmapRing = (percentage) => {
    const circumference = 188.5;
    const offset = circumference - (percentage / 100) * circumference;
    return `
      <div class="relative w-16 h-16 flex-shrink-0">
        <svg class="w-full h-full -rotate-90">
          <circle class="text-surface-variant" cx="32" cy="32" fill="transparent" r="30" stroke="currentColor" stroke-width="5"></circle>
          <circle class="text-primary aegis-glow" cx="32" cy="32" fill="transparent" r="30" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
        </svg>
        <span class="absolute inset-0 flex items-center justify-center font-label-mono text-[10px] text-primary">${percentage}%</span>
      </div>
    `;
  };

  const renderOverview = () => {
    const overviewList = document.getElementById("roadmap-overview-list");
    const detailShell = document.getElementById("roadmap-detail-shell");
    const taskDetailShell = document.getElementById("task-detail-shell");
    const addTaskBtn = document.getElementById("add-task-btn");
    const backBtn = document.getElementById("back-to-roadmaps-btn");

    if (!overviewList) return;

    const roadmaps = getRoadmaps();
    setText("roadmap-title", "ROADMAPS");
    setText("active-track", "OVERVIEW");
    setText("mission-count", `${roadmaps.length} ROADMAPS`);
    setText("primary-panel-title", "Roadmap Overview");
    setText("primary-panel-copy", "Select a roadmap to inspect its tasks and subtask structure.");
    setText("task-summary", `${roadmaps.reduce((total, roadmap) => total + roadmap.total, 0)} ACTIVE`);

    detailShell?.classList.add("hidden");
    taskDetailShell?.classList.add("hidden");
    addTaskBtn?.classList.add("hidden");
    backBtn?.classList.add("hidden");

    if (roadmaps.length === 0) {
      overviewList.innerHTML = '<p class="col-span-2 text-center text-on-surface-variant py-10">No roadmaps yet. Create one from the dashboard to start building phases.</p>';
      renderSidebar(null);
      return;
    }

    overviewList.innerHTML = roadmaps.map((roadmap) => {
      const progress = getRoadmapProgress(roadmap.name);
      const ring = renderRoadmapRing(progress.percentage);
      return `
        <button class="glass-panel p-5 rounded-xl text-left border border-outline-variant/20 hover:border-primary/50 transition-all roadmap-card" data-roadmap="${roadmap.name}" type="button">
          <div class="flex items-center gap-4">
            ${ring}
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-3 mb-2">
                <h3 class="font-h3 text-h3 text-on-surface uppercase tracking-tighter truncate">${roadmap.name}</h3>
                <span class="font-label-mono text-[10px] text-on-surface-variant uppercase tracking-widest">${progress.completed}/${progress.total}</span>
              </div>
              <p class="text-xs text-on-surface-variant">${progress.percentage}% complete</p>
              <div class="mt-4 h-2 rounded-full bg-surface-variant overflow-hidden">
                <div class="h-full bg-primary aegis-glow" style="width:${progress.percentage}%"></div>
              </div>
            </div>
          </div>
        </button>
      `;
    }).join("");

    overviewList.querySelectorAll("[data-roadmap]").forEach((button) => {
      button.addEventListener("click", () => {
        const roadmapName = button.dataset.roadmap;
        window.location.href = `roadmap.html?roadmap=${encodeURIComponent(roadmapName)}`;
      });
    });

    renderSidebar(null);
  };

  const renderTaskChildren = (roadmapName, parentTaskId) => {
    const tasks = getRoadmapTasks(roadmapName).filter((task) => getParentTaskIdFromTag(task.tag) === parentTaskId);
    if (tasks.length === 0) {
      return '<p class="text-xs text-on-surface-variant">No subtasks yet.</p>';
    }

    return tasks.map((task) => `
      <button class="glass-panel w-full p-3 rounded-xl border border-outline-variant/20 text-left hover:border-primary/40 transition-all subtask-card ${task.done ? 'opacity-60' : ''}" data-task-id="${task.id}" type="button">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="font-body-md text-on-surface ${task.done ? 'line-through opacity-50' : ''}">${task.title}</p>
            <p class="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">${task.xp} XP</p>
          </div>
          <span class="material-symbols-outlined text-primary text-[18px]">${task.done ? 'check_circle' : 'radio_button_unchecked'}</span>
        </div>
      </button>
    `).join("");
  };

  const renderDetailTaskPanel = (roadmapName) => {
    const detailShell = document.getElementById("roadmap-detail-shell");
    const detailList = document.getElementById("roadmap-detail-list");
    const taskDetailShell = document.getElementById("task-detail-shell");
    const addTaskBtn = document.getElementById("add-task-btn");
    const backBtn = document.getElementById("back-to-roadmaps-btn");

    if (!detailShell || !detailList) return;

    const progress = getRoadmapProgress(roadmapName);
    setText("roadmap-title", roadmapName.toUpperCase());
    setText("active-track", roadmapName.toUpperCase());
    setText("mission-count", `${progress.total} TASKS`);
    setText("primary-panel-title", `${roadmapName} Tasks`);
    setText("primary-panel-copy", "Tick tasks done, then pick any task to add subtasks under it.");
    setText("detail-roadmap-title", roadmapName.toUpperCase());
    setText("detail-roadmap-count", `${progress.total} TASKS`);
    setText("task-summary", `${progress.total} ACTIVE`);
    setText("detail-completed-count", `${progress.completed}/${progress.total}`);
    setText("detail-progress-text", `${progress.percentage}%`);

    const ring = document.getElementById("detail-progress-ring");
    if (ring) {
      const circumference = 188.5;
      const offset = circumference - (progress.percentage / 100) * circumference;
      ring.setAttribute("stroke-dasharray", `${circumference}`);
      ring.setAttribute("stroke-dashoffset", `${offset}`);
    }

    detailShell.classList.remove("hidden");
    taskDetailShell?.classList.toggle("hidden", !selectedTaskId);
    addTaskBtn?.classList.remove("hidden");
    backBtn?.classList.remove("hidden");

    const rootTasks = getRoadmapTasks(roadmapName).filter((task) => !getParentTaskIdFromTag(task.tag));

    if (rootTasks.length === 0) {
      detailList.innerHTML = '<p class="text-sm text-on-surface-variant py-8">No tasks in this roadmap yet. Use Add Task to create the first phase.</p>';
      return;
    }

    detailList.innerHTML = rootTasks.map((task, index) => {
      const childMarkup = renderTaskChildren(roadmapName, task.id);
      return `
        <div class="glass-panel rounded-xl border border-outline-variant/20 p-4 space-y-4 ${selectedTaskId === task.id ? 'roadmap-node-selected' : ''}">
          <button class="w-full text-left task-select-btn" data-task-id="${task.id}" type="button">
            <div class="flex items-center justify-between gap-3 mb-2">
              <span class="font-label-mono text-[10px] text-on-surface-variant uppercase tracking-widest">TASK_${String(index + 1).padStart(2, '0')}</span>
              <span class="font-label-caps text-[10px] ${task.done ? 'text-primary' : 'text-on-surface-variant'} uppercase">${task.done ? 'SECURED' : 'IN_PROGRESS'}</span>
            </div>
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="font-h3 text-h3 text-on-surface uppercase tracking-tighter ${task.done ? 'line-through opacity-50' : ''}">${task.title}</h3>
                <p class="text-xs text-on-surface-variant mt-2">${task.xp} XP</p>
                <p class="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">${task.done ? 'Completed' : 'Pending'}</p>
              </div>
              <span class="material-symbols-outlined text-primary text-[20px]">${task.done ? 'check_circle' : 'radio_button_unchecked'}</span>
            </div>
          </button>
          <div class="pl-2 border-l border-outline-variant/20 space-y-3">
            ${childMarkup}
          </div>
        </div>
      `;
    }).join("");

    detailList.querySelectorAll(".task-select-btn").forEach((button) => {
      button.addEventListener("click", () => {
        selectedTaskId = button.dataset.taskId;
        renderDetailTaskPanel(roadmapName);
      });
    });

    detailList.querySelectorAll("[data-task-id]").forEach((button) => {
      const task = window.Aegis.state.tasks.find((item) => item.id === button.dataset.taskId);
      if (!task) return;

      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (button.classList.contains("task-select-btn")) return;
        window.Aegis.updateTask(task.id, !task.done);
      });
    });

    updateSelectedTaskPanel(roadmapName);
    renderSidebar(roadmapName);
  };

  const updateSelectedTaskPanel = (roadmapName) => {
    const taskDetailShell = document.getElementById("task-detail-shell");
    const selectedTaskTitle = document.getElementById("selected-task-title");
    const selectedTaskMeta = document.getElementById("selected-task-meta");
    const selectedTaskToggleBtn = document.getElementById("selected-task-toggle-btn");
    const selectedTaskSubtasks = document.getElementById("selected-task-subtasks");
    const addSubtaskBtn = document.getElementById("add-subtask-btn");

    if (!taskDetailShell || !selectedTaskTitle || !selectedTaskMeta || !selectedTaskToggleBtn || !selectedTaskSubtasks || !addSubtaskBtn) {
      return;
    }

    const task = window.Aegis.state.tasks.find((item) => item.id === selectedTaskId);
    if (!task) {
      taskDetailShell.classList.add("hidden");
      return;
    }

    const subtasks = getRoadmapTasks(roadmapName).filter((item) => getParentTaskIdFromTag(item.tag) === task.id);
    selectedTaskTitle.textContent = task.title;
    selectedTaskMeta.textContent = `${task.xp} XP • ${task.done ? 'Completed' : 'In progress'}`;
    selectedTaskToggleBtn.textContent = task.done ? "Mark Undone" : "Mark Done";
    selectedTaskToggleBtn.onclick = () => {
      window.Aegis.updateTask(task.id, !task.done);
    };

    addSubtaskBtn.onclick = () => {
      addTask(roadmapName, task.id);
    };

    selectedTaskSubtasks.innerHTML = subtasks.length === 0
      ? '<p class="text-xs text-on-surface-variant">No subtasks yet.</p>'
      : subtasks.map((subtask) => `
          <button class="glass-panel w-full p-3 rounded-xl border border-outline-variant/20 text-left hover:border-primary/40 transition-all ${subtask.done ? 'opacity-60' : ''}" data-task-id="${subtask.id}" type="button">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="font-body-md text-on-surface ${subtask.done ? 'line-through opacity-50' : ''}">${subtask.title}</p>
                <p class="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">${subtask.xp} XP</p>
              </div>
              <span class="material-symbols-outlined text-primary text-[18px]">${subtask.done ? 'check_circle' : 'radio_button_unchecked'}</span>
            </div>
          </button>
        `).join("");

    selectedTaskSubtasks.querySelectorAll("[data-task-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const subtask = window.Aegis.state.tasks.find((item) => item.id === button.dataset.taskId);
        if (!subtask) return;
        window.Aegis.updateTask(subtask.id, !subtask.done);
      });
    });

    taskDetailShell.classList.remove("hidden");
  };

  const renderSidebar = (roadmapName) => {
    const container = document.getElementById("roadmap-sidebar");
    if (!container) return;

    if (!roadmapName) {
      const roadmaps = getRoadmaps();
      const completedTasks = roadmaps.reduce((total, roadmap) => total + roadmap.completed, 0);
      container.innerHTML = `
        <div class="glass-panel p-margin rounded-xl border border-outline-variant/20">
          <h3 class="font-h3 text-h3 text-on-surface uppercase tracking-tighter">Roadmap Ledger</h3>
          <p class="text-sm text-on-surface-variant mt-4">You currently have ${roadmaps.length} roadmap${roadmaps.length === 1 ? '' : 's'} and ${completedTasks} completed task${completedTasks === 1 ? '' : 's'}.</p>
          <div class="mt-6 space-y-3">
            <div class="flex items-center justify-between text-xs text-on-surface-variant">
              <span>Roadmaps</span>
              <span class="text-on-surface font-bold">${roadmaps.length}</span>
            </div>
            <div class="flex items-center justify-between text-xs text-on-surface-variant">
              <span>Completed tasks</span>
              <span class="text-on-surface font-bold">${completedTasks}</span>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const progress = getRoadmapProgress(roadmapName);
    const completed = progress.completed;
    const total = progress.total;
    const percentage = progress.percentage;
    container.innerHTML = `
      <div class="glass-panel p-margin rounded-xl border border-outline-variant/20">
        <h3 class="font-h3 text-h3 text-on-surface uppercase tracking-tighter">Mission Progress</h3>
        <p class="text-sm text-on-surface-variant mt-4">Click a task to inspect it, then add subtasks from the selected task panel.</p>
        <div class="mt-6 space-y-4">
          <div class="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Completed</span>
            <span class="text-on-surface font-bold">${completed}/${total}</span>
          </div>
          <div class="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
            <div class="h-full bg-primary aegis-glow" style="width: ${percentage}%"></div>
          </div>
          <div class="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Remaining</span>
            <span class="text-on-surface font-bold">${Math.max(total - completed, 0)}</span>
          </div>
        </div>
      </div>
    `;
  };

  const initOverviewOrDetail = () => {
    const roadmapName = getRoadmapName();
    const addTaskBtn = document.getElementById("add-task-btn");
    const backBtn = document.getElementById("back-to-roadmaps-btn");
    const missionPanel = document.getElementById("mission-panel");
    const newRoadmapBtn = document.getElementById("new-roadmap-btn");

    if (!roadmapName) {
      selectedTaskId = null;
      missionPanel?.classList.add("hidden");
      addTaskBtn?.classList.add("hidden");
      newRoadmapBtn?.classList.remove("hidden");
      backBtn?.classList.add("hidden");
      // Fetch roadmaps from Supabase if available, otherwise render overview from tasks
      fetchAndRenderRoadmaps().catch(() => renderOverview());
      return;
    }

    renderDetailTaskPanel(roadmapName);
    addTaskBtn?.classList.remove("hidden");
    backBtn?.classList.remove("hidden");
    addTaskBtn.onclick = () => addTask(roadmapName);
    newRoadmapBtn?.classList.add("hidden");
  };

  const getCurrentUserId = async () => {
    const supabase = window.AegisSupabase;
    if (!supabase) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session?.user?.id || null;
    } catch {
      return null;
    }
  };

  const fetchAndRenderRoadmaps = async () => {
    const container = document.getElementById('roadmap-overview-list');
    if (!container) return;
    const userId = await getCurrentUserId();
    if (!userId || !window.AegisApi || !window.AegisApi.fetchRoadmaps) {
      // fallback to task-derived overview
      renderOverview();
      return;
    }

    const res = await window.AegisApi.fetchRoadmaps(userId);
    if (res.error || !res.data) {
      renderOverview();
      return;
    }

    const roadmaps = res.data;
    if (!roadmaps || roadmaps.length === 0) {
      container.innerHTML = '<p class="col-span-2 text-center text-on-surface-variant py-10">No roadmaps yet. Create one using New Roadmap.</p>';
      renderSidebar(null);
      return;
    }

    container.innerHTML = roadmaps.map(r => {
      const name = r.name;
      const created = new Date(r.created_at).toLocaleDateString();
      return `
        <div class="glass-panel p-5 rounded-xl text-left border border-outline-variant/20 hover:border-primary/50 transition-all roadmap-card">
          <div class="flex items-center gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-3 mb-2">
                <h3 class="font-h3 text-h3 text-on-surface uppercase tracking-tighter truncate">${name}</h3>
                <div class="flex items-center gap-2">
                  <button data-id="${r.id}" class="edit-roadmap-btn px-3 py-1 rounded border border-outline-variant/20 text-[12px]">Edit</button>
                  <button data-id="${r.id}" class="delete-roadmap-btn px-3 py-1 rounded border border-danger/20 text-[12px]">Delete</button>
                </div>
              </div>
              <p class="text-xs text-on-surface-variant">${r.description || ''}</p>
              <p class="text-[10px] text-on-surface-variant mt-3">Created ${created}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.edit-roadmap-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const res = await window.AegisApi.getRoadmap(id);
        if (res.error || !res.data) return;
        openRoadmapModal(res.data);
      });
    });

    container.querySelectorAll('.delete-roadmap-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('Delete this roadmap? This will not delete associated tasks.')) return;
        await window.AegisApi.deleteRoadmap(id);
        fetchAndRenderRoadmaps();
      });
    });
  };

  const openRoadmapModal = (existing = null) => {
    const modal = document.getElementById('roadmap-modal');
    const nameInput = document.getElementById('roadmap-name-input');
    const descInput = document.getElementById('roadmap-desc-input');
    const form = document.getElementById('roadmap-form');
    if (!modal || !form) return;
    if (existing) {
      modal.dataset.editId = existing.id;
      nameInput.value = existing.name || '';
      descInput.value = existing.description || '';
    } else {
      delete modal.dataset.editId;
      form.reset();
    }
    modal.classList.remove('hidden');
  };

  const setupRoadmapModal = () => {
    const newBtn = document.getElementById('new-roadmap-btn');
    const closeBtn = document.getElementById('close-roadmap-modal-btn');
    const modal = document.getElementById('roadmap-modal');
    const form = document.getElementById('roadmap-form');
    if (newBtn) newBtn.addEventListener('click', () => openRoadmapModal());
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('roadmap-name-input').value.trim();
      const description = document.getElementById('roadmap-desc-input').value.trim();
      if (!name) return;
      const userId = await getCurrentUserId();
      if (!userId) return alert('Not signed in');
      const editId = modal.dataset.editId;
      if (editId) {
        await window.AegisApi.updateRoadmap(editId, { name, description });
      } else {
        await window.AegisApi.createRoadmap({ user_id: userId, name, description });
      }
      modal.classList.add('hidden');
      fetchAndRenderRoadmaps();
    });
  };

  const closeBtn = document.getElementById("mission-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      const missionPanel = document.getElementById("mission-panel");
      if (missionPanel) missionPanel.classList.add("hidden");
    });
  }

  Promise.resolve(window.Aegis?.ready).then(() => {
    setupModals();
    initOverviewOrDetail();
  });

  window.addEventListener("aegis:state-updated", () => {
    initOverviewOrDetail();
  });