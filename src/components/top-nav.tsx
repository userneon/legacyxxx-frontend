import { useState } from "react"
import { ChevronDown, Lock } from "lucide-react"

import { competitiveService } from "@/api"
import type { CompetitiveAccess, PageId } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { useModerationAccess } from "@/components/penalty-staff"
import { COMMERCE_ITEMS, COMMUNITY_ITEMS, NAV_ITEMS, PLAY_ITEMS, SKIN_VIEWS, type NavItem } from "@/components/app-sidebar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { setSkinchangerView } from "@/lib/skinchanger-view"
import { isFeatureEnabled } from "@/lib/features"
import { cn } from "@/lib/utils"

/**
 * The menu along the top of the frame (owner request 2026-11-17: "no sidebar, put it on top"): the same pages the sidebar listed, in the same groups.
 * A group (Play, Commerce, Community, Skinchanger) opens a small list under its name; everything else is one click.
 */
const linkClass = "relative inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-[13.5px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
const activeClass = "text-[var(--text)] after:absolute after:inset-x-2 after:-bottom-[11px] after:h-[2px] after:rounded-full after:bg-[var(--text)]"

type Entry = { key: string; label: string; active: boolean; go: () => void; locked?: boolean }

function Group({ label, active, entries }: { label: string; active: boolean; entries: Entry[] }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-expanded={open} className={cn(linkClass, active && activeClass)}>
          {label}
          <ChevronDown aria-hidden="true" className={cn("size-3.5 text-[var(--text-dim)] transition-transform duration-200", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={14} className="flex w-52 flex-col gap-0.5 rounded-[20px] p-2">
        {entries.map((entry) => (
          <button key={entry.key} type="button" onClick={() => { setOpen(false); entry.go() }} aria-current={entry.active ? "page" : undefined} className={cn("flex h-10 items-center rounded-[10px] px-3.5 text-left text-[13.5px] font-medium transition-colors hover:bg-white/[0.08]", entry.active ? "text-[var(--text)]" : entry.locked ? "text-[var(--text-dim)] hover:text-[var(--text-muted)]" : "text-[var(--text-muted)] hover:text-[var(--text)]")}>
            <span className="flex-1">{entry.label}</span>
            {entry.locked && <Lock aria-label="Locked until your rank is high enough" className="size-3.5 shrink-0 text-[var(--text-dim)]" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

export function TopNav({ currentPage, onNavigate, className }: { currentPage: PageId; onNavigate: (page: PageId) => void; className?: string }) {
  const { isAuthenticated } = useAuth()
  // Pro League opens at a rank: until then its row carries a lock (the same answer the sidebar used).
  const { data: access } = useApiQuery<CompetitiveAccess>((signal) => competitiveService.getMyAccess({ signal }), { enabled: isAuthenticated, queryKey: `sidebar-access:${isAuthenticated}` })
  const proLocked = isAuthenticated && access != null && !access.proLeagueUnlocked
  const staffAccess = useModerationAccess()
  const mayCheck = Boolean(staffAccess && staffAccess.role && ["ADMIN", "MANAGER", "OWNER"].includes(staffAccess.role))
  const entriesOf = (items: NavItem[]): Entry[] => items.map((item) => ({ key: item.id, label: item.label, active: currentPage === item.id, go: () => onNavigate(item.id), locked: item.id === "play-proleague" && proLocked }))
  const link = (item: NavItem) => (
    <button key={item.id} type="button" onClick={() => onNavigate(item.id)} aria-current={currentPage === item.id ? "page" : undefined} className={cn(linkClass, currentPage === item.id && activeClass)}>{item.label}</button>
  )
  const single = (id: PageId) => NAV_ITEMS.find((item) => item.id === id)
  const skin = single("skinchanger")
  const rest = NAV_ITEMS.filter((item) => item.id !== "skinchanger" && item.id !== "shop")
  return (
    <nav aria-label="Main" className={cn("scrollbar-hidden flex min-w-0 items-center gap-0.5 overflow-x-auto", className)}>
      <button type="button" onClick={() => onNavigate("home")} aria-current={currentPage === "home" ? "page" : undefined} className={cn(linkClass, currentPage === "home" && activeClass)}>Home</button>
      {PLAY_ITEMS.length > 0 && <Group label="Play" active={currentPage.startsWith("play-")} entries={entriesOf(PLAY_ITEMS)} />}
      {skin && (isFeatureEnabled("skinCollections")
        ? <Group label={skin.label} active={currentPage === "skinchanger"} entries={SKIN_VIEWS.map((view) => ({ key: view.id, label: view.label, active: false, go: () => { setSkinchangerView(view.id); onNavigate("skinchanger") } }))} />
        : link(skin))}
      {COMMERCE_ITEMS.length === 1 && link(COMMERCE_ITEMS[0])}
      {COMMERCE_ITEMS.length > 1 && <Group label="Commerce" active={COMMERCE_ITEMS.some((item) => item.id === currentPage)} entries={entriesOf(COMMERCE_ITEMS)} />}
      {rest.map(link)}
      {COMMUNITY_ITEMS.length > 0 && <Group label="Community" active={COMMUNITY_ITEMS.some((item) => item.id === currentPage)} entries={entriesOf(COMMUNITY_ITEMS)} />}
      {mayCheck && link({ id: "staff", label: "Staff panel", icon: NAV_ITEMS[0].icon })}
    </nav>
  )
}
