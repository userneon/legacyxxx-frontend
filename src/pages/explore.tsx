import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { LoaderCircle, RotateCcw, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { searchService } from "@/api"
import type { CommunityPlayer, ModerationStatus } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { steamIdFromInput } from "@/lib/links"
import { PlayerAvatar } from "@/components/player-avatar"
import { RelativeTime } from "@/components/relative-time"
import { Skeleton } from "@/components/ui/skeleton"

const SEARCH_DEBOUNCE_MS = 250

/** A clean record needs no badge; only an active penalty is flagged. */
function StatusPill({ status }: { status: ModerationStatus }) {
  if (status === "Clear") return null
  return (
    <span className={cn(
      "inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-[11px] font-medium",
      status === "Banned"
        ? "border-[var(--accent-solid)]/35 bg-[var(--accent-solid)]/10 text-[var(--accent-solid)]"
        : "border-[var(--line)] bg-[var(--raised)] text-[var(--text-muted)]",
    )}>
      {status}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[11px] text-[var(--text-dim)]">{label}</span>
      <span className="truncate text-[13px] font-medium tabular-nums text-[var(--text)]">{value}</span>
    </span>
  )
}

function PlayerCard({ player, onOpen }: { player: CommunityPlayer; onOpen: () => void }) {
  const identity = player.steamId ?? player.id
  const winRate = player.matches > 0 ? `${Math.round((player.wins / player.matches) * 100)}%` : "—"
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!identity}
      aria-label={`Open ${player.name} profile`}
      className="flex flex-col gap-4 rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-4 text-left transition-colors duration-150 hover:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 disabled:cursor-default"
    >
      <span className="flex items-center gap-3">
        <PlayerAvatar avatar={player.avatar} name={player.name} className="size-12 shrink-0 rounded-xl text-sm" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium text-[var(--text)]" title={player.name}>{player.name}</span>
          <span className="truncate text-xs text-[var(--text-dim)]">
            {player.lastPlayed ? <>Played <RelativeTime value={player.lastPlayed} /></> : "No matches yet"}
          </span>
        </span>
        <StatusPill status={player.moderationStatus} />
      </span>
      <span className="grid grid-cols-4 gap-2 border-t border-[var(--line-soft)] pt-3.5">
        <Stat label="K/D" value={player.kd.toFixed(2)} />
        <Stat label="Matches" value={player.matches.toLocaleString()} />
        <Stat label="Win rate" value={winRate} />
        <Stat label="Hours" value={`${Math.round(player.playedHours).toLocaleString()}h`} />
      </span>
    </button>
  )
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-xl bg-[var(--line-soft)]" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-2.5 w-[55%] rounded-full bg-[var(--line)]" />
          <Skeleton className="h-2 w-[35%] rounded-full bg-[var(--line-soft)]" />
        </div>
        <Skeleton className="h-5 w-[52px] rounded-full bg-[var(--raised)]" />
      </div>
      <div className="grid grid-cols-4 gap-2 border-t border-[var(--line-soft)] pt-3.5">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Skeleton className="h-2 w-10 rounded-full bg-[var(--line-soft)]" />
            <Skeleton className="h-2.5 w-9 rounded-full bg-[var(--line)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ExplorePage({ onProfileNavigate }: { onProfileNavigate: (userId: string) => void }) {
  // The search lives in the URL (?q=), so reload and back/forward keep it.
  const [params, setParams] = useSearchParams()
  const search = params.get("q")?.trim() ?? ""
  const [query, setQuery] = useState(search)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = steamIdFromInput(query)
      if (next === search) return
      setParams((current) => {
        const updated = new URLSearchParams(current)
        if (next) updated.set("q", next)
        else updated.delete("q")
        return updated
      }, { replace: true })
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query, search, setParams])

  const searching = search.length > 0
  const { data, loading, error, refetch } = useApiQuery<CommunityPlayer[]>(
    (signal) => searchService.searchPlayers(search, { signal }).then((response) => response.players),
    { enabled: searching, queryKey: `explore:${search}`, keepPreviousData: true },
  )
  const players = data ?? []

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-4 border-b border-[var(--line-soft)] px-6 pb-5 pt-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.3px] text-[var(--text)]">Explore</h1>
          <span className="text-[13px] leading-[1.2] text-[var(--text-muted)]">Find players on Legacy-X.</span>
        </div>
        <label className="flex h-12 w-full max-w-[640px] items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--card-surface)] px-4 transition-colors focus-within:border-[var(--line-strong)]">
          <Search className="size-[18px] shrink-0 text-[var(--text-dim)]" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search players"
            placeholder="Search by name or Steam ID"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]"
          />
        </label>
      </div>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 pb-7 pt-5">
        {!searching ? (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-2 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--card-surface)]">
              <Search className="size-[18px] text-[var(--text-dim)]" />
            </span>
            <span className="text-sm font-medium text-[var(--text)]">Start typing to search</span>
            <span className="text-[13px] text-[var(--text-dim)]">Search any player by name or Steam ID.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
              Results
              {loading && players.length > 0 && <LoaderCircle aria-label="Updating" className="size-3.5 animate-spin" />}
            </span>
            {loading && players.length === 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
                {Array.from({ length: 6 }, (_, index) => <CardSkeleton key={index} />)}
              </div>
            ) : error && players.length === 0 ? (
              <p className="flex items-center justify-center gap-3 py-10 text-[13px] text-[var(--text-dim)]">
                Could not run that search.
                <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] transition-colors hover:text-[var(--text)]">
                  <RotateCcw className="size-3.5" />
                  Retry
                </button>
              </p>
            ) : players.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-[var(--text-dim)]">No player matches “{search}”.</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
                {players.map((player) => {
                  const identity = player.steamId ?? player.id
                  return (
                    <PlayerCard
                      key={identity ?? player.name}
                      player={player}
                      onOpen={() => { if (identity) onProfileNavigate(identity) }}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
