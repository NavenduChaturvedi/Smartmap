import { BrowserRouter, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { RequireAuth } from "@/components/layout/RequireAuth"
import { AuthProvider } from "@/lib/auth-context"
import { PageHeaderProvider } from "@/lib/page-header"
import { StoreProvider } from "@/lib/store"
import { Achievements } from "@/pages/Achievements"
import { Analytics } from "@/pages/Analytics"
import { Dashboard } from "@/pages/Dashboard"
import { Login } from "@/pages/Login"
import { Logs } from "@/pages/Logs"
import { RoadmapDetail } from "@/pages/RoadmapDetail"
import { RoadmapOverview } from "@/pages/RoadmapOverview"
import { Settings } from "@/pages/Settings"
import { Workflows } from "@/pages/Workflows"

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <PageHeaderProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<RequireAuth />}>
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
              </Route>
            </Routes>
          </BrowserRouter>
        </PageHeaderProvider>
      </StoreProvider>
    </AuthProvider>
  )
}

export default App
