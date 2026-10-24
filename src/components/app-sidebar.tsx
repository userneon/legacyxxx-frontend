import type React from "react"
import { useEffect, useState, type ComponentType } from "react"
import { ArrowLeftRight, Gem, DoorOpen, Swords, MountainSnow, Scale, ScrollText, Telescope, Users, Lock, ChevronDown, ShieldCheck, Clapperboard } from "lucide-react"

import { isFeatureEnabled, isPageEnabled } from "@/lib/features"
import { competitiveService } from "@/api"
import { playService, type PlayServerList } from "@/api/play"
import { ADMIN_URL } from "@/lib/sites"
import type { CompetitiveAccess, PageId } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useModerationAccess } from "@/components/penalty-staff"
import { useAuth } from "@/hooks/use-auth"
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { setSkinchangerView, useSkinchangerView, type SkinchangerView } from "@/lib/skinchanger-view"
import { KnifeIcon } from "@/components/knife-icon"
import { DiscordIcon } from "@/components/discord-strip"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface AppSidebarProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
}

type NavItem = { id: PageId; label: string; icon: ComponentType<{ className?: string }> }

/** Navigation only lists pages whose feature is switched on — a disabled page has no entry at all. */
function enabledNav(items: NavItem[]): NavItem[] {
  return items.filter((item) => isPageEnabled(item.id))
}

// The Play submenu rows show no icon; the type only needs one for the other rows.
const PLAY_ITEMS: NavItem[] = enabledNav([
  { id: "play-5vs5", label: "5x5 Matches", icon: Swords },
  { id: "play-fun", label: "Fun Mode", icon: Swords },
  { id: "play-proleague", label: "Pro League", icon: Swords },
  { id: "play-tournaments", label: "Tournaments", icon: Swords },
])

const NAV_ITEMS: NavItem[] = enabledNav([
  { id: "skinchanger", label: "Skinchanger", icon: KnifeIcon },
  { id: "compare", label: "Compare", icon: ArrowLeftRight },
  { id: "shop", label: "Shop", icon: Gem },
  { id: "leaders", label: "Leaders", icon: MountainSnow },
  { id: "clan", label: "Clans", icon: Users },
  { id: "creators", label: "Creators", icon: Clapperboard },
  { id: "penalties", label: "Penalties", icon: Scale },
  { id: "feedback", label: "Reviews", icon: ScrollText },
  { id: "explore", label: "Explore", icon: Telescope },
  { id: "discord", label: "Discord", icon: DiscordIcon },
])

// Skinchanger gets a submenu only while community collections are switched on.
const SKIN_VIEWS: Array<{ id: SkinchangerView; label: string }> = [
  { id: "loadout", label: "Loadout" },
  { id: "collections", label: "Collections" },
]

const EASE = "ease-[cubic-bezier(0.2,0,0,1)]"

/**
 * The sidebar button's icon, drawn so it moves with the sidebar: a window with a side panel. Open, the panel is filled and its divider sits
 * at the panel's edge; collapsed, the fill slides away and the divider glides to the left edge. Pressing it squeezes it for a moment.
 */
function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-[18px] overflow-visible">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="3" y="3" width="6" height="18" rx="1" fill="currentColor" stroke="none" className={cn("origin-left transition-[transform,opacity] duration-300 motion-reduce:transition-none", EASE, collapsed ? "scale-x-0 opacity-0" : "scale-x-100 opacity-30")} />
      <path d="M9 3v18" className={cn("transition-transform duration-300 motion-reduce:transition-none", EASE, collapsed ? "-translate-x-[3px]" : "translate-x-0")} />
    </svg>
  )
}

/**
 * Every row keeps its icon at the same x in both states: the rail narrows around it, so collapsing
 * never makes an icon jump. The row is 40px tall and, collapsed, a 40px square.
 * Hover has no fill (it would sit flat on the glass): a thin white tick at the left edge and the label
 * nudged 2px. The active row uses the same tick in violet (the one brand mark in the nav), a violet
 * icon and a semibold label; no fill or glow either.
 */
const rowClass = cn(
  "relative flex h-10 w-full items-center gap-2.5 overflow-hidden rounded-lg pl-[11px] pr-3 text-sm font-medium text-[var(--text-muted)]",
  "transition-colors duration-150 hover:text-[var(--text)]",
  "before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-[var(--text)]/55 before:opacity-0 before:transition-opacity before:duration-150 hover:before:opacity-100",
  "hover:[&>.lx-nav-label]:translate-x-0.5",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/60",
)
const activeRowClass = "font-semibold text-[var(--text)] [&>svg]:text-[var(--brand-bright)] before:inset-y-2.5 before:bg-[var(--brand-bright)] before:opacity-100"

