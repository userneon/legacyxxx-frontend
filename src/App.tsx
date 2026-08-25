import { Component, useEffect, useRef, type ReactNode } from "react"
import { Routes, Route, useNavigate, useLocation } from "react-router-dom"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ProfileBlock } from "@/components/profile-block"
import { HomePage } from "@/pages/home"
import { PlayPage } from "@/pages/play"
import { LeadersPage } from "@/pages/leaders"
import { ClanPage } from "@/pages/clan"
import { ShopPage } from "@/pages/shop"
import { SkinchangerPage } from "@/pages/skinchanger"
import { PenaltiesPage } from "@/pages/penalties"
import { ExplorePage } from "@/pages/explore"
import { FeedbackPage } from "@/pages/feedback"
import { ProfilePage } from "@/pages/profile"
import { WalletPage } from "@/pages/wallet"
import { ConnectPage } from "@/pages/connect"
import { StaffPanelPage } from "@/pages/staffpanel"
import { ProtectedPage } from "@/components/protected-page"
import { useAuth } from "@/hooks/use-auth"
import type { PageId } from "@/api/types"
import { PAGE_TITLES, routeToPage } from "@/lib/routes"

// LEGACY-X visual system: preserve the existing compact glass sidebar shell and route-level page transitions.
export function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const mainRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  const currentPage = routeToPage(location.pathname)

  const handleNavigate = (page: PageId) => {
    if (page === "profile" && user?.steamId) {
      navigate(`/profile/${user.steamId}`)
      return
    }
    navigate(getRouteForPage(page))
  }

  const handleProfileNavigate = (steamId: string) => {
    const profilePath = `/profile/${encodeURIComponent(steamId)}`
    if (user?.steamId === steamId) {
      navigate(profilePath)
      return
    }

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
              <Route path="/clan" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />
              <Route path="/clans" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />
              <Route path="/clan/:clanId" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />
              <Route path="/clans/:clanId" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />
              <Route path="/shop" element={<ProtectedPage pageName="Shop"><ShopPage /></ProtectedPage>} />
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
              <Route path="/wallet" element={<ProtectedPage pageName="Wallet"><WalletPage /></ProtectedPage>} />
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
  switch (page) {
    case "home": return "/"
    case "play-5vs5": return "/play/5vs5"
    case "play-fun": return "/play/fun"
    case "play-proleague": return "/play/proleague"
    case "play-tournaments": return "/tournaments"
    case "leaders": return "/leaders"
    case "clan": return "/clan"
    case "shop": return "/shop"
    case "skinchanger": return "/skinchanger"
    case "penalties": return "/penalties"
    case "explore": return "/explore"
    case "feedback": return "/reviews"
    case "profile": return "/profile"
    case "wallet": return "/wallet"
    default: return "/"
  }
}

export default App
