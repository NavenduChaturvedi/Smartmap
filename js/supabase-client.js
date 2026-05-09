import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = window.__SUPABASE_URL || "https://zlariazotxothzqwnknx.supabase.co";
const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsYXJpYXpvdHhvdGh6cXdua254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTM5NzksImV4cCI6MjA5Mzg4OTk3OX0.EnwNkxip7oZAzeQS3-54ta4rkn_r2l1lc5AXnFKHo6c";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	console.warn("Supabase client not configured yet. Set window.__SUPABASE_URL and window.__SUPABASE_ANON_KEY.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.AegisSupabase = supabase;