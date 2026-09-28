import {
  BarChart3,
  History,
  LayoutDashboard,
  type LucideIcon,
  PlusSquare,
  Settings,
  Trophy,
  Waypoints,
} from "lucide-react"

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  match: (pathname: string) => boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, match: (p) => p === "/" },
  { to: "/roadmap", label: "Roadmaps", icon: Waypoints, match: (p) => p.startsWith("/roadmap") },
  {
    to: "/workflows",
    label: "New roadmap",
    icon: PlusSquare,
    match: (p) => p.startsWith("/workflows"),
  },
  { to: "/logs", label: "Activity", icon: History, match: (p) => p.startsWith("/logs") },
  { to: "/analytics", label: "Analytics", icon: BarChart3, match: (p) => p.startsWith("/analytics") },
  {
    to: "/achievements",
    label: "Achievements",
    icon: Trophy,
    match: (p) => p.startsWith("/achievements"),
  },
  { to: "/settings", label: "Settings", icon: Settings, match: (p) => p.startsWith("/settings") },
]

// Shortcut hint for the search box: ⌘K on Apple platforms, Ctrl K elsewhere.
const IS_APPLE =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
const SEARCH_SHORTCUT_LABEL = IS_APPLE ? "⌘K" : "Ctrl K"

export { NAV_ITEMS, SEARCH_SHORTCUT_LABEL }
export type { NavItem }
