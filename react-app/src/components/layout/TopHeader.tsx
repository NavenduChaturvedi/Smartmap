import { ChevronRight, Menu, Plus, RefreshCw, Search } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { SEARCH_SHORTCUT_LABEL } from "@/lib/nav"
import { usePageHeaderApi } from "@/lib/page-header"
import { useStore } from "@/lib/store"

import { CommandPalette } from "./CommandPalette"
import { MobileNav } from "./Sidebar"

function TopHeader() {
  const { meta } = usePageHeaderApi()
  const { refresh, isGuest } = useStore()
  const [syncing, setSyncing] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Ctrl+K / ⌘K toggles search from anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await refresh()
    } finally {
      setSyncing(false)
    }
  }

  // "Smartmap" leads every trail; on phones only the current page fits.
  const crumbs = meta.crumbs

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line bg-surface px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted hover:text-ink md:hidden"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex min-w-0 items-center gap-1.5">
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1
              return (
                <li
                  key={crumb + i}
                  className={isLast ? "flex min-w-0 items-center" : "hidden shrink-0 items-center gap-1.5 sm:flex"}
                  aria-current={isLast ? "page" : undefined}
                >
                  <span
                    className={
                      isLast
                        ? "truncate font-semibold whitespace-nowrap text-ink-strong"
                        : "whitespace-nowrap text-ink-muted"
                    }
                  >
                    {crumb}
                  </span>
                  {!isLast && <ChevronRight className="size-3.5 text-ink-muted/60" aria-hidden />}
                </li>
              )
            })}
          </ol>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
          aria-keyshortcuts="Control+K Meta+K"
          className="flex size-8 items-center justify-center gap-2 rounded-lg border border-line bg-surface-muted text-[12.5px] text-ink-muted transition-colors hover:border-ink-muted/30 lg:w-56 lg:justify-start lg:px-2.5"
        >
          <Search className="size-3.5 shrink-0" aria-hidden />
          <span className="hidden flex-1 text-left lg:inline">Search...</span>
          <kbd className="hidden rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] font-medium lg:inline">
            {SEARCH_SHORTCUT_LABEL}
          </kbd>
        </button>

        {/* Guest data only lives in this tab's memory and storage; nothing to fetch. */}
        {!isGuest && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            aria-label="Refresh data"
            className="max-sm:w-8 max-sm:px-0"
          >
            <RefreshCw className={syncing ? "animate-spin" : undefined} aria-hidden />
            <span className="hidden sm:inline">{syncing ? "Refreshing..." : "Refresh"}</span>
          </Button>
        )}
        {meta.primaryAction && (
          <Button
            variant="primary"
            size="sm"
            onClick={meta.primaryAction.onClick}
            aria-label={meta.primaryAction.label}
            className="max-sm:w-8 max-sm:px-0"
          >
            <Plus aria-hidden />
            <span className="hidden sm:inline">{meta.primaryAction.label}</span>
          </Button>
        )}
      </div>

      <CommandPalette open={searchOpen} onClose={closeSearch} />
      <MobileNav open={menuOpen} onClose={closeMenu} />
    </header>
  )
}

export { TopHeader }
