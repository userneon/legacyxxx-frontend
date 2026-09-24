/**
 * Floating sidebar (docs/design shell, shell-collapsed): logo + toggle, Home · Play (5x5 Matches, Fun Mode,
 * Pro League, Tournaments) · Skinchanger · Leaders · Penalties · Reviews · Explore. Collapses to a 64px icon rail;
 * the state persists in shadcn's sidebar cookie. On phones it is a sheet opened from the top bar.
 */
import type { ComponentType, ReactNode } from "react"
import { Link, useLocation } from "react-router-dom"
import { Gavel, House, Lock, MessageSquare, Paintbrush, PanelLeft, Play, Search, Trophy } from "lucide-react"

import { cn } from "@/lib/utils"
import { isFeatureEnabled, type FeatureName } from "@/lib/features"
import { PAGE_ROUTES } from "@/lib/routes"
import { Sidebar, useSidebar } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useLiveServers } from "@/hooks/use-live-servers"
import { useMyRank } from "@/hooks/use-my-rank"
import type { ServerModeKind } from "@/api"

type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>

interface NavItem {
  label: string
  to: string
  icon: Icon
  feature?: FeatureName
}

const TOP: NavItem[] = [{ label: "Home", to: PAGE_ROUTES.home, icon: House }]
const BOTTOM: NavItem[] = [
  { label: "Skinchanger", to: PAGE_ROUTES.skinchanger, icon: Paintbrush, feature: "skinchanger" },
  { label: "Leaders", to: PAGE_ROUTES.leaders, icon: Trophy, feature: "leaders" },
  { label: "Penalties", to: PAGE_ROUTES.penalties, icon: Gavel, feature: "penalties" },
  { label: "Reviews", to: PAGE_ROUTES.feedback, icon: MessageSquare, feature: "feedback" },
  { label: "Explore", to: PAGE_ROUTES.explore, icon: Search, feature: "explore" },
]
const PLAY: Array<{ label: string; to: string; mode?: Exclude<ServerModeKind, "other">; pro?: boolean; feature?: FeatureName }> = [
  { label: "5x5 Matches", to: PAGE_ROUTES["play-5vs5"], mode: "5v5" },
  { label: "Fun Mode", to: PAGE_ROUTES["play-fun"], mode: "fun" },
  { label: "Pro League", to: PAGE_ROUTES["play-proleague"], pro: true },
  { label: "Tournaments", to: PAGE_ROUTES["play-tournaments"], feature: "tournaments" },
]

const enabled = <T extends { feature?: FeatureName }>(items: T[]) => items.filter((item) => !item.feature || isFeatureEnabled(item.feature))

const itemBase =
  "relative flex h-10 items-center gap-2.5 rounded-lg px-[11px] text-sm font-medium outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent/60"
const labelFade = "truncate transition-opacity duration-[120ms] group-data-[collapsible=icon]:opacity-0"

function Rail({ label, collapsed, children }: { label: string; collapsed: boolean; children: ReactNode }) {
  if (!collapsed) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/** Green dot + real player count; hidden at 0. Tabular numbers keep the width steady when it changes. */
function OnlineCount({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-auto flex items-center gap-1.5 text-xs text-text-muted tabular-nums animate-fade-in" aria-label={`${count} online`}>
      <span className="size-1.5 rounded-full bg-live" aria-hidden />
      {count}
    </span>
  )
}

export function AppSidebar() {
  const { pathname } = useLocation()
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile
  const { onlineByMode } = useLiveServers()
  const { profile } = useMyRank()
  const proUnlocked = Boolean(profile?.pro_league_unlocked)
  const playItems = enabled(PLAY)
  const playActive = playItems.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
  const anyOnline = onlineByMode["5v5"] + onlineByMode.fun + onlineByMode.pro > 0
  const closeMobile = () => isMobile && setOpenMobile(false)

  const renderItem = (item: NavItem) => {
    const active = pathname === item.to
    return (
      <Rail key={item.to} label={item.label} collapsed={collapsed}>
        <Link
          to={item.to}
          onClick={closeMobile}
          aria-current={active ? "page" : undefined}
          aria-label={collapsed ? item.label : undefined}
          className={cn(itemBase, active ? "bg-raised text-text" : "text-text-muted hover:bg-raised hover:text-text")}
        >
          {active && collapsed && <span aria-hidden className="absolute top-2.5 bottom-2.5 -left-3 w-0.5 bg-accent" />}
          <item.icon className="size-[18px] shrink-0" aria-hidden />
          <span className={labelFade}>{item.label}</span>
        </Link>
      </Rail>
    )
  }

  return (
    <Sidebar variant="floating" collapsible="icon">
      <div className="flex h-[60px] shrink-0 items-center justify-between pr-1 pl-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <Link to="/" onClick={closeMobile} className="flex min-w-0 items-center gap-2.5 group-data-[collapsible=icon]:hidden" aria-label="LEGACY-X home">
          <img src="/logolegacyx.webp" alt="" width={22} height={22} className="size-[22px] shrink-0" />
          <span className="text-base font-bold tracking-[0.3px] text-text">LEGACY-X</span>
        </Link>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          aria-expanded={!collapsed}
          className="flex size-8 items-center justify-center rounded-lg text-text-muted transition-colors duration-150 hover:bg-raised hover:text-text"
        >
          <PanelLeft className="size-[18px]" aria-hidden />
        </button>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-0.5 px-3 group-data-[collapsible=icon]:gap-1">
        {enabled(TOP).map(renderItem)}

        {collapsed ? (
          <Rail label="Play" collapsed>
            <Link
              to={PAGE_ROUTES["play-5vs5"]}
              aria-label="Play"
              aria-current={playActive ? "page" : undefined}
              className={cn(itemBase, playActive ? "bg-raised text-text" : "text-text-muted hover:bg-raised hover:text-text")}
            >
              {playActive && <span aria-hidden className="absolute top-2.5 bottom-2.5 -left-3 w-0.5 bg-accent" />}
              <Play className="size-[18px] shrink-0" aria-hidden />
              {anyOnline && <span aria-hidden className="absolute top-2 right-2 size-1.5 rounded-full bg-live shadow-[0_0_0_2px_var(--panel)]" />}
            </Link>
          </Rail>
        ) : (
          <>
            <span className={cn(itemBase, "cursor-default text-text-muted")}>
              <Play className="size-[18px] shrink-0" aria-hidden />
              <span className={labelFade}>Play</span>
            </span>
            <div className="ml-5 flex flex-col gap-0.5 border-l border-line pl-2">
              {playItems.map((item) => {
                const active = pathname === item.to || pathname.startsWith(`${item.to}/`)
                const locked = item.pro && !proUnlocked
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeMobile}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                      active ? "bg-raised text-text" : locked ? "text-text-dim hover:bg-raised hover:text-text-muted" : "text-text-muted hover:bg-raised hover:text-text",
                    )}
                  >
                    {active && <span aria-hidden className="absolute top-2.5 bottom-2.5 -left-[9px] w-0.5 bg-accent" />}
                    <span className={cn(labelFade, "min-w-0")}>{item.label}</span>
                    {locked && <Lock className="size-3.5 shrink-0 text-text-dim" aria-label="Locked" />}
                    {item.mode && <OnlineCount count={onlineByMode[item.mode]} />}
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {enabled(BOTTOM).map(renderItem)}
      </nav>
      <div className="flex-1" />
    </Sidebar>
  )
}
