import { useEffect } from "react"
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { PageHeaderProvider } from "@/lib/page-header"
import { StoreProvider } from "@/lib/store"
import { Achievements } from "@/pages/Achievements"
import { Analytics } from "@/pages/Analytics"
import { Dashboard } from "@/pages/Dashboard"
import { Login } from "@/pages/Login"
import { Logs } from "@/pages/Logs"
import { ResetPassword } from "@/pages/ResetPassword"
import { RoadmapDetail } from "@/pages/RoadmapDetail"
import { RoadmapOverview } from "@/pages/RoadmapOverview"
import { Settings } from "@/pages/Settings"
import { Workflows } from "@/pages/Workflows"

// A reset link signs the user in with a recovery session. If Supabase sent
// them somewhere other than /reset-password (e.g. that URL isn't on the
// project's redirect allow list, so it fell back to the site URL), bring
// them there before they land in the app without having set a password.
function PasswordRecoveryRedirect() {
  const { passwordRecovery, session } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (passwordRecovery && session && pathname !== "/reset-password") {
      navigate("/reset-password", { replace: true })
    }
  }, [passwordRecovery, session, pathname, navigate])
  return null
}

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <PageHeaderProvider>
          <BrowserRouter>
            <PasswordRecoveryRedirect />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* No sign-in wall: guests use the app with browser storage. */}
              <Route element={<AppShell />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/roadmap" element={<RoadmapOverview />} />
                <Route path="/roadmap/:id" element={<RoadmapDetail />} />
                <Route path="/workflows" element={<Workflows />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </PageHeaderProvider>
      </StoreProvider>
    </AuthProvider>
  )
}

export default App
