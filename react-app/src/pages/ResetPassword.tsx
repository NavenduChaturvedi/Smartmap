import { CheckCircle2, KeyRound } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/field"
import { useAuth } from "@/lib/auth-context"
import { authLinkError } from "@/lib/supabase"

const MIN_LENGTH = 6 // Supabase's default minimum

// Where a password-reset email link lands. The link signs the user in with
// a short-lived recovery session; this page uses it to set a new password.
function ResetPassword() {
  const navigate = useNavigate()
  const { session, loading, updatePassword, passwordRecovery, clearPasswordRecovery } = useAuth()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError("The two passwords don't match.")
      return
    }
    setSubmitting(true)
    const { error: updateError } = await updatePassword(password)
    setSubmitting(false)
    if (updateError) setError(updateError)
    else setDone(true)
  }

  let body
  if (loading) {
    body = <p className="text-center text-[13px] text-ink-muted">Checking your reset link...</p>
  } else if (done) {
    body = (
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="size-8 text-sage-text" aria-hidden />
        <p className="text-[13px] text-ink">Your password has been changed and you're signed in.</p>
        <Button onClick={() => navigate("/", { replace: true })}>Continue to Smartmap</Button>
      </div>
    )
  } else if (!session) {
    body = (
      <div className="flex flex-col items-center gap-3 text-center">
        <p role="alert" className="text-[13px] text-coral-text">
          {authLinkError
            ? `${authLinkError}.`
            : "This reset link is invalid or has already been used."}{" "}
          Reset links work once and expire after a while.
        </p>
        <Button asChild>
          <Link to="/login" state={{ mode: "forgot" }}>
            Send a new link
          </Link>
        </Button>
      </div>
    )
  } else {
    body = (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-[12.5px] text-ink-muted">
          {passwordRecovery ? "Choose a new password for " : "Change the password for "}
          <span className="font-medium text-ink">{session.user.email}</span>.
        </p>
        <div>
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-[12.5px] text-coral-text">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting || !password || !confirm}>
          {submitting ? "Saving..." : "Set new password"}
        </Button>
        <button
          type="button"
          onClick={() => {
            clearPasswordRecovery()
            navigate("/", { replace: true })
          }}
          className="text-center text-[12.5px] font-medium text-ink-muted hover:text-ink"
        >
          Not now
        </button>
      </form>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-4 sm:p-6">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-surface-dark text-white">
            <KeyRound className="size-5" aria-hidden />
          </div>
          <h1 className="text-[15px] font-semibold text-ink-strong">Reset your password</h1>
        </div>
        {body}
      </Card>
    </div>
  )
}

export { ResetPassword }
