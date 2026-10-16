import { useMemo } from "react"
import { clanTagProps } from "@/lib/cosmetics"
import { useNavigate } from "react-router-dom"
import { Crown, RotateCcw } from "lucide-react"

import { clansService } from "@/api"
import type { ClanRankEntry, MyClanState } from "@/api/types"
import { ClanMark } from "@/components/clan-mark"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { GRID } from "@/pages/leaders-grid"

/** Same columns as the player ladder; the rank column is the clan's size here. */
const CLAN_GRID = GRID
const PODIUM_ORDER = [2, 1, 3]
const winRate = (clan: ClanRankEntry) => (clan.matches > 0 ? `${Math.round((clan.wins / clan.matches) * 100)}%` : "—")

function ClanTopCard({ clan, onOpen }: { clan: ClanRankEntry; onOpen: () => void }) {
  const first = clan.rank === 1
  const slot = PODIUM_ORDER.indexOf(clan.rank)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${clan.name}`}
      style={{ order: slot, animationDelay: `${first ? 60 : 160 + slot * 60}ms` }}
      className={cn(
        "lx-fx-card group relative isolate flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl border bg-[var(--glass-fill)] p-[18px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50",
        first ? "border-[var(--brand)]/45" : "mt-6 border-[var(--line-soft)]",
      )}
    >
      {first && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[var(--brand-bright)] to-transparent" />}
      <span className="flex items-center gap-2">
        {first && <Crown aria-hidden="true" className="size-6 fill-[var(--brand)]/30 text-[var(--brand-bright)]" />}
        <span className={cn("font-bold leading-none tracking-[-1px]", first ? "text-[34px] text-[var(--text)]" : "text-[28px] text-[var(--text-2)]")}>#{clan.rank}</span>
      </span>
      <span className="flex min-w-0 items-center gap-3">
        <ClanMark logo={clan.logo} tag={clan.tag} className={first ? "size-[60px] text-[15px]" : "size-[52px]"} />
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className={cn("truncate font-semibold text-[var(--text)]", first ? "text-base" : "text-sm")} title={clan.name}>{clan.name}</span>
          <span className="text-xs text-[var(--text-dim)]"><span {...clanTagProps(clan.look)}>[{clan.tag}]</span> · {clan.currentPlayers} members</span>
        </span>
      </span>
      <span className="flex items-end justify-between border-t border-[var(--line-soft)] pt-3.5">
        <span className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--text-dim)]">Total EXP</span>
          <span className={cn("font-bold leading-none", first ? "text-[22px] text-[var(--brand-bright)]" : "text-lg text-[var(--text)]")}>{clan.totalExp.toLocaleString()}</span>
        </span>
        <span className="flex gap-3.5">
          <span className="flex flex-col items-end gap-1.5"><span className="text-[11px] text-[var(--text-dim)]">Matches</span><span className="text-xs text-[var(--text-2)]">{clan.matches.toLocaleString()}</span></span>
          <span className="flex flex-col items-end gap-1.5"><span className="text-[11px] text-[var(--text-dim)]">Win rate</span><span className="text-xs text-[var(--text-2)]">{winRate(clan)}</span></span>
        </span>
      </span>
    </button>
  )
}

function ClanRow({ clan, onOpen, you, index = 0 }: { clan: ClanRankEntry; onOpen: () => void; you?: boolean; index?: number }) {
  const cell = (strong?: boolean) => cn("text-right text-[13px]", strong ? "font-semibold text-[var(--text)]" : "text-[var(--text-muted)]")
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={you ? "Your clan" : `Open ${clan.name}`}
      style={you ? undefined : { animationDelay: `${Math.min(index, 14) * 28}ms` }}
      className={cn(
        CLAN_GRID,
        "lx-layer group relative w-full text-left transition-[background-color] duration-500 ease-[cubic-bezier(0.37,0,0.18,1)] hover:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/50",
        you
          ? "h-[60px] shrink-0 border-t border-[var(--brand)]/40 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--brand)_16%,var(--card-surface)),var(--card-surface)_45%)]"
          : "lx-row-in h-14 border-b border-[var(--raised)] hover:bg-[var(--raised)]",
      )}
    >
      <span aria-hidden="true" className={cn("absolute bottom-2 left-0 top-2 w-[3px] origin-center rounded-r-full bg-[var(--brand-bright)] transition-[scale,opacity] duration-500", you ? "opacity-100" : "scale-y-0 opacity-0 group-hover:scale-y-100 group-hover:opacity-100 group-hover:duration-300")} />
      <span className={cn("text-sm font-semibold", you ? "text-[var(--brand-bright)]" : "text-[var(--text-muted)] transition-colors duration-300 group-hover:text-[var(--text)]")}>{clan.rank}</span>
      <span className="flex min-w-0 items-center gap-3 transition-[translate] duration-500 group-hover:translate-x-1 group-hover:duration-300">
        <ClanMark logo={clan.logo} tag={clan.tag} className={cn("size-8 rounded-[9px] text-[10px]", you && "ring-2 ring-[var(--brand)]/80")} />
        <span className="min-w-0 truncate text-[13px] font-medium text-[var(--text)]" title={clan.name}>{you ? "Your clan" : clan.name}</span>
        <span {...clanTagProps(clan.look, "shrink-0 text-[11px] font-semibold text-[var(--text-dim)]")}>[{clan.tag}]</span>
      </span>
      <span className={cell()}>{clan.currentPlayers}/{clan.maxPlayers}</span>
      <span className={cell(true)}>{clan.totalExp.toLocaleString()}</span>
      <span className={cell()}>{clan.matches.toLocaleString()}</span>
      <span className={cell()}>{winRate(clan)}</span>
      <span className={cell()}>{clan.wins.toLocaleString()}</span>
    </button>
  )
}

/** The clan ladder inside Leaders: a podium, the same table, and your own clan pinned at the bottom. */
export function ClanLadder({ search }: { search: string }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { data, loading, error, refetch } = useApiQuery<ClanRankEntry[]>((signal) => clansService.getRanking({ signal }))
  const { data: mine } = useApiQuery<MyClanState>((signal) => clansService.getMine({ signal }), { enabled: isAuthenticated, queryKey: String(isAuthenticated) })
  const clans = useMemo(() => data ?? [], [data])
  const topThree = search ? [] : clans.slice(0, 3)
  const rows = search ? clans.filter((clan) => clan.name.toLowerCase().includes(search) || clan.tag.toLowerCase().includes(search)) : clans.slice(3)
  const yours = mine?.membership ? clans.find((clan) => clan.id === mine.membership?.clan.id) : undefined
  const firstLoad = loading && clans.length === 0
  const open = (clan: ClanRankEntry) => navigate(`/clans/${clan.number ?? clan.id}`)

  return (
    <>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
        {(firstLoad || topThree.length > 0) && (
          <section aria-label="Top 3" className="lx-layer isolate grid grid-cols-3 items-start gap-3 px-6 pb-5 pt-3">
            {firstLoad
              ? [0, 1, 2].map((index) => <Skeleton key={index} className="h-[200px] rounded-xl" />)
              : topThree.map((clan) => <ClanTopCard key={clan.id} clan={clan} onOpen={() => open(clan)} />)}
          </section>
        )}

        <div className={cn(CLAN_GRID, "sticky top-0 z-[2] h-10 border-y border-[var(--line-soft)] bg-[var(--panel)] text-xs font-medium text-[var(--text-dim)]")}>
          <span>#</span>
          <span>Clan</span>
          <span className="text-right">Members</span>
          <span className="text-right text-[var(--brand-bright)]">Total EXP</span>
          <span className="text-right">Matches</span>
          <span className="text-right">Win rate</span>
          <span className="text-right">Wins</span>
        </div>

        {firstLoad ? (
          Array.from({ length: 6 }, (_, index) => <div key={index} className={cn(CLAN_GRID, "h-14 border-b border-[var(--raised)]")}><Skeleton className="h-4 w-6" /><Skeleton className="h-5 w-40" /></div>)
        ) : error && clans.length === 0 ? (
          <p className="flex items-center justify-center gap-3 px-6 py-10 text-[13px] text-[var(--text-dim)]">
            Could not load the clan ranking.
            <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] transition-colors hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
          </p>
        ) : clans.length === 0 ? (
          <p className="px-6 py-10 text-center text-[13px] text-[var(--text-dim)]">No clan has any members yet.</p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-[13px] text-[var(--text-dim)]">{search ? "No clan matches this search." : "Only the top three so far."}</p>
        ) : (
          <div>{rows.map((clan, index) => <ClanRow key={clan.id} index={index} clan={clan} onOpen={() => open(clan)} />)}</div>
        )}
        <div className="h-4" />
      </div>
      {yours && <ClanRow clan={yours} you onOpen={() => open(yours)} />}
    </>
  )
}
