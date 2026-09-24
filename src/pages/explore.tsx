/**
 * Explore (docs/design/explore, explore-results): player search only. Results update as you type (250ms
 * debounce) and the previous results stay visible while the next ones load.
 */
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"

import { searchService, type CommunityPlayer, type SearchPlayersResult } from "@/api"
import { formatInt, formatPercent, formatRatio } from "@/lib/format"
import { profilePath } from "@/lib/routes"
import { normalizePlayerQuery } from "@/lib/steam"
import { cn } from "@/lib/utils"
import { PlayerAvatar } from "@/components/player-avatar"
import { RelativeTime } from "@/components/relative-time"
import { EmptyState, ErrorState, InlineLoader, Skeleton } from "@/components/states"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { useDebounced } from "@/hooks/use-debounced"
import { useUrlState } from "@/hooks/use-url-state"

const STATUS_LABEL: Record<CommunityPlayer["moderationStatus"], string | null> = { Banned: "Banned", Muted: "Muted", Gag: "Gagged", Clear: null }

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col gap-1.5">
      <span className="text-[11px] text-text-dim">{label}</span>
      <span className="text-[13px] font-medium tabular-nums text-text">{value}</span>
    </span>
  )
}

function PlayerCard({ player, onOpen }: { player: CommunityPlayer; onOpen: () => void }) {
  const status = STATUS_LABEL[player.moderationStatus]
  const winRate = player.winRate ?? (player.matches ? player.wins / player.matches : null)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-4 rounded-xl border border-line-soft bg-card p-4 text-left transition-colors duration-150 hover:border-line-strong hover:bg-raised"
    >
      <span className="flex min-w-0 items-center gap-3">
        <PlayerAvatar avatar={player.avatar} name={player.name} size={48} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-[15px] font-semibold text-text" title={player.name}>{player.name}</span>
          <span className="truncate text-xs text-text-dim">{player.lastPlayed ? <RelativeTime value={player.lastPlayed} prefix="Last played " /> : "No matches yet"}</span>
        </span>
        {status ? (
          <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-line bg-raised px-2 text-[11px] font-medium text-text-2">{status}</span>
        ) : (
          <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium text-text-dim">
            <span className="size-1.5 rounded-full bg-live" aria-hidden />
            Clean
          </span>
        )}
      </span>
      <span className="grid grid-cols-4 gap-2 border-t border-line-soft pt-3.5">
        <Stat label="K/D" value={formatRatio(player.kd)} />
        <Stat label="Matches" value={formatInt(player.matches)} />
        <Stat label="Win rate" value={formatPercent(winRate)} />
        <Stat label="Hours" value={formatInt(player.playedHours)} />
      </span>
    </button>
  )
}

export function ExplorePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [urlQuery, setUrlQuery] = useUrlState("q", "")
  const [draft, setDraft] = useState(urlQuery)
  const query = useDebounced(normalizePlayerQuery(draft), 250)
  useEffect(() => {
    if (query !== urlQuery) setUrlQuery(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const { data, loading, error, refetch } = useApiQuery<SearchPlayersResult>((signal) => searchService.searchPlayers(urlQuery, { signal }), {
    enabled: Boolean(urlQuery),
    queryKey: urlQuery,
    keepPreviousData: true,
  })
  const players = data?.players ?? []

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-4 border-b border-line-soft px-4 pt-6 pb-5 sm:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 inline-flex items-center gap-2 text-[22px] font-semibold tracking-[-0.3px] text-text">
            Explore
            <InlineLoader show={loading && Boolean(data)} />
          </h1>
          <p className="m-0 text-[13px] text-text-muted">Find players on Legacy-X.</p>
        </div>
        <label className="flex h-12 max-w-[640px] items-center gap-2.5 rounded-xl border border-line bg-card px-4 text-text-dim transition-colors duration-150 focus-within:border-line-strong">
          <Search className="size-[18px] shrink-0" aria-hidden />
          <input
            type="search"
            autoFocus
            aria-label="Search players"
            placeholder="Search by name or Steam ID"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-text-dim [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-7 sm:px-6">
        {!urlQuery ? (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-2 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl border border-line bg-card text-text-muted">
              <Search className="size-[18px]" aria-hidden />
            </span>
            <span className="text-sm font-medium text-text">Start typing to search</span>
            <span className="text-[13px] text-text-dim">Search any player by name or Steam ID.</span>
          </div>
        ) : loading && !data ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Searching">
            <Skeleton className="h-2.5 w-14" />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="flex flex-col gap-4 rounded-xl border border-line-soft bg-card p-4">
                  <span className="flex items-center gap-3">
                    <Skeleton className="size-12 rounded-xl" />
                    <span className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-3 w-1/2 bg-line" />
                      <Skeleton className="h-2.5 w-1/3" />
                    </span>
                  </span>
                  <span className="grid grid-cols-4 gap-2 border-t border-line-soft pt-3.5">
                    {[0, 1, 2, 3].map((cell) => (
                      <span key={cell} className="flex flex-col gap-2">
                        <Skeleton className="h-2 w-8" />
                        <Skeleton className="h-2.5 w-9 bg-line" />
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : error && !data ? (
          <ErrorState onRetry={refetch} />
        ) : players.length === 0 ? (
          <EmptyState>No players match "{urlQuery}".</EmptyState>
        ) : (
          <div className={cn("flex flex-col gap-3 transition-opacity duration-150", loading && "opacity-70")}>
            <span className="text-xs text-text-dim">Results</span>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-3">
              {players.map((player) => (
                <PlayerCard key={player.id || player.steamId} player={player} onOpen={() => navigate(profilePath(player.steamId, user))} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
