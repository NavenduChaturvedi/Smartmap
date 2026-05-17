// Lightweight Supabase API helpers for Roadmaps
// Exposes methods on window.AegisApi for frontend usage

const getSupabaseClient = () => window.AegisSupabase || null;

const handleResponse = (res) => {
  if (res.error) return { data: null, error: res.error };
  return { data: res.data, error: null };
};

export const fetchRoadmaps = async (userId) => {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error('Supabase client not available') };
  try {
    const res = await supabase.from('roadmaps').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return handleResponse(res);
  } catch (err) {
    return { data: null, error: err };
  }
};

export const getRoadmap = async (id) => {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error('Supabase client not available') };
  try {
    const res = await supabase.from('roadmaps').select('*').eq('id', id).maybeSingle();
    return handleResponse(res);
  } catch (err) {
    return { data: null, error: err };
  }
};

export const createRoadmap = async ({ user_id, name, description = '' }) => {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error('Supabase client not available') };
  try {
    const payload = { user_id, name, description };
    const res = await supabase.from('roadmaps').insert(payload).select().single();
    return handleResponse(res);
  } catch (err) {
    return { data: null, error: err };
  }
};

export const updateRoadmap = async (id, updates) => {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error('Supabase client not available') };
  try {
    const res = await supabase.from('roadmaps').update(updates).eq('id', id).select().maybeSingle();
    return handleResponse(res);
  } catch (err) {
    return { data: null, error: err };
  }
};

export const deleteRoadmap = async (id) => {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error('Supabase client not available') };
  try {
    const taskDelete = await supabase.from('tasks').delete().eq('roadmap_id', id);
    if (taskDelete.error) return handleResponse(taskDelete);

    const res = await supabase.from('roadmaps').delete().eq('id', id).select().maybeSingle();
    return handleResponse(res);
  } catch (err) {
    return { data: null, error: err };
  }
};

// Attach to global API helper used by frontend code
window.AegisApi = {
  fetchRoadmaps,
  getRoadmap,
  createRoadmap,
  updateRoadmap,
  deleteRoadmap
};
