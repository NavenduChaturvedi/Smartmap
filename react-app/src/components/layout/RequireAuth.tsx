import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useAuth } from "@/lib/auth-context"

function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas text-[13px] text-ink-muted">
        Loading...
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

export { RequireAuth }
