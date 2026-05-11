const state = window.Aegis.state;

  const renderStats = () => {
    const pending = state.tasks.filter((task) => !task.done).length;
    document.getElementById("stat-roadmaps").textContent = String(state.roadmapsActive).padStart(2, "0");
    document.getElementById("stat-pending").textContent = String(pending).padStart(2, "0");
    document.getElementById("stat-streak").textContent = String(state.streak);
    document.getElementById("stat-xp").textContent = state.totalXp.toLocaleString();
    document.getElementById("objective-status").textContent = pending > 0 ? "STATUS: NOMINAL" : "STATUS: CLEAR";
  };

  const renderTasks = () => {
    const list = document.getElementById("objectives-list");
    list.innerHTML = state.tasks.map((task) => {
      const base = "glass-panel p-4 flex items-center gap-4 transition-all cursor-pointer";
      const doneClass = task.done ? "border-l-4 border-primary aegis-glow" : "border-l-4 border-outline-variant hover:border-primary group";
      const icon = task.done ? "check_circle" : "circle";
      const titleClass = task.done ? "font-body-md text-on-surface opacity-40 line-through" : "font-body-md text-on-surface";
      const xpClass = task.done ? "font-label-mono text-primary text-xs" : "font-label-mono text-on-surface-variant text-xs group-hover:text-primary";
      const iconClass = task.done ? "material-symbols-outlined text-primary" : "material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors";
      return `
        <button class="${base} ${doneClass}" data-task-id="${task.id}" type="button">
          <span class="${iconClass}">${icon}</span>
          <div class="flex-1 text-left">
            <p class="${titleClass}">${task.title}</p>
            <p class="font-label-mono text-[10px] text-on-surface-variant uppercase">${task.tag}</p>
          </div>
          <div class="${xpClass}">+${task.xp}_XP</div>
        </button>
      `;
    }).join("");

    list.querySelectorAll("[data-task-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const taskId = button.dataset.taskId;
        state.tasks = state.tasks.map((task) => {
          if (task.id !== taskId) return task;
          const nextDone = !task.done;
          state.totalXp += nextDone ? task.xp : -task.xp;
          return { ...task, done: nextDone };
        });
        window.Aegis.save();
        renderStats();
        renderTasks();
      });
    });
  };

  renderStats();
  renderTasks();