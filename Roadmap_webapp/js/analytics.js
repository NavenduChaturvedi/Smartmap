const AEGIS_STORAGE_KEY = "aegis_state_v1";
  const defaultState = { totalXp: 4250, streak: 12, tasks: [] };
  const readState = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(AEGIS_STORAGE_KEY) || "{}");
      return { ...defaultState, ...parsed, tasks: parsed.tasks || [] };
    } catch {
      return { ...defaultState };
    }
  };

  const state = readState();
  const completedTasks = state.tasks.filter((task) => task.done).length;
  const pendingTasks = state.tasks.filter((task) => !task.done).length;
  const throughput = state.tasks.length ? (completedTasks / state.tasks.length) * 5 : 0;
  const weeklyDelta = Math.max(2, Math.round(completedTasks * 0.8));

  document.getElementById("analytics-task-metrics").textContent = String(completedTasks);
  document.getElementById("analytics-weekly-delta").textContent = `+${weeklyDelta} WK_TOTAL`;
  document.getElementById("analytics-xp").textContent = Number(state.totalXp || 0).toLocaleString();
  document.getElementById("analytics-throughput").textContent = throughput.toFixed(1);
  document.getElementById("analytics-streak").textContent = String(state.streak || 0);

  // Make chart/heatmap slightly react to current workload without redrawing SVG paths.
  const heatmapCells = document.querySelectorAll(".glass-panel .w-3\\.5");
  heatmapCells.forEach((cell, index) => {
    if (index < completedTasks) cell.style.opacity = "0.9";
    if (index > completedTasks + pendingTasks) cell.style.opacity = "0.08";
  });