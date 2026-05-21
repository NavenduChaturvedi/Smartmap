const AEGIS_AI_ENDPOINT = "http://127.0.0.1:8765/api/ai/chat";

const buildAegisAiContext = () => {
  const state = window.Aegis?.state || {};
  const roadmaps = (state.roadmaps || []).map((roadmap) => ({
    name: roadmap.name,
    total: 0,
    completed: 0,
    percentage: 0
  }));

  const roadmapById = new Map((state.roadmaps || []).map((roadmap, index) => [roadmap.id, roadmaps[index]]));

  (state.tasks || []).forEach((task) => {
    if (!task.roadmap_id || !roadmapById.has(task.roadmap_id)) return;
    const entry = roadmapById.get(task.roadmap_id);
    entry.total += 1;
    if (task.done) entry.completed += 1;
    entry.percentage = entry.total === 0 ? 0 : Math.round((entry.completed / entry.total) * 100);
  });

  return {
    page: document.title,
    commanderName: state.commanderName,
    stats: {
      streak: state.streak || 0,
      totalXp: state.totalXp || 0,
      roadmapsActive: state.roadmapsActive || 0,
      pendingTasks: (state.tasks || []).filter((task) => !task.done).length
    },
    roadmaps: roadmaps.slice(0, 6),
    tasks: (state.tasks || [])
      .slice(0, 8)
      .map((task) => ({ title: task.title, done: Boolean(task.done), xp: Number(task.xp || 0) }))
  };
};

const formatAegisAiError = (payload, statusCode) => {
  const message = payload?.error || "Gemini request failed";
  const details = typeof payload?.details === "string" ? payload.details.trim() : "";
  const suggestion = statusCode === 429
    ? "Check Gemini quota, billing, or rate limits, then try again."
    : "Check the proxy logs for the backend response.";

  const lines = [
    `AI unavailable (${statusCode || "unknown"}): ${message}`
  ];

  if (details) {
    lines.push("");
    lines.push(details);
  }

  lines.push("");
  lines.push(suggestion);

  return lines.join("\n");
};

const initAegisAiAssistant = () => {
  const promptInput = document.getElementById("ai-prompt-input");
  const submitButton = document.getElementById("ai-submit-btn");
  const responseBox = document.getElementById("ai-response-output");
  const statusLabel = document.getElementById("ai-status-label");

  if (!promptInput || !submitButton || !responseBox) return;

  if (!promptInput.value.trim()) {
    promptInput.value = "Review my current progress and suggest the 3 highest-leverage next actions.";
  }

  const setBusy = (isBusy) => {
    submitButton.disabled = isBusy;
    submitButton.classList.toggle("opacity-60", isBusy);
    submitButton.classList.toggle("cursor-wait", isBusy);
    if (statusLabel) {
      statusLabel.textContent = isBusy ? "Thinking with Gemini..." : "Uses GEMINI_API_KEY via local proxy";
    }
  };

  const runPrompt = async () => {
    const prompt = promptInput.value.trim();
    if (!prompt) {
      responseBox.textContent = "Type a prompt first.";
      return;
    }

    setBusy(true);
    responseBox.textContent = "Contacting Gemini...";

    try {
      const response = await fetch(AEGIS_AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          context: buildAegisAiContext(),
          model: "gemini-2.0-flash"
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        const error = new Error(payload.error || "Gemini request failed");
        error.statusCode = response.status;
        error.details = payload.details;
        throw error;
      }

      responseBox.textContent = payload.reply || "Gemini returned an empty response.";
    } catch (error) {
      responseBox.textContent = formatAegisAiError({ error: error.message, details: error.details }, error.statusCode);
    } finally {
      setBusy(false);
    }
  };

  submitButton.addEventListener("click", runPrompt);
  promptInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runPrompt();
    }
  });
};

Promise.resolve(window.Aegis?.ready).then(initAegisAiAssistant);