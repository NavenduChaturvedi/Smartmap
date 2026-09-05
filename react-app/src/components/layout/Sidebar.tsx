import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldHalf,
  Terminal,
  Trophy,
  Waypoints,
  Workflow,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import { IconTooltip } from "@/components/ui/icon-tooltip"
import { useAuth } from "@/lib/auth-context"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { to: "/", label: "Command Center", icon: LayoutDashboard, match: (p: string) => p === "/" },
  {
    to: "/roadmap",
    label: "Interactive Roadmap Canvas",
    icon: Waypoints,
    match: (p: string) => p.startsWith("/roadmap"),
  },
  {
    to: "/workflows",
    label: "Workflows & Triggers",
    icon: Workflow,
    match: (p: string) => p.startsWith("/workflows"),
  },
  {
    to: "/logs",
    label: "Node Logs",
    icon: Terminal,
    match: (p: string) => p.startsWith("/logs"),
  },
  {
    to: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    match: (p: string) => p.startsWith("/analytics"),
  },
  {
    to: "/achievements",
    label: "Achievements",
    icon: Trophy,
    match: (p: string) => p.startsWith("/achievements"),
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings,
    match: (p: string) => p.startsWith("/settings"),
  },
] as const

function Sidebar() {
  const { pathname } = useLocation()
  const { state } = useStore()
  const { signOut } = useAuth()
  const initials = state.profile.displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside className="flex h-screen w-16 shrink-0 flex-col items-center justify-between bg-surface-dark py-4">
      <div className="flex flex-col items-center gap-6">
        <IconTooltip label="RoadmapOS">
          <Link
            to="/"
            className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-ink-inverse"
          >
            <ShieldHalf className="size-5" strokeWidth={1.75} />
          </Link>
        </IconTooltip>

        <nav className="flex flex-col items-center gap-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = item.match(pathname)
            return (
              <IconTooltip key={item.to} label={item.label}>
                <Link
                  to={item.to}
                  aria-current={isActive}
                  className={cn(
                    "relative flex size-10 items-center justify-center rounded-lg text-white/50 transition-colors duration-150 hover:bg-white/10 hover:text-white",
                    isActive && "bg-white/10 text-white",
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 h-4 w-0.5 -translate-x-[calc(100%+2px)] rounded-full bg-sage-solid" />
                  )}
                  <Icon className="size-[18px]" strokeWidth={1.75} />
                </Link>
              </IconTooltip>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <IconTooltip label="Sign Out">
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex size-9 items-center justify-center rounded-lg text-white/50 transition-colors duration-150 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-[18px]" strokeWidth={1.75} />
          </button>
        </IconTooltip>

        <IconTooltip label="AI Engine Active">
          <Link
            to="/settings"
            className="relative flex size-9 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white"
          >
            {initials || "CM"}
            <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-sage-solid ring-2 ring-surface-dark" />
          </Link>
        </IconTooltip>
      </div>
    </aside>
  )
}

export { Sidebar }
