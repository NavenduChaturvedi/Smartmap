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

// Auth links from emails (password reset) put their result in the URL, and
// createClient consumes and clears it on load. Read it first so the app can
// tell it arrived from a reset link, or that the link had expired.
const initialAuthParams = (() => {
  if (typeof window === "undefined") return new URLSearchParams()
  const { search, hash } = window.location
  return new URLSearchParams(`${search.slice(1)}&${hash.slice(1)}`)
})()

// True when this page load came from a password-reset email link.
export const arrivedFromRecoveryLink = initialAuthParams.get("type") === "recovery"

// Supabase's message when an email link was invalid or expired, if any.
export const authLinkError = initialAuthParams.get("error_description")

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
