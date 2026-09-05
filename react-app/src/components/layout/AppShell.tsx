import { Outlet } from "react-router-dom"

import { useStore } from "@/lib/store"

import { Sidebar } from "./Sidebar"
import { TopHeader } from "./TopHeader"

function AppShell() {
  const { loading } = useStore()

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
              <Outlet />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export { AppShell }
