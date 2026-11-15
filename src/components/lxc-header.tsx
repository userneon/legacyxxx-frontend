/**
 * The LXC frame's top (owner decision 2026-11-14: "put it in the code"; the design is the Arena direction): one bar with the wordmark, how many
 * players are online, a player search, your FOL$, the bell and your avatar (`ProfileBlock`), Every figure is the API's:
 * the online count is `GET /public/overview` and is left out until it arrives. A phone (under 560 px) keeps the older top bar and sidebar sheet.
 */
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Search } from "lucide-react"

import { serversService } from "@/api"
import type { HomeStats, PageId } from "@/api/types"
import { ProfileBlock } from "@/components/profile-block"
import { useApiQuery } from "@/hooks/use-api-query"
import { PAGE_ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

export function LxcHeader({ onNavigate, className }: { onNavigate: (page: PageId) => void; className?: string }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const { data: stats } = useApiQuery<HomeStats>((signal) => serversService.getHomeStats({ signal }), { queryKey: "lxc-header-stats", keepPreviousData: true })
  return (
    <div className={cn("shrink-0 bg-[var(--bg)] px-11", className)}>
      <header className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center gap-4 border-b border-[var(--line)] py-2.5">
        <Link to={PAGE_ROUTES.home} aria-label="LXC, home" className="min-[560px]:hidden"><img src="/lxc-monogram.png" alt="LXC" className="h-5 w-auto" /></Link>
        <Link to={PAGE_ROUTES.home} aria-label="LXC, home" className="hidden min-[560px]:block"><img src="/lxc-monogram.png" alt="LXC" className="h-6 w-auto" /></Link>
        {typeof stats?.playersOnline === "number" ? (
          <span className="inline-flex h-8 items-center gap-2 text-[13px] font-bold text-[var(--status-green)]" title="Players online">
            <span aria-hidden="true" className="size-2 rounded-full bg-[var(--status-green)]" />
            {stats.playersOnline.toLocaleString()}
          </span>
        ) : null}
        <span className="flex-1" />
        <form
          role="search"
          onSubmit={(event) => { event.preventDefault(); if (query.trim()) navigate(`/explore?query=${encodeURIComponent(query.trim())}`) }}
          className="flex h-9 w-full max-w-[260px] items-center gap-2 border-b border-[var(--line-strong)] px-1 text-[var(--text-dim)] transition-colors focus-within:border-[var(--text-dim)] max-md:max-w-none max-md:flex-1"
        >
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player" aria-label="Search player" className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]" />
          <button type="submit" aria-label="Search" className="grid size-7 place-items-center rounded-md hover:text-[var(--text)]"><Search className="size-4" /></button>
        </form>
        <ProfileBlock onNavigate={onNavigate} />
      </header>
    </div>
  )
}
