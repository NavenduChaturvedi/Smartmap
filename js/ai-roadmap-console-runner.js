// ai-roadmap-console-runner.js
// Usage:
// 1) Open ai-roadmap.html and sign in so `window.Aegis` and `window.AegisApi` are available.
// 2) In the browser console define `plan` as the parsed JSON (the same schema used by the AI):
//    { roadmap: { name, description }, tasks: [ { title, xp, subtasks: [...] } ] }
// 3) Call: `AegisConsoleRunner.runPlan(plan)`

window.AegisConsoleRunner = (function () {
  async function ensureRoadmap(name, description) {
    if (!window.AegisApi || !window.AegisApi.createRoadmap) {
      console.warn('AegisApi.createRoadmap not available; skipping roadmap creation.');
      return null;
    }
    try {
      const resp = await window.AegisApi.createRoadmap({ user_id: window.Aegis?.user?.id || null, name, description });
      // API may return the created roadmap or an id depending on implementation
      return resp?.id || resp?.data?.id || resp || null;
    } catch (e) {
      console.error('createRoadmap failed', e);
      return null;
    }
  }

  function normalizeNode(node) {
    if (typeof node === 'string') return { title: node.trim(), xp: 0, subtasks: [] };
    if (!node || typeof node !== 'object') return null;
    return {
      title: (node.title || '').toString(),
      xp: Number(node.xp || 0),
      subtasks: Array.isArray(node.subtasks) ? node.subtasks.map(normalizeNode).filter(Boolean) : [],
      // preserve explicit order if present, otherwise infer from title
      order: Number.isFinite(Number(node?.order)) ? Number(node.order) : undefined
    };
  }

  function extractOrderFromTitle(title) {
    if (!title || typeof title !== 'string') return 1e9;
    const t = title.toLowerCase();
    const m = t.match(/\b(?:day|days|week|weeks|phase|ph)\b\s*(\d{1,4})/i);
    if (m && m[1]) return Number(m[1]);
    const m2 = t.match(/\b(\d{1,4})\b/);
    if (m2 && m2[1]) return Number(m2[1]);
    if (t.includes('post') || t.includes('after') || t.includes('launch')) return 1e6;
    return 1e9;
  }

  async function addTasksRecursively(tasks, roadmapId = null, parentId = null) {
    const created = [];
    // sort by explicit or inferred order to preserve chronological intent
    const tasksOrdered = (Array.isArray(tasks) ? tasks.slice() : []).sort((a, b) => {
      const oa = Number((a && (a.order ?? extractOrderFromTitle(a.title))) || 1e9);
      const ob = Number((b && (b.order ?? extractOrderFromTitle(b.title))) || 1e9);
      return oa - ob;
    });

    for (const t of tasksOrdered) {
      const n = normalizeNode(t);
      if (!n) continue;
      if (!window.Aegis || !window.Aegis.addTask) {
        console.warn('window.Aegis.addTask not available; printing intended creation:', n);
        created.push({ title: n.title, xp: n.xp, parent: parentId });
        continue;
      }
      // addTask(title, tag = "", xp = 0, roadmap_id = null, parent_task_id = null)
      const task = await window.Aegis.addTask(n.title, '', n.xp, roadmapId, parentId);
      created.push(task);
      if (n.subtasks && n.subtasks.length) {
        const subs = await addTasksRecursively(n.subtasks, roadmapId, task?.id || null);
        created.push(...subs);
      }
    }
    return created;
  }

  async function runPlan(plan) {
    if (!plan || !plan.roadmap) {
      console.error('Invalid plan object. Expected { roadmap: {...}, tasks: [...] }');
      return null;
    }
    const name = plan.roadmap.name || 'AI Roadmap';
    const desc = plan.roadmap.description || '';
    const roadmapId = await ensureRoadmap(name, desc);
    const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
    const created = await addTasksRecursively(tasks, roadmapId, null);
    if (window.Aegis && window.Aegis.save) {
      try { await window.Aegis.save(); } catch (e) { console.warn('Aegis.save failed', e); }
    }
    console.log('Plan applied. RoadmapId:', roadmapId, 'Created items:', created.length);
    return { roadmapId, created };
  }

  return { runPlan };
})();
