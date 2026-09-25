import { Component, useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import { Navigate, Routes, Route, useNavigate, useLocation } from "react-router-dom"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { KillFeed } from "@/components/kill-feed"
import { AppSidebar } from "@/components/app-sidebar"
import { ProfileBlock } from "@/components/profile-block"
import { HomePage } from "@/pages/home"
import { PlayPage } from "@/pages/play"
import { SettingsPage } from "@/pages/settings"
import { getWebsitePreferences, useWebsitePreferences } from "@/lib/preferences"
import { TournamentsPage } from "@/pages/tournaments"
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
import { routeToPage, pageToRoute } from "@/lib/routes"
import { isFeatureEnabled } from "@/lib/features"

// LEGACY-X visual system: preserve the existing compact glass sidebar shell and route-level page transitions.
export function App() {
  const navigate = useNavigate()
  const location = useLocation()
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

    // Profiles open in the same tab, like every other page.
    navigate(`/profile/${encodeURIComponent(identity)}`)
  }
  const handleClanNavigate = (clanId: string) => {
    navigate(`/clans/${clanId}`)
  }

  // The content panel scrolls on its own, so send it back to the top on navigation.
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [location.pathname])

  const websitePrefs = useWebsitePreferences()

  // A narrow window, or the "Start with sidebar collapsed" setting, starts on the icon rail.
  return (
    <SidebarProvider defaultOpen={typeof window === "undefined" || (!getWebsitePreferences().sidebarCollapsed && window.innerWidth >= 1280)} style={{ "--sidebar-width": "264px", "--sidebar-width-icon": "62px" } as CSSProperties}>
      <AppSidebar currentPage={currentPage} onNavigate={handleNavigate} />
      {/* Floating shell: sidebar, top bar and content panel are separate cards with an 8px gutter. */}
      <SidebarInset className="m-0 flex h-svh min-w-0 flex-col gap-2 bg-transparent p-2 pl-0">
        <header className="flex h-14 shrink-0 items-center gap-4 rounded-[14px] border border-[var(--line-soft)] bg-[var(--panel)] pl-4 pr-2 max-md:pl-2">
          {/* On a phone the sidebar is a sheet, so the top bar carries its only trigger. */}
          <SidebarTrigger className="size-9 shrink-0 rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--raised)] hover:text-[var(--text)] min-[560px]:hidden" />
          {websitePrefs.killFeed ? <KillFeed /> : <div className="min-w-0 flex-1" />}
          <span aria-hidden="true" className="h-6 w-px shrink-0 bg-[var(--line)]" />
          <ProfileBlock onNavigate={handleNavigate} />
        </header>

        <div ref={panelRef} className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-clip rounded-[14px] border border-[var(--line-soft)] bg-[var(--panel)]">
          <div key={location.pathname} className="page-enter flex min-h-full flex-col">
            <RouteErrorBoundary resetKey={location.pathname}>
            <Routes>
              <Route path="/" element={<HomePage onNavigate={handleNavigate} />} />
              <Route path="/play/5x5" element={<PlayPage mode="5vs5" />} />
              <Route path="/play/fun" element={<PlayPage mode="fun" />} />
              <Route path="/play/pro" element={<PlayPage mode="proleague" />} />
              {/* Earlier addresses of the Play pages. */}
              <Route path="/play/5vs5" element={<Navigate to="/play/5x5" replace />} />
              <Route path="/play/proleague" element={<Navigate to="/play/pro" replace />} />
              <Route path="/tournaments" element={<TournamentsPage onProfileNavigate={handleProfileNavigate} />} />
              <Route path="/leaders" element={<LeadersPage onProfileNavigate={handleProfileNavigate} />} />
              {isFeatureEnabled("clan") && <Route path="/clan" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />}
              {isFeatureEnabled("clan") && <Route path="/clans" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />}
              {isFeatureEnabled("clan") && <Route path="/clan/:clanId" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />}
              {isFeatureEnabled("clan") && <Route path="/clans/:clanId" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />}
              <Route path="/skinchanger" element={<ProtectedPage pageName="Skinchanger"><SkinchangerPage /></ProtectedPage>} />
              <Route path="/penalties" element={<PenaltiesPage onProfileNavigate={handleProfileNavigate} />} />
              <Route path="/settings" element={<ProtectedPage pageName="Settings"><SettingsPage /></ProtectedPage>} />
              <Route path="/explore" element={<ExplorePage onProfileNavigate={handleProfileNavigate} />} />
              <Route path="/search" element={<ExplorePage onProfileNavigate={handleProfileNavigate} />} />
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
