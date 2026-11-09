import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type ReactElement } from "react"
import { DoorOpen, Lock, ShieldCheck, Store, Swords, Users } from "lucide-react"

import { competitiveService } from "@/api"
import { playService, type PlayServerList } from "@/api/play"
import type { CompetitiveAccess, PageId } from "@/api/types"
import { AppSidebar, COMMERCE_ITEMS, COMMUNITY_ITEMS, NAV_ITEMS, PLAY_ITEMS, SKIN_VIEWS } from "@/components/app-sidebar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useSidebar } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { useModerationAccess } from "@/components/penalty-staff"
import { isFeatureEnabled } from "@/lib/features"
import { ADMIN_URL } from "@/lib/sites"
import { setSkinchangerView, useSkinchangerView, type SkinchangerView } from "@/lib/skinchanger-view"
import { cn } from "@/lib/utils"

type Icon = ComponentType<{ className?: string }>
type MenuItem = { key: string; label: string; page: PageId; view?: SkinchangerView; count?: number; locked?: boolean }
type Entry = { key: string; label: string; icon: Icon; pages: PageId[]; to?: PageId; menu?: MenuItem[]; href?: string; live?: boolean }

interface Props {
  currentPage: PageId
  onNavigate: (page: PageId) => void
}

/**
 * The navigation of the new shell (owner pick 2026-11-09, the preview with the disc): a pill of icons on the left; the page you are on is a light disc
 * that slides to its icon and sits half over the page panel, cut in by a ring of the frame's colour. A group (Play, Skinchanger, Community, Commerce) opens
 * a small menu beside it. A phone (under 560 px) keeps the sidebar sheet. Same labels as the sidebar, so the tutorial finds every button.
 */
export function ShellNav({ currentPage, onNavigate }: Props) {
  const { isMobile } = useSidebar()
  return isMobile ? <AppSidebar currentPage={currentPage} onNavigate={onNavigate} /> : <AppRail currentPage={currentPage} onNavigate={onNavigate} />
}

