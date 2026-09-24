import { useEffect, useState } from "react"
import { House, Play, Paintbrush, Trophy, Gavel, MessageSquare, Search, Lock, PanelLeft, ChevronDown, type LucideIcon } from "lucide-react"

import { isPageEnabled } from "@/lib/features"
import { competitiveService } from "@/api"
import { playService, type PlayServerList } from "@/api/play"
import type { CompetitiveAccess, PageId } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface AppSidebarProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
}

type NavItem = { id: PageId; label: string; icon: LucideIcon }

/** Navigation only lists pages whose feature is switched on — a disabled page has no entry at all. */
function enabledNav(items: NavItem[]): NavItem[] {
  return items.filter((item) => isPageEnabled(item.id))
}

const PLAY_ITEMS: NavItem[] = enabledNav([
  { id: "play-5vs5", label: "5x5 Matches", icon: Play },
  { id: "play-fun", label: "Fun Mode", icon: Play },
  { id: "play-proleague", label: "Pro League", icon: Play },
  { id: "play-tournaments", label: "Tournaments", icon: Play },
])

const NAV_ITEMS: NavItem[] = enabledNav([
  { id: "skinchanger", label: "Skinchanger", icon: Paintbrush },
  { id: "leaders", label: "Leaders", icon: Trophy },
  { id: "penalties", label: "Penalties", icon: Gavel },
  { id: "feedback", label: "Reviews", icon: MessageSquare },
  { id: "explore", label: "Explore", icon: Search },
])

const EASE = "ease-[cubic-bezier(0.2,0,0,1)]"

/**
 * Every row keeps its icon at the same x in both states: the rail narrows around it, so collapsing
 * never makes an icon jump. The row is 40px tall and, collapsed, a 40px square.
 */
const rowClass = cn(
  "relative flex h-10 w-full items-center gap-2.5 overflow-hidden rounded-lg pl-[11px] pr-3 text-sm font-medium text-[var(--text-muted)]",
  "transition-colors duration-150 hover:bg-[var(--raised)] hover:text-[var(--text)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/60",
)
const activeRowClass = "bg-[var(--raised)] text-[var(--text)]"

/** Labels fade out (120ms) before the width shrinks, and fade back in once it has grown. */
function labelClass(collapsed: boolean) {
  return cn(
    "min-w-0 truncate whitespace-nowrap text-left transition-opacity motion-reduce:transition-none",
    collapsed ? "opacity-0 duration-[120ms]" : "opacity-100 delay-150 duration-200",
  )
}

function ActiveBar() {
  return <span aria-hidden="true" className="absolute -left-3 bottom-2.5 top-2.5 w-0.5 rounded-full bg-[var(--accent-solid)]" />
}

export function AppSidebar({ currentPage, onNavigate }: AppSidebarProps) {
  const { state, toggleSidebar, isMobile } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile
  const { isAuthenticated } = useAuth()
  const [playOpen, setPlayOpen] = useState(true)

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
    <Sidebar variant="floating" collapsible="icon" className="border-none [&>div[data-sidebar=sidebar]]:rounded-[14px] [&>div[data-sidebar=sidebar]]:border-[var(--line-soft)] [&>div[data-sidebar=sidebar]]:bg-[var(--panel)]">
      <SidebarContent className="gap-0 overflow-x-hidden px-3 pb-3">
        <div className={cn("flex h-[60px] shrink-0 items-center transition-[padding] duration-300 motion-reduce:transition-none", EASE, collapsed ? "px-1" : "pl-3 pr-1")}>
          <span className={cn("min-w-0 flex-1 overflow-hidden text-base font-bold tracking-[0.3px] text-[var(--text)]", labelClass(collapsed))}>LEGACY-X</span>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-expanded={!collapsed}
            aria-label="Toggle sidebar"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
          >
            <PanelLeft className="size-[18px]" />
          </button>
        </div>

        <nav aria-label="Main" className="flex flex-col gap-0.5">
          <div className="relative">
            {isActive("home") && <ActiveBar />}
            <button type="button" onClick={() => onNavigate("home")} aria-label="Home" className={cn(rowClass, isActive("home") && activeRowClass)}>
              <House className="size-[18px] shrink-0" />
              <span className={labelClass(collapsed)}>Home</span>
            </button>
          </div>

          {PLAY_ITEMS.length > 0 && (
            <>
              <div className="relative">
              {collapsed && playActive && <ActiveBar />}
              <button
                type="button"
                // On the icon rail there's no room for the submenu, so Play opens 5x5 directly.
                onClick={() => (collapsed ? onNavigate(PLAY_ITEMS[0].id) : setPlayOpen((open) => !open))}
                aria-label="Play"
                aria-expanded={collapsed ? undefined : playOpen}
                className={cn(rowClass, collapsed && playActive && activeRowClass)}
              >
                <Play className="size-[18px] shrink-0" />
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
              </button>
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
                          {active && <span aria-hidden="true" className="absolute -left-[9px] bottom-2.5 top-2.5 w-0.5 bg-[var(--accent-solid)]" />}
                          <span className="flex-1 truncate text-left">{item.label}</span>
                          {locked && <Lock className="size-3.5 shrink-0 text-[var(--text-dim)]" />}
                          {count > 0 && (
                            <span className="flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-[var(--text-muted)]">
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

          {NAV_ITEMS.map((item) => (
            <div key={item.id} className="relative">
              {isActive(item.id) && <ActiveBar />}
              <button type="button" onClick={() => onNavigate(item.id)} aria-label={item.label} className={cn(rowClass, isActive(item.id) && activeRowClass)}>
                <item.icon className="size-[18px] shrink-0" />
                <span className={labelClass(collapsed)}>{item.label}</span>
              </button>
            </div>
          ))}
        </nav>
      </SidebarContent>
    </Sidebar>
  )
}