/** Labels fade out (120ms) before the width shrinks, and fade back in once it has grown. */
function labelClass(collapsed: boolean) {
  return cn(
    "lx-nav-label min-w-0 truncate whitespace-nowrap text-left transition-[opacity,translate] motion-reduce:transition-none",
    collapsed ? "opacity-0 duration-[120ms]" : "opacity-100 delay-150 duration-200",
  )
}

/** On the icon rail the labels are hidden, so the row names itself in a tooltip to the right; expanded, it is a plain row. */
function RailTip({ label, show, children }: { label: string; show: boolean; children: React.ReactElement }) {
  if (!show) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="rounded-lg border border-[var(--line-strong)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text)] shadow-[0_8px_24px_rgba(0,0,0,0.5)] duration-150 [--tooltip-bg:var(--card-surface)]">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export function AppSidebar({ currentPage, onNavigate }: AppSidebarProps) {
  const { state, toggleSidebar, isMobile } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile
  const { isAuthenticated } = useAuth()
  // The groups start closed; the one you are inside starts open so the current page is visible.
  const [playOpen, setPlayOpen] = useState(currentPage.startsWith("play-"))
  const [skinOpen, setSkinOpen] = useState(currentPage === "skinchanger")
  const skinView = useSkinchangerView()
  // Admins, Managers and Owners can ask players for a check; nobody else gets the entry.
  const staffAccess = useModerationAccess()
  const mayCheck = Boolean(staffAccess && staffAccess.role && ["ADMIN", "MANAGER", "OWNER"].includes(staffAccess.role))
  const navItems: NavItem[] = mayCheck ? [...NAV_ITEMS, { id: "staff", label: "Staff", icon: ShieldCheck }] : NAV_ITEMS

  // Live player counts next to the Play rows, refreshed every 30s while the tab is visible.
  const { data: competitive, refetch: refetchCompetitive } = useApiQuery<PlayServerList>((signal) => playService.getServers("5x5", { signal }), { queryKey: "sidebar-play-5x5", keepPreviousData: true })
  const { data: fun, refetch: refetchFun } = useApiQuery<PlayServerList>((signal) => playService.getServers("fun", { signal }), { queryKey: "sidebar-play-fun", keepPreviousData: true })
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") { refetchCompetitive(); refetchFun() } }, 30_000)
    return () => window.clearInterval(timer)
  }, [refetchCompetitive, refetchFun])

  const { data: access } = useApiQuery<CompetitiveAccess>((signal) => competitiveService.getMyAccess({ signal }), { enabled: isAuthenticated, queryKey: `sidebar-access:${isAuthenticated}` })
  const proLeagueLocked = !access?.proLeagueUnlocked

  const playersIn = (id: PageId) => (id === "play-5vs5" ? competitive?.players : id === "play-fun" ? fun?.players : 0) ?? 0
  const anyoneOnline = playersIn("play-5vs5") + playersIn("play-fun") > 0
  const isActive = (id: PageId) => currentPage === id
  const playActive = currentPage.startsWith("play-")

  return (
    <Sidebar variant="floating" collapsible="icon" className="lx-glass-sidebar border-none [&>div[data-sidebar=sidebar]]:rounded-[14px]">
      <SidebarContent className="gap-0 overflow-x-hidden px-3 pb-3">
        <div className={cn("flex h-[60px] shrink-0 items-center transition-[padding] duration-300 motion-reduce:transition-none", EASE, collapsed ? "px-1" : "pl-3 pr-1")}>
          <span className={cn("flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-base font-bold tracking-[0.3px] text-[var(--text)]", labelClass(collapsed))}>
            <img src="/logolegacyx.webp" alt="" aria-hidden="true" className="size-6 shrink-0 drop-" />
            <span>LEGACY-<span className="text-[var(--brand-bright)]">X</span></span>
          </span>
<RailTip label="Open sidebar" show={collapsed}><button
            type="button"
            onClick={toggleSidebar}
            aria-expanded={!collapsed}
            aria-label="Toggle sidebar"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-[color,background-color,scale] duration-150 active:scale-90 motion-reduce:transition-none hover:bg-[var(--raised)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
          >
            <SidebarToggleIcon collapsed={collapsed} />
          </button></RailTip>
        </div>

        <nav aria-label="Main" className="flex flex-col gap-0.5">
          <div className="relative">
            <RailTip label="Home" show={collapsed}><button type="button" onClick={() => onNavigate("home")} aria-label="Home" className={cn(rowClass, isActive("home") && activeRowClass)}>
              <DoorOpen className="size-[18px] shrink-0" />
              <span className={labelClass(collapsed)}>Home</span>
            </button></RailTip>
          </div>

          {PLAY_ITEMS.length > 0 && (
            <>
              <div className="relative">
<RailTip label="Play" show={collapsed}><button
                type="button"
                // On the icon rail there's no room for the submenu, so Play opens 5x5 directly.
                onClick={() => (collapsed ? onNavigate(PLAY_ITEMS[0].id) : setPlayOpen((open) => !open))}
                aria-label="Play"
                aria-expanded={collapsed ? undefined : playOpen}
                className={cn(rowClass, collapsed && playActive && activeRowClass)}
              >
                <Swords className="size-[18px] shrink-0" />
                <span className={cn(labelClass(collapsed), "flex-1")}>Play</span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0 text-[var(--text-dim)] transition-[rotate,opacity] duration-300 motion-reduce:transition-none",
                    EASE,
                    playOpen && "rotate-180",
                    collapsed ? "opacity-0" : "opacity-100",
                  )}
                />
                {collapsed && anyoneOnline && <span aria-hidden="true" className="absolute right-2 top-2 size-1.5 rounded-full bg-[var(--status-green)]" />}
              </button></RailTip>
              </div>

              {/* The submenu folds away (collapsed rail, or closed) instead of appearing and disappearing. */}
              <div
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none",
                  EASE,
                  playOpen && !collapsed ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
                inert={!playOpen || collapsed || undefined}
              >
                <div className="overflow-hidden">
                  <div className="ml-5 flex flex-col gap-0.5 border-l border-[var(--line)] pl-2">
                    {PLAY_ITEMS.map((item) => {
                      const active = isActive(item.id)
                      const locked = item.id === "play-proleague" && proLeagueLocked
                      const count = item.id === "play-5vs5" || item.id === "play-fun" ? playersIn(item.id) : 0
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onNavigate(item.id)}
                          className={cn(rowClass, "overflow-visible px-3", active && activeRowClass, locked && !active && "text-[var(--text-dim)]")}
                        >
                          <span className="lx-nav-label flex-1 truncate text-left transition-[translate] duration-150 motion-reduce:transition-none">{item.label}</span>
                          {locked && <Lock className="size-3.5 shrink-0 text-[var(--text-dim)]" />}
                          {count > 0 && (
                            <span className="flex shrink-0 items-center gap-1.5 text-xs text-[var(--text-muted)]">
                              <span className="size-1.5 rounded-full bg-[var(--status-green)]" />
                              {count}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {navItems.map((item) => {
            if (item.id === "skinchanger" && isFeatureEnabled("skinCollections")) {
              const open = skinOpen && !collapsed
              return (
                <div key={item.id} className="flex flex-col gap-0.5">
                  <div className="relative">
<RailTip label={item.label} show={collapsed}><button
                      type="button"
                      onClick={() => { if (collapsed || !isActive("skinchanger")) onNavigate("skinchanger"); if (!collapsed) setSkinOpen((was) => (isActive("skinchanger") ? !was : true)) }}
                      aria-label={item.label}
                      aria-expanded={collapsed ? undefined : skinOpen}
                      className={cn(rowClass, collapsed && isActive("skinchanger") && activeRowClass)}
                    >
                      <item.icon className="size-[18px] shrink-0" />
                      <span className={cn(labelClass(collapsed), "flex-1")}>{item.label}</span>
                      <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 text-[var(--text-dim)] transition-[rotate,opacity] duration-300 motion-reduce:transition-none", EASE, skinOpen && "rotate-180", collapsed ? "opacity-0" : "opacity-100")} />
                    </button></RailTip>
                  </div>
                  <div className={cn("grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none", EASE, open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")} inert={!open || undefined}>
                    <div className="overflow-hidden">
                      <div className="ml-5 flex flex-col gap-0.5 border-l border-[var(--line)] pl-2">
                        {SKIN_VIEWS.map((entry) => (
                          <button key={entry.id} type="button" onClick={() => { setSkinchangerView(entry.id); onNavigate("skinchanger") }} className={cn(rowClass, "overflow-visible px-3", isActive("skinchanger") && skinView === entry.id && activeRowClass)}>
                            <span className="lx-nav-label flex-1 truncate text-left transition-[translate] duration-150 motion-reduce:transition-none">{entry.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
            if (item.id === "staff") {
              return (
                <div key={item.id} className="relative">
                  <RailTip label={item.label} show={collapsed}><a href={ADMIN_URL} aria-label={item.label} className={rowClass}>
                    <item.icon className="size-[18px] shrink-0" />
                    <span className={labelClass(collapsed)}>{item.label}</span>
                  </a></RailTip>
                </div>
              )
            }
            return (
              <div key={item.id} className="relative">
                <RailTip label={item.label} show={collapsed}><button type="button" onClick={() => onNavigate(item.id)} aria-label={item.label} className={cn(rowClass, isActive(item.id) && activeRowClass)}>
                  <item.icon className="size-[18px] shrink-0" />
                  <span className={labelClass(collapsed)}>{item.label}</span>
                </button></RailTip>
              </div>
            )
          })}
        </nav>
      </SidebarContent>
    </Sidebar>
  )
}
