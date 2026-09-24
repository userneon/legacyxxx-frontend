/**
 * Leaders (docs/design/leaders, leaders-sort-kd, leaders-ranks): sort EXP / K/D / Win rate, top-3 cards, the
 * table from #4 with a sticky header, and the viewer's pinned "You" row. K/D and win rate only rank players with
 * 10+ completed matches (decided server-side). Sort and search live in the URL.
 */
import { useNavigate } from "react-router-dom"
import { useEffect, useState, type KeyboardEvent } from "react"
import { Search } from "lucide-react"

import { competitiveService, type CompetitiveLeaderboard, type CompetitiveLeaderboardEntry, type LeaderboardSort } from "@/api"
import { formatInt, formatPercent, formatRatio } from "@/lib/format"
import { profilePath } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { PageHeader, SearchField } from "@/components/page"
import { PlayerAvatar } from "@/components/player-avatar"
import { RankBadge, RankEmblem } from "@/components/rank"
import { RelativeTime } from "@/components/relative-time"
import { EmptyState, ErrorState, InlineLoader, Skeleton } from "@/components/states"
import { Segmented } from "@/components/ui/segmented"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { useDebounced } from "@/hooks/use-debounced"
import { useIncremental } from "@/hooks/use-incremental"
import { useUrlState } from "@/hooks/use-url-state"

const SORTS = ["exp", "kd", "win"] as const
const SORT_LABEL: Record<LeaderboardSort, string> = { exp: "EXP", kd: "K/D", win: "Win rate" }
const COLUMNS = "grid grid-cols-[40px_minmax(0,1fr)_88px] @3xl:grid-cols-[56px_minmax(220px,1fr)_150px_110px_90px_100px_90px] gap-4 items-center px-4 @3xl:px-6"

function metric(entry: CompetitiveLeaderboardEntry, sort: LeaderboardSort) {
  if (sort === "kd") return formatRatio(entry.kd_ratio)
  if (sort === "win") return formatPercent(entry.win_rate)
  return formatInt(entry.current_exp)
}

function subtitle(sort: LeaderboardSort, minimum: number) {
  if (sort === "exp") return "Ranked by EXP from completed matches."
  return `Ranked by ${sort === "kd" ? "K/D" : "win rate"} · minimum ${minimum || 10} matches.`
}

function TopCard({ entry, place, sort, onOpen }: { entry: CompetitiveLeaderboardEntry; place: number; sort: LeaderboardSort; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl border border-line-soft bg-card p-[18px] text-left transition-colors duration-150 hover:border-line-strong hover:bg-raised"
    >
      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-0.5", place === 1 ? "bg-accent" : "bg-transparent")} />
      <span className="flex items-center justify-between">
        <span className="text-[28px] font-bold tracking-[-1px] text-text">#{place}</span>
        <RankEmblem rankId={entry.rank_id} size={40} />
      </span>
      <span className="flex min-w-0 items-center gap-3">
        <PlayerAvatar avatar={entry.avatar} name={entry.username} size={52} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-[15px] font-semibold text-text" title={entry.username}>{entry.username}</span>
          <span className="truncate text-xs text-text-dim">
            {entry.last_match_at ? <RelativeTime value={entry.last_match_at} prefix="Played " /> : "No matches yet"}
          </span>
        </span>
      </span>
      <span className="flex items-end justify-between border-t border-line-soft pt-3.5">
        <span className="flex flex-col gap-1">
          <span className="text-[11px] text-text-dim">{SORT_LABEL[sort]}</span>
          <span className="text-xl font-semibold tabular-nums text-text">{metric(entry, sort)}</span>
        </span>
        <span className="flex gap-3.5 text-right">
          <span className="flex flex-col items-end gap-1">
            <span className="text-[11px] text-text-dim">Matches</span>
            <span className="text-[13px] font-medium tabular-nums text-text-2">{formatInt(entry.matches_completed)}</span>
          </span>
          <span className="flex flex-col items-end gap-1">
            <span className="text-[11px] text-text-dim">{sort === "win" ? "K/D" : "Win rate"}</span>
            <span className="text-[13px] font-medium tabular-nums text-text-2">{sort === "win" ? formatRatio(entry.kd_ratio) : formatPercent(entry.win_rate)}</span>
          </span>
        </span>
      </span>
    </button>
  )
}

function Row({ entry, sort, onOpen, you = false }: { entry: CompetitiveLeaderboardEntry; sort: LeaderboardSort; onOpen: () => void; you?: boolean }) {
  const cell = (key: LeaderboardSort | "matches", value: string) => (
    <span className={cn("hidden text-right text-[13px] tabular-nums @3xl:block", key === sort ? "font-semibold text-text" : "text-text-2")}>{value}</span>
  )
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onOpen()
    }
  }
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKey}
      aria-label={you ? `Your position: ${entry.position}` : `${entry.position}. ${entry.username}`}
      className={cn(COLUMNS, "cursor-pointer transition-colors duration-150", you ? "h-[60px] border-t border-line bg-card hover:bg-raised" : "h-14 border-b border-raised hover:bg-card")}
    >
      <span className="text-sm font-semibold tabular-nums text-text-muted">{entry.position}</span>
      <span className="flex min-w-0 items-center gap-3">
        <PlayerAvatar avatar={entry.avatar} name={entry.username} size={32} ring={you} />
        <span className="truncate text-[13px] font-medium text-text" title={entry.username}>{you ? "You" : entry.username}</span>
        <RankEmblem rankId={entry.rank_id} size={20} className="@3xl:hidden" />
      </span>
      <span className="hidden min-w-0 @3xl:flex">
        <RankBadge rankId={entry.rank_id} size={22} />
      </span>
      <span className="text-right text-[13px] font-semibold tabular-nums text-text @3xl:hidden">{metric(entry, sort)}</span>
      {cell("exp", formatInt(entry.current_exp))}
      {cell("matches", formatInt(entry.matches_completed))}
      {cell("win", formatPercent(entry.win_rate))}
      {cell("kd", formatRatio(entry.kd_ratio))}
    </div>
  )
}

