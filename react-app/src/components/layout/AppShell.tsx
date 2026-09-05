import { DatabaseZap } from "lucide-react"
import { Outlet } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"

import { Sidebar } from "./Sidebar"
import { TopHeader } from "./TopHeader"

function AppShell() {
  const { loading, pendingImport, confirmLegacyImport, dismissLegacyImport } = useStore()

  return (
    <div className="flex h-screen bg-canvas font-sans">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <main className="scrollbar-thin flex-1 overflow-y-auto p-6">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
            {loading ? (
              <div className="flex h-64 items-center justify-center text-[13px] text-ink-muted">
                Loading your roadmaps...
              </div>
            ) : (
              <>
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
  )
}

export { AppShell }
