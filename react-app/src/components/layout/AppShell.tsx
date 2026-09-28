import { MotionConfig } from "framer-motion"
import { CheckCircle2, CloudOff, DatabaseZap, X } from "lucide-react"
import { useState } from "react"
import { Link, Outlet } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"

import { AchievementToast } from "./AchievementToast"
import { Sidebar } from "./Sidebar"
import { TopHeader } from "./TopHeader"

function AppShell() {
  const {
    state,
    loading,
    isGuest,
    guestSync,
    retryGuestSync,
    dismissGuestSync,
    pendingImport,
    confirmLegacyImport,
    dismissLegacyImport,
  } = useStore()
  const [guestBannerHidden, setGuestBannerHidden] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

  return (
    <MotionConfig reducedMotion={state.settings.reducedMotion ? "always" : "user"}>
    <div className="flex h-dvh bg-canvas font-sans">
      <AchievementToast />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <main className="scrollbar-thin flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-4 sm:gap-6">
            {loading ? (
              <div className="flex h-64 items-center justify-center text-[13px] text-ink-muted">
                {guestSync?.status === "syncing"
                  ? "Adding your roadmaps from this browser to your account..."
                  : "Loading your roadmaps..."}
              </div>
            ) : (
              <>
                {isGuest && !guestBannerHidden && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <CloudOff className="size-4 shrink-0 text-ink-muted" aria-hidden />
                      <p className="text-[13px] text-ink">
                        You're using Smartmap as a guest. Your data is saved in this browser only.
                        Create an account to keep it and use it on other devices.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button asChild size="sm">
                        <Link to="/login" state={{ mode: "signup" }}>
                          Create account
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link to="/login">Sign in</Link>
                      </Button>
                      <button
                        type="button"
                        onClick={() => setGuestBannerHidden(true)}
                        aria-label="Hide this message"
                        className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                )}
                {guestSync?.status === "done" && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-sage-solid bg-sage-bg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="size-4 shrink-0 text-sage-text" aria-hidden />
                      <p className="text-[13px] text-sage-text">
                        Added {plural(guestSync.roadmapCount, "roadmap")} and{" "}
                        {plural(guestSync.taskCount, "task")} from this browser to your account.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={dismissGuestSync}
                      aria-label="Dismiss"
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-sage-text hover:bg-white/40"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                )}
                {guestSync?.status === "error" && (
                  <div
                    role="alert"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-coral-text/40 bg-coral-bg px-4 py-3"
                  >
                    <p className="text-[13px] text-coral-text">
                      Couldn't add the {plural(guestSync.roadmapCount, "roadmap")} from this browser to
                      your account. They're still saved here, so nothing is lost.
                    </p>
                    <Button
                      size="sm"
                      disabled={retrying}
                      onClick={async () => {
                        setRetrying(true)
                        try {
                          await retryGuestSync()
                        } finally {
                          setRetrying(false)
                        }
                      }}
                    >
                      {retrying ? "Retrying..." : "Try again"}
                    </Button>
                  </div>
                )}
                {pendingImport && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-solid/50 bg-amber-bg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <DatabaseZap className="size-4 shrink-0 text-amber-text" />
                      <p className="text-[13px] text-amber-text">
                        Found {pendingImport.roadmapCount} roadmap
                        {pendingImport.roadmapCount === 1 ? "" : "s"} and {pendingImport.taskCount}{" "}
                        task{pendingImport.taskCount === 1 ? "" : "s"} saved in this browser from
                        before. Import them into your account?
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="outline" size="sm" onClick={dismissLegacyImport}>
                        Dismiss
                      </Button>
                      <Button size="sm" onClick={() => void confirmLegacyImport()}>
                        Import
                      </Button>
                    </div>
                  </div>
                )}
                <Outlet />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
    </MotionConfig>
  )
}

export { AppShell }
