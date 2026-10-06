import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, LoaderCircle, RotateCcw, Search, Sparkles, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { competitiveService, searchService } from "@/api"
import type { CommunityPlayer, CompetitiveLeaderboardEntry, ModerationStatus } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useViewParams } from "@/hooks/use-view-params"
import { steamIdFromInput } from "@/lib/links"
import { PageBar, PageBarEnd, PageTabs, pageSearchClass } from "@/components/page-tabs"
import { PlayerAvatar } from "@/components/player-avatar"
import { RelativeTime } from "@/components/relative-time"
import { Skeleton } from "@/components/ui/skeleton"

const SEARCH_DEBOUNCE_MS = 250

/** Penalty colours shared with the Penalties page. */
const STATUS_COLOR: Record<Exclude<ModerationStatus, "Clear">, string> = {
  Banned: "var(--penalty-ban)",
  Muted: "var(--penalty-mute)",
  Gag: "var(--penalty-gag)",
}

/** A clean record needs no badge; only an active penalty is flagged, in its penalty colour. */
function StatusPill({ status }: { status: ModerationStatus }) {
  const color = status === "Clear" ? undefined : STATUS_COLOR[status]
  if (!color) return null
  return (
    <span
      className="inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-[11px] font-semibold"
      style={{ color, borderColor: `color-mix(in oklab, ${color} 35%, transparent)`, backgroundColor: `color-mix(in oklab, ${color} 10%, transparent)` }}
    >
      {status}
    </span>
  )
}

/** Feeds the pointer position to a card's spotlight (--mx / --my). */

/** The player's name with the searched part in crimson. */
function Highlight({ text, match }: { text: string; match: string }) {
  const at = text && match ? text.toLowerCase().indexOf(match.toLowerCase()) : -1
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-[3px] bg-[var(--raised)] px-px text-[var(--text-2)]">{text.slice(at, at + match.length)}</mark>
      {text.slice(at + match.length)}
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[11px] text-[var(--text-dim)]">{label}</span>
      <span className="truncate text-[13px] font-medium text-[var(--text)]">{value}</span>
    </span>
  )
}

function PlayerCard({ player, match, index, onOpen }: { player: CommunityPlayer; match: string; index: number; onOpen: () => void }) {
  const identity = player.steamId ?? player.id
  const winRate = player.matches > 0 ? `${Math.round((player.wins / player.matches) * 100)}%` : "—"
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!identity}
      aria-label={`Open ${player.name} profile`}
      style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
      className="lx-fx-card group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50 disabled:cursor-default"
    >
      <ArrowUpRight aria-hidden="true" className="absolute right-3.5 top-3.5 size-4 -translate-x-1 translate-y-1 text-[var(--text-2)] opacity-0 transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.37,0,0.18,1)] group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 group-hover:duration-500 group-hover:ease-[cubic-bezier(0.22,1,0.36,1)]" />
      <span className="relative flex items-center gap-3 pr-5">
        <PlayerAvatar
          avatar={player.avatar}
          name={player.name}
          className="lx-layer size-12 shrink-0 rounded-xl text-sm ring-0 ring-[var(--line-strong)] transition-[scale,box-shadow] duration-700 ease-[cubic-bezier(0.37,0,0.18,1)] group-hover:scale-105 group-hover:ring-2 group-hover:duration-500 group-hover:ease-[cubic-bezier(0.22,1,0.36,1)]"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium text-[var(--text)]" title={player.name}><Highlight text={player.name} match={match} /></span>
          <span className="truncate text-xs text-[var(--text-dim)]">
            {player.lastPlayed ? <>Played <RelativeTime value={player.lastPlayed} /></> : "No matches yet"}
          </span>
        </span>
        <StatusPill status={player.moderationStatus} />
      </span>
      <span className="relative grid grid-cols-4 gap-2 border-t border-[var(--line-soft)] pt-3.5">
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
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-4" aria-hidden="true">
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
  // The search is page state; a link may still carry ?q= (read once, then the URL is cleaned).
  const [params, setParams] = useViewParams()
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

  // Before a search: the top of the ladder as suggestions, so the page never starts empty.
  const { data: ladder } = useApiQuery<CompetitiveLeaderboardEntry[]>((signal) => competitiveService.getLeaderboard({ signal }), { enabled: !searching, queryKey: `explore-suggestions:${searching}` })
  const suggestions = [...(ladder ?? [])].sort((a, b) => a.position - b.position).slice(0, 8)
  const input = useRef<HTMLInputElement>(null)
  const pick = (name: string) => {
    setQuery(name)
    input.current?.focus()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageBar>
        <PageTabs ariaLabel="Explore" value="players" onChange={() => undefined} options={[{ value: "players", label: "Players" }]} />
        <PageBarEnd>
          <span className="text-[13px] text-[var(--text-dim)] max-lg:hidden">Name, Steam ID or profile link</span>
          <label className={cn(pageSearchClass, "w-[300px] max-sm:w-full")}>
            <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
            <input
              ref={input}
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search players"
              placeholder="Search players"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] [&::-webkit-search-cancel-button]:hidden"
            />
            {loading && searching && <LoaderCircle aria-label="Searching" className="size-4 shrink-0 animate-spin text-[var(--text-dim)]" />}
            {query && (
              <button type="button" onClick={() => pick("")} aria-label="Clear search" className="flex size-6 shrink-0 items-center justify-center rounded-md text-[var(--text-dim)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]">
                <X className="size-3.5" />
              </button>
            )}
          </label>
        </PageBarEnd>
      </PageBar>

      {/* pt-4 leaves room for the 5px hover lift: the scroll area clips anything above its top. */}
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 pb-7 pt-4">
        {!searching ? (
          <div className="lx-swap-in flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
            <span className="relative flex size-14 items-center justify-center rounded-2xl border border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text-2)]">
              <Search className="size-6" />
            </span>
            <span className="text-base font-semibold text-[var(--text)]">Start typing to search</span>
            <span className="max-w-sm text-[13px] text-[var(--text-dim)]">Search any player by name or Steam ID, or paste a Steam profile link.</span>
            {suggestions.length > 0 && (
              <div className="mt-3 flex max-w-[640px] flex-col items-center gap-2.5">
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Sparkles className="size-3.5 text-[var(--text-2)]" />
                  Try a top player
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((player, index) => (
                    <button
                      key={player.user_id}
                      type="button"
                      onClick={() => pick(player.username)}
                      style={{ animationDelay: `${120 + index * 45}ms` }}
                      className="lx-swap-in lx-layer group flex h-9 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--glass-fill)] pl-1 pr-3.5 text-[13px] font-medium text-[var(--text-2)] transition-[border-color,color,background-color,translate] duration-300 hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:bg-[var(--raised)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50"
                    >
                      <PlayerAvatar avatar={player.avatar} name={player.username} className="size-7 rounded-full text-[10px]" />
                      {player.username}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
              <span aria-hidden="true" className="h-3 w-[3px] rounded-full bg-[var(--text-faint)]" />
              {players.length > 0 ? <><span className="font-semibold text-[var(--text-2)]">{players.length}</span> player{players.length === 1 ? "" : "s"}</> : "Results"}
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
              <p className="lx-swap-in py-10 text-center text-[13px] text-[var(--text-dim)]">No player matches “{search}”.</p>
            ) : (
              // Keyed on the search so every new result set cascades in.
              <div key={search} className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
                {players.map((player, index) => {
                  const identity = player.steamId ?? player.id
                  return (
                    <PlayerCard
                      key={identity ?? player.name}
                      player={player}
                      match={search}
                      index={index}
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
