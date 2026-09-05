import { createClient } from "@supabase/supabase-js"

import type { Database } from "./database.types"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Copy .env.example to .env.local and fill in " +
      "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (see react-app/README.md).",
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
