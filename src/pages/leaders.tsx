import { useState } from "react"
import { Target, Search, SearchX, Clock3, Users, Medal, Gamepad2, Skull } from "lucide-react"
import { StopwatchIcon } from "@/components/mask-icons"
import { StatTile, toolbarClass, toolbarSearchClass } from "@/components/page-kit"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { cn } from "@/lib/utils"
import { competitiveService } from "@/api"
import type { CompetitiveLeaderboardEntry } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { QueryState } from "@/components/query-state"
import { PlayerModerationAvatar } from "@/components/player-moderation-avatar"
import { CompetitiveRankBadge } from "@/components/competitive-rank-badge"
import { RelativeTime } from "@/components/relative-time"
import { Button } from "@/components/ui/button"

type SortKey = "rank" | "kd" | "kills" | "headshots" | "wins" | "matches" | "hours"

const SORTS: Array<{ id: SortKey; label: string }> = [
  { id: "rank", label: "Rank (EXP)" },
  { id: "kd", label: "K/D ratio" },
  { id: "kills", label: "Kills" },
  { id: "headshots", label: "Headshot %" },
  { id: "wins", label: "Wins" },
  { id: "matches", label: "Matches" },
  { id: "hours", label: "Hours played" },
]

/** Ladders by game mode. Only competitive 5v5 is tracked today; the others are listed as coming. */
const MODES = [
  { id: "5v5", label: "5v5 Competitive", available: true },
  { id: "fun", label: "Fun Mode", available: false },
  { id: "proleague", label: "Pro League", available: false },
] as const

function headshotRate(player: CompetitiveLeaderboardEntry) {
  return player.kills > 0 ? Math.round((player.headshot_kills / player.kills) * 100) : 0
}

function sortValue(player: CompetitiveLeaderboardEntry, key: SortKey) {
  switch (key) {
    case "kd": return player.kd_ratio
    case "kills": return player.kills
    case "headshots": return headshotRate(player)
    case "wins": return player.wins
    case "matches": return player.matches_completed
    case "hours": return player.played_hours
    // The server's own ordering; a lower position is better, so it is negated to share one comparator.
    default: return -player.position
  }
}