function LoadingRows() {
  return (
    <div aria-busy="true" aria-label="Loading leaderboard">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className={cn(COLUMNS, "h-14 border-b border-raised")}>
          <Skeleton className="h-2.5 w-5" />
          <span className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-[9px]" />
            <Skeleton className="h-2.5 w-2/5 bg-line" />
          </span>
          <Skeleton className="hidden h-2.5 w-20 @3xl:block" />
          {[56, 30, 40, 32].map((width, cell) => (
            <span key={cell} className="hidden justify-end @3xl:flex">
              <Skeleton className="h-2.5" style={{ width }} />
            </span>
          ))}
          <span className="flex justify-end @3xl:hidden">
            <Skeleton className="h-2.5 w-12" />
          </span>
        </div>
      ))}
    </div>
  )
}

export function LeadersPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sort, setSort] = useUrlState<LeaderboardSort>("sort", "exp", SORTS)
  const [urlQuery, setUrlQuery] = useUrlState("q", "")
  const [draft, setDraft] = useState(urlQuery)
  const query = useDebounced(draft.trim(), 250)
  useEffect(() => {
    if (query !== urlQuery) setUrlQuery(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const { data, loading, error, refetch } = useApiQuery<CompetitiveLeaderboard>(
    (signal) => competitiveService.getLeaderboard({ sort, query: urlQuery, limit: 500 }, { signal }),
    { queryKey: `${sort}|${urlQuery}|${user?.id ?? ""}`, keepPreviousData: true },
  )

  const entries = data?.entries ?? []
  const showTop = !urlQuery && entries.length >= 3
  const top = showTop ? entries.slice(0, 3) : []
  const rest = showTop ? entries.slice(3) : entries
  const { count, sentinelRef, hasMore } = useIncremental(rest.length, 100, `${sort}|${urlQuery}`)
  const open = (entry: CompetitiveLeaderboardEntry) => navigate(profilePath(entry.steam_id, user))
  const minimum = data?.minimumMatches ?? 10

  return (
    <div className="@container flex h-full min-h-0 flex-col">
      <PageHeader
        className="px-4 pt-6 pb-[18px] @3xl:px-6"
        title={
          <span className="inline-flex items-center gap-2">
            Leaders
            <InlineLoader show={loading && Boolean(data)} />
          </span>
        }
        subtitle={subtitle(sort, minimum)}
        actions={
          <>
            <Segmented
              ariaLabel="Sort by"
              value={sort}
              onChange={setSort}
              options={SORTS.map((value) => ({ value, label: SORT_LABEL[value] }))}
            />
            <SearchField
              icon={<Search className="size-[15px] shrink-0" aria-hidden />}
              aria-label="Search player"
              placeholder="Search player"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="w-full sm:w-[220px]"
            />
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {top.length > 0 && (
          <section aria-label="Top 3" className="grid grid-cols-1 gap-3 px-4 pb-5 @3xl:grid-cols-3 @3xl:px-6">
            {top.map((entry, index) => (
              <TopCard key={entry.user_id} entry={entry} place={index + 1} sort={sort} onOpen={() => open(entry)} />
            ))}
          </section>
        )}

        <div className={cn(COLUMNS, "sticky top-0 z-[2] h-10 border-y border-line-soft bg-panel text-xs")} role="row">
          <span className="font-medium text-text-dim">#</span>
          <span className="font-medium text-text-dim">Player</span>
          <span className="hidden font-medium text-text-dim @3xl:block">Rank</span>
          <span className="text-right font-semibold text-text @3xl:hidden">{SORT_LABEL[sort]}</span>
          {(["exp", "matches", "win", "kd"] as const).map((key) => (
            <span key={key} className={cn("hidden text-right @3xl:block", key === sort ? "font-semibold text-text" : "font-medium text-text-dim")}>
              {key === "matches" ? "Matches" : SORT_LABEL[key]}
            </span>
          ))}
        </div>

        {loading && !data ? (
          <LoadingRows />
        ) : error && !data ? (
          <ErrorState onRetry={refetch} />
        ) : entries.length === 0 ? (
          <EmptyState>{urlQuery ? `No players match "${urlQuery}".` : sort === "exp" ? "No ranked players yet." : `No one has ${minimum} completed matches yet.`}</EmptyState>
        ) : (
          <div className={cn("transition-opacity duration-150", loading && "opacity-70")}>
            {rest.slice(0, count).map((entry) => (
              <Row key={entry.user_id} entry={entry} sort={sort} onOpen={() => open(entry)} />
            ))}
            {hasMore && <div ref={sentinelRef} className="h-px" aria-hidden />}
            <div className="h-4" aria-hidden />
          </div>
        )}
      </div>

      {data?.viewer && <Row entry={data.viewer} sort={sort} onOpen={() => open(data.viewer!)} you />}
    </div>
  )
}
