import type React from "react"
import { useEffect, useState, type ComponentType, type ReactNode } from "react"
import { Lock, ChevronDown, ShieldCheck, Clapperboard, Store, Swords } from "lucide-react"

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { KnifeIcon } from "@/components/knife-icon"
import { ClanIcon } from "@/components/clan-icon"
import { CommunityIcon, CompareIcon, ExploreIcon, HomeIcon, LeadersIcon, PenaltiesIcon, PlayIcon, ReviewsIcon, ShopIcon } from "@/components/mask-icon"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"

interface AppSidebarProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
}

export type NavItem = { id: PageId; label: string; icon: ComponentType<{ className?: string }> }

/** Navigation only lists pages whose feature is switched on — a disabled page has no entry at all. */
function enabledNav(items: NavItem[]): NavItem[] {
  return items.filter((item) => isPageEnabled(item.id))
}

// The Play submenu rows show no icon; the type only needs one for the other rows.
export const PLAY_ITEMS: NavItem[] = enabledNav([
  { id: "play-5vs5", label: "5x5 Matches", icon: Swords },
  { id: "play-fun", label: "Fun Mode", icon: Swords },
  { id: "play-proleague", label: "Pro League", icon: Swords },
  { id: "play-tournaments", label: "Tournaments", icon: Swords },
])

export const NAV_ITEMS: NavItem[] = enabledNav([
  { id: "skinchanger", label: "Skinchanger", icon: KnifeIcon },
  { id: "compare", label: "Compare", icon: CompareIcon },
  { id: "shop", label: "Shop", icon: ShopIcon },
  { id: "leaders", label: "Leaders", icon: LeadersIcon },
  { id: "penalties", label: "Penalties", icon: PenaltiesIcon },
  { id: "feedback", label: "Reviews", icon: ReviewsIcon },
  { id: "explore", label: "Explore", icon: ExploreIcon },
])

// Commerce (owner request 2026-11-07): the Shop and the Market under one row that opens like Play.
export const COMMERCE_ITEMS: NavItem[] = enabledNav([
  { id: "shop", label: "Shop", icon: ShopIcon },
  { id: "market", label: "Market", icon: Store },
])

// Community (owner request 2026-10-26): Clans, the Staff page and Creators under one row that opens like Play.
export const COMMUNITY_ITEMS: NavItem[] = enabledNav([
  { id: "clan", label: "Clans", icon: ClanIcon },
  { id: "team", label: "Staff", icon: ShieldCheck },
  { id: "creators", label: "Creators", icon: Clapperboard },
])

// Skinchanger gets a submenu only while community collections are switched on.
export const SKIN_VIEWS: Array<{ id: SkinchangerView; label: string }> = [
  { id: "loadout", label: "Loadout" },
  { id: "collections", label: "Collections" },
  ...(isFeatureEnabled("skinAdvanced") ? [{ id: "advanced" as const, label: "Advanced" }] : []),
]

const EASE = "ease-[cubic-bezier(0.2,0,0,1)]"

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

interface FlyoutItem { key: string; label: string; active: boolean; go: () => void; trailing?: ReactNode }