// LEGACY-X visual system: glass surfaces, container-query columns and server-authoritative rank artwork.
export function LeadersPage({ onProfileNavigate }: { onProfileNavigate: (userId: string) => void }) {
  const { data: leaders, loading, error, refetch } = useApiQuery<CompetitiveLeaderboardEntry[]>((signal) =>
    competitiveService.getLeaderboard({ signal }),
  )
  const { user } = useAuth()
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("rank")

  const list = leaders ?? []
  const podium = [...list].sort((a, b) => a.position - b.position).slice(0, 3)
  const search = query.trim().toLowerCase()
  const narrowed = Boolean(search) || sort !== "rank"

  const rows = list
    .filter((player) => !search || player.username.toLowerCase().includes(search))
    // Without a search or a different sort, the top three already stand on the podium above.
    .filter((player) => narrowed || player.position > 3)
    .sort((a, b) => sortValue(b, sort) - sortValue(a, sort))

  const totalMatches = list.reduce((sum, player) => sum + player.matches_completed, 0)
  const totalWins = list.reduce((sum, player) => sum + player.wins, 0)
  const bestAim = [...list].sort((a, b) => headshotRate(b) - headshotRate(a))[0]
  const mostActive = [...list].sort((a, b) => b.played_hours - a.played_hours)[0]

  return (
    <div className="@container flex flex-col gap-5 p-4 @2xl:p-6">
      <QueryState loading={loading} error={error} empty={!loading && !error && list.length === 0} emptyMessage="No player performance data available yet." onRetry={refetch} />

      {!loading && !error && list.length > 0 && (
        <>
          <div className="-mx-4 -my-1 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 py-1 @4xl:mx-0 @4xl:my-0 @4xl:grid @4xl:grid-cols-4 @4xl:overflow-visible @4xl:px-0">
            <StatTile icon={Users} label="Ranked players" value={list.length} tone="text-sky-300" />
            <StatTile icon={Gamepad2} label="Matches recorded" value={totalMatches} tone="text-white/90" />
            <StatTile icon={Medal} label="Community wins" value={totalWins} tone="text-amber-300" />
            <StatTile
              icon={StopwatchIcon}
              label={mostActive ? `${mostActive.username} · hours played` : "Hours played"}
              value={mostActive?.played_hours ?? 0}
              suffix="h"
              tone="text-pink-300"
            />
          </div>

          <section className="glass relative isolate overflow-hidden rounded-2xl px-4 pb-4 pt-8 @2xl:px-6" aria-label="Top three players">
            <div className="pointer-events-none absolute inset-x-6 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
            <div className="mx-auto grid w-full max-w-3xl grid-cols-3 items-end gap-2 @lg:gap-4 @4xl:max-w-5xl @4xl:gap-8 @6xl:max-w-none @6xl:gap-12">
              <PodiumPlayer player={podium[1]} rank={2} onProfileNavigate={onProfileNavigate} />
              <PodiumPlayer player={podium[0]} rank={1} onProfileNavigate={onProfileNavigate} />
              <PodiumPlayer player={podium[2]} rank={3} onProfileNavigate={onProfileNavigate} />
            </div>
            {bestAim && (
              <p className="mt-5 text-center text-xs text-muted-foreground">
                Sharpest aim: <span className="font-semibold text-white/85">{bestAim.username}</span> · {headshotRate(bestAim)}% headshots
              </p>
            )}
          </section>

          <div className={toolbarClass}>
            <label className={toolbarSearchClass}>
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Select value="5v5">
                <SelectTrigger aria-label="Mode" className="w-[11.5rem] bg-background/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((mode) => (
                    <SelectItem key={mode.id} value={mode.id} disabled={!mode.available}>
                      {mode.label}{!mode.available && <span className="ml-1 text-[10px] text-muted-foreground">soon</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                <SelectTrigger aria-label="Rank by" className="w-[10.5rem] bg-background/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <section className="@container glass overflow-hidden rounded-2xl">
            <div className="hidden grid-cols-[3rem_minmax(0,1.4fr)_5rem_4rem_4.5rem_3.5rem_4rem_5.5rem] gap-x-3 border-b border-white/[0.06] px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground @3xl:grid">
              <span>#</span>
              <span>Player</span>
              <span>Rank</span>
              <span className="text-right">K/D</span>
              <span className="text-right">Kills</span>
              <span className="text-right">HS</span>
              <span className="text-right">Wins</span>
              <span className="text-right">Last played</span>
            </div>

            {rows.length === 0 ? (
              <div className="query-state-in flex flex-col items-center gap-3 p-10 text-center">
                <SearchX className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No player matches this search.</p>
                <Button variant="outline" size="sm" onClick={() => setQuery("")}>Clear search</Button>
              </div>
            ) : (
              <div className="stagger-in flex flex-col">
                {rows.map((player) => (
                  <LeaderRow
                    key={player.user_id}
                    player={player}
                    isSelf={Boolean(user && user.id === player.user_id)}
                    onOpen={() => onProfileNavigate(player.steam_id || player.user_id)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function LeaderRow({ player, isSelf, onOpen }: { player: CompetitiveLeaderboardEntry; isSelf: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${player.username} profile`}
      className={cn(
        "group grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-white/[0.05] px-4 py-3 text-left transition-colors last:border-0",
        "hover:bg-white/[0.03] focus-visible:bg-white/[0.04] focus-visible:outline-none",
        "@3xl:grid-cols-[3rem_minmax(0,1.4fr)_5rem_4rem_4.5rem_3.5rem_4rem_5.5rem]",
        isSelf && "bg-primary/[0.07] hover:bg-primary/[0.1]",
      )}
    >
      <span className={cn("text-sm font-bold tabular-nums", player.position <= 10 ? "text-white/85" : "text-muted-foreground")}>
        {player.position}
      </span>

      <span className="flex min-w-0 items-center gap-2.5">
        <PlayerModerationAvatar avatar={player.avatar} name={player.username} className="size-9 shrink-0 rounded-md text-xs" />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-white/90">{player.username}</span>
            {isSelf && <span className="shrink-0 rounded border border-primary/40 bg-primary/15 px-1 py-px text-[9px] font-bold uppercase text-white/85">You</span>}
          </span>
          <span className="mt-0.5 block truncate text-[11px] tabular-nums text-muted-foreground">
            {player.current_exp.toLocaleString()} EXP
            <span className="@3xl:hidden"> · {player.kd_ratio.toFixed(2)} K/D · {player.kills.toLocaleString()} kills</span>
          </span>
        </span>
      </span>

      <span className="justify-self-end @3xl:justify-self-start">
        <CompetitiveRankBadge rankId={player.rank_id} rankName={player.rank_name} imageKey={player.rank_image_key} className="h-7 w-12" />
      </span>

      <span className="hidden text-right text-sm font-semibold tabular-nums text-white/95 @3xl:block">{player.kd_ratio.toFixed(2)}</span>
      <span className="hidden text-right text-sm tabular-nums text-white/75 @3xl:block">
        <span className="inline-flex items-center gap-1"><Skull className="size-3 text-white/35" />{player.kills.toLocaleString()}</span>
      </span>
      <span className="hidden text-right text-sm tabular-nums text-white/75 @3xl:block">
        <span className="inline-flex items-center gap-1"><Target className="size-3 text-white/35" />{headshotRate(player)}%</span>
      </span>
      <span className="hidden text-right text-sm tabular-nums text-white/75 @3xl:block">{player.wins.toLocaleString()}</span>
      <span className="hidden justify-end text-right text-xs text-muted-foreground @3xl:flex">
        {player.last_match_at
          ? <span className="inline-flex items-center gap-1"><Clock3 className="size-3 shrink-0" /><RelativeTime value={player.last_match_at} /></span>
          : "—"}
      </span>
    </button>
  )
}

function PodiumPlayer({ player, rank, onProfileNavigate }: { player?: CompetitiveLeaderboardEntry; rank: 1 | 2 | 3; onProfileNavigate: (userId: string) => void }) {
  if (!player) return <div aria-hidden="true" />

  const tone = rank === 1
    ? { label: "Gold", height: "min-h-40 @lg:min-h-52", surface: "border-amber-300/45 bg-gradient-to-b from-amber-300/18 to-amber-300/[0.02]", text: "text-amber-200", chip: "border-amber-200/45 bg-amber-300 text-[#201a0d]" }
    : rank === 2
      ? { label: "Silver", height: "min-h-32 @lg:min-h-44", surface: "border-slate-200/30 bg-gradient-to-b from-slate-200/[0.12] to-slate-200/[0.02]", text: "text-slate-200", chip: "border-slate-100/35 bg-slate-200 text-[#20242b]" }
      : { label: "Bronze", height: "min-h-28 @lg:min-h-36", surface: "border-orange-300/35 bg-gradient-to-b from-orange-300/[0.13] to-orange-300/[0.02]", text: "text-orange-200", chip: "border-orange-200/40 bg-orange-300 text-[#28170e]" }

  return (
    <button
      type="button"
      onClick={() => onProfileNavigate(player.steam_id || player.user_id)}
      className="group mx-auto flex w-full min-w-0 max-w-[17rem] flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      aria-label={`Open ${player.username} profile`}
    >
      <div className="relative z-10 -mb-3 flex flex-col items-center">
        <div className={cn("mb-1 flex size-7 items-center justify-center rounded-full border text-xs font-black shadow-lg shadow-black/25", tone.chip)}>{rank}</div>
        <CompetitiveRankBadge rankId={player.rank_id} rankName={player.rank_name} imageKey={player.rank_image_key} className="mb-1 h-8 w-14" />
        <PlayerModerationAvatar avatar={player.avatar} name={player.username} className="size-12 rounded-md border-2 border-card text-base @lg:size-16" />
      </div>
      <div className={cn("flex w-full min-w-0 flex-col items-center justify-end rounded-t-xl border px-2 pb-3 pt-5 transition-transform duration-300 group-hover:-translate-y-0.5", tone.height, tone.surface)}>
        <p className={cn("text-[10px] font-bold uppercase tracking-[0.16em]", tone.text)}>{tone.label}</p>
        <p className="mt-1 max-w-full truncate text-sm font-bold text-white/95 @lg:text-base">{player.username}</p>
        <p className="mt-0.5 max-w-full truncate text-[10px] tabular-nums text-white/45">{player.rank_name} · {player.current_exp.toLocaleString()} EXP</p>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-lg font-black tabular-nums text-white">{player.kd_ratio.toFixed(2)}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/50">K/D</span>
        </div>
        <p className="mt-1 truncate text-[10px] tabular-nums text-white/55">{player.kills.toLocaleString()} kills · {player.wins.toLocaleString()} wins</p>
      </div>
    </button>
  )
}
