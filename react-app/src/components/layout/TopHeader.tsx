import { ChevronRight, Plus, RefreshCw, Search, Sparkles } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { StatusPill } from "@/components/ui/status-pill"
import { usePageHeaderApi } from "@/lib/page-header"
import { useStore } from "@/lib/store"

function TopHeader() {
  const { meta } = usePageHeaderApi()
  const { refresh } = useStore()
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    await refresh()
    setSyncing(false)
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-6">
      <div className="flex items-center gap-1.5 text-[13px]">
        {meta.crumbs.map((crumb, i) => {
          const isLast = i === meta.crumbs.length - 1
          return (
            <span key={crumb} className="flex items-center gap-1.5">
              <span
                className={isLast ? "font-semibold text-ink-strong" : "text-ink-muted"}
              >
                {crumb}
              </span>
              {!isLast && <ChevronRight className="size-3.5 text-ink-muted/60" />}
            </span>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-8 w-56 items-center gap-2 rounded-lg border border-line bg-surface-muted px-2.5 text-[12.5px] text-ink-muted transition-colors hover:border-ink-muted/30"
        >
          <Search className="size-3.5 shrink-0" />
          <span className="flex-1 text-left">Quick jump...</span>
          <kbd className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>

        <StatusPill tone="sage">
          <Sparkles className="-ml-0.5 size-2.5" />
          AI Active
        </StatusPill>

        <div className="mx-1 h-5 w-px bg-line" />

        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={syncing ? "size-3.5 animate-spin" : "size-3.5"} />
          {syncing ? "Syncing..." : "Sync Nodes"}
        </Button>
        {meta.primaryAction && (
          <Button variant="primary" size="sm" onClick={meta.primaryAction.onClick}>
            <Plus className="size-3.5" />
            {meta.primaryAction.label}
          </Button>
        )}
      </div>
    </header>
  )
}

export { TopHeader }
