  const getUrlParam = (param) => {
    const url = new URL(window.location);
    return url.searchParams.get(param);
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

  const renderRoadmapTasks = () => {
    const roadmapName = getRoadmapName();
    const tasks = getRoadmapTasks(roadmapName);
    const listEl = document.getElementById("roadmap-tasks-list");
    const missionPanel = document.getElementById("mission-panel");
    const roadmapTitle = document.getElementById("roadmap-title");
    const activeTrack = document.getElementById("active-track");
    const missionCount = document.getElementById("mission-count");

    if (!roadmapName) {
      listEl.innerHTML = '<p class="col-span-2 text-center text-on-surface-variant py-8">No roadmap selected. Go to dashboard to create or select one.</p>';
      missionPanel.classList.add("hidden");
      roadmapTitle.textContent = "ROADMAP GRID";
      activeTrack.textContent = "NO_ROADMAP";
      missionCount.textContent = "0 ACTIVE";
      renderRouteStatus(null);
      renderSidebar(null);
      return;
    }

    roadmapTitle.textContent = roadmapName.toUpperCase();
    activeTrack.textContent = roadmapName.toUpperCase();
    missionCount.textContent = `${tasks.length} ACTIVE`;

    if (tasks.length === 0) {
      listEl.innerHTML = '<p class="col-span-2 text-center text-on-surface-variant py-8">No tasks in this roadmap yet.</p>';
      renderRouteStatus(roadmapName);
      renderSidebar(roadmapName);
      return;
    }

    listEl.innerHTML = tasks
      .map((task, idx) => {
        const status = task.done ? "SECURED" : "IN_PROGRESS";
        const badgeClass = task.done ? "text-primary" : "text-primary";
        return `
          <button class="roadmap-node glass-panel p-5 rounded-xl text-left border border-outline-variant/20 hover:border-primary/50 transition-all" data-task-id="${task.id}" data-task-title="${task.title}">
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
        const taskTitle = btn.dataset.taskTitle;
        selectTask(taskId, taskTitle);
      });
    });

    renderRouteStatus(roadmapName);
    renderSidebar(roadmapName);
  };

  const selectTask = (taskId, taskTitle) => {
    const task = window.Aegis.state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    document.getElementById("mission-title").textContent = task.title;
    document.getElementById("mission-description").textContent = `XP Value: ${task.xp}`;
    document.getElementById("mission-reward").textContent = `${task.xp} XP`;
    document.getElementById("mission-action").textContent = task.done ? "COMPLETED" : "MARK_DONE";
    document.getElementById("mission-action-btn").dataset.taskId = taskId;
    document.getElementById("mission-subnodes").innerHTML = '';
    document.getElementById("mission-panel").classList.remove("hidden");
  };

  const renderRouteStatus = (roadmapName) => {
    const container = document.getElementById("route-status-cards");
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
      document.getElementById("mission-panel").classList.add("hidden");
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

  renderRoadmapTasks();
  window.addEventListener("aegis:state-updated", renderRoadmapTasks);