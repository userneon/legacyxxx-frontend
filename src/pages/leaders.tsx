import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { useSearchParams } from "react-router-dom"
import { LoaderCircle, RotateCcw, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { competitiveService } from "@/api"
import type { CompetitiveLeaderboardEntry, LeaderboardSort } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { PlayerAvatar } from "@/components/player-avatar"
import { CompetitiveRankBadge, RankLabel, rankTierColor } from "@/components/competitive-rank-badge"
import { Segmented } from "@/components/segmented"
import { Skeleton } from "@/components/ui/skeleton"

/** One grid for the header row, every player row and the pinned "You" row. */
const GRID = "grid grid-cols-[56px_minmax(220px,1fr)_150px_110px_90px_100px_90px] items-center gap-4 px-6"
const SEARCH_DEBOUNCE_MS = 250

const SORTS: { value: LeaderboardSort; label: string; metric: string }[] = [
  { value: "exp", label: "EXP", metric: "EXP" },
  { value: "kd", label: "K/D", metric: "K/D" },
  { value: "win", label: "Win rate", metric: "Win rate" },
]

const SUBTITLE: Record<LeaderboardSort, string> = {
  exp: "Ranked by EXP from completed matches.",
  kd: "Ranked by K/D · minimum 10 matches.",
  win: "Ranked by win rate · minimum 10 matches.",
}

const formatExp = (player: CompetitiveLeaderboardEntry) => player.current_exp.toLocaleString()
const formatKd = (player: CompetitiveLeaderboardEntry) => player.kd_ratio.toFixed(2)
const formatWinRate = (player: CompetitiveLeaderboardEntry) => (player.matches_completed > 0 ? `${Math.round(player.win_rate * 100)}%` : "—")
const METRIC: Record<LeaderboardSort, (player: CompetitiveLeaderboardEntry) => string> = { exp: formatExp, kd: formatKd, win: formatWinRate }

const readSort = (value: string | null): LeaderboardSort => (value === "kd" || value === "win" ? value : "exp")

function TopCard({ player, sort, onOpen }: { player: CompetitiveLeaderboardEntry; sort: LeaderboardSort; onOpen: () => void }) {
  const first = player.position === 1
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${player.username} profile`}
      // The player's rank tier colour drives a soft glow on hover (--tier).
      style={{ "--tier": rankTierColor(player.rank_id) } as CSSProperties}
      className="group relative isolate flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-[18px] text-left transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:border-[color-mix(in_oklab,var(--tier)_40%,var(--line-strong))] hover:shadow-[0_0_28px_-10px_color-mix(in_oklab,var(--tier)_55%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 motion-reduce:transition-none"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 -z-10 size-44 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--tier)_22%,transparent)_0%,transparent_70%)] opacity-0 transition-opacity duration-200 ease-[var(--ease-out)] group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
      />
      {first && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-[var(--accent-solid)]" />}
      <span className="flex items-center justify-between">
        <span className="text-[28px] font-bold leading-none tracking-[-1px] text-[var(--text)] tabular-nums">#{player.position}</span>
        <CompetitiveRankBadge rankId={player.rank_id} rankName={player.rank_name} imageKey={player.rank_image_key} currentExp={player.current_exp} size={40} />
      </span>
      <span className="flex min-w-0 items-center gap-3">
        <PlayerAvatar avatar={player.avatar} name={player.username} className="size-[52px] shrink-0 rounded-[13px] text-base" />
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate text-sm font-semibold text-[var(--text)]" title={player.username}>{player.username}</span>
          <span className="truncate text-xs font-medium" style={{ color: rankTierColor(player.rank_id) }}>{player.rank_name}</span>
        </span>
      </span>
      <span className="flex items-end justify-between border-t border-[var(--line-soft)] pt-3.5">
        <span className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--text-dim)]">{SORTS.find((entry) => entry.value === sort)!.metric}</span>
          <span className="text-lg font-bold leading-none tabular-nums text-[var(--text)]">{METRIC[sort](player)}</span>
        </span>
        <span className="flex gap-3.5">
          <span className="flex flex-col items-end gap-1.5">
            <span className="text-[11px] text-[var(--text-dim)]">Matches</span>
            <span className="text-xs tabular-nums text-[var(--text-2)]">{player.matches_completed.toLocaleString()}</span>
          </span>
          <span className="flex flex-col items-end gap-1.5">
            <span className="text-[11px] text-[var(--text-dim)]">Win rate</span>
            <span className="text-xs tabular-nums text-[var(--text-2)]">{formatWinRate(player)}</span>
          </span>
        </span>
      </span>
    </button>
  )
}

function PlayerRow({ player, sort, onOpen, you }: { player: CompetitiveLeaderboardEntry; sort: LeaderboardSort; onOpen: () => void; you?: boolean }) {
  const cell = (column: LeaderboardSort | "matches") => cn("text-right text-[13px] tabular-nums", column === sort ? "font-medium text-[var(--text)]" : "text-[var(--text-muted)]")
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={you ? "Your position" : `Open ${player.username} profile`}
      className={cn(
        GRID,
        "w-full text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/60",
        you ? "h-[60px] shrink-0 border-t border-[var(--line)] bg-[var(--card-surface)]" : "h-14 border-b border-[var(--raised)] hover:bg-[var(--card-surface)]",
      )}
    >
      <span className="text-sm font-semibold tabular-nums text-[var(--text-muted)]">{player.position}</span>
      <span className="flex min-w-0 items-center gap-3">
        <PlayerAvatar
          avatar={player.avatar}
          name={player.username}
          className={cn("size-8 shrink-0 rounded-[9px] text-xs", you && "ring-1 ring-[var(--accent-solid)]")}
        />
        <span className="min-w-0 truncate text-[13px] font-medium text-[var(--text)]" title={player.username}>{you ? "You" : player.username}</span>
      </span>
      <RankLabel rankId={player.rank_id} rankName={player.rank_name} imageKey={player.rank_image_key} currentExp={player.current_exp} size={22} nameClassName="font-medium" />
      <span className={cell("exp")}>{formatExp(player)}</span>
      <span className={cell("matches")}>{player.matches_completed.toLocaleString()}</span>
      <span className={cell("win")}>{formatWinRate(player)}</span>
      <span className={cell("kd")}>{formatKd(player)}</span>
    </button>
  )
}

function TopCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-[18px]" aria-hidden="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-10 rounded-md bg-[var(--line)]" />
        <Skeleton className="size-10 rounded-full bg-[var(--line-soft)]" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="size-[52px] rounded-[13px] bg-[var(--line)]" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-3/5 rounded-full bg-[var(--line-strong)]" />
          <Skeleton className="h-2 w-1/3 rounded-full bg-[var(--line-soft)]" />
        </div>
      </div>
      <div className="flex items-end justify-between border-t border-[var(--line-soft)] pt-3.5">
        <Skeleton className="h-4 w-[72px] rounded-full bg-[var(--line-strong)]" />
        <Skeleton className="h-2.5 w-20 rounded-full bg-[var(--line-soft)]" />
      </div>
    </div>
  )
}

function RowSkeleton() {
  return (
    <div className={cn(GRID, "h-14 border-b border-[var(--raised)]")} aria-hidden="true">
      <Skeleton className="h-2.5 w-4 rounded-full bg-[var(--line-soft)]" />
      <span className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-[9px] bg-[var(--line-soft)]" />
        <Skeleton className="h-2.5 w-[45%] rounded-full bg-[var(--line)]" />
      </span>
      <span className="flex items-center gap-2">
        <Skeleton className="size-[22px] rounded-full bg-[var(--line-soft)]" />
        <Skeleton className="h-2.5 w-16 rounded-full bg-[var(--line-soft)]" />
      </span>
      <Skeleton className="ml-auto h-2.5 w-14 rounded-full bg-[var(--line)]" />
      <Skeleton className="ml-auto h-2.5 w-8 rounded-full bg-[var(--line-soft)]" />
      <Skeleton className="ml-auto h-2.5 w-10 rounded-full bg-[var(--line-soft)]" />
      <Skeleton className="ml-auto h-2.5 w-8 rounded-full bg-[var(--line-soft)]" />
    </div>
  )
}

export function LeadersPage({ onProfileNavigate }: { onProfileNavigate: (userId: string) => void }) {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const sort = readSort(params.get("sort"))
  const [query, setQuery] = useState(params.get("q") ?? "")
  const search = (params.get("q") ?? "").trim().toLowerCase()

  // Sort and search live in the URL; typing updates it 250ms after the last keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setParams((current) => {
        const next = new URLSearchParams(current)
        if (query.trim()) next.set("q", query.trim())
        else next.delete("q")
        return next
      }, { replace: true })
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query, setParams])

  const setSort = (value: LeaderboardSort) => {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value === "exp") next.delete("sort")
      else next.set("sort", value)
      return next
    }, { replace: true })
  }

  const { data, loading, error, refetch } = useApiQuery<CompetitiveLeaderboardEntry[]>(
    (signal) => competitiveService.getLeaderboard({ signal }, { sort }),
    { queryKey: `leaders:${sort}`, keepPreviousData: true },
  )

  const players = useMemo(() => [...(data ?? [])].sort((a, b) => a.position - b.position), [data])
  const topThree = search ? [] : players.slice(0, 3)
  const rows = search ? players.filter((player) => player.username.toLowerCase().includes(search)) : players.slice(3)
  // Your real position for the active sort; hidden when logged out or not on this ladder.
  const you = user ? players.find((player) => player.user_id === user.id || player.steam_id === user.steamId) : undefined
  const firstLoad = loading && players.length === 0
  const open = (player: CompetitiveLeaderboardEntry) => onProfileNavigate(player.steam_id || player.user_id)

  return (
    <div className="scrollbar-hidden flex min-h-0 flex-1 overflow-x-auto">
      <div className="flex min-w-[900px] flex-1 flex-col">
        <div className="flex items-end justify-between gap-4 px-6 pb-[18px] pt-6">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="flex items-center gap-2 text-[22px] font-semibold leading-[1.2] tracking-[-0.3px] text-[var(--text)]">
              Leaders
              {loading && players.length > 0 && <LoaderCircle aria-label="Updating" className="size-4 animate-spin text-[var(--text-dim)]" />}
            </h1>
            <span className="text-[13px] leading-[1.2] text-[var(--text-muted)]">{SUBTITLE[sort]}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Segmented ariaLabel="Sort by" value={sort} onChange={setSort} options={SORTS} />
            <label className="flex h-[38px] w-[220px] items-center gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--card-surface)] px-3 transition-colors focus-within:border-[var(--line-strong)]">
              <Search className="size-4 shrink-0 text-[var(--text-dim)]" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search player"
                placeholder="Search player"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]"
              />
            </label>
          </div>
        </div>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
          {(firstLoad || topThree.length > 0) && (
            <section aria-label="Top 3" className="grid grid-cols-3 gap-3 px-6 pb-5">
              {firstLoad
                ? [0, 1, 2].map((index) => <TopCardSkeleton key={index} />)
                : topThree.map((player) => <TopCard key={player.user_id} player={player} sort={sort} onOpen={() => open(player)} />)}
            </section>
          )}

          <div className={cn(GRID, "sticky top-0 z-[2] h-10 border-y border-[var(--line-soft)] bg-[var(--panel)] text-xs")}>
            <span className="font-medium text-[var(--text-dim)]">#</span>
            <span className="font-medium text-[var(--text-dim)]">Player</span>
            <span className="font-medium text-[var(--text-dim)]">Rank</span>
            {(["exp", "matches", "win", "kd"] as const).map((column) => (
              <span key={column} className={cn("text-right", column === sort ? "font-semibold text-[var(--text)]" : "font-medium text-[var(--text-dim)]")}>
                {column === "exp" ? "EXP" : column === "matches" ? "Matches" : column === "win" ? "Win rate" : "K/D"}
              </span>
            ))}
          </div>

          {firstLoad ? (
            Array.from({ length: 8 }, (_, index) => <RowSkeleton key={index} />)
          ) : error && players.length === 0 ? (
            <p className="flex items-center justify-center gap-3 px-6 py-10 text-[13px] text-[var(--text-dim)]">
              Could not load the leaderboard.
              <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] transition-colors hover:text-[var(--text)]">
                <RotateCcw className="size-3.5" />
                Retry
              </button>
            </p>
          ) : players.length === 0 ? (
            <p className="px-6 py-10 text-center text-[13px] text-[var(--text-dim)]">
              {sort === "exp" ? "No ranked players yet." : "No player has 10 completed matches yet."}
            </p>
          ) : rows.length === 0 ? (
            <p className="px-6 py-10 text-center text-[13px] text-[var(--text-dim)]">{search ? "No player matches this search." : "Only the top three so far."}</p>
          ) : (
            rows.map((player) => <PlayerRow key={player.user_id} player={player} sort={sort} onOpen={() => open(player)} />)
          )}
          <div className="h-4" />
        </div>

        {you && <PlayerRow player={you} sort={sort} you onOpen={() => open(you)} />}
      </div>
    </div>
  )
}
