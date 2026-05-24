const LOCAL_AEGIS_AI_ENDPOINT = "http://127.0.0.1:8765/api/ai/chat";
const DEPLOYED_AEGIS_AI_ENDPOINT = "/api/ai/chat";

const resolveAegisAiEndpoint = () => {
  const hostname = window.location.hostname || "";
  if (window.location.protocol === "file:" || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "") {
    return LOCAL_AEGIS_AI_ENDPOINT;
  }

  return DEPLOYED_AEGIS_AI_ENDPOINT;
};

const AEGIS_AI_ENDPOINT = resolveAegisAiEndpoint();

const getCurrentUserId = async () => {
  if (!window.AegisSupabase?.auth?.getSession) return null;
  const sessionRes = await window.AegisSupabase.auth.getSession();
  return sessionRes?.data?.session?.user?.id || null;
};

const buildAegisAiContext = () => {
  const state = window.Aegis?.state || {};
  return {
    page: document.title,
    commanderName: state.commanderName,
    stats: {
      streak: state.streak || 0,
      totalXp: state.totalXp || 0,
      roadmapsActive: state.roadmapsActive || 0,
      pendingTasks: (state.tasks || []).filter((task) => !task.done).length
    },
    roadmaps: (state.roadmaps || []).slice(0, 6).map((roadmap) => ({
      id: roadmap.id,
      name: roadmap.name,
      description: roadmap.description || ""
    })),
    tasks: (state.tasks || [])
      .slice(0, 10)
      .map((task) => ({
        title: task.title,
        done: Boolean(task.done),
        xp: Number(task.xp || 0),
        roadmap_id: task.roadmap_id || null,
        parent_task_id: task.parent_task_id || null
      }))
  };
};

const formatAegisAiError = (payload, statusCode) => {
  const message = payload?.error || "Gemini request failed";
  const details = typeof payload?.details === "string" ? payload.details.trim() : "";
  const lines = [`AI unavailable (${statusCode || "unknown"}): ${message}`];

  if (details) {
    lines.push("");
    lines.push(details);
  }

  lines.push("");
  lines.push("Check the proxy logs and Gemini quota, then try again.");
  return lines.join("\n");
};

const schemaPrompt = `You are RoadmapOS Planner. Return ONLY valid JSON with this exact shape:
{
  "roadmap": { "name": "string", "description": "string" },
  "tasks": [
    {
      "title": "string",
      "xp": number,
      "subtasks": [
        {
          "title": "string",
          "xp": number,
          "subtasks": []
        }
      ]
    }
  ]
}

Rules:
- Include 3 to 8 top-level tasks.
- Include subtasks only when useful.
- Use integers for xp.
- No markdown fences, comments, or extra keys.`;

const extractJsonText = (text) => {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;

  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const block = fenced[1].trim();
    try {
      JSON.parse(block);
      return block;
    } catch {
      // continue
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const block = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      JSON.parse(block);
      return block;
    } catch {
      return null;
    }
  }

  return null;
};

// Infer an ordering number from a task title (e.g. "Day 3", "Days 1-4", "Week 2", "Phase 1").
const extractOrderFromTitle = (title) => {
  if (!title || typeof title !== "string") return 1e9;
  const t = title.toLowerCase();
  // match day/week/phase followed by number (capture first number in ranges)
  const m = t.match(/\b(?:day|days|week|weeks|phase|ph)\b\s*(\d{1,4})/i);
  if (m && m[1]) return Number(m[1]);
  // fallback: find first standalone number
  const m2 = t.match(/\b(\d{1,4})\b/);
  if (m2 && m2[1]) return Number(m2[1]);
  // common terms that indicate post/after -> put at end
  if (t.includes("post") || t.includes("after") || t.includes("launch")) return 1e6;
  return 1e9;
};

const normalizeTaskNode = (node) => {
  // Accept either an object node {title,xp,subtasks} or a simple string node for subtasks
  if (typeof node === "string") {
    const title = node.trim();
    if (!title) return null;
    return { title, xp: 0, subtasks: [] };
  }

  const title = typeof node?.title === "string" ? node.title.trim() : "";
  if (!title) return null;

  const xp = Number.isFinite(Number(node?.xp)) ? Math.max(0, Math.trunc(Number(node.xp))) : 0;
  const subtasks = Array.isArray(node?.subtasks)
    ? node.subtasks.map(normalizeTaskNode).filter(Boolean)
    : [];

  const explicitOrder = Number.isFinite(Number(node?.order)) ? Number(node.order) : undefined;
  const inferred = extractOrderFromTitle(title);
  const order = explicitOrder !== undefined ? explicitOrder : inferred;

  return { title, xp, subtasks, order };
};

