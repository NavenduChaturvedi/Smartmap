  const renderAnalytics = () => {
    const state = window.Aegis.state;
    const completedTasks = state.tasks.filter((task) => task.done).length;
    const pendingTasks = state.tasks.filter((task) => !task.done).length;
    const throughput = state.tasks.length ? (completedTasks / state.tasks.length) * 5 : 0;
    const weeklyDelta = Math.max(2, Math.round(completedTasks * 0.8));

    document.getElementById("analytics-task-metrics").textContent = String(completedTasks);
    document.getElementById("analytics-weekly-delta").textContent = `+${weeklyDelta} WK_TOTAL`;
    document.getElementById("analytics-xp").textContent = Number(state.totalXp || 0).toLocaleString();
    document.getElementById("analytics-throughput").textContent = throughput.toFixed(1);
    document.getElementById("analytics-streak").textContent = String(state.streak || 0);

    const summaryComplete = document.getElementById("analytics-summary-complete");
    const summaryPending = document.getElementById("analytics-summary-pending");
    if (summaryComplete) summaryComplete.textContent = String(completedTasks);
    if (summaryPending) summaryPending.textContent = String(pendingTasks);

    // Make chart/heatmap slightly react to current workload without redrawing SVG paths.
    const heatmapCells = document.querySelectorAll(".glass-panel .w-3\\.5");
    heatmapCells.forEach((cell, index) => {
      if (index < completedTasks) cell.style.opacity = "0.9";
      if (index > completedTasks + pendingTasks) cell.style.opacity = "0.08";
    });
  };

  renderAnalytics();
  window.addEventListener("aegis:state-updated", renderAnalytics);