import { Component, Suspense, lazy, useEffect, useRef, type ReactNode } from "react"
import { Routes, Route, useNavigate, useLocation } from "react-router-dom"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ProfileBlock } from "@/components/profile-block"
import { HomePage } from "@/pages/home"
import { PlayPage } from "@/pages/play"
import { LeadersPage } from "@/pages/leaders"
import { ClanPage } from "@/pages/clan"
import { SkinchangerPage } from "@/pages/skinchanger"
import { PenaltiesPage } from "@/pages/penalties"
import { ExplorePage } from "@/pages/explore"
import { FeedbackPage } from "@/pages/feedback"
import { ProfilePage } from "@/pages/profile"
import { ConnectPage } from "@/pages/connect"
import { StaffPanelPage } from "@/pages/staffpanel"
import { ProtectedPage } from "@/components/protected-page"
import { useAuth } from "@/hooks/use-auth"
import type { PageId } from "@/api/types"
import { PAGE_TITLES, routeToPage, pageToRoute } from "@/lib/routes"
import { isFeatureEnabled } from "@/lib/features"

// The staff panel is its own shell and bundle; players never download it.
const PanelApp = lazy(() => import("@/panel/panel-app"))
const StaffProfileApp = lazy(() => import("@/panel/panel-app").then((module) => ({ default: module.StaffProfileApp })))

function PanelFallback() {
  return <div className="flex min-h-dvh items-center justify-center"><div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" /></div>
}

// LEGACY-X visual system: preserve the existing compact glass sidebar shell and route-level page transitions.
export function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const mainRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  const currentPage = routeToPage(location.pathname)

  const handleNavigate = (page: PageId) => {
    navigate(getRouteForPage(page))
  }

  /** A player is addressed by SteamID64; your own profile is simply /profile. */
  const handleProfileNavigate = (identity: string) => {
    if (identity === user?.steamId || identity === user?.id) {
      navigate("/profile")
      return
    }

    const profilePath = `/profile/${encodeURIComponent(identity)}`

    const profileTab = window.open(profilePath, "_blank")
    if (profileTab) {
      profileTab.opener = null
      profileTab.focus()
      return
    }

    // Popup blocking is not expected for direct click handlers, but retain a usable fallback.
    navigate(profilePath)
  }
  const handleClanNavigate = (clanId: string) => {
    navigate(`/clans/${clanId}`)
  }

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [location.pathname])

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
    <SidebarProvider defaultOpen>
      <AppSidebar currentPage={currentPage} onNavigate={handleNavigate} />
      <SidebarInset>
        <header className="glass sticky top-0 z-50 flex h-14 items-center justify-between px-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <span className="text-sm font-medium text-muted-foreground">
              {PAGE_TITLES[currentPage]}
            </span>
          </div>
          <ProfileBlock onNavigate={handleNavigate} />
        </header>

        <div ref={mainRef} className="scrollbar-hidden flex-1 overflow-auto">
          <div key={location.pathname} className="page-enter">
            <RouteErrorBoundary resetKey={location.pathname}>
            <Routes>
              <Route path="/" element={<HomePage onNavigate={handleNavigate} />} />
              <Route path="/play/5vs5" element={<PlayPage mode="5vs5" />} />
              <Route path="/play/fun" element={<PlayPage mode="fun" />} />
              <Route path="/play/proleague" element={<PlayPage mode="proleague" />} />
              <Route path="/tournaments" element={<PlayPage mode="tournaments" />} />
              <Route path="/leaders" element={<LeadersPage onProfileNavigate={handleProfileNavigate} />} />
              {isFeatureEnabled("clan") && <Route path="/clan" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />}
              {isFeatureEnabled("clan") && <Route path="/clans" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />}
              {isFeatureEnabled("clan") && <Route path="/clan/:clanId" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />}
              {isFeatureEnabled("clan") && <Route path="/clans/:clanId" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />}
              <Route path="/skinchanger" element={<ProtectedPage pageName="Skinchanger"><SkinchangerPage /></ProtectedPage>} />
              <Route path="/penalties" element={<PenaltiesPage onProfileNavigate={handleProfileNavigate} />} />
              <Route path="/explore" element={<ExplorePage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />
              <Route path="/search" element={<ExplorePage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />
              <Route path="/reviews" element={<FeedbackPage onProfileNavigate={handleProfileNavigate} />} />
              <Route path="/feedback" element={<FeedbackPage onProfileNavigate={handleProfileNavigate} />} />
              <Route path="/profile" element={
                <ProtectedPage pageName="Profile">
                  <ProfilePage />
                </ProtectedPage>
              } />
              <Route path="/profile/:steamId" element={
                <ProtectedPage pageName="Profile">
                  <ProfilePage />
                </ProtectedPage>
              } />
              <Route path="/connect" element={<ConnectPage />} />
              <Route path="/staffpanel" element={<StaffPanelPage />} />
              <Route path="*" element={<HomePage onNavigate={handleNavigate} />} />
            </Routes>
            </RouteErrorBoundary>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

class RouteErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidUpdate(previousProps: Readonly<{ children: ReactNode; resetKey: string }>) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return <div className="flex min-h-[20rem] items-center justify-center p-6 text-sm text-muted-foreground">This page is temporarily unavailable.</div>
    }
    return this.props.children
  }
}

function getRouteForPage(page: PageId): string {
  return pageToRoute(page)
}

export default App
