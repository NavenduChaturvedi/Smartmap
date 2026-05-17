export const migrateLegacyTagsToForeignKeys = async () => {
  const supabase = window.AegisSupabase;
  if (!supabase) return;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return;
  const userId = userData.user.id;

  const state = window.Aegis.state;
  if (!state || !state.tasks || state.tasks.length === 0) return;

  let migratedCount = 0;
  let roadmapsCreated = 0;

  // 1. Find all tasks with RM: tag but no roadmap_id
  const needsMigration = state.tasks.filter(t => t.tag && t.tag.startsWith('RM:') && !t.roadmap_id);
  if (needsMigration.length === 0) return; // Nothing to do

  console.log(`[Migration] Found ${needsMigration.length} legacy tasks to migrate.`);

  // 2. Fetch existing roadmaps to avoid duplicates
  const { data: existingRoadmaps } = await window.AegisApi.fetchRoadmaps(userId);
  const roadmapNameMap = new Map();
  if (existingRoadmaps) {
    existingRoadmaps.forEach(r => roadmapNameMap.set(r.name.trim().toLowerCase(), r.id));
  }

  // 3. Extract unique roadmap names from legacy tags
  const getRoadmapFromTag = (tag) => {
    if (!tag || !tag.startsWith("RM:")) return null;
    const [, rest = ""] = tag.split("RM:");
    return rest.split("|")[0].trim();
  };

  const uniqueRoadmapNames = new Set(
    needsMigration.map(t => getRoadmapFromTag(t.tag)).filter(Boolean)
  );

  // 4. Create missing roadmaps
  for (const rmName of uniqueRoadmapNames) {
    const key = rmName.toLowerCase();
    if (!roadmapNameMap.has(key)) {
      const { data: newRm, error } = await window.AegisApi.createRoadmap({
        user_id: userId,
        name: rmName,
        description: 'Auto-migrated from legacy tasks'
      });
      if (!error && newRm) {
        roadmapNameMap.set(key, newRm.id);
        roadmapsCreated++;
        console.log(`[Migration] Created roadmap: ${rmName}`);
      } else {
        console.error(`[Migration] Failed to create roadmap for ${rmName}:`, error);
      }
    }
  }

  // 5. Update local tasks with Roadmap ID
  state.tasks = state.tasks.map(task => {
    if (task.tag && task.tag.startsWith('RM:') && !task.roadmap_id) {
      const rmName = getRoadmapFromTag(task.tag);
      if (rmName) {
        const key = rmName.toLowerCase();
        if (roadmapNameMap.has(key)) {
          task.roadmap_id = roadmapNameMap.get(key);
          migratedCount++;
        }
      }
    }
    return task;
  });

  // 6. Fix parent_task_id matching based on PARENT: tags
  // The PARENT tag refers to the exact title of the parent task
  const getParentTaskIdFromTag = (tag) => {
    if (!tag || !tag.includes("PARENT:")) return null;
    const match = tag.match(/PARENT:\s*([^|]+)/i);
    return match ? match[1].trim() : null;
  };

  state.tasks = state.tasks.map(task => {
    if (task.tag && task.tag.includes('PARENT:') && !task.parent_task_id) {
      const parentName = getParentTaskIdFromTag(task.tag);
      if (parentName) {
        // Find a task in the same roadmap that matches this title
        const parentTask = state.tasks.find(t => t.roadmap_id === task.roadmap_id && t.title.trim() === parentName);
        if (parentTask) {
          task.parent_task_id = parentTask.id;
        }
      }
    }
    return task;
  });

  if (migratedCount > 0) {
    console.log(`[Migration] Migrated ${migratedCount} tasks, created ${roadmapsCreated} roadmaps. Saving...`);
    await window.Aegis.save(); // Save to localStorage & supabase
  }
};
