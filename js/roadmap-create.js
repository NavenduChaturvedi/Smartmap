const form = document.getElementById("roadmap-create-form");
const nameInput = document.getElementById("roadmap-name");
const phasesList = document.getElementById("phases-list");
const addPhaseBtn = document.getElementById("add-phase-btn");
const errorEl = document.getElementById("roadmap-create-error");
const submitBtn = document.getElementById("roadmap-create-submit");

let phaseCounter = 0;

const setError = (message) => {
  if (!errorEl) return;
  if (!message) {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
    return;
  }

  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
};

const setLoading = (isLoading) => {
  if (!submitBtn) return;
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle("opacity-70", isLoading);
  submitBtn.classList.toggle("cursor-not-allowed", isLoading);
  submitBtn.innerHTML = isLoading
    ? '<span class="material-symbols-outlined text-[18px]">hourglass_top</span> Launching...'
    : '<span class="material-symbols-outlined text-[18px]">rocket_launch</span> Launch Roadmap';
};

const getRoadmapTag = (roadmapName) => `RM: ${roadmapName}`;


const createPhaseRow = (phase = {}) => {
  phaseCounter += 1;
  const row = document.createElement("div");
  row.className = "glass-panel rounded-2xl border border-outline-variant/30 p-5 space-y-4";
  row.dataset.phaseRow = "true";
  row.innerHTML = `
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="font-label-caps text-label-caps uppercase tracking-[0.25em] text-on-surface-variant">Phase ${phaseCounter}</p>
        <p class="text-xs text-on-surface-variant mt-1">Add a task that belongs to this roadmap phase.</p>
      </div>
      <button class="inline-flex items-center justify-center h-10 w-10 rounded-full border border-outline-variant/30 text-on-surface-variant hover:text-error hover:border-error/40 transition-colors" type="button" data-remove-phase aria-label="Remove phase">
        <span class="material-symbols-outlined text-[18px]">delete</span>
      </button>
    </div>
    <div class="grid gap-4 md:grid-cols-[1.5fr_1fr]">
      <div class="grid gap-2">
        <label class="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">Task Title</label>
        <input class="w-full rounded-2xl border border-outline-variant/40 bg-surface-container-low px-4 py-3 text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" data-phase-title type="text" placeholder="Example: Define scope and milestones" value="${phase.title || ""}" />
      </div>
      <div class="grid gap-2">
        <label class="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">XP Reward</label>
        <input class="w-full rounded-2xl border border-outline-variant/40 bg-surface-container-low px-4 py-3 text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" data-phase-xp type="number" min="0" step="10" value="${Number.isFinite(Number(phase.xp)) ? Number(phase.xp) : 0}" />
      </div>
    </div>
    <div class="grid gap-2">
      <label class="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">Phase Label</label>
      <input class="w-full rounded-2xl border border-outline-variant/40 bg-surface-container-low px-4 py-3 text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" data-phase-label type="text" placeholder="Example: Phase 1 - Planning" value="${phase.label || ""}" />
    </div>
  `;

  row.querySelector("[data-remove-phase]")?.addEventListener("click", () => {
    const remainingRows = phasesList?.querySelectorAll("[data-phase-row]")?.length || 0;
    if (remainingRows <= 1) return;
    row.remove();
  });

  return row;
};

const ensureAtLeastOnePhase = () => {
  if (!phasesList) return;
  if (!phasesList.querySelector("[data-phase-row]")) {
    phasesList.appendChild(createPhaseRow());
  }
};

const addPhaseRow = (phase = {}) => {
  if (!phasesList) return;
  phasesList.appendChild(createPhaseRow(phase));
};

const readPhaseRows = () => {
  if (!phasesList) return [];

  return Array.from(phasesList.querySelectorAll("[data-phase-row]")).map((row) => ({
    title: row.querySelector("[data-phase-title]")?.value?.trim() || "",
    label: row.querySelector("[data-phase-label]")?.value?.trim() || "",
    xp: Number.parseInt(row.querySelector("[data-phase-xp]")?.value || "0", 10) || 0
  }));
};
const createRoadmap = async (event) => {
  event.preventDefault();

  await Promise.resolve(window.Aegis?.ready);

  const roadmapName = nameInput?.value?.trim();
  if (!roadmapName) {
    setError("Roadmap name is required.");
    return;
  }

  const state = window.Aegis?.state;
  if (!state) {
    setError("Aegis state is not ready yet.");
    return;
  }

  const phases = readPhaseRows();
  const validPhases = phases.filter((phase) => phase.title);
  if (validPhases.length === 0) {
    setError("Add at least one phase with a task title.");
    return;
  }

  setError("");
  setLoading(true);

  try {
    // Try to create a roadmap in Supabase if API is available
    let roadmapId = null;
    const sessionRes = window.AegisSupabase ? await window.AegisSupabase.auth.getSession() : null;
    const userId = sessionRes?.data?.session?.user?.id || null;

    if (window.AegisApi && window.AegisApi.createRoadmap && userId) {
      const res = await window.AegisApi.createRoadmap({ user_id: userId, name: roadmapName, description: '' });
      if (res.error) throw res.error;
      roadmapId = res.data?.id || null;
    }

    if (!roadmapId) {
      // Fallback to tag-based roadmap creation
      const roadmapTag = getRoadmapTag(roadmapName);
      const roadmapExists = state.tasks.some((task) => task.tag === roadmapTag);
      if (roadmapExists) {
        setError("That roadmap already exists. Choose a different name.");
        setLoading(false);
        return;
      }

      for (const phase of validPhases) {
        const taskTitle = phase.label ? `${phase.label}: ${phase.title}` : phase.title;
        window.Aegis.addTask(taskTitle, roadmapTag, phase.xp);
      }

      await window.Aegis.save();
      window.location.href = `roadmap.html?roadmap=${encodeURIComponent(roadmapName)}`;
      return;
    }

    // Create tasks linked to the new roadmap_id
    for (const phase of validPhases) {
      const taskTitle = phase.label ? `${phase.label}: ${phase.title}` : phase.title;
      window.Aegis.addTask(taskTitle, '', phase.xp, roadmapId, null);
    }

    await window.Aegis.save();
    window.location.href = `roadmap.html?roadmap_id=${encodeURIComponent(roadmapId)}`;
  } catch (error) {
    setError(error?.message || "Failed to create roadmap.");
    setLoading(false);
  }
};

form?.addEventListener("submit", createRoadmap);
Promise.resolve(window.Aegis?.ready).then(() => {
  nameInput?.focus();
  ensureAtLeastOnePhase();
});

addPhaseBtn?.addEventListener("click", () => addPhaseRow());