import { BackgroundBeams } from "@/components/background-beams"
import { ProfileBackdrop } from "@/components/profile-backdrop"
import { ProfileScene } from "@/components/profile-scene"
import { useProfileScene } from "@/lib/profile-scene"
import { Component, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { Navigate, Routes, Route, useNavigate, useLocation } from "react-router-dom"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ProfileBlock } from "@/components/profile-block"
import { HomePage } from "@/pages/home"
import { PlayPage } from "@/pages/play"
import { SettingsPage } from "@/pages/settings"
import { getWebsitePreferences } from "@/lib/preferences"
import { TournamentsPage } from "@/pages/tournaments"
import { LeadersPage } from "@/pages/leaders"
import { ClanPage } from "@/pages/clan"
import { SkinchangerPage } from "@/pages/skinchanger"
import { ComparePage } from "@/pages/compare"
import { PenaltiesPage } from "@/pages/penalties"
import { ExplorePage } from "@/pages/explore"
import { FeedbackPage } from "@/pages/feedback"
import { ProfilePage } from "@/pages/profile"
import { ConnectPage } from "@/pages/connect"
import { StaffPanelPage } from "@/pages/staffpanel"
import { ProtectedPage } from "@/components/protected-page"
import { useAuth } from "@/hooks/use-auth"
import type { PageId } from "@/api/types"
import { routeToPage, pageToRoute, PAGE_TITLES, documentTitle } from "@/lib/routes"
import { isFeatureEnabled } from "@/lib/features"
import { cn } from "@/lib/utils"

// LEGACY-X visual system: preserve the existing compact glass sidebar shell and route-level page transitions.
export function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const currentPage = routeToPage(location.pathname)

  // Browser tab title follows the page ("Leaders · LEGACY-X"); Profile sets the player's name itself.
  useEffect(() => {
    if (currentPage === "profile") return
    document.title = documentTitle(currentPage === "home" ? null : PAGE_TITLES[currentPage])
  }, [currentPage])

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

  /*
   * Page transitions: the old page fades out (160ms) before the new one flows in, instead of being
   * swapped in the same frame. Moves inside one section (the Play modes, a filter or ?server= in
   * the URL) apply at once, so the Play page stays mounted and only its contents change.
   */
  const [shownLocation, setShownLocation] = useState(location)
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    if (location === shownLocation) return
    if (pageSection(location.pathname) === pageSection(shownLocation.pathname)) {
      setShownLocation(location)
      return
    }
    setLeaving(true)
    const timer = window.setTimeout(() => {
      setShownLocation(location)
      setLeaving(false)
    }, PAGE_LEAVE_MS)
    return () => window.clearTimeout(timer)
  }, [location, shownLocation])

  // The content panel scrolls on its own; a new page starts at the top (instantly, while it fades in).
  const panelRef = useRef<HTMLDivElement>(null)
  const shownSection = pageSection(shownLocation.pathname)
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 })
  }, [shownSection])

  const profileScene = useProfileScene()
  // A profile with a Steam background gets it behind the whole window; one without keeps the Grid Scan (dev) or the beams.
  const profileGrid = currentPage === "profile" && isFeatureEnabled("profileGrid") && !profileScene

  // A narrow window, or the "Start with sidebar collapsed" setting, starts on the icon rail.
  return (
    <SidebarProvider defaultOpen={typeof window === "undefined" || (!getWebsitePreferences().sidebarCollapsed && window.innerWidth >= 1280)} style={{ "--sidebar-width": "264px", "--sidebar-width-icon": "62px" } as CSSProperties}>
      {/* On a profile the whole backdrop is the Grid Scan; the beams come back when the visitor leaves. */}
      {!profileGrid && !profileScene && <BackgroundBeams />}
      <ProfileScene scene={currentPage === "profile" ? profileScene : null} />
      <ProfileBackdrop active={profileGrid} />
      <AppSidebar currentPage={currentPage} onNavigate={handleNavigate} />
      {/* Floating shell: sidebar, top bar and content panel are separate cards with an 8px gutter. */}
      <SidebarInset className="m-0 flex h-svh min-w-0 flex-col gap-2 bg-transparent p-2 pl-0">
        <header className="lx-glass-shell flex h-14 shrink-0 items-center gap-4 rounded-[14px] pl-4 pr-2 max-md:pl-2">
          {/* On a phone the sidebar is a sheet, so the top bar carries its only trigger. */}
          <SidebarTrigger className="size-9 shrink-0 rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--raised)] hover:text-[var(--text)] min-[560px]:hidden" />
          <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px]">
            <span className="shrink-0 text-[var(--text-dim)]">LEGACY-X</span>
            <span aria-hidden="true" className="text-[var(--text-faint)]">/</span>
            <span className="truncate font-semibold text-[var(--text)]">{PAGE_TITLES[currentPage]}</span>
          </div>
          <span aria-hidden="true" className="h-6 w-px shrink-0 bg-[var(--line)]" />
          <ProfileBlock onNavigate={handleNavigate} />
        </header>

        <div ref={panelRef} className="lx-glass-shell scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-clip rounded-[14px]">
          <div key={shownSection} className={cn("page-enter flex min-h-full flex-col", leaving && "page-leave")}>
            <RouteErrorBoundary resetKey={shownLocation.pathname}>
            <Routes location={shownLocation}>
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
              {isFeatureEnabled("compare") && <Route path="/compare" element={<ComparePage />} />}
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

const PAGE_LEAVE_MS = 160

/** Pages that share one mounted view: every Play mode is the Play section. */
function pageSection(pathname: string): string {
  return pathname.startsWith("/play/") ? "/play" : pathname
}

function getRouteForPage(page: PageId): string {
  return pageToRoute(page)
}

export default App
