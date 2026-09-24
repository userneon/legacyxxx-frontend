import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom"
import {
  ArrowLeft, Ban, BellRing, ClipboardCheck, FileClock, Gauge, Globe, Hash, Loader2, Menu, MessageSquareWarning, MicOff,
  Package, Radio, Scale, Search, Server, ShieldCheck, ShieldOff, Users, UsersRound, type LucideIcon,
} from "lucide-react"

import { adminService, type SearchResult } from "@/api/admin"
import { PlayerAvatar } from "@/components/player-avatar"
import { ProtectedPage } from "@/components/protected-page"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useStaff } from "@/hooks/use-staff"
import { cn } from "@/lib/utils"
import { AuditPage, DashboardPage, LivePage, PlayersPage } from "./pages-core"
import { AppealsPage, BansPage, MutesPage, ReportsPage, ReviewQueuePage } from "./pages-moderation"
import { MatchPage, ServerDetailPage } from "./pages-servers"
import { AnnouncementsPage, NameFilterPage, ProductsPage, ServersManagePage, StaffRolesPage, WebsitePage } from "./pages-management"
import { StaffProfilePage } from "./pages-player"

type NavItem = { to: string; label: string; icon: LucideIcon; any: string[]; badge?: "reports" | "reviewQueue"; end?: boolean }
type NavGroup = { label?: string; items: NavItem[] }

const ROLE_PERMISSIONS = ["roles.assign", "roles.revoke", "roles.permissions.edit", "roles.immunity.edit"]

export const PANEL_NAV: NavGroup[] = [
  {
    items: [
      { to: "/panel", label: "Dashboard", icon: Gauge, any: ["panel.access"], end: true },
      { to: "/panel/live", label: "Live", icon: Radio, any: ["live.view"] },
      { to: "/panel/players", label: "Players", icon: Users, any: ["players.view"] },
    ],
  },
  {
    label: "Moderation",
    items: [
      { to: "/panel/reports", label: "Reports", icon: MessageSquareWarning, any: ["reports.view"], badge: "reports" },
      { to: "/panel/bans", label: "Bans", icon: Ban, any: ["bans.view"] },
      { to: "/panel/mutes", label: "Mutes", icon: MicOff, any: ["mutes.view"] },
      { to: "/panel/appeals", label: "Appeals", icon: Scale, any: ["appeals.view"] },
      { to: "/panel/review", label: "Review queue", icon: ClipboardCheck, any: ["bans.review"], badge: "reviewQueue" },
    ],
  },
  { items: [{ to: "/panel/audit", label: "Audit log", icon: FileClock, any: ["audit.view"] }] },
  {
    label: "Management",
    items: [
      { to: "/panel/staff", label: "Staff & Roles", icon: UsersRound, any: ROLE_PERMISSIONS },
      { to: "/panel/servers", label: "Servers", icon: Server, any: ["servers.create", "servers.delete", "servers.rotate_key"], end: true },
      { to: "/panel/products", label: "Products", icon: Package, any: ["products.view"] },
      { to: "/panel/announcements", label: "Announcements", icon: BellRing, any: ["announce.web", "announce.ingame"] },
      { to: "/panel/website", label: "Website", icon: Globe, any: ["site.customize"] },
      { to: "/panel/name-filter", label: "Name filter", icon: ShieldOff, any: ["name_filter.manage"] },
    ],
  },
]

/** Hides a route the user cannot use. The API refuses it anyway; this only avoids a dead screen. */
function Require({ any, children }: { any: string[]; children: ReactNode }) {
  const { can } = useStaff()
  if (!any.some(can)) return <NoAccess />
  return <>{children}</>
}

function NoAccess() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-6 text-center">
      <ShieldOff className="size-6 text-muted-foreground" />
      <p className="text-sm font-medium">You don't have access to this page</p>
      <Link to="/panel" className="text-[13px] text-amber-300 hover:underline">Back to the dashboard</Link>
    </div>
  )
}

export default function PanelApp() {
  return (
    <ProtectedPage pageName="Staff Panel">
      <TooltipProvider delayDuration={200}>
        <PanelGate />
      </TooltipProvider>
    </ProtectedPage>
  )
}

