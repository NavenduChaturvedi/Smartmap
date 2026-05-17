  const getUrlParam = (param) => {
    const url = new URL(window.location);
    return url.searchParams.get(param);
  };

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  };

  const getRoadmapName = () => {
    return getUrlParam("roadmap") || null;
  };

  const getRoadmapTasks = (roadmapName) => {
    if (!roadmapName) return [];
    return window.Aegis.state.tasks.filter(
      (task) => task.tag && task.tag.startsWith(`RM: ${roadmapName}`)
    );
  };

  const createRoadmapTask = () => {
    const currentRoadmap = getRoadmapName();
    const roadmapName = currentRoadmap || prompt("Enter roadmap name:");
    if (!roadmapName || !roadmapName.trim()) return;

    const taskTitle = prompt(`Enter task title for ${roadmapName.trim()}:`);
    if (!taskTitle || !taskTitle.trim()) return;

    window.Aegis.addTask(taskTitle.trim(), `RM: ${roadmapName.trim()}`, 0);

    if (!currentRoadmap) {
      window.location.href = `roadmap.html?roadmap=${encodeURIComponent(roadmapName.trim())}`;
    }
  };

  const renderRoadmapTasks = () => {
    const roadmapName = getRoadmapName();
    const tasks = getRoadmapTasks(roadmapName);
    const listEl = document.getElementById("roadmap-tasks-list");
    const summaryEl = document.getElementById("task-summary");
    const missionPanel = document.getElementById("mission-panel");
    const roadmapTitle = document.getElementById("roadmap-title");
    const activeTrack = document.getElementById("active-track");
    const missionCount = document.getElementById("mission-count");

    if (!listEl) return;

    if (summaryEl) {
      summaryEl.textContent = `${tasks.length} ACTIVE`;
    }

    if (!roadmapName) {
      listEl.innerHTML = '<p class="col-span-2 text-center text-on-surface-variant py-8">No roadmap selected. Create one from the dashboard or use Add Task to start a new route.</p>';
      missionPanel?.classList.add("hidden");
      setText("roadmap-title", "ROADMAP GRID");
      setText("active-track", "NO_ROADMAP");
      setText("mission-count", "0 ACTIVE");
      renderRouteStatus(null);
      renderSidebar(null);
      return;
    }

    setText("roadmap-title", roadmapName.toUpperCase());
    setText("active-track", roadmapName.toUpperCase());
    setText("mission-count", `${tasks.length} ACTIVE`);

    if (tasks.length === 0) {
      listEl.innerHTML = '<p class="col-span-2 text-center text-on-surface-variant py-8">No tasks in this roadmap yet. Use Add Task to create the first one.</p>';
      renderRouteStatus(roadmapName);
      renderSidebar(roadmapName);
      return;
    }

    listEl.innerHTML = tasks
      .map((task, idx) => {
        const status = task.done ? "SECURED" : "IN_PROGRESS";
        const badgeClass = task.done ? "text-primary" : "text-primary";
        return `
          <button class="roadmap-node glass-panel p-5 rounded-xl text-left border border-outline-variant/20 hover:border-primary/50 transition-all" data-task-id="${task.id}">
            <div class="flex items-center justify-between mb-3">
              <span class="font-label-mono text-[10px] text-on-surface-variant uppercase">TASK_${String(idx + 1).padStart(2, "0")}</span>
              <span class="font-label-caps text-[10px] ${badgeClass} uppercase">${status}</span>
            </div>
            <h3 class="font-h3 text-lg text-on-surface font-bold">${task.title}</h3>
            <p class="text-xs text-on-surface-variant mt-2">${task.xp} XP</p>
          </button>
        `;
      })
      .join("");

    // Wire task clicks
    listEl.querySelectorAll(".roadmap-node").forEach((btn) => {
      btn.addEventListener("click", () => {
        const taskId = btn.dataset.taskId;
        selectTask(taskId);
      });
    });

    renderRouteStatus(roadmapName);
    renderSidebar(roadmapName);
  };

  const selectTask = (taskId) => {
    const task = window.Aegis.state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    setText("mission-title", task.title);
    setText("mission-description", `XP Value: ${task.xp}`);
    setText("mission-reward", `${task.xp} XP`);
    setText("mission-action", task.done ? "COMPLETED" : "MARK_DONE");
    const actionBtn = document.getElementById("mission-action-btn");
    if (actionBtn) {
      actionBtn.dataset.taskId = taskId;
    }
    const missionSubnodes = document.getElementById("mission-subnodes");
    if (missionSubnodes) {
      missionSubnodes.innerHTML = "";
    }
    document.getElementById("mission-panel")?.classList.remove("hidden");
  };

  const renderRouteStatus = (roadmapName) => {
    const container = document.getElementById("route-status-cards");
    if (!container) return;
    if (!roadmapName) {
      container.innerHTML = '';
      return;
    }
    const tasks = getRoadmapTasks(roadmapName);
    const completed = tasks.filter((t) => t.done).length;
    const total = tasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    container.innerHTML = `
      <div class="glass-panel p-5 rounded-xl border border-outline-variant/20">
        <p class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest">Tasks Cleared</p>
        <p class="font-h2 text-h2 text-primary mt-3">${completed}</p>
        <p class="text-xs text-on-surface-variant mt-1">${percentage}% completion</p>
      </div>
      <div class="glass-panel p-5 rounded-xl border border-outline-variant/20">
        <p class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest">Total Tasks</p>
        <p class="font-h2 text-h2 text-primary mt-3">${total}</p>
        <p class="text-xs text-on-surface-variant mt-1">In roadmap</p>
      </div>
      <div class="glass-panel p-5 rounded-xl border border-outline-variant/20">
        <p class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest">Road Progress</p>
        <p class="font-h2 text-h2 text-primary mt-3">${percentage}%</p>
        <p class="text-xs text-on-surface-variant mt-1">Overall</p>
      </div>
    `;
  };

  const renderSidebar = (roadmapName) => {
    const container = document.getElementById("roadmap-sidebar");
    if (!container) return;
    if (!roadmapName) {
      container.innerHTML = '';
      return;
    }
    const tasks = getRoadmapTasks(roadmapName);
    const completed = tasks.filter((t) => t.done).length;
    const inProgress = tasks.filter((t) => !t.done).length;
    const percentage = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

    container.innerHTML = `
      <div class="glass-panel p-margin rounded-xl border border-outline-variant/20">
        <h3 class="font-h3 text-h3 text-on-surface uppercase tracking-tighter">Mission Progress</h3>
        <p class="text-sm text-on-surface-variant mt-4">Click a task to view details and mark as complete.</p>
        <div class="mt-6 space-y-3">
          <div class="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Completed</span>
            <span class="text-on-surface font-bold">${completed}/${tasks.length}</span>
          </div>
          <div class="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
            <div class="h-full bg-primary aegis-glow" style="width: ${percentage}%"></div>
          </div>
          <div class="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Remaining</span>
            <span class="text-on-surface font-bold">${inProgress}</span>
          </div>
        </div>
      </div>
    `;
  };

  // Wire close button
  const closeBtn = document.getElementById("mission-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.getElementById("mission-panel")?.classList.add("hidden");
    });
  }

  // Wire action button
  const actionBtn = document.getElementById("mission-action-btn");
  if (actionBtn) {
    actionBtn.addEventListener("click", () => {
      const taskId = actionBtn.dataset.taskId;
      if (taskId) {
        window.Aegis.updateTask(taskId, true);
      }
    });
  }

  const addTaskBtn = document.getElementById("add-task-btn");
  if (addTaskBtn) {
    addTaskBtn.addEventListener("click", createRoadmapTask);
  }

  Promise.resolve(window.Aegis?.ready).then(renderRoadmapTasks);
  window.addEventListener("aegis:state-updated", renderRoadmapTasks);