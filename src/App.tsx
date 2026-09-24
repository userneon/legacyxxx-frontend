import { Component, Suspense, lazy, useLayoutEffect, useRef, type ReactNode } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"

import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TopBar } from "@/components/top-bar"
import { ProtectedPage } from "@/components/protected-page"
import { ErrorState } from "@/components/states"
import { HomePage } from "@/pages/home"
import { PlayPage } from "@/pages/play"
import { TournamentsPage } from "@/pages/tournaments"
import { LeadersPage } from "@/pages/leaders"
import { SkinchangerPage } from "@/pages/skinchanger"
import { PenaltiesPage } from "@/pages/penalties"
import { ReviewsPage } from "@/pages/reviews"
import { ExplorePage } from "@/pages/explore"
import { ProfilePage } from "@/pages/profile"
import { SettingsPage } from "@/pages/settings"
import { ConnectPage } from "@/pages/connect"
import { StaffPanelPage } from "@/pages/staffpanel"
import { LEGACY_REDIRECTS } from "@/lib/routes"
import { getWebsitePrefs } from "@/lib/website-prefs"

// The staff panel is its own shell and bundle; players never download it.
const PanelApp = lazy(() => import("@/panel/panel-app"))
const StaffProfileApp = lazy(() => import("@/panel/panel-app").then((module) => ({ default: module.StaffProfileApp })))

function PanelFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-2 border-line border-t-text-muted" />
    </div>
  )
}

/**
 * Where the sidebar starts: Settings → "Start with sidebar collapsed" wins, then the last toggle (shadcn's
 * sidebar_state cookie), then the viewport (1024–1279px starts collapsed).
 */
function initialSidebarOpen() {
  if (getWebsitePrefs().sidebarCollapsed) return false
  const cookie = document.cookie.split("; ").find((part) => part.startsWith("sidebar_state="))
  if (cookie) return cookie.endsWith("=true")
  return window.innerWidth >= 1280
}

/** Scroll positions per path so returning to a page lands where the player left it. */
const scrollPositions = new Map<string, number>()

function ContentPanel({ children }: { children: ReactNode }) {
  const location = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef(location.pathname)

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    panel.scrollTop = scrollPositions.get(location.pathname) ?? 0
    pathRef.current = location.pathname
  }, [location.pathname])

  return (
    <div
      ref={panelRef}
      onScroll={(event) => scrollPositions.set(pathRef.current, event.currentTarget.scrollTop)}
      className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-[14px] border border-line-soft bg-panel"
      id="content-panel"
    >
      <div key={location.pathname} className="h-full animate-page-in">
        {children}
      </div>
    </div>
  )
}

export function App() {
  const location = useLocation()

  if (location.pathname === "/panel" || location.pathname.startsWith("/panel/") || location.pathname.startsWith("/u/")) {
    return (
      <Suspense fallback={<PanelFallback />}>
        <Routes>
          <Route path="/panel/*" element={<PanelApp />} />
          <Route path="/u/:steamId" element={<StaffProfileApp />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <SidebarProvider defaultOpen={initialSidebarOpen()} className="h-dvh min-h-0 overflow-hidden bg-bg">
      <AppSidebar />
      <main className="flex h-dvh min-w-0 flex-1 flex-col gap-2 p-2 md:pl-0">
        <TopBar />
        <ContentPanel>
          <RouteErrorBoundary resetKey={location.pathname}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/play/5x5" element={<PlayPage mode="5v5" />} />
              <Route path="/play/fun" element={<PlayPage mode="fun" />} />
              <Route path="/play/pro" element={<PlayPage mode="pro" />} />
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/leaders" element={<LeadersPage />} />
              <Route path="/skinchanger" element={<ProtectedPage pageName="Skinchanger"><SkinchangerPage /></ProtectedPage>} />
              <Route path="/penalties" element={<PenaltiesPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/settings" element={<ProtectedPage pageName="Settings"><SettingsPage /></ProtectedPage>} />
              <Route path="/profile" element={<ProtectedPage pageName="your profile"><ProfilePage /></ProtectedPage>} />
              <Route path="/profile/:identity" element={<ProfilePage />} />
              <Route path="/connect" element={<ConnectPage />} />
              <Route path="/staffpanel" element={<StaffPanelPage />} />
              {Object.entries(LEGACY_REDIRECTS).map(([from, to]) => (
                <Route key={from} path={from} element={<Navigate to={to} replace />} />
              ))}
              <Route path="/players/:identity" element={<LegacyProfileRedirect />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </RouteErrorBoundary>
        </ContentPanel>
      </main>
    </SidebarProvider>
  )
}

function LegacyProfileRedirect() {
  const { pathname } = useLocation()
  return <Navigate to={pathname.replace(/^\/players\//, "/profile/")} replace />
}

class RouteErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidUpdate(previousProps: Readonly<{ children: ReactNode; resetKey: string }>) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) return <ErrorState message="This page couldn't be shown." onRetry={() => this.setState({ hasError: false })} className="min-h-[40vh]" />
    return this.props.children
  }
}

export default App