/** On the icon rail a group (Play, Skinchanger, Commerce, Community) opens its pages in a small menu beside the icon. */
function RailFlyout({ open, onOpenChange, items, children }: { open: boolean; onOpenChange: (open: boolean) => void; items: FlyoutItem[]; children: ReactNode }) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild><div className="relative">{children}</div></PopoverAnchor>
      <PopoverContent side="right" align="start" sideOffset={14} className="flex w-52 flex-col gap-0.5 rounded-lg border-[var(--line)] bg-[var(--card-surface)] p-1.5">
        {items.map((item) => (
          <button key={item.key} type="button" onClick={() => { onOpenChange(false); item.go() }} aria-current={item.active ? "page" : undefined} className={cn("flex h-9 items-center gap-2 rounded-md px-3 text-left text-[13px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60", item.active && "bg-[var(--raised)] text-[var(--text)]")}>
            <span className="flex-1 truncate">{item.label}</span>
            {item.trailing}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

export function AppSidebar({ currentPage, onNavigate }: AppSidebarProps) {
  const { state, isMobile } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile
  const { isAuthenticated } = useAuth()
  // The groups start closed; the one you are inside starts open so the current page is visible.
  const [playOpen, setPlayOpen] = useState(currentPage.startsWith("play-"))
  const [skinOpen, setSkinOpen] = useState(currentPage === "skinchanger")
  const communityActive = COMMUNITY_ITEMS.some((item) => item.id === currentPage)
  const [communityOpen, setCommunityOpen] = useState(communityActive)
  const commerceActive = COMMERCE_ITEMS.some((item) => item.id === currentPage)
  const [commerceOpen, setCommerceOpen] = useState(commerceActive)
  const skinView = useSkinchangerView()
  const [flyout, setFlyout] = useState<"play" | "skin" | "commerce" | "community" | null>(null)
  const flyoutProps = (key: "play" | "skin" | "commerce" | "community") => ({ open: collapsed && flyout === key, onOpenChange: (open: boolean) => setFlyout(open ? key : null) })
  // Admins, Managers and Owners can ask players for a check; nobody else gets the entry.
  const staffAccess = useModerationAccess()
  const mayCheck = Boolean(staffAccess && staffAccess.role && ["ADMIN", "MANAGER", "OWNER"].includes(staffAccess.role))
  const navItems: NavItem[] = mayCheck ? [...NAV_ITEMS, { id: "staff", label: "Staff panel", icon: ShieldCheck }] : NAV_ITEMS

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
        <div className={cn("flex h-[60px] shrink-0 items-center justify-center transition-[padding] duration-300 motion-reduce:transition-none", EASE, !collapsed && "pl-3 pr-1")}>
          <span className={cn("min-w-0 flex-1 items-center gap-2 overflow-hidden text-base font-bold tracking-[0.3px] text-[var(--text)]", collapsed ? "hidden" : "flex", labelClass(collapsed))}>
            <img src="/lxc-logo.webp" alt="LXC" className="h-5 w-auto shrink-0" />
          </span>
          {collapsed && <span className="relative h-9 w-3 shrink-0" role="img" aria-label="LXC"><img src="/lxc-wordmark.webp" alt="" className="absolute left-1/2 top-1/2 w-9 max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-90" /></span>}

        </div>

        <nav aria-label="Main" className="flex flex-col gap-0.5">
          <div className="relative">
            <RailTip label="Home" show={collapsed}><button type="button" onClick={() => onNavigate("home")} aria-label="Home" className={cn(rowClass, isActive("home") && activeRowClass)}>
              <HomeIcon className="size-[19px]" />
              <span className={labelClass(collapsed)}>Home</span>
            </button></RailTip>
          </div>

          {PLAY_ITEMS.length > 0 && (
            <>
              <RailFlyout {...flyoutProps("play")} items={PLAY_ITEMS.map((item) => ({ key: item.id, label: item.label, active: isActive(item.id), go: () => onNavigate(item.id), trailing: item.id === "play-proleague" && proLeagueLocked ? <Lock className="size-3.5 text-[var(--text-dim)]" /> : (item.id === "play-5vs5" || item.id === "play-fun") && playersIn(item.id) > 0 ? <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]"><span className="size-1.5 rounded-full bg-[var(--status-green)]" />{playersIn(item.id)}</span> : undefined }))}>
<RailTip label="Play" show={collapsed && flyout !== "play"}><button
                type="button"
                onClick={() => (collapsed ? setFlyout((was) => (was === "play" ? null : "play")) : setPlayOpen((open) => !open))}
                aria-label="Play"
                aria-expanded={collapsed ? undefined : playOpen}
                className={cn(rowClass, collapsed && playActive && activeRowClass)}
              >
                <PlayIcon className="size-[18px]" />
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
                {collapsed && anyoneOnline && <span aria-hidden="true" className="absolute right-1 top-1 size-1.5 rounded-full bg-[var(--status-green)]" />}
              </button></RailTip>
              </RailFlyout>

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
                  <RailFlyout {...flyoutProps("skin")} items={SKIN_VIEWS.map((entry) => ({ key: entry.id, label: entry.label, active: isActive("skinchanger") && skinView === entry.id, go: () => { setSkinchangerView(entry.id); onNavigate("skinchanger") } }))}>
<RailTip label={item.label} show={collapsed && flyout !== "skin"}><button
                      type="button"
                      onClick={() => { if (collapsed) { setFlyout((was) => (was === "skin" ? null : "skin")); return } if (!isActive("skinchanger")) onNavigate("skinchanger"); setSkinOpen((was) => (isActive("skinchanger") ? !was : true)) }}
                      aria-label={item.label}
                      aria-expanded={collapsed ? undefined : skinOpen}
                      className={cn(rowClass, collapsed && isActive("skinchanger") && activeRowClass)}
                    >
                      <item.icon className="size-[18px] shrink-0" />
                      <span className={cn(labelClass(collapsed), "flex-1")}>{item.label}</span>
                      <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 text-[var(--text-dim)] transition-[rotate,opacity] duration-300 motion-reduce:transition-none", EASE, skinOpen && "rotate-180", collapsed ? "opacity-0" : "opacity-100")} />
                    </button></RailTip>
                  </RailFlyout>
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
            if (item.id === "shop" && COMMERCE_ITEMS.length > 0) {
              const open = commerceOpen && !collapsed
              return (
                <div key={item.id} className="flex flex-col gap-0.5">
                  <RailFlyout {...flyoutProps("commerce")} items={COMMERCE_ITEMS.map((entry) => ({ key: entry.id, label: entry.label, active: isActive(entry.id), go: () => onNavigate(entry.id) }))}>
                    <RailTip label="Commerce" show={collapsed && flyout !== "commerce"}><button
                      type="button"
                      onClick={() => (collapsed ? setFlyout((was) => (was === "commerce" ? null : "commerce")) : setCommerceOpen((was) => !was))}
                      aria-label="Commerce"
                      aria-expanded={collapsed ? undefined : commerceOpen}
                      className={cn(rowClass, collapsed && commerceActive && activeRowClass)}
                    >
                      <ShopIcon className="size-[19px]" />
                      <span className={cn(labelClass(collapsed), "flex-1")}>Commerce</span>
                      <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 text-[var(--text-dim)] transition-[rotate,opacity] duration-300 motion-reduce:transition-none", EASE, commerceOpen ? "rotate-180" : "rotate-0", collapsed ? "opacity-0" : "opacity-100")} />
                    </button></RailTip>
                  </RailFlyout>
                  <div className={cn("grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none", EASE, open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")} aria-hidden={!open}>
                    <div className="overflow-hidden">
                      <div className="ml-5 flex flex-col gap-0.5 border-l border-[var(--line)] pl-2">
                        {COMMERCE_ITEMS.map((entry) => (
                          <button key={entry.id} type="button" onClick={() => onNavigate(entry.id)} tabIndex={open ? 0 : -1} className={cn(rowClass, "overflow-visible px-3", isActive(entry.id) && activeRowClass)}>
                            <span className="lx-nav-label flex-1 truncate text-left transition-[translate] duration-150 motion-reduce:transition-none">{entry.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
            if (item.id === "leaders" && COMMUNITY_ITEMS.length > 0) {
              const open = communityOpen && !collapsed
              return (
                <div key={item.id} className="flex flex-col gap-0.5">
                  <div className="relative">
                    <RailTip label={item.label} show={collapsed}><button type="button" onClick={() => onNavigate(item.id)} aria-label={item.label} className={cn(rowClass, isActive(item.id) && activeRowClass)}>
                      <item.icon className="size-[18px] shrink-0" />
                      <span className={labelClass(collapsed)}>{item.label}</span>
                    </button></RailTip>
                  </div>
                  <RailFlyout {...flyoutProps("community")} items={COMMUNITY_ITEMS.map((entry) => ({ key: entry.id, label: entry.label, active: isActive(entry.id), go: () => onNavigate(entry.id) }))}>
                    <RailTip label="Community" show={collapsed && flyout !== "community"}><button
                      type="button"
                      onClick={() => (collapsed ? setFlyout((was) => (was === "community" ? null : "community")) : setCommunityOpen((was) => !was))}
                      aria-label="Community"
                      aria-expanded={collapsed ? undefined : communityOpen}
                      className={cn(rowClass, collapsed && communityActive && activeRowClass)}
                    >
                      <CommunityIcon className="size-[20px]" />
                      <span className={cn(labelClass(collapsed), "flex-1")}>Community</span>
                      <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 text-[var(--text-dim)] transition-[rotate,opacity] duration-300 motion-reduce:transition-none", EASE, communityOpen && "rotate-180", collapsed ? "opacity-0" : "opacity-100")} />
                    </button></RailTip>
                  </RailFlyout>
                  <div className={cn("grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none", EASE, open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")} inert={!open || undefined}>
                    <div className="overflow-hidden">
                      <div className="ml-5 flex flex-col gap-0.5 border-l border-[var(--line)] pl-2">
                        {COMMUNITY_ITEMS.map((entry) => (
                          <button key={entry.id} type="button" onClick={() => onNavigate(entry.id)} className={cn(rowClass, "overflow-visible px-3", isActive(entry.id) && activeRowClass)}>
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