function AppRail({ currentPage, onNavigate }: Props) {
  const { isAuthenticated } = useAuth()
  const skinView = useSkinchangerView()
  const staffAccess = useModerationAccess()
  const mayCheck = Boolean(staffAccess && staffAccess.role && ["ADMIN", "MANAGER", "OWNER"].includes(staffAccess.role))

  // Live player counts for the Play menu, refreshed every 30 s while the tab is visible (the same two reads as the sidebar).
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

  const entries = useMemo<Entry[]>(() => {
    const nav = (id: PageId) => NAV_ITEMS.find((item) => item.id === id)
    const direct = (id: PageId): Entry[] => {
      const item = nav(id)
      return item ? [{ key: id, label: item.label, icon: item.icon, pages: [id], to: id }] : []
    }
    const list: Entry[] = [{ key: "home", label: "Home", icon: DoorOpen, pages: ["home"], to: "home" }]
    if (PLAY_ITEMS.length > 0) {
      list.push({
        key: "play", label: "Play", icon: Swords, pages: PLAY_ITEMS.map((item) => item.id), live: anyoneOnline,
        menu: PLAY_ITEMS.map((item) => ({ key: item.id, label: item.label, page: item.id, count: item.id === "play-5vs5" || item.id === "play-fun" ? playersIn(item.id) : 0, locked: item.id === "play-proleague" && proLeagueLocked })),
      })
    }
    const skin = nav("skinchanger")
    if (skin) {
      list.push(isFeatureEnabled("skinCollections")
        ? { key: "skinchanger", label: skin.label, icon: skin.icon, pages: ["skinchanger"], menu: SKIN_VIEWS.map((view) => ({ key: view.id, label: view.label, page: "skinchanger" as PageId, view: view.id })) }
        : { key: "skinchanger", label: skin.label, icon: skin.icon, pages: ["skinchanger"], to: "skinchanger" })
    }
    list.push(...direct("compare"), ...direct("leaders"))
    if (COMMUNITY_ITEMS.length > 0) list.push({ key: "community", label: "Community", icon: Users, pages: COMMUNITY_ITEMS.map((item) => item.id), menu: COMMUNITY_ITEMS.map((item) => ({ key: item.id, label: item.label, page: item.id })) })
    if (COMMERCE_ITEMS.length > 0) list.push({ key: "commerce", label: "Commerce", icon: Store, pages: COMMERCE_ITEMS.map((item) => item.id), menu: COMMERCE_ITEMS.map((item) => ({ key: item.id, label: item.label, page: item.id })) })
    list.push(...direct("penalties"), ...direct("feedback"), ...direct("explore"))
    if (mayCheck) list.push({ key: "staff", label: "Staff panel", icon: ShieldCheck, pages: [], href: ADMIN_URL })
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyoneOnline, competitive?.players, fun?.players, proLeagueLocked, mayCheck])

  const active = entries.find((entry) => entry.pages.includes(currentPage)) ?? null

  // The disc slides to the active icon: its top is measured from the icon's own box, so it stays right at any height or font size.
  const pillRef = useRef<HTMLDivElement>(null)
  const slotRefs = useRef(new Map<string, HTMLElement>())
  const [discTop, setDiscTop] = useState<number | null>(null)
  useLayoutEffect(() => {
    const measure = () => {
      const slot = active ? slotRefs.current.get(active.key) : null
      setDiscTop(slot ? slot.offsetTop + slot.offsetHeight / 2 - 28 : null)
    }
    measure()
    const pill = pillRef.current
    if (!pill || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(pill)
    return () => observer.disconnect()
  }, [active, entries.length])

  const [openMenu, setOpenMenu] = useState<string | null>(null)

  return (
    <nav aria-label="Main" className="lx-rail">
      <button type="button" onClick={() => onNavigate("home")} aria-label="LEGACY-X home" className="lx-rail-logo">
        <img src="/logolegacyx.webp" alt="" aria-hidden="true" className="size-8" />
      </button>
      <div ref={pillRef} className="lx-rail-pill">
        {/* The tab: the page panel's own colour reaches from the panel through the gap into the rail and ends in a round end around the disc, so the active page and its panel are one shape. */}
        <span
          aria-hidden="true"
          className="lx-rail-tab"
          data-on={active && discTop !== null ? "1" : "0"}
          style={{ transform: `translate3d(0, ${discTop ?? 0}px, 0)` }}
        >
          <span className="lx-rail-tab-edge" />
          <span className="lx-rail-disc">{active && <active.icon key={active.key} className="lx-rail-disc-icon size-5" />}</span>
        </span>
        {entries.map((entry) => {
          const isActive = active?.key === entry.key
          const button = entry.href ? (
            <a href={entry.href} aria-label={entry.label} className="lx-rail-item"><entry.icon className="size-5" /></a>
          ) : entry.menu ? null : (
            <button type="button" aria-label={entry.label} aria-current={isActive ? "page" : undefined} onClick={() => entry.to && onNavigate(entry.to)} className="lx-rail-item"><entry.icon className={cn("size-5", isActive && "opacity-0")} /></button>
          )
          return (
            <div key={entry.key} ref={(node) => { if (node) slotRefs.current.set(entry.key, node); else slotRefs.current.delete(entry.key) }} className="lx-rail-slot">
              {entry.menu ? (
                <Popover open={openMenu === entry.key} onOpenChange={(open) => setOpenMenu(open ? entry.key : null)}>
                  <Tooltip open={openMenu === entry.key ? false : undefined}>
                    <TooltipTrigger asChild onFocus={(event) => event.preventDefault()}>
                      <PopoverTrigger asChild>
                        <button type="button" aria-label={entry.label} aria-current={isActive ? "page" : undefined} aria-haspopup="menu" className="lx-rail-item">
                          <entry.icon className={cn("size-5", isActive && "opacity-0")} />
                          {entry.live && !isActive && <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[var(--status-green)]" />}
                        </button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <RailLabel>{entry.label}</RailLabel>
                  </Tooltip>
                  <PopoverContent side="right" align="start" sideOffset={52} className="lx-rail-menu w-56 p-2">
                    <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">{entry.label}</p>
                    {entry.menu.map((item) => {
                      const on = item.view ? currentPage === "skinchanger" && skinView === item.view : currentPage === item.page
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setOpenMenu(null)
                            if (item.view) setSkinchangerView(item.view)
                            onNavigate(item.page)
                          }}
                          className={cn("lx-rail-menu-row", on && "lx-rail-menu-row-on", item.locked && !on && "text-[var(--text-dim)]")}
                        >
                          <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                          {item.locked && <Lock className="size-3.5 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />}
                          {(item.count ?? 0) > 0 && (
                            <span className="flex shrink-0 items-center gap-1.5 text-xs text-[var(--text-muted)]">
                              <span className="size-1.5 rounded-full bg-[var(--status-green)]" />
                              {item.count}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </PopoverContent>
                </Popover>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild onFocus={(event) => event.preventDefault()}>{button as ReactElement}</TooltipTrigger>
                  <RailLabel>{entry.label}</RailLabel>
                </Tooltip>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}

function RailLabel({ children }: { children: string }) {
  return (
    <TooltipContent side="right" sideOffset={50} className="rounded-lg border border-[var(--line-strong)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text)] shadow-[0_8px_24px_rgba(0,0,0,0.5)] duration-150 [--tooltip-bg:var(--card-surface)]">
      {children}
    </TooltipContent>
  )
}
