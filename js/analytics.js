  let activityChart = null;

  const formatLocalDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getLocalDateKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return formatLocalDateKey(date);
  };

  const getLastSevenDays = () => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return date;
    });
  };

  const getDayLabel = (date) => date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  const buildChartData = (tasks) => {
    const days = getLastSevenDays();
    const counts = new Map(days.map((day) => [formatLocalDateKey(day), 0]));
    const startKey = formatLocalDateKey(days[0]);
    const endKey = formatLocalDateKey(days[days.length - 1]);

    tasks.forEach((task) => {
      if (!task.done) return;
      const completedKeySource = task.completed_at || task.created_at;
      if (!completedKeySource) return;
      const key = getLocalDateKey(completedKeySource);
      if (!key || key < startKey || key > endKey) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return {
      labels: days.map(getDayLabel),
      counts: days.map((day) => counts.get(formatLocalDateKey(day)) || 0)
    };
  };

  const renderAnalytics = () => {
    const state = window.Aegis.state;
    const completedTasks = state.tasks.filter((task) => task.done).length;
    const pendingTasks = state.tasks.filter((task) => !task.done).length;
    const throughput = state.tasks.length ? (completedTasks / state.tasks.length) * 5 : 0;

    const days = getLastSevenDays();
    const lastSevenDayKeys = new Set(days.map((day) => formatLocalDateKey(day)));
    const weeklyDelta = state.tasks.reduce((total, task) => {
      if (!task.done) return total;
      const completedKeySource = task.completed_at || task.created_at;
      if (!completedKeySource) return total;
      const completedKey = getLocalDateKey(completedKeySource);
      return completedKey && lastSevenDayKeys.has(completedKey) ? total + 1 : total;
    }, 0);

    document.getElementById("analytics-task-metrics").textContent = String(completedTasks);
    document.getElementById("analytics-weekly-delta").textContent = `+${weeklyDelta} WK_TOTAL`;
    document.getElementById("analytics-xp").textContent = Number(state.totalXp || 0).toLocaleString();
    document.getElementById("analytics-throughput").textContent = throughput.toFixed(1);
    document.getElementById("analytics-streak").textContent = String(state.streak || 0);

    const summaryComplete = document.getElementById("analytics-summary-complete");
    const summaryPending = document.getElementById("analytics-summary-pending");
    if (summaryComplete) summaryComplete.textContent = String(completedTasks);
    if (summaryPending) summaryPending.textContent = String(pendingTasks);

    const chartCanvas = document.getElementById("analytics-activity-chart");
    if (!chartCanvas || !window.Chart) return;

    const chartData = buildChartData(state.tasks);
    const chartConfig = {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: [{
          label: "Completed Tasks",
          data: chartData.counts,
          backgroundColor: "rgba(96, 165, 250, 0.8)",
          borderColor: "rgba(96, 165, 250, 1)",
          borderWidth: 1,
          borderRadius: 10,
          maxBarThickness: 28
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 400
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "#f8fafc",
            bodyColor: "#f8fafc",
            borderColor: "rgba(148, 163, 184, 0.25)",
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: "rgba(226, 232, 240, 0.8)"
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: "rgba(226, 232, 240, 0.8)"
            },
            grid: {
              color: "rgba(148, 163, 184, 0.12)"
            }
          }
        }
      }
    };

    if (activityChart) {
      activityChart.data.labels = chartConfig.data.labels;
      activityChart.data.datasets[0].data = chartConfig.data.datasets[0].data;
      activityChart.update();
      return;
    }

    activityChart = new window.Chart(chartCanvas, chartConfig);
  };

  Promise.resolve(window.Aegis?.ready).then(renderAnalytics);
  window.addEventListener("aegis:state-updated", renderAnalytics);