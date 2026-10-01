import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { Crown, LoaderCircle, RotateCcw, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { PAGE_TITLES } from "@/lib/routes"
import { competitiveService } from "@/api"
import type { CompetitiveLeaderboardEntry, LeaderboardSort } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useViewParams } from "@/hooks/use-view-params"
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

/** Podium order on screen: silver, gold, bronze. */
const PODIUM_ORDER = [2, 1, 3]

/** Feeds the pointer position to a card's spotlight (--mx / --my). */

/** A fresh number each time the leaderboard data changes, so the rows replay their entrance. */
let listVersion = 0

function TopCard({ player, sort, onOpen }: { player: CompetitiveLeaderboardEntry; sort: LeaderboardSort; onOpen: () => void }) {
  const first = player.position === 1
  const slot = PODIUM_ORDER.indexOf(player.position)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${player.username} profile`}
      // The player's rank tier colour tints the corner glow (--tier); the podium spot sets the order and height.
      style={{ "--tier": rankTierColor(player.rank_id), order: slot, animationDelay: `${first ? 60 : 160 + slot * 60}ms` } as CSSProperties}
      className={cn(
        "lx-fx-card group relative isolate flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl border bg-[var(--glass-fill)] p-[18px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50",
        first ? "border-[var(--brand)]/45" : "mt-6 border-[var(--line-soft)]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-10 -top-12 -z-10 size-44 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--tier)_22%,transparent)_0%,transparent_70%)] transition-opacity duration-700 ease-[cubic-bezier(0.37,0,0.18,1)] group-hover:opacity-100 group-hover:duration-500",
          first ? "opacity-70" : "opacity-0",
        )}
      />
      {first && (
        <>
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[var(--brand-bright)] to-transparent" />
          <span aria-hidden="true" className="lx-hero-glow pointer-events-none absolute -inset-10 -z-10 opacity-50" />
        </>
      )}
      <span className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          {first && <Crown aria-hidden="true" className="size-6 fill-[var(--brand)]/30 text-[var(--brand-bright)] drop-" />}
          <span className={cn("font-bold leading-none tracking-[-1px]", first ? "text-[34px] text-[var(--text)]" : "text-[28px] text-[var(--text-2)]")}>#{player.position}</span>
        </span>
        <CompetitiveRankBadge rankId={player.rank_id} rankName={player.rank_name} imageKey={player.rank_image_key} currentExp={player.current_exp} size={first ? 48 : 40} />
      </span>
      <span className="flex min-w-0 items-center gap-3">
        <PlayerAvatar
          avatar={player.avatar}
          name={player.username}
          className={cn(
            "lx-layer shrink-0 text-base transition-[scale] duration-700 ease-[cubic-bezier(0.37,0,0.18,1)] group-hover:scale-105 group-hover:duration-500 group-hover:ease-[cubic-bezier(0.22,1,0.36,1)]",
            first ? "size-[60px] rounded-[15px] ring-2 ring-[var(--brand)]/70 ring-offset-2 ring-offset-[var(--card-surface)]" : "size-[52px] rounded-[13px]",
          )}
        />
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className={cn("truncate font-semibold text-[var(--text)]", first ? "text-base" : "text-sm")} title={player.username}>{player.username}</span>
          <span className="truncate text-xs font-medium" style={{ color: rankTierColor(player.rank_id) }}>{player.rank_name}</span>
        </span>
      </span>
      <span className="flex items-end justify-between border-t border-[var(--line-soft)] pt-3.5">
        <span className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--text-dim)]">{SORTS.find((entry) => entry.value === sort)!.metric}</span>
          <span key={sort} className={cn("lx-swap-in font-bold leading-none", first ? "text-[22px] text-[var(--brand-bright)]" : "text-lg text-[var(--text)]")}>{METRIC[sort](player)}</span>
        </span>
        <span className="flex gap-3.5">
          <span className="flex flex-col items-end gap-1.5">
            <span className="text-[11px] text-[var(--text-dim)]">Matches</span>
            <span className="text-xs text-[var(--text-2)]">{player.matches_completed.toLocaleString()}</span>
          </span>
          <span className="flex flex-col items-end gap-1.5">
            <span className="text-[11px] text-[var(--text-dim)]">Win rate</span>
            <span className="text-xs text-[var(--text-2)]">{formatWinRate(player)}</span>
          </span>
        </span>
      </span>
    </button>
  )
}

function PlayerRow({ player, sort, onOpen, you, index = 0 }: { player: CompetitiveLeaderboardEntry; sort: LeaderboardSort; onOpen: () => void; you?: boolean; index?: number }) {
  const cell = (column: LeaderboardSort | "matches") => cn("text-right text-[13px] transition-colors duration-300", column === sort ? "font-semibold text-[var(--text)]" : "text-[var(--text-muted)]")
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={you ? "Your position" : `Open ${player.username} profile`}
      style={you ? undefined : { animationDelay: `${Math.min(index, 14) * 28}ms` }}
      className={cn(
        GRID,
        // lx-layer: rows pass under the sticky header, so Chrome layers them for overlap anyway; a
        // fixed layer keeps a podium hover from re-creating (and repainting) the row below it.
        "lx-layer group relative w-full text-left transition-[background-color] duration-500 ease-[cubic-bezier(0.37,0,0.18,1)] hover:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/50",
        you
          ? "h-[60px] shrink-0 border-t border-[var(--brand)]/40 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--brand)_16%,var(--card-surface)),var(--card-surface)_45%)]"
          : "lx-row-in h-14 border-b border-[var(--raised)] hover:bg-[var(--raised)]",
      )}
    >
      {/* Crimson marker: always on your pinned row, slides in on hover for the others. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute bottom-2 left-0 top-2 w-[3px] origin-center rounded-r-full bg-[var(--brand-bright)] transition-[scale,opacity] duration-500 ease-[cubic-bezier(0.37,0,0.18,1)]",
          you ? "opacity-100" : "scale-y-0 opacity-0 group-hover:scale-y-100 group-hover:opacity-100 group-hover:duration-300 group-hover:ease-[cubic-bezier(0.22,1,0.36,1)]",
        )}
      />
      <span className={cn("text-sm font-semibold", you ? "text-[var(--brand-bright)]" : "text-[var(--text-muted)] transition-colors duration-300 group-hover:text-[var(--text)]")}>{player.position}</span>
      <span className="flex min-w-0 items-center gap-3 transition-[translate] duration-500 ease-[cubic-bezier(0.37,0,0.18,1)] group-hover:translate-x-1 group-hover:duration-300 group-hover:ease-[cubic-bezier(0.22,1,0.36,1)]">
        <PlayerAvatar
          avatar={player.avatar}
          name={player.username}
          className={cn("size-8 shrink-0 rounded-[9px] text-xs", you && "ring-2 ring-[var(--brand)]/80")}
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

const COLUMNS = [
  { key: "exp", label: "EXP" },
  { key: "matches", label: "Matches" },
  { key: "win", label: "Win rate" },
  { key: "kd", label: "K/D" },
] as const

/**
 * Sticky column header. One crimson underline glides to the sorted column (like the Segmented
 * thumb) instead of jumping; every label keeps the same weight so nothing shifts when it changes.
 */
function TableHeader({ sort }: { sort: LeaderboardSort }) {
  const row = useRef<HTMLDivElement>(null)
  const labels = useRef(new Map<string, HTMLSpanElement>())
  const [bar, setBar] = useState<{ x: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const label = labels.current.get(sort)
      if (!label || !row.current) return
      const rowBox = row.current.getBoundingClientRect()
      const labelBox = label.getBoundingClientRect()
      setBar({ x: labelBox.left - rowBox.left, width: labelBox.width })
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (row.current) observer.observe(row.current)
    return () => observer.disconnect()
  }, [sort])

  return (
    <div ref={row} className={cn(GRID, "sticky top-0 z-[2] h-10 border-y border-[var(--line-soft)] bg-[var(--panel)] text-xs")}>
      <span className="font-medium text-[var(--text-dim)]">#</span>
      <span className="font-medium text-[var(--text-dim)]">Player</span>
      <span className="font-medium text-[var(--text-dim)]">Rank</span>
      {COLUMNS.map((column) => (
        <span key={column.key} className="text-right">
          <span
            ref={(node) => {
              if (node) labels.current.set(column.key, node)
              else labels.current.delete(column.key)
            }}
            className={cn(
              "font-semibold transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              column.key === sort ? "text-[var(--brand-bright)]" : "text-[var(--text-dim)]",
            )}
          >
            {column.label}
          </span>
        </span>
      ))}
      {bar && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-px left-0 h-0.5 rounded-full bg-[var(--brand-bright)] transition-[translate,width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ translate: `${bar.x - 6}px 0`, width: bar.width + 12 }}
        />
      )}
    </div>
  )
}

function TopCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-[18px]" aria-hidden="true">
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
  const [params, setParams] = useViewParams()
  const sort = readSort(params.get("sort"))
  const [query, setQuery] = useState(params.get("q") ?? "")
  const search = (params.get("q") ?? "").trim().toLowerCase()

  // Sort and search are page state (not in the URL); typing applies 250ms after the last keystroke.
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
  // A new number per data change, so a re-sorted list replays its entrance.
  const rowsKey = useMemo(() => ++listVersion, [data])
  const open = (player: CompetitiveLeaderboardEntry) => onProfileNavigate(player.steam_id || player.user_id)

  return (
    <div className="scrollbar-hidden flex min-h-0 flex-1 overflow-x-auto">
      <div className="flex min-w-[900px] flex-1 flex-col">
        <div className="px-6 pb-2 pt-6">
          <section aria-label="Leaders" className="relative overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
            <div aria-hidden="true" className="lx-hero-glow pointer-events-none absolute -inset-10" />
            <div aria-hidden="true" className="lx-hero-grid pointer-events-none absolute inset-0" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent" />
            <div className="relative z-10 flex items-end justify-between gap-6 p-7">
              <div className="flex min-w-0 flex-col gap-2.5">
                <h1 className="flex items-center gap-2.5 text-[34px] font-bold leading-[1.1] tracking-[-0.6px] text-[var(--text)]">
                  <span aria-hidden="true" className="h-7 w-1 rounded-full bg-[var(--text-faint)]" />
                  {PAGE_TITLES["leaders"]}
                  {loading && players.length > 0 && <LoaderCircle aria-label="Updating" className="size-4 animate-spin text-[var(--text-dim)]" />}
                </h1>
                <span key={sort} className="lx-swap-in text-[14px] text-[var(--text-2)]">{SUBTITLE[sort]}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Segmented ariaLabel="Sort by" value={sort} onChange={setSort} options={SORTS} />
                <label className="flex h-[38px] w-[220px] items-center gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--glass-fill)] px-3 transition-[border-color,box-shadow] duration-300 focus-within:border-[var(--text-dim)] focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand)_18%,transparent)]">
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
          </section>
        </div>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
          {/* pt-3 leaves room above the podium: cards lift 5px on hover and the scroll area clips anything above its top.
              The podium is its own layer, so the cards' lift and shadow never re-layer the table rows they overlap. */}
          {(firstLoad || topThree.length > 0) && (
            <section aria-label="Top 3" className="lx-layer isolate grid grid-cols-3 items-start gap-3 px-6 pb-5 pt-3">
              {firstLoad
                ? [0, 1, 2].map((index) => <TopCardSkeleton key={index} />)
                : topThree.map((player) => <TopCard key={player.user_id} player={player} sort={sort} onOpen={() => open(player)} />)}
            </section>
          )}

          <TableHeader sort={sort} />

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
            <div key={rowsKey}>
              {rows.map((player, index) => <PlayerRow key={player.user_id} index={index} player={player} sort={sort} onOpen={() => open(player)} />)}
            </div>
          )}
          <div className="h-4" />
        </div>

        {you && <PlayerRow player={you} sort={sort} you onOpen={() => open(you)} />}
      </div>
    </div>
  )
}
