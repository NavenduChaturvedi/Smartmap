import { ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/field"
import { useAuth } from "@/lib/auth-context"
import { useStore } from "@/lib/store"

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, loading, signIn, signUp, requestPasswordReset } = useAuth()
  const { isGuest, state } = useStore()
  const guestRoadmaps = isGuest ? state.roadmaps.length : 0

  const [mode, setMode] = useState<"login" | "signup" | "forgot">(() => {
    const requested = (location.state as { mode?: string } | null)?.mode
    return requested === "signup" || requested === "forgot" ? requested : "login"
  })
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

  const switchMode = (next: typeof mode) => {
    setMode(next)
    setError("")
    setInfo("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setInfo("")

    if (mode === "forgot") {
      if (!email.trim()) {
        setError("Enter the email you signed up with.")
        return
      }
      setSubmitting(true)
      const { error: resetError } = await requestPasswordReset(email.trim())
      setSubmitting(false)
      // Same message whether or not the account exists, so this form can't
      // be used to find out who has an account.
      if (resetError) setError(resetError)
      else setInfo("If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.")
      return
    }

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
        setInfo(
          guestRoadmaps > 0
            ? "Check your email to confirm your account, then sign in. Your roadmaps stay in this browser until then."
            : "Check your email to confirm your account, then sign in.",
        )
        setMode("login")
      }
      // If no confirmation is needed, signUp already returns a session and
      // the redirect effect above handles navigation.
    }
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-4 sm:p-6">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-surface-dark">
            <img src="/logo-mark.png" alt="Smartmap" className="size-7" />
          </div>
          <h1 className="text-[15px] font-semibold text-ink-strong">Smartmap</h1>
          <p className="text-[12.5px] text-ink-muted">
            {mode === "login"
              ? "Sign in to sync your roadmaps across devices."
              : mode === "signup"
                ? "Create an account to keep your roadmaps safe."
                : "Enter your email and we'll send you a link to reset your password."}
          </p>
        </div>

        {guestRoadmaps > 0 && mode !== "forgot" && (
          <p className="mb-4 rounded-lg bg-sage-bg px-3 py-2 text-[12.5px] text-sage-text">
            The {guestRoadmaps} roadmap{guestRoadmaps === 1 ? "" : "s"} you made in this browser
            will be added to your account.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="login-name">Full Name</Label>
              <Input
                id="login-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                autoFocus
              />
            </div>
          )}
          <div>
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              autoComplete="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus={mode !== "signup"}
            />
          </div>
          {mode !== "forgot" && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label htmlFor="login-password" className="mb-0">
                  Password
                </Label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-[12px] font-medium text-ink-muted hover:text-ink"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="login-password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-[12.5px] text-coral-text">
              {error}
            </p>
          )}
          {info && (
            <p role="status" className="text-[12.5px] text-sage-text">
              {info}
            </p>
          )}

          <Button type="submit" className="mt-1" disabled={submitting}>
            {submitting
              ? { login: "Signing in...", signup: "Creating account...", forgot: "Sending..." }[mode]
              : { login: "Sign In", signup: "Create Account", forgot: "Send reset link" }[mode]}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => switchMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-center text-[12.5px] font-medium text-ink-muted hover:text-ink"
        >
          {mode === "login"
            ? "Need an account? Create one"
            : mode === "signup"
              ? "Already have an account? Sign in"
              : "Back to sign in"}
        </button>

        <div className="mt-4 border-t border-line pt-4 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-muted hover:text-ink"
          >
            {guestRoadmaps > 0 ? "Back to the app" : "Try it without an account"}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
          <p className="mt-1 text-[11.5px] text-ink-muted">
            Your data is saved in this browser until you sign in.
          </p>
        </div>
      </Card>
    </div>
  )
}

export { Login }