function PanelGate() {
  const { ready, staff, can } = useStaff()
  if (!ready) {
    return <div className="flex min-h-dvh items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
  }
  if (!staff || !can("panel.access")) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="glass max-w-sm rounded-2xl p-6 text-center">
          <ShieldOff className="mx-auto mb-3 size-6 text-muted-foreground" />
          <h1 className="text-base font-semibold">Staff only</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">This area is for the LEGACY-X staff team.</p>
          <Link to="/" className="mt-4 inline-block text-[13px] text-amber-300 hover:underline">Back to LEGACY-X</Link>
        </div>
      </div>
    )
  }
  return <PanelShell />
}

function PanelShell() {
  const [navOpen, setNavOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const { staff } = useStaff()

  useEffect(() => setNavOpen(false), [location.pathname])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const role = staff?.roles[0]

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="glass-sidebar sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border/50 lg:flex">
        <PanelNav />
      </aside>
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="glass-sidebar w-64 p-0">
          <SheetTitle className="sr-only">Staff panel navigation</SheetTitle>
          <PanelNav />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border/50 px-3 md:px-4">
          <button className="flex size-9 items-center justify-center rounded-lg hover:bg-accent lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open navigation">
            <Menu className="size-4" />
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 text-left text-[13px] text-muted-foreground transition-colors hover:border-amber-300/40 md:max-w-md"
          >
            <Search className="size-4 shrink-0" />
            <span className="truncate">Search SteamID, name or match ID</span>
            <kbd className="ml-auto hidden rounded border border-border/60 px-1.5 font-mono text-[10px] sm:inline">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            {role && <span className="hidden rounded-md bg-amber-300/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300 sm:inline">{role.name}</span>}
            <Link to="/" className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground">
              <ArrowLeft className="size-4" /><span className="hidden sm:inline">Site</span>
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <Routes>
            <Route index element={<DashboardPage />} />
            <Route path="live" element={<Require any={["live.view"]}><LivePage /></Require>} />
            <Route path="players" element={<Require any={["players.view"]}><PlayersPage /></Require>} />
            <Route path="reports" element={<Require any={["reports.view"]}><ReportsPage /></Require>} />
            <Route path="bans" element={<Require any={["bans.view"]}><BansPage /></Require>} />
            <Route path="mutes" element={<Require any={["mutes.view"]}><MutesPage /></Require>} />
            <Route path="appeals" element={<Require any={["appeals.view"]}><AppealsPage /></Require>} />
            <Route path="review" element={<Require any={["bans.review"]}><ReviewQueuePage /></Require>} />
            <Route path="audit" element={<Require any={["audit.view"]}><AuditPage /></Require>} />
            <Route path="servers" element={<Require any={["servers.create", "servers.delete", "servers.rotate_key"]}><ServersManagePage /></Require>} />
            <Route path="servers/:serverId" element={<Require any={["servers.view"]}><ServerDetailPage /></Require>} />
            <Route path="match/:matchId" element={<Require any={["servers.view"]}><MatchPage /></Require>} />
            <Route path="staff" element={<Require any={ROLE_PERMISSIONS}><StaffRolesPage /></Require>} />
            <Route path="products" element={<Require any={["products.view"]}><ProductsPage /></Require>} />
            <Route path="announcements" element={<Require any={["announce.web", "announce.ingame"]}><AnnouncementsPage /></Require>} />
            <Route path="website" element={<Require any={["site.customize"]}><WebsitePage /></Require>} />
            <Route path="name-filter" element={<Require any={["name_filter.manage"]}><NameFilterPage /></Require>} />
            <Route path="*" element={<Navigate to="/panel" replace />} />
          </Routes>
        </main>
      </div>

      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}

/** The staff profile lives at /u/:steamId but shares the panel shell. */
export function StaffProfileApp() {
  return (
    <ProtectedPage pageName="Staff Panel">
      <TooltipProvider delayDuration={200}>
        <StaffProfileGate />
      </TooltipProvider>
    </ProtectedPage>
  )
}

function StaffProfileGate() {
  const { ready, staff, can } = useStaff()
  const location = useLocation()
  if (!ready) return <div className="flex min-h-dvh items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
  // Players get the ordinary public profile.
  if (!staff || !can("players.moderation.view")) return <Navigate to={location.pathname.replace(/^\/u\//, "/profile/")} replace />
  return <ProfileShell />
}

function ProfileShell() {
  const [searchOpen, setSearchOpen] = useState(false)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen((open) => !open) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="glass-sidebar sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border/50 lg:flex"><PanelNav /></aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border/50 px-3 md:px-4">
          <Link to="/panel" className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground">
            <ArrowLeft className="size-4" />Panel
          </Link>
          <button onClick={() => setSearchOpen(true)} className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-border/60 px-3 text-[13px] text-muted-foreground hover:border-amber-300/40">
            <Search className="size-4" /><kbd className="hidden font-mono text-[10px] sm:inline">Ctrl K</kbd>
          </button>
        </header>
        <main className="min-w-0 flex-1"><StaffProfilePage /></main>
      </div>
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}

function PanelNav() {
  const { can, badge } = useStaff()
  return (
    <nav className="flex h-full flex-col gap-3 overflow-y-auto px-3 py-4">
      <Link to="/panel" className="flex items-center gap-2 px-2 pb-1">
        <ShieldCheck className="size-5 text-amber-300" />
        <span className="text-[13px] font-semibold tracking-wide">LEGACY-X Staff</span>
      </Link>
      {PANEL_NAV.map((group, index) => {
        const items = group.items.filter((item) => item.any.some(can))
        if (items.length === 0) return null
        return (
          <div key={group.label ?? index} className="flex flex-col gap-0.5">
            {group.label && <span className="px-2 pb-1 text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/60">{group.label}</span>}
            {items.map((item) => {
              const count = item.badge ? badge?.[item.badge] ?? 0 : 0
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(
                    "flex h-9 items-center gap-2.5 rounded-lg px-2 text-[13px] transition-colors",
                    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {count > 0 && <span className="ml-auto rounded-full bg-amber-300 px-1.5 text-[10px] font-bold text-black tabular-nums">{count > 99 ? "99+" : count}</span>}
                </NavLink>
              )
            })}
          </div>
        )
      })}
    </nav>
  )
}

/* ---------------------------------------------------------------------------
 * Ctrl+K search
 * ------------------------------------------------------------------------- */

function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const requestRef = useRef(0)

  useEffect(() => { if (!open) { setQuery(""); setResult(null); setActive(0) } }, [open])
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResult(null); return }
    const id = ++requestRef.current
    setLoading(true)
    const timer = window.setTimeout(() => {
      adminService.search(q)
        .then((data) => { if (id === requestRef.current) { setResult(data); setActive(0) } })
        .catch(() => { if (id === requestRef.current) setResult({ players: [], matches: [] }) })
        .finally(() => { if (id === requestRef.current) setLoading(false) })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query])

  const entries = [
    ...(result?.players ?? []).map((player) => ({ key: `p-${player.steamId}`, to: `/u/${player.steamId}`, player, match: null as null | SearchResult["matches"][number] })),
    ...(result?.matches ?? []).map((match) => ({ key: `m-${match.matchId}`, to: `/panel/match/${encodeURIComponent(match.matchId)}`, player: null, match })),
  ]
  const go = (to: string) => { onOpenChange(false); navigate(to) }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="glass top-[20%] max-w-lg translate-y-0 gap-0 p-0">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border/50 px-3">
          {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : <Search className="size-4 text-muted-foreground" />}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(entries.length - 1, i + 1)) }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
              if (e.key === "Enter" && entries[active]) go(entries[active].to)
              if (e.key === "Enter" && !entries[active] && /^\d{17}$/.test(query.trim())) go(`/u/${query.trim()}`)
            }}
            placeholder="SteamID64, player name or match ID"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {query.trim().length < 2 && <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">Type at least 2 characters</p>}
          {result && entries.length === 0 && !loading && <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">No matches</p>}
          {entries.map((entry, index) => (
            <button
              key={entry.key}
              onMouseEnter={() => setActive(index)}
              onClick={() => go(entry.to)}
              className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left", index === active && "bg-accent")}
            >
              {entry.player ? (
                <>
                  <PlayerAvatar avatar={entry.player.avatar} name={entry.player.name} className="size-7 rounded-md" />
                  <span className="min-w-0 flex-1 truncate text-[13px]">{entry.player.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{entry.player.steamId}</span>
                </>
              ) : (
                <>
                  <span className="flex size-7 items-center justify-center rounded-md bg-secondary"><Hash className="size-3.5" /></span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{entry.match!.matchId}</span>
                  <span className="text-[11px] text-muted-foreground">Match</span>
                </>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
