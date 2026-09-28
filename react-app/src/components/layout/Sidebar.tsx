import { LogIn, LogOut, X } from "lucide-react"
import { useEffect } from "react"
import { createPortal } from "react-dom"
import { Link, useLocation } from "react-router-dom"

import { IconTooltip } from "@/components/ui/icon-tooltip"
import { useAuth } from "@/lib/auth-context"
import { NAV_ITEMS } from "@/lib/nav"
import { getInitials } from "@/lib/profile"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

function Avatar({ className }: { className?: string }) {
  const { state } = useStore()
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white",
        className,
      )}
    >
      {getInitials(state.profile.displayName)}
    </span>
  )
}

// Icon rail, md and up. Phones get MobileNav instead.
function Sidebar() {
  const { pathname } = useLocation()
  const { state, isGuest } = useStore()
  const { signOut } = useAuth()

  return (
    <aside className="hidden h-dvh w-16 shrink-0 flex-col items-center justify-between bg-surface-dark py-4 md:flex">
      <div className="flex flex-col items-center gap-6">
        <IconTooltip label="Smartmap">
          <Link
            to="/"
            aria-label="Smartmap home"
            className="flex size-9 items-center justify-center rounded-lg bg-white/10"
          >
            <img src="/logo-mark.png" alt="" className="size-6" />
          </Link>
        </IconTooltip>

        <nav aria-label="Main" className="flex flex-col items-center gap-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = item.match(pathname)
            return (
              <IconTooltip key={item.to} label={item.label}>
                <Link
                  to={item.to}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex size-10 items-center justify-center rounded-lg text-white/50 transition-colors duration-150 hover:bg-white/10 hover:text-white",
                    isActive && "bg-white/10 text-white",
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 h-4 w-0.5 -translate-x-[calc(100%+2px)] rounded-full bg-sage-solid" />
                  )}
                  <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                </Link>
              </IconTooltip>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        {isGuest ? (
          <IconTooltip label="Sign in">
            <Link
              to="/login"
              aria-label="Sign in"
              className="flex size-9 items-center justify-center rounded-lg text-white/50 transition-colors duration-150 hover:bg-white/10 hover:text-white"
            >
              <LogIn className="size-[18px]" strokeWidth={1.75} aria-hidden />
            </Link>
          </IconTooltip>
        ) : (
          <IconTooltip label="Sign out">
            <button
              type="button"
              onClick={() => void signOut()}
              aria-label="Sign out"
              className="flex size-9 items-center justify-center rounded-lg text-white/50 transition-colors duration-150 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-[18px]" strokeWidth={1.75} aria-hidden />
            </button>
          </IconTooltip>
        )}

        <IconTooltip label={state.profile.displayName || "Profile settings"}>
          <Link to="/settings" aria-label={`Profile settings for ${state.profile.displayName}`}>
            <Avatar />
          </Link>
        </IconTooltip>
      </div>
    </aside>
  )
}

// Slide-out menu for small screens, opened from the header's menu button.
function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation()
  const { state, isGuest } = useStore()
  const { signOut } = useAuth()

  // Close on navigation.
  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-surface-dark/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface-dark p-4 text-white"
      >
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white/10">
              <img src="/logo-mark.png" alt="" className="size-6" />
            </span>
            <span className="text-[15px] font-semibold">Smartmap</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex size-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = item.match(pathname)
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-white/70 hover:bg-white/10 hover:text-white",
                  isActive && "bg-white/10 text-white",
                )}
              >
                <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto flex items-center gap-3 border-t border-white/10 pt-4">
          <Avatar />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
            {state.profile.displayName}
          </span>
          {isGuest ? (
            <Link
              to="/login"
              className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-white/80 hover:bg-white/10 hover:text-white"
            >
              <LogIn className="size-4" strokeWidth={1.75} aria-hidden />
              Sign in
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void signOut()}
              aria-label="Sign out"
              className="flex size-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-[18px]" strokeWidth={1.75} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export { Avatar, MobileNav, Sidebar }
