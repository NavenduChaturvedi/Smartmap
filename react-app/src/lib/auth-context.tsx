import type { Session, User } from "@supabase/supabase-js"
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { arrivedFromRecoveryLink, supabase } from "./supabase"

interface AuthApi {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: string | null; needsEmailConfirm: boolean }>
  signOut: () => Promise<void>
  // Emails a password-reset link that returns to /reset-password.
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
  // Signed in through a reset link and hasn't set a new password yet.
  passwordRecovery: boolean
  clearPasswordRecovery: () => void
}

const AuthContext = createContext<AuthApi | null>(null)

function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(arrivedFromRecoveryLink)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true)
      if (event === "SIGNED_OUT") setPasswordRecovery(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) return { error: error.message, needsEmailConfirm: false }
    // If email confirmation is required, signUp succeeds but returns no session.
    return { error: null, needsEmailConfirm: !data.session }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: error?.message ?? null }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (!error) setPasswordRecovery(false)
    return { error: error?.message ?? null }
  }

  const value: AuthApi = {
    session,
    user: session?.user ?? null,
    loading,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
    passwordRecovery,
    clearPasswordRecovery: () => setPasswordRecovery(false),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

export { AuthProvider, useAuth }
