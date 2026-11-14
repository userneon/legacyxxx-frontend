/**
 * The LXC frame's top (owner decision 2026-11-14: "put it in the code"; the design is the Arena direction): one bar with the wordmark, how many
 * players are online, a player search, your FOL$, the bell and your avatar (`ProfileBlock`), and under it the page cards. Every figure is the API's:
 * the online count is `GET /public/overview` and is left out until it arrives. A phone (under 560 px) keeps the older top bar and sidebar sheet.
 */
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Gem, Home, Crosshair, Search, ShoppingBag, Trophy, Users, MessageSquare } from "lucide-react"

import { serversService } from "@/api"
import type { HomeStats, PageId } from "@/api/types"
import { ProfileBlock } from "@/components/profile-block"
import { useApiQuery } from "@/hooks/use-api-query"
import { PAGE_ROUTES, PAGE_TITLES } from "@/lib/routes"
import { isPageEnabled } from "@/lib/features"
import { cn } from "@/lib/utils"

const CARDS: Array<{ id: PageId; icon: typeof Home; label?: string; match: (page: PageId) => boolean }> = [
  { id: "home", icon: Home, match: (page) => page === "home" },
  { id: "play-5vs5", icon: Crosshair, label: "Play", match: (page) => page.startsWith("play-") },
  { id: "skinchanger", icon: Gem, match: (page) => page === "skinchanger" },
  { id: "leaders", icon: Trophy, match: (page) => page === "leaders" },
  { id: "clan", icon: Users, label: "Clans", match: (page) => page === "clan" || page === "team" || page === "creators" },
  { id: "shop", icon: ShoppingBag, match: (page) => page === "shop" || page === "market" },
  { id: "feedback", icon: MessageSquare, label: "Reviews", match: (page) => page === "feedback" },
]

export function LxcHeader({ currentPage, onNavigate, className }: { currentPage: PageId; onNavigate: (page: PageId) => void; className?: string }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const { data: stats } = useApiQuery<HomeStats>((signal) => serversService.getHomeStats({ signal }), { queryKey: "lxc-header-stats", keepPreviousData: true })
  const cards = CARDS.filter((card) => isPageEnabled(card.id))
  return (
    <div className={cn("shrink-0 border-b border-[var(--line)] bg-[var(--bg)]", className)}>
      <header className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center gap-3 px-6 py-2.5">
        <Link to={PAGE_ROUTES.home} aria-label="LXC, home" className="text-[26px] font-bold leading-none tracking-[0.02em] text-[var(--text)]">LXC</Link>
        {typeof stats?.playersOnline === "number" ? (
          <span className="inline-flex h-8 items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--status-green)_12%,transparent)] px-3 text-[13px] font-bold text-[var(--status-green)]" title="Players online">
            <span aria-hidden="true" className="size-2 rounded-full bg-[var(--status-green)]" />
            {stats.playersOnline.toLocaleString()}
          </span>
        ) : null}
        <span className="flex-1" />
        <form
          role="search"
          onSubmit={(event) => { event.preventDefault(); if (query.trim()) navigate(`/explore?query=${encodeURIComponent(query.trim())}`) }}
          className="flex h-11 w-full max-w-[260px] items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--card-surface)] px-3 text-[var(--text-dim)] focus-within:border-[var(--line-strong)] max-md:max-w-none max-md:flex-1"
        >
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player" aria-label="Search player" className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]" />
          <button type="submit" aria-label="Search" className="grid size-7 place-items-center rounded-md hover:text-[var(--text)]"><Search className="size-4" /></button>
        </form>
        <ProfileBlock onNavigate={onNavigate} />
      </header>
      <nav aria-label="Sections" className="mx-auto flex w-full max-w-[1320px] gap-2.5 overflow-x-auto px-6 pb-4 pt-1">
        {cards.map((card) => {
          const active = card.match(currentPage)
          const Icon = card.icon
          return (
            <Link
              key={card.id}
              to={PAGE_ROUTES[card.id]}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-14 min-w-[132px] flex-1 items-center justify-center gap-2.5 rounded-lg border bg-[var(--card-surface)] text-[14px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60",
                active ? "border-2 border-[var(--accent-solid)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-dim)] hover:bg-[var(--raised)] hover:text-[var(--text)]",
              )}
            >
              <Icon className="size-[18px]" />
              {card.label ?? PAGE_TITLES[card.id]}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
