import { EventLayer } from "@/components/event-layer"
import { SnowLayer } from "@/components/snow-layer"
import { loadPerkCatalogue } from "@/api/perks"
import { ProfileBackdrop } from "@/components/profile-backdrop"
import { ProfileScene } from "@/components/profile-scene"
import { useProfileScene } from "@/lib/profile-scene"
import { Component, Suspense, lazy, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { ArrowUp } from "lucide-react"
import { Navigate, Routes, Route, useNavigate, useLocation } from "react-router-dom"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { ShellNav } from "@/components/app-rail"
import { SHELL } from "@/lib/shell"
import { ProfileBlock } from "@/components/profile-block"
import { SiteTourButton } from "@/components/site-tour"
import { AccountSidebar } from "@/components/account-sidebar"
import { PublicChat } from "@/components/public-chat"
import { HomePage } from "@/pages/home"
import { PlayPage } from "@/pages/play"
import { LeadersPage } from "@/pages/leaders"
import { ProfilePage } from "@/pages/profile"
import { ProtectedPage } from "@/components/protected-page"
import { useAuth } from "@/hooks/use-auth"
import type { PageId } from "@/api/types"
import { routeToPage, pageToRoute, PAGE_TITLES, documentTitle } from "@/lib/routes"
import { isFeatureEnabled } from "@/lib/features"
import { ExternalRedirect } from "@/components/external-redirect"
import { ADMIN_URL } from "@/lib/sites"
import { cn } from "@/lib/utils"

// Pages other than the first ones a visitor needs load when they are opened, so the first page does not wait for the Staff, Shop and Skinchanger code.
const PrivacyPage = lazy(() => import("@/pages/privacy").then((module) => ({ default: module.PrivacyPage })))
const TournamentsPage = lazy(() => import("@/pages/tournaments").then((module) => ({ default: module.TournamentsPage })))
const SkinCollectionPage = lazy(() => import("@/pages/skin-collection").then((module) => ({ default: module.SkinCollectionPage })))
const SkinchangerPage = lazy(() => import("@/pages/skinchanger").then((module) => ({ default: module.SkinchangerPage })))
const ComparePage = lazy(() => import("@/pages/compare").then((module) => ({ default: module.ComparePage })))
const ShopPage = lazy(() => import("@/pages/shop").then((module) => ({ default: module.ShopPage })))
const WalletPage = lazy(() => import("@/pages/wallet").then((module) => ({ default: module.WalletPage })))
const PenaltiesPage = lazy(() => import("@/pages/penalties").then((module) => ({ default: module.PenaltiesPage })))
const ExplorePage = lazy(() => import("@/pages/explore").then((module) => ({ default: module.ExplorePage })))
const DiscordPage = lazy(() => import("@/pages/discord").then((module) => ({ default: module.DiscordPage })))
const TeamPage = lazy(() => import("@/pages/team").then((module) => ({ default: module.TeamPage })))
const MarketPage = lazy(() => import("@/pages/market").then((module) => ({ default: module.MarketPage })))
const MarketListingPage = lazy(() => import("@/pages/market-listing").then((module) => ({ default: module.MarketListingPage })))
const CreatorsPage = lazy(() => import("@/pages/creators").then((module) => ({ default: module.CreatorsPage })))
const FeedbackPage = lazy(() => import("@/pages/feedback").then((module) => ({ default: module.FeedbackPage })))
const ConnectPage = lazy(() => import("@/pages/connect").then((module) => ({ default: module.ConnectPage })))
const ClanPage = lazy(() => import("@/pages/clan").then((module) => ({ default: module.ClanPage })))

// LEGACY-X visual system: preserve the existing compact glass sidebar shell and route-level page transitions.
export function App() {
  // The Shop's ranks are asked for in the background, so they are already there when the Shop opens.
  useEffect(() => { const id = window.setTimeout(() => { void loadPerkCatalogue().catch(() => undefined) }, 1500); return () => window.clearTimeout(id) }, [])
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
  // A long page: a round button brings you back to the top once you have scrolled a screen down.
  const [showTop, setShowTop] = useState(false)
  useEffect(() => {
    const node = panelRef.current
    if (!node) return
    const onScroll = () => setShowTop(node.scrollTop > 480)
    onScroll()
    node.addEventListener("scroll", onScroll, { passive: true })
    return () => node.removeEventListener("scroll", onScroll)
  }, [])
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 })
  }, [shownSection])

  // The detail sheets open inside the page panel (owner request 2026-11-09): publish the panel's edges so the sheet and its blur can sit exactly over it.
  useEffect(() => {
    const node = panelRef.current
    if (!node) return
    const root = document.documentElement
    const publish = () => {
      const rect = node.getBoundingClientRect()
      root.style.setProperty("--lx-panel-left", `${Math.round(rect.left)}px`)
      root.style.setProperty("--lx-panel-top", `${Math.round(rect.top)}px`)
      root.style.setProperty("--lx-panel-right", `${Math.round(window.innerWidth - rect.right)}px`)
      root.style.setProperty("--lx-panel-bottom", `${Math.round(window.innerHeight - rect.bottom)}px`)
    }
    root.classList.add("lx-shell")
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(node)
    window.addEventListener("resize", publish)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", publish)
      root.classList.remove("lx-shell")
    }
  }, [])

  const profileScene = useProfileScene()
  // A profile with a Steam background gets it behind the whole window; one without keeps the Grid Scan (dev) or the beams.
  const profileGrid = false // the grid behind the profile was taken out (owner request 2026-11-13)

  // A narrow window, or the "Start with sidebar collapsed" setting, starts on the icon rail.
  return (
    // Two sidebars, always closed to their icons (owner requests 2026-11-13: "dual sidebar, remove the top bar, without a toggle", then "always closed"): the menu on the left, the account on the right.
    <SidebarProvider open={false} onOpenChange={() => {}} style={{ "--sidebar-width": "264px", "--sidebar-width-icon": "62px" } as CSSProperties}>
      <EventLayer />
      <SnowLayer />
      <ProfileScene scene={currentPage === "profile" ? profileScene : null} />
      <ProfileBackdrop active={profileGrid} />
      {/* The shell (owner pick 2026-11-09): one solid frame holding the rail, a pill header and the page panel. A phone keeps the sidebar sheet and the older layout. */}
      <div className={SHELL === "pill" ? "lx-frame" : "contents"}>
      <ShellNav currentPage={currentPage} onNavigate={handleNavigate} />
      <SidebarInset className={cn("m-0 flex min-w-0 flex-col gap-2 bg-transparent", SHELL === "pill" ? "lx-frame-main max-[559px]:h-svh max-[559px]:p-2" : "h-svh p-2 pl-0 max-[559px]:pl-2")}>
        {/* The top bar is gone on wider windows (its parts live in the right sidebar); a phone keeps it, since it has neither sidebar on screen. */}
        <header className={cn("lx-glass-shell relative z-[3] flex h-14 shrink-0 items-center gap-4 pl-4 pr-2 max-md:pl-2 max-sm:gap-1.5 min-[560px]:hidden", SHELL === "pill" ? "lx-frame-header" : "rounded-[14px]")}>
          {/* On a phone the sidebar is a sheet, so the top bar carries its only trigger. */}
          <SidebarTrigger className="size-9 shrink-0 rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--raised)] hover:text-[var(--text)] min-[560px]:hidden" />
          <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px]">
            <span className="shrink-0 text-[var(--text-dim)] max-sm:hidden">LEGACY-X</span>
            <span aria-hidden="true" className="text-[var(--text-faint)] max-sm:hidden">/</span>
            <span className="truncate font-semibold text-[var(--text)]">{PAGE_TITLES[currentPage]}</span>
          </div>
          <SiteTourButton />
          <span aria-hidden="true" className="h-6 w-px shrink-0 bg-[var(--line)] max-sm:hidden" />
          <ProfileBlock onNavigate={handleNavigate} tab={SHELL === "pill" && (location.pathname === "/profile" || location.pathname === "/discord")} />
        </header>

        <button
          type="button"
          aria-label="Back to the top"
          onClick={() => panelRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ left: "calc(var(--lx-panel-left, 0px) + 16px)", bottom: "calc(var(--lx-panel-bottom, 0px) + 16px)" }}
          className={cn("fixed z-30 flex size-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text)] shadow-lg transition-[opacity,transform] duration-200 hover:bg-[var(--line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]", showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0")}
        >
          <ArrowUp className="size-5" aria-hidden="true" />
        </button>
        <div ref={panelRef} className={cn("lx-glass-shell scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-clip max-sm:pb-16", SHELL === "pill" ? "lx-frame-panel" : "rounded-[14px]")}>
          {/* Leaders scrolls its table inside the panel (sticky header, your row pinned under it), so it gets the panel's height instead of growing past it. */}
          <div key={shownSection} className={cn("page-enter flex flex-col", shownSection === "/leaders" ? "h-full" : "min-h-full", leaving && "page-leave")}>
            <RouteErrorBoundary resetKey={shownLocation.pathname}>
            <Suspense fallback={<div className="min-h-[40vh]" aria-hidden="true" />}>
            <Routes location={shownLocation}>
              <Route path="/" element={<HomePage onNavigate={handleNavigate} />} />
              <Route path="/play/5x5" element={<PlayPage mode="5vs5" />} />
              <Route path="/play/fun" element={<PlayPage mode="fun" />} />
              <Route path="/play/pro" element={<PlayPage mode="proleague" />} />
              {/* Earlier addresses of the Play pages. */}
              <Route path="/play/5vs5" element={<Navigate to="/play/5x5" replace />} />
              <Route path="/play/proleague" element={<Navigate to="/play/pro" replace />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/tournaments" element={<TournamentsPage onProfileNavigate={handleProfileNavigate} />} />
              <Route path="/leaders" element={<LeadersPage onProfileNavigate={handleProfileNavigate} />} />
              {/* The address is /clans (and /clans/1); the older /clan keeps working and moves there, with its ?tab= kept. */}
              {isFeatureEnabled("clan") && <Route path="/clan" element={<Navigate to={{ pathname: "/clans", search: location.search }} replace />} />}
              {isFeatureEnabled("clan") && <Route path="/clans/appearance" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />}
              {isFeatureEnabled("clan") && <Route path="/clans" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />}
              {isFeatureEnabled("clan") && <Route path="/clan/:clanId" element={<Navigate to={{ pathname: location.pathname.replace(/^\/clan\//, "/clans/"), search: location.search }} replace />} />}
              {isFeatureEnabled("clan") && <Route path="/clans/:clanId" element={<ClanPage onProfileNavigate={handleProfileNavigate} onClanNavigate={handleClanNavigate} />} />}
              <Route path="/skinchanger/collections/:collectionId" element={<ProtectedPage pageName="Skinchanger"><SkinCollectionPage /></ProtectedPage>} />
              <Route path="/skinchanger" element={<ProtectedPage pageName="Skinchanger"><SkinchangerPage /></ProtectedPage>} />
              {isFeatureEnabled("compare") && <Route path="/compare" element={<ComparePage />} />}
              {/* Staff lives on its own site now (owner request 2026-10-23); the older addresses move there. */}
              <Route path="/staff/*" element={<ExternalRedirect to={`${ADMIN_URL}${location.pathname}${location.search}`} />} />
              <Route path="/checks" element={<ExternalRedirect to={`${ADMIN_URL}/staff/checks`} />} />
              <Route path="/wallet" element={<ProtectedPage pageName="Wallet"><WalletPage /></ProtectedPage>} />
              <Route path="/wallet/:tab" element={<ProtectedPage pageName="Wallet"><WalletPage /></ProtectedPage>} />
              {isFeatureEnabled("shop") && <Route path="/shop" element={<ProtectedPage pageName="Shop"><ShopPage /></ProtectedPage>} />}
              {isFeatureEnabled("shop") && <Route path="/shop/top-up" element={<Navigate to="/wallet/top-up" replace />} />}
              {isFeatureEnabled("shop") && <Route path="/shop/:tab" element={<ProtectedPage pageName="Shop"><ShopPage /></ProtectedPage>} />}
              {isFeatureEnabled("market") && <Route path="/market" element={<MarketPage />} />}
              {isFeatureEnabled("market") && <Route path="/market/:id" element={<MarketListingPage />} />}
              <Route path="/penalties" element={<PenaltiesPage onProfileNavigate={handleProfileNavigate} />} />
              {/* Settings now live in Profile. */}
              <Route path="/settings" element={<Navigate to="/profile" state={{ tab: "settings" }} replace />} />
              <Route path="/explore" element={<ExplorePage onProfileNavigate={handleProfileNavigate} />} />
              <Route path="/creators" element={<CreatorsPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/discord" element={<DiscordPage />} />
              <Route path="/search" element={<ExplorePage onProfileNavigate={handleProfileNavigate} />} />
              <Route path="/reviews" element={<FeedbackPage onProfileNavigate={handleProfileNavigate} />} />
              <Route path="/feedback" element={<FeedbackPage onProfileNavigate={handleProfileNavigate} />} />
              <Route path="/profile" element={
                <ProtectedPage pageName="Profile">
                  <ProfilePage />
                </ProtectedPage>
              } />
              <Route path="/profile/appearance" element={<ProtectedPage pageName="Profile"><ProfilePage /></ProtectedPage>} />
              <Route path="/profile/settings" element={<ProtectedPage pageName="Profile"><ProfilePage /></ProtectedPage>} />
              <Route path="/profile/:steamId" element={
                <ProtectedPage pageName="Profile">
                  <ProfilePage />
                </ProtectedPage>
              } />
              <Route path="/connect" element={<ConnectPage />} />
              <Route path="*" element={<HomePage onNavigate={handleNavigate} />} />
            </Routes>
            </Suspense>
            </RouteErrorBoundary>
          </div>
        </div>
      </SidebarInset>
      <AccountSidebar onNavigate={handleNavigate} />
      </div>
      <PublicChat />
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