const normalizePlan = (payload) => {
  const roadmapName = typeof payload?.roadmap?.name === "string" ? payload.roadmap.name.trim() : "";
  const roadmapDescription = typeof payload?.roadmap?.description === "string" ? payload.roadmap.description.trim() : "";
  const tasks = Array.isArray(payload?.tasks) ? payload.tasks.map(normalizeTaskNode).filter(Boolean) : [];

  if (!roadmapName || tasks.length === 0) return null;
  return {
    roadmap: { name: roadmapName, description: roadmapDescription },
    tasks
  };
};

const createTaskTree = async (tasks, roadmapId, parentTaskId = null) => {
  const created = [];

  // Sort tasks by `order` (inferred from title or provided explicitly) to preserve chronological intent
  const tasksOrdered = (Array.isArray(tasks) ? tasks.slice() : []).sort((a, b) => {
    const oa = Number(a?.order ?? 1e9);
    const ob = Number(b?.order ?? 1e9);
    return oa - ob;
  });

  for (const task of tasksOrdered) {
    const newTask = window.Aegis.addTask(task.title, "", task.xp, roadmapId, parentTaskId);
    created.push(newTask);
    if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      const childTasks = await createTaskTree(task.subtasks, roadmapId, newTask.id);
      created.push(...childTasks);
    }
  }

  return created;
};

