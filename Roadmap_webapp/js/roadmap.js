const AEGIS_STORAGE_KEY = "aegis_state_v1";
  const nodeData = {
    NODE_01: {
      title: "HTML Fundamentals",
      description: "Establish mission baseline with semantic structures, accessible markup, and document architecture essentials.",
      reward: "100 XP",
      action: "COMPLETED",
      subnodes: [
        { label: "Semantic Elements", status: "SECURED" },
        { label: "Forms & Inputs", status: "SECURED" },
        { label: "Accessibility Basics", status: "SECURED" }
      ]
    },
    NODE_02: {
      title: "CSS Mastery",
      description: "Deploy styling protocols including responsive layouts, component-driven styles, and advanced visual control.",
      reward: "180 XP",
      action: "COMPLETED",
      subnodes: [
        { label: "Flexbox/Grid", status: "SECURED" },
        { label: "Responsive Media Queries", status: "SECURED" },
        { label: "Transitions & States", status: "SECURED" }
      ]
    },
    NODE_03: {
      title: "Javascript Core",
      description: "Master the foundational logic of the modern web. This mission covers asynchronous execution, functional paradigms, and advanced DOM manipulation protocols required for high-level system operations.",
      reward: "250 XP",
      action: "INITIATE NODE",
      subnodes: [
        { label: "Variables & Scope", status: "SECURED" },
        { label: "Functions & Prototypes", status: "SECURED" },
        { label: "DOM Manipulation", status: "IN_PROGRESS" },
        { label: "Asynchronous Logic", status: "LOCKED" }
      ]
    },
    NODE_04: {
      title: "React Basics",
      description: "Initialize component architecture, state management, and event-driven UI composition for scalable interfaces.",
      reward: "320 XP",
      action: "LOCKED",
      subnodes: [
        { label: "JSX Components", status: "LOCKED" },
        { label: "Props and State", status: "LOCKED" },
        { label: "Hooks Overview", status: "LOCKED" }
      ]
    },
    NODE_05: {
      title: "Full Stack Integration",
      description: "Synchronize frontend and backend systems with API pipelines, authentication layers, and deployment routines.",
      reward: "500 XP",
      action: "LOCKED",
      subnodes: [
        { label: "API Integration", status: "LOCKED" },
        { label: "Auth and Sessions", status: "LOCKED" },
        { label: "Deployment Pipeline", status: "LOCKED" }
      ]
    }
  };

  const nodes = document.querySelectorAll(".roadmap-node");
  const titleEl = document.getElementById("mission-title");
  const descriptionEl = document.getElementById("mission-description");
  const rewardEl = document.getElementById("mission-reward");
  const actionEl = document.getElementById("mission-action");
  const subnodesEl = document.getElementById("mission-subnodes");

  const renderSubnode = (item) => {
    const isSecured = item.status === "SECURED";
    const isProgress = item.status === "IN_PROGRESS";
    const isLocked = item.status === "LOCKED";
    const icon = isSecured
      ? '<span class="material-symbols-outlined text-primary text-sm">check_circle</span>'
      : isProgress
        ? '<span class="w-4 h-4 border border-primary flex items-center justify-center"><span class="w-1.5 h-1.5 bg-primary glow-active"></span></span>'
        : '<span class="w-4 h-4 border border-outline"></span>';
    const rowClass = isLocked ? "flex items-center justify-between opacity-50" : "flex items-center justify-between";
    const labelClass = isProgress ? "font-body-sm text-on-surface font-bold" : "font-body-sm text-on-surface";
    const statusClass = isProgress ? "font-label-mono text-[10px] text-primary" : "font-label-mono text-[10px] text-outline";

    return `
      <div class="${rowClass}">
        <div class="flex items-center gap-3">
          ${icon}
          <span class="${labelClass}">${item.label}</span>
        </div>
        <span class="${statusClass}">[${item.status}]</span>
      </div>
    `;
  };

  const readState = () => {
    try {
      return JSON.parse(localStorage.getItem(AEGIS_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  };

  const writeState = (partial) => {
    const current = readState();
    localStorage.setItem(AEGIS_STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
  };

  const setActiveNode = (nodeKey) => {
    const data = nodeData[nodeKey];
    if (!data) return;
    titleEl.textContent = data.title;
    descriptionEl.textContent = data.description;
    rewardEl.textContent = data.reward;
    actionEl.textContent = data.action;
    subnodesEl.innerHTML = data.subnodes.map(renderSubnode).join("");

    nodes.forEach((node) => {
      const selected = node.dataset.node === nodeKey;
      node.classList.toggle("roadmap-node-selected", selected);
      if (!node.classList.contains("opacity-40")) return;
      node.classList.toggle("opacity-60", selected);
    });
    writeState({ roadmap: { selectedNode: nodeKey } });
  };

  nodes.forEach((node) => {
    node.addEventListener("click", () => setActiveNode(node.dataset.node));
  });

  const initialNode = readState()?.roadmap?.selectedNode || "NODE_03";
  setActiveNode(initialNode);