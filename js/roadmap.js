  const getUrlParam = (param) => new URL(window.location).searchParams.get(param);

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  const getRoadmapCatalog = () => Array.isArray(window.Aegis.state.roadmaps) ? window.Aegis.state.roadmaps : [];

  const findRoadmapById = (roadmapId) => getRoadmapCatalog().find((roadmap) => roadmap.id === roadmapId) || null;

  const resolveRoadmapLabel = (roadmapIdOrName) => {
    if (!roadmapIdOrName) return "";
    const byId = findRoadmapById(roadmapIdOrName);
    if (byId?.name) return byId.name;
    return normalizeRoadmapName(roadmapIdOrName);
  };

  // URL may provide either a roadmap ID (preferred) or a legacy roadmap name
  const getRoadmapName = () => getUrlParam("roadmap_id") || getUrlParam("roadmap") || null;

  const isUuidLike = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}/i.test(value || "");

  const normalizeRoadmapName = (value) => (value || "").trim();

  const getRoadmapFromTag = (tag) => {
    if (!tag || !tag.startsWith("RM:")) return null;
    const [, rest = ""] = tag.split("RM:");
    return rest.split("|")[0].trim();
  };

  const getParentTaskIdFromTag = (tagOrTask) => {
    if (!tagOrTask) return null;
    if (typeof tagOrTask === 'object') return tagOrTask.parent_task_id || null;
    if (!tagOrTask.includes("PARENT:")) return null;
    const match = tagOrTask.match(/PARENT:\s*([^|]+)/i);
    return match ? match[1].trim() : null;
  };

  const getRoadmapTasks = (roadmapIdOrName) => {
    if (!roadmapIdOrName) return [];
    const resolvedRoadmap = findRoadmapById(roadmapIdOrName);
    const resolvedName = resolvedRoadmap?.name || normalizeRoadmapName(roadmapIdOrName);
    return window.Aegis.state.tasks.filter((task) => {
      if (task.roadmap_id && (task.roadmap_id === roadmapIdOrName || task.roadmap_id === resolvedRoadmap?.id)) return true;
      const rmName = getRoadmapFromTag(task.tag);
      if (rmName && rmName === resolvedName) return true;
      return false;
    });
  };

  const getRoadmaps = () => {
    const map = new Map();

    getRoadmapCatalog().forEach((roadmap) => {
      map.set(roadmap.id, {
        id: roadmap.id,
        name: roadmap.name,
        total: 0,
        completed: 0,
        rootCount: 0
      });
    });

    window.Aegis.state.tasks.forEach((task) => {
      const roadmapId = task.roadmap_id || null;
      const roadmapName = roadmapId ? (findRoadmapById(roadmapId)?.name || null) : getRoadmapFromTag(task.tag);
      const key = roadmapId || roadmapName;
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          id: roadmapId,
          name: roadmapName || String(key).slice(0, 8),
          total: 0,
          completed: 0,
          rootCount: 0
        });
      }

      const stats = map.get(key);
      stats.total += 1;
      if (task.done) stats.completed += 1;
      if (!task.parent_task_id && !getParentTaskIdFromTag(task)) stats.rootCount += 1;
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
      const roadmapParam = getRoadmapName();
      if (!roadmapParam) return;

      const titleInput = document.getElementById("task-title-input");
      const xpInput = document.getElementById("task-xp-input");
      const taskTitle = titleInput.value.trim();
      const xp = Number.parseInt(xpInput.value, 10) || 0;

      if (!taskTitle) return;

      const isId = isUuidLike(roadmapParam);
      const roadmapId = isId ? roadmapParam : null;

      let createdParent = null;
      if (roadmapId) {
        createdParent = window.Aegis.addTask(taskTitle, '', xp, roadmapId, null);
      } else {
        const tag = `RM: ${roadmapParam}`;
        createdParent = window.Aegis.addTask(taskTitle, tag, xp);
      }

      if (createdParent) {
        // Add subtasks
        const subtaskRows = subtasksContainer.querySelectorAll(".subtask-row");
        subtaskRows.forEach(row => {
          const inputs = row.querySelectorAll("input");
          const stTitle = inputs[0].value.trim();
          const stXp = Number.parseInt(inputs[1].value, 10) || 0;
          if (stTitle) {
            if (roadmapId) {
              window.Aegis.addTask(stTitle, '', stXp, roadmapId, createdParent.id);
            } else {
              window.Aegis.addTask(stTitle, `RM: ${roadmapParam} | PARENT: ${createdParent.id}`, stXp);
            }
          }
        });
      }

      taskModal.classList.add("hidden");
      addTaskForm.reset();
      subtasksContainer.innerHTML = '';
      renderDetailTaskPanel(roadmapParam);
    });

    // Add Single Subtask Modal Setup
    const closeSingleSubtaskBtn = document.getElementById("close-single-subtask-modal-btn");
    const addSingleSubtaskForm = document.getElementById("add-single-subtask-form");

    closeSingleSubtaskBtn?.addEventListener("click", () => {
      subtaskModal.classList.add("hidden");
    });

    addSingleSubtaskForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const roadmapParam = getRoadmapName();
      if (!roadmapParam || !currentTargetParentId) return;

      const titleInput = document.getElementById("subtask-title-input");
      const xpInput = document.getElementById("subtask-xp-input");
      const stTitle = titleInput.value.trim();
      const stXp = Number.parseInt(xpInput.value, 10) || 0;

      const isId = isUuidLike(roadmapParam);
      const roadmapId = isId ? roadmapParam : null;

      if (stTitle) {
        if (roadmapId) {
          window.Aegis.addTask(stTitle, '', stXp, roadmapId, currentTargetParentId);
        } else {
          window.Aegis.addTask(stTitle, `RM: ${roadmapParam} | PARENT: ${currentTargetParentId}`, stXp);
        }
      }

      subtaskModal.classList.add("hidden");
      addSingleSubtaskForm.reset();
      renderDetailTaskPanel(roadmapParam);
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

    // Render expandable roadmap cards. Clicking a card toggles an inline expansion showing root tasks.
    overviewList.innerHTML = roadmaps.map((roadmap) => {
      const key = roadmap.id || roadmap.name;
      const progress = getRoadmapProgress(key);
      const ring = renderRoadmapRing(progress.percentage);
      return `
        <div class="glass-panel p-5 rounded-xl text-left border border-outline-variant/20 transition-all roadmap-card" data-roadmap="${key}">
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
            <button class="expand-roadmap-btn material-symbols-outlined text-on-surface-variant" aria-expanded="false">expand_more</button>
          </div>
          <div class="mt-4 roadmap-expanded hidden"></div>
        </div>
      `;
    }).join("");

    // Attach toggle behavior to expand buttons
    overviewList.querySelectorAll('.roadmap-card').forEach((card) => {
      const key = card.dataset.roadmap;
      const expandBtn = card.querySelector('.expand-roadmap-btn');
      const expanded = card.querySelector('.roadmap-expanded');
      expandBtn?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const isOpen = !expanded.classList.contains('hidden');
        if (isOpen) {
          expanded.classList.add('hidden');
          expandBtn.textContent = 'expand_more';
          expandBtn.setAttribute('aria-expanded', 'false');
          return;
        }

        // Populate expanded area with root tasks for this roadmap
        const rootTasks = getRoadmapTasks(key).filter((task) => !getParentTaskIdFromTag(task));
        if (rootTasks.length === 0) {
          expanded.innerHTML = '<p class="text-sm text-on-surface-variant">No tasks for this roadmap.</p>';
        } else {
          expanded.innerHTML = rootTasks.map((task, idx) => `
            <div class="mt-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-on-surface">${task.title}</p>
                  <p class="text-xs text-on-surface-variant">${task.xp} XP</p>
                </div>
                <div class="flex items-center gap-2">
                  <button class="task-toggle-subtasks material-symbols-outlined" data-task-id="${task.id}" aria-expanded="false">keyboard_arrow_down</button>
                  <button class="mark-task-done material-symbols-outlined" data-task-id="${task.id}">${task.done ? 'check_circle' : 'radio_button_unchecked'}</button>
                </div>
              </div>
              <div class="subtasks-container mt-2 hidden" data-parent-id="${task.id}"></div>
            </div>
          `).join('');

          // Attach subtasks toggle and mark-done handlers
          expanded.querySelectorAll('.task-toggle-subtasks').forEach((btn) => {
            btn.addEventListener('click', (ev) => {
              ev.stopPropagation();
              const parentId = btn.dataset.taskId;
              const container = expanded.querySelector(`.subtasks-container[data-parent-id="${parentId}"]`);
              const isHidden = container.classList.contains('hidden');
              if (!isHidden) {
                container.classList.add('hidden');
                btn.textContent = 'keyboard_arrow_down';
                btn.setAttribute('aria-expanded', 'false');
                return;
              }
              // render subtasks
              const subtasks = getRoadmapTasks(key).filter((t) => getParentTaskIdFromTag(t) === parentId);
              if (subtasks.length === 0) {
                container.innerHTML = '<p class="text-xs text-on-surface-variant">No subtasks</p>';
              } else {
                container.innerHTML = subtasks.map(st => `
                  <div class="glass-panel p-3 rounded-xl border border-outline-variant/20 flex items-center justify-between mt-2 ${st.done ? 'opacity-60' : ''}">
                    <div>
                      <p class="font-body-md ${st.done ? 'line-through opacity-50' : ''}">${st.title}</p>
                      <p class="text-[10px] text-on-surface-variant">${st.xp} XP</p>
                    </div>
                    <button class="material-symbols-outlined toggle-subtask-done" data-subtask-id="${st.id}">${st.done ? 'check_circle' : 'radio_button_unchecked'}</button>
                  </div>
                `).join('');

                container.querySelectorAll('.toggle-subtask-done').forEach(tb => {
                  tb.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const subId = tb.dataset.subtaskId;
                    const sub = window.Aegis.state.tasks.find(t => t.id === subId);
                    if (sub) window.Aegis.updateTask(subId, !sub.done);
                  });
                });
              }
              container.classList.remove('hidden');
              btn.textContent = 'keyboard_arrow_up';
              btn.setAttribute('aria-expanded', 'true');
            });
          });

          expanded.querySelectorAll('.mark-task-done').forEach((btn) => {
            btn.addEventListener('click', (ev) => {
              ev.stopPropagation();
              const id = btn.dataset.taskId;
              const t = window.Aegis.state.tasks.find(x => x.id === id);
              if (t) window.Aegis.updateTask(id, !t.done);
            });
          });
        }

        expanded.classList.remove('hidden');
        expandBtn.textContent = 'expand_less';
        expandBtn.setAttribute('aria-expanded', 'true');
      });
    });

    renderSidebar(null);
  };

  const renderTaskChildren = (roadmapName, parentTaskId) => {
    const tasks = getRoadmapTasks(roadmapName).filter((task) => getParentTaskIdFromTag(task) === parentTaskId);
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
    const isId = isUuidLike(roadmapName);
    const roadmapLabel = resolveRoadmapLabel(roadmapName);
    setText("mission-count", `${progress.total} TASKS`);
    setText("primary-panel-title", `${roadmapLabel} Tasks`);
    setText("primary-panel-copy", "Tick tasks done, then pick any task to add subtasks under it.");
    setText("detail-roadmap-count", `${progress.total} TASKS`);
    setText("task-summary", `${progress.total} ACTIVE`);
    setText("detail-completed-count", `${progress.completed}/${progress.total}`);
    setText("detail-progress-text", `${progress.percentage}%`);

    setText("roadmap-title", roadmapLabel.toUpperCase());
    setText("active-track", roadmapLabel.toUpperCase());
    setText("detail-roadmap-title", roadmapLabel.toUpperCase());

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

    const rootTasks = getRoadmapTasks(roadmapName).filter((task) => !getParentTaskIdFromTag(task));

    if (rootTasks.length === 0) {
      detailList.innerHTML = '<p class="text-sm text-on-surface-variant py-8">No tasks in this roadmap yet. Use Add Task to create the first phase.</p>';
      return;
    }

    detailList.innerHTML = rootTasks.map((task, index) => {
      const childMarkup = renderTaskChildren(roadmapName, task.id);
      return `
        <div class="glass-panel rounded-xl border border-outline-variant/20 p-4 space-y-4 ${selectedTaskId === task.id ? 'roadmap-node-selected' : ''}">
          <div class="flex items-center justify-between mb-2">
            <div>
              <span class="font-label-mono text-[10px] text-on-surface-variant uppercase tracking-widest">TASK_${String(index + 1).padStart(2, '0')}</span>
            </div>
            <div class="flex items-center gap-2">
              <button class="task-toggle-subtasks material-symbols-outlined" data-task-id="${task.id}" aria-expanded="false">keyboard_arrow_down</button>
              <span class="font-label-caps text-[10px] ${task.done ? 'text-primary' : 'text-on-surface-variant'} uppercase">${task.done ? 'SECURED' : 'IN_PROGRESS'}</span>
            </div>
          </div>
          <button class="w-full text-left task-select-btn" data-task-id="${task.id}" type="button">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="font-h3 text-h3 text-on-surface uppercase tracking-tighter ${task.done ? 'line-through opacity-50' : ''}">${task.title}</h3>
                <p class="text-xs text-on-surface-variant mt-2">${task.xp} XP</p>
                <p class="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">${task.done ? 'Completed' : 'Pending'}</p>
              </div>
              <span class="material-symbols-outlined text-primary text-[20px]">${task.done ? 'check_circle' : 'radio_button_unchecked'}</span>
            </div>
          </button>
          <div class="pl-2 border-l border-outline-variant/20 space-y-3 task-children hidden" data-parent-id="${task.id}">
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

    // Attach toggle behavior for subtasks within the detail panel
    detailList.querySelectorAll('.task-toggle-subtasks').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const parentId = btn.dataset.taskId;
        const container = detailList.querySelector(`.task-children[data-parent-id="${parentId}"]`);
        if (!container) return;
        const isHidden = container.classList.contains('hidden');
        if (isHidden) {
          container.classList.remove('hidden');
          btn.textContent = 'keyboard_arrow_up';
          btn.setAttribute('aria-expanded', 'true');
        } else {
          container.classList.add('hidden');
          btn.textContent = 'keyboard_arrow_down';
          btn.setAttribute('aria-expanded', 'false');
        }
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

    const subtasks = getRoadmapTasks(roadmapName).filter((item) => getParentTaskIdFromTag(item) === task.id);
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

  const getLegacyRoadmapName = (roadmapName) => {
    if (!roadmapName || isUuidLike(roadmapName)) return null;
    return roadmapName;
  };

  const roadmapNameExists = (name, currentName = null) => {
    const normalized = normalizeRoadmapName(name).toLowerCase();
    const current = normalizeRoadmapName(currentName).toLowerCase();
    if (!normalized || normalized === current) return false;
    return getRoadmaps().some((roadmap) => roadmap.name.toLowerCase() === normalized);
  };

  const renameLegacyRoadmap = async (oldName, nextName) => {
    const cleanName = normalizeRoadmapName(nextName);
    if (!oldName || !cleanName || roadmapNameExists(cleanName, oldName)) return false;

    window.Aegis.state.tasks = window.Aegis.state.tasks.map((task) => {
      if (getRoadmapFromTag(task.tag) !== oldName) return task;
      const parentId = getParentTaskIdFromTag(task.tag);
      return {
        ...task,
        tag: parentId ? `RM: ${cleanName} | PARENT: ${parentId}` : `RM: ${cleanName}`
      };
    });

    await window.Aegis.save();
    window.location.href = `roadmap.html?roadmap=${encodeURIComponent(cleanName)}`;
    return true;
  };

  const deleteLocalRoadmapTasks = async (roadmapName) => {
    const beforeCount = window.Aegis.state.tasks.length;
    window.Aegis.state.tasks = window.Aegis.state.tasks.filter((task) => {
      if (task.roadmap_id && task.roadmap_id === roadmapName) return false;
      return getRoadmapFromTag(task.tag) !== roadmapName;
    });

    if (window.Aegis.state.tasks.length !== beforeCount) {
      selectedTaskId = null;
      await window.Aegis.save();
    }
  };

  const openDeleteRoadmapModal = (roadmapName) => {
    const modal = document.getElementById("delete-roadmap-modal");
    const confirmBtn = document.getElementById("confirm-delete-roadmap-btn");
    const cancelBtn = document.getElementById("cancel-delete-roadmap-btn");
    if (!modal || !confirmBtn || !cancelBtn) return;

    modal.classList.remove("hidden");
    cancelBtn.onclick = () => modal.classList.add("hidden");
    confirmBtn.onclick = async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Deleting...";
      try {
        if (isUuidLike(roadmapName) && window.AegisApi?.deleteRoadmap) {
          await window.AegisApi.deleteRoadmap(roadmapName);
        }
        await deleteLocalRoadmapTasks(roadmapName);
        window.location.href = "roadmap.html";
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Delete";
        modal.classList.add("hidden");
      }
    };
  };

  const initOverviewOrDetail = () => {
    const roadmapName = getRoadmapName();
    const addTaskBtn = document.getElementById("add-task-btn");
    const backBtn = document.getElementById("back-to-roadmaps-btn");
    const missionPanel = document.getElementById("mission-panel");
    const newRoadmapBtn = document.getElementById("new-roadmap-btn");
    const editBtn = document.getElementById("edit-roadmap-btn");
    const deleteBtn = document.getElementById("delete-roadmap-btn");
    if (!roadmapName) {
      selectedTaskId = null;
      missionPanel?.classList.add("hidden");
      addTaskBtn?.classList.add("hidden");
      if(editBtn) editBtn.classList.add("hidden");
      if(deleteBtn) deleteBtn.classList.add("hidden");
      newRoadmapBtn?.classList.remove("hidden");
      backBtn?.classList.add("hidden");
      // Fetch roadmaps from Supabase if available, otherwise render overview from tasks
      fetchAndRenderRoadmaps().catch(() => renderOverview());
      return;
    }

    const isId = isUuidLike(roadmapName);

    renderDetailTaskPanel(roadmapName);
    addTaskBtn?.classList.remove("hidden");
    backBtn?.classList.remove("hidden");
    addTaskBtn.onclick = () => addTask(roadmapName);
    newRoadmapBtn?.classList.add("hidden");

    if (editBtn) {
      editBtn.classList.remove("hidden");
      editBtn.onclick = async () => {
        if (isId && window.AegisApi?.getRoadmap) {
          const res = await window.AegisApi.getRoadmap(roadmapName);
          if (!res.error && res.data) {
            openRoadmapModal(res.data);
            return;
          }
        }

        openRoadmapModal({
          id: null,
          name: getLegacyRoadmapName(roadmapName) || roadmapName,
          description: ""
        });
      };
    }

    if (deleteBtn) {
      deleteBtn.classList.remove("hidden");
      deleteBtn.onclick = () => openDeleteRoadmapModal(roadmapName);
    }
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
      btn.addEventListener('click', async (event) => {
        event.stopPropagation();
        const id = btn.dataset.id;
        const res = await window.AegisApi.getRoadmap(id);
        if (res.error || !res.data) return;
        openRoadmapModal(res.data);
      });
    });

    container.querySelectorAll('.delete-roadmap-btn').forEach(btn => {
      btn.addEventListener('click', async (event) => {
        event.stopPropagation();
        const id = btn.dataset.id;
        openDeleteRoadmapModal(id);
      });
    });
  };

  const openRoadmapModal = (existing = null) => {
    const modal = document.getElementById('roadmap-modal');
    const nameInput = document.getElementById('roadmap-name-input');
    const descInput = document.getElementById('roadmap-desc-input');
    const form = document.getElementById('roadmap-form');
    const titleEle = document.getElementById('roadmap-modal-title');
    const descEle = document.getElementById('roadmap-modal-desc');
    const submitBtn = document.getElementById('roadmap-modal-submit-btn');

    if (!modal || !form) return;
    if (existing) {
      modal.dataset.editId = existing.id || "";
      modal.dataset.legacyName = existing.id ? "" : (existing.name || "");
      nameInput.value = existing.name || '';
      descInput.value = existing.description || '';
      if (titleEle) titleEle.textContent = 'Edit Roadmap';
      if (descEle) descEle.textContent = 'Modify roadmap details';
      if (submitBtn) submitBtn.textContent = 'Save Changes';
    } else {
      delete modal.dataset.editId;
      delete modal.dataset.legacyName;
      form.reset();
      if (titleEle) titleEle.textContent = 'New Roadmap';
      if (descEle) descEle.textContent = 'Create a roadmap entry';
      if (submitBtn) submitBtn.textContent = 'Create Roadmap';
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
      const editId = modal.dataset.editId || "";
      const legacyName = modal.dataset.legacyName || "";
      if (editId) {
        await window.AegisApi.updateRoadmap(editId, { name, description });
      } else if (legacyName) {
        await renameLegacyRoadmap(legacyName, name);
        return;
      } else if (userId && window.AegisApi?.createRoadmap) {
        const res = await window.AegisApi.createRoadmap({ user_id: userId, name, description });
        if (!res.error && res.data?.id) {
          window.location.href = `roadmap.html?roadmap_id=${encodeURIComponent(res.data.id)}`;
          return;
        }
      } else {
        window.Aegis.addTask(`Start ${name}`, `RM: ${name}`, 0);
        window.location.href = `roadmap.html?roadmap=${encodeURIComponent(name)}`;
        return;
      }
      modal.classList.add('hidden');
      const activeName = getRoadmapName();
      if (activeName) {
        renderDetailTaskPanel(activeName);
      } else {
        fetchAndRenderRoadmaps();
      }
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
    setupRoadmapModal();
    initOverviewOrDetail();
  });

  window.addEventListener("aegis:state-updated", () => {
    initOverviewOrDetail();
  });
