import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/field"
import { useAuth } from "@/lib/auth-context"

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, loading, signIn, signUp } = useAuth()

  const [mode, setMode] = useState<"login" | "signup">("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/"

  useEffect(() => {
    if (!loading && session) navigate(redirectTo, { replace: true })
  }, [loading, session, navigate, redirectTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setInfo("")

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.")
      return
    }
    if (mode === "signup" && !name.trim()) {
      setError("Full name is required to create an account.")
      return
    }

    setSubmitting(true)
    if (mode === "login") {
      const { error: signInError } = await signIn(email.trim(), password)
      if (signInError) setError(signInError)
      // On success, the session update triggers the redirect effect above.
    } else {
      const { error: signUpError, needsEmailConfirm } = await signUp(
        email.trim(),
        password,
        name.trim(),
      )
      if (signUpError) {
        setError(signUpError)
      } else if (needsEmailConfirm) {
        setInfo("Check your email to confirm your account, then sign in.")
        setMode("login")
      }
      // If no confirmation is needed, signUp already returns a session and
      // the redirect effect above handles navigation.
    }
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-surface-dark">
            <img src="/logo-mark.png" alt="Smartmap" className="size-7" />
          </div>
          <h1 className="text-[15px] font-semibold text-ink-strong">Smartmap</h1>
          <p className="text-[12.5px] text-ink-muted">
            {mode === "login" ? "Sign in to continue." : "Create a new account."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <div>
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
          )}
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus={mode === "login"}
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-[12.5px] text-coral-text">{error}</p>}
          {info && <p className="text-[12.5px] text-sage-text">{info}</p>}

          <Button type="submit" className="mt-1" disabled={submitting}>
            {submitting
              ? mode === "login"
                ? "Signing in..."
                : "Creating account..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "login" ? "signup" : "login"))
            setError("")
            setInfo("")
          }}
          className="mt-4 w-full text-center text-[12.5px] font-medium text-ink-muted hover:text-ink"
        >
          {mode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
      </Card>
    </div>
  )
}

export { Login }