const initAegisRoadmapCreator = () => {
  const promptInput = document.getElementById("ai-roadmap-prompt");
  const submitButton = document.getElementById("ai-roadmap-run-btn");
  const previewBox = document.getElementById("ai-roadmap-preview");
  const statusLabel = document.getElementById("ai-roadmap-status");
  const errorBox = document.getElementById("ai-roadmap-error");
  const summaryBox = document.getElementById("ai-roadmap-summary");

  if (!promptInput || !submitButton || !previewBox || !errorBox || !summaryBox) return;

  const setBusy = (isBusy) => {
    submitButton.disabled = isBusy;
    submitButton.classList.toggle("opacity-60", isBusy);
    submitButton.classList.toggle("cursor-wait", isBusy);
    if (statusLabel) {
      statusLabel.textContent = isBusy
        ? "Planning roadmap..."
        : AEGIS_AI_ENDPOINT === LOCAL_AEGIS_AI_ENDPOINT
          ? "Uses Gemini via local proxy"
          : "Uses Gemini via Vercel API";
    }
  };

  const setError = (message) => {
    if (!message) {
      errorBox.textContent = "";
      errorBox.classList.add("hidden");
      return;
    }

    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
  };

  const renderPreview = (plan) => {
    if (!plan) {
      previewBox.innerHTML = '<p class="text-sm text-on-surface-variant">No plan yet. Describe the roadmap you want and run the command.</p>';
      summaryBox.textContent = "Waiting for your command.";
      return;
    }

    const topLevelCount = plan.tasks.length;
    const subtaskCount = plan.tasks.reduce((total, task) => total + task.subtasks.length, 0);
    summaryBox.textContent = `${topLevelCount} tasks · ${subtaskCount} subtasks · ${plan.roadmap.name}`;

    previewBox.innerHTML = `
      <div class="space-y-4">
        <div class="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
          <p class="font-label-caps text-label-caps uppercase tracking-[0.25em] text-on-surface-variant">Roadmap</p>
          <h3 class="mt-2 text-xl font-semibold text-on-surface">${plan.roadmap.name}</h3>
          <p class="mt-2 text-sm text-on-surface-variant">${plan.roadmap.description || "No description provided."}</p>
        </div>
        <div class="space-y-3">
          ${plan.tasks.map((task) => `
            <div class="rounded-2xl border border-outline-variant/20 bg-white/3 p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-medium text-on-surface">${task.title}</p>
                  <p class="text-xs uppercase tracking-[0.2em] text-on-surface-variant mt-1">${task.xp} XP</p>
                </div>
                <span class="rounded-full border border-primary/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-primary">Task</span>
              </div>
              ${task.subtasks.length > 0 ? `
                <div class="mt-3 space-y-2 border-t border-outline-variant/20 pt-3">
                  ${task.subtasks.map((subtask) => `
                    <div class="flex items-center justify-between rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 py-2">
                      <span class="text-sm text-on-surface-variant">${subtask.title}</span>
                      <span class="text-[10px] uppercase tracking-[0.2em] text-primary">${subtask.xp} XP</span>
                    </div>
                  `).join("")}
                </div>
              ` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  };

  const runCommand = async () => {
    const command = promptInput.value.trim();
    if (!command) {
      setError("Describe the roadmap first.");
      return;
    }

    await Promise.resolve(window.Aegis?.ready);
    if (!window.Aegis?.state) {
      setError("Aegis state is not ready yet.");
      return;
    }

    setBusy(true);
    setError("");
    previewBox.innerHTML = '<p class="text-sm text-on-surface-variant">Thinking...</p>';

    try {
      const response = await fetch(AEGIS_AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${schemaPrompt}\n\nUser request: ${command}`,
          context: buildAegisAiContext(),
          model: "gemini-2.5-flash"
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        const error = new Error(payload.error || "Gemini request failed");
        error.statusCode = response.status;
        error.details = payload.details;
        throw error;
      }

      let jsonText = extractJsonText(payload.reply || "");
      if (!jsonText) {
        // Try a second-pass conversion: ask Gemini (via proxy) to extract/convert the reply into the required JSON schema.
        const convertResponse = await fetch(AEGIS_AI_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `${schemaPrompt}\n\nConvert the following model response into ONLY the JSON matching the schema above. Respond with JSON only.\n\nOriginal response:\n${payload.reply || ""}`,
            context: buildAegisAiContext(),
            model: "gemini-2.5-flash"
          })
        });

        const convertPayload = await convertResponse.json();
        if (convertResponse.ok) {
          jsonText = extractJsonText(convertPayload.reply || "");
        }
      }

      if (!jsonText) {
        // Try to repair truncated JSON by trimming to the last closing brace before the parse error
        const rawReply = (convertPayload?.reply || payload.reply || "") + "";
        let candidate = null;
        const fencedMatch = rawReply.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fencedMatch && fencedMatch[1]) candidate = fencedMatch[1].trim();
        else {
          const first = rawReply.indexOf('{');
          const last = rawReply.lastIndexOf('}');
          if (first >= 0 && last > first) candidate = rawReply.slice(first, last + 1);
        }

        if (candidate) {
          let repaired = candidate;
          for (let i = 0; i < 6; i++) {
            try {
              JSON.parse(repaired);
              jsonText = repaired;
              break;
            } catch (err) {
              const msg = (err && err.message) ? err.message : '';
              const m = msg.match(/position\s*(\d+)/i) || msg.match(/at\s*position\s*(\d+)/i);
              const pos = m ? Number(m[1]) : Math.floor(repaired.length * 0.9);
              const cut = repaired.lastIndexOf('}', pos > 0 ? pos : repaired.length - 1);
              if (cut <= 0) break;
              repaired = repaired.slice(0, cut + 1);
            }
          }
        }

        if (!jsonText) {
          throw new Error("Gemini did not return valid JSON.");
        }
      }

      const plan = normalizePlan(JSON.parse(jsonText));
      if (!plan) {
        throw new Error("The roadmap plan was missing a name or tasks.");
      }

      renderPreview(plan);

      const userId = await getCurrentUserId();
      let roadmapId = null;

      if (userId && window.AegisApi?.createRoadmap) {
        const roadmapRes = await window.AegisApi.createRoadmap({
          user_id: userId,
          name: plan.roadmap.name,
          description: plan.roadmap.description
        });
        if (roadmapRes.error) throw roadmapRes.error;
        roadmapId = roadmapRes.data?.id || null;
      }

      const createdTasks = await createTaskTree(plan.tasks, roadmapId, null);
      await window.Aegis.save();
      renderPreview(plan);
      summaryBox.textContent = `${plan.roadmap.name} created with ${createdTasks.length} tasks and subtasks.`;

      if (roadmapId) {
        window.location.href = `roadmap.html?roadmap_id=${encodeURIComponent(roadmapId)}`;
      } else {
        window.location.href = `roadmap.html?roadmap=${encodeURIComponent(plan.roadmap.name)}`;
      }
    } catch (error) {
      setError(error?.message || "Failed to create roadmap.");
      previewBox.innerHTML = '<p class="text-sm text-on-surface-variant">No valid roadmap was created.</p>';
      if (error?.details) {
        summaryBox.textContent = String(error.details).slice(0, 180);
      }
      if (error?.statusCode) {
        setError(formatAegisAiError({ error: error.message, details: error.details }, error.statusCode));
      }
    } finally {
      setBusy(false);
    }
  };

  submitButton.addEventListener("click", runCommand);
  promptInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runCommand();
    }
  });

  renderPreview(null);
};

Promise.resolve(window.Aegis?.ready).then(initAegisRoadmapCreator);