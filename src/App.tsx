import { useEffect, useRef } from "react"
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
import { ProtectedPage } from "@/components/protected-page"
import { useAuth } from "@/hooks/use-auth"
import type { PageId } from "@/api/types"
import { PAGE_TITLES, routeToPage } from "@/lib/routes"

// LEGACY-X visual system: preserve the existing compact glass sidebar shell and route-level page transitions.
const localSkinchangerPreviewUrl = "https://5177-ixb4ame4rc059l817o60r-b5eb73d9.us2.manus.computer/skinchanger"

export function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const mainRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  const currentPage = routeToPage(location.pathname)

  const handleNavigate = (page: PageId) => {
    if (page === "skinchanger") {
      window.location.assign(localSkinchangerPreviewUrl)
      return
    }
    if (page === "profile" && user?.steamId) {
      navigate(`/profile/${user.steamId}`)
      return
    }
    navigate(getRouteForPage(page))
  }

  const handleProfileNavigate = (steamId: string) => {
    navigate(`/profile/${steamId}`)
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

        <div ref={mainRef} className="flex-1 overflow-auto">
          <div key={location.pathname} className="page-enter">
            <Routes>
              <Route path="/" element={<HomePage onNavigate={handleNavigate} />} />
              <Route path="/play/5vs5" element={<PlayPage mode="5vs5" />} />
              <Route path="/play/fun" element={<PlayPage mode="fun" />} />
              <Route path="/play/proleague" element={<PlayPage mode="proleague" />} />
              <Route path="/tournaments" element={<PlayPage mode="tournaments" />} />
              <Route path="/leaderboard" element={<LeadersPage onProfileNavigate={handleProfileNavigate} />} />
              <Route path="/clans" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />
              <Route path="/clans/:clanId" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />
              <Route path="/shop" element={<ProtectedPage pageName="Shop"><ShopPage /></ProtectedPage>} />
              <Route path="/skinchanger" element={<ProtectedPage pageName="Skinchanger"><SkinchangerPage /></ProtectedPage>} />
              <Route path="/penalties" element={<PenaltiesPage onProfileNavigate={handleProfileNavigate} />} />
              <Route path="/search" element={<ExplorePage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />
              <Route path="/feedback" element={<ProtectedPage pageName="Reviews"><FeedbackPage /></ProtectedPage>} />
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
              <Route path="*" element={<HomePage onNavigate={handleNavigate} />} />
            </Routes>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function getRouteForPage(page: PageId): string {
  switch (page) {
    case "home": return "/"
    case "play-5vs5": return "/play/5vs5"
    case "play-fun": return "/play/fun"
    case "play-proleague": return "/play/proleague"
    case "play-tournaments": return "/tournaments"
    case "leaders": return "/leaderboard"
    case "clan": return "/clans"
    case "shop": return "/shop"
    case "skinchanger": return "/skinchanger"
    case "penalties": return "/penalties"
    case "explore": return "/search"
    case "feedback": return "/feedback"
    case "profile": return "/profile"
    case "wallet": return "/wallet"
    default: return "/"
  }
}

export default App
