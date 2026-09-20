/**
 * LEGACY-X match details: scoreboard (rosters + per-player stats), round timeline and team comparison for one
 * MatchZy map. Detail stats recorded before they were kept arrive as null and render as "—".
 */
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bomb, Clock3, Crosshair, Flag, Scissors, Skull, Trophy, Circle, Star, Zap, Target } from "lucide-react"

import { matchesService } from "@/api"
import type { MatchDetail, MatchDetailPlayer, MatchDetailRound, MatchDetailTeam, MatchRoundOutcome } from "@/api/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlayerAvatar } from "@/components/player-avatar"
import { RelativeTime } from "@/components/relative-time"
import { useApiQuery } from "@/hooks/use-api-query"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { cn } from "@/lib/utils"

const TEAM_TONE = {
  team1: { text: "text-sky-300", bar: "bg-sky-400" },
  team2: { text: "text-amber-300", bar: "bg-amber-400" },
} as const

const SIDE_TONE = { t: "text-amber-200 bg-amber-500/20 border-amber-300/40", ct: "text-sky-200 bg-sky-500/20 border-sky-300/40" } as const

const OUTCOME: Record<MatchRoundOutcome, { icon: typeof Skull; label: string }> = {
  elimination: { icon: Skull, label: "Elimination" },
  bomb_exploded: { icon: Bomb, label: "Bomb exploded" },
  bomb_defused: { icon: Scissors, label: "Bomb defused" },
  time_expired: { icon: Clock3, label: "Time ran out" },
  surrender: { icon: Flag, label: "Surrender" },
  other: { icon: Circle, label: "Round won" },
}

const dash = (value: number | null | undefined, suffix = "") => (value === null || value === undefined ? "—" : `${value}${suffix}`)

/** Regulation halves are 12 rounds (MR12); overtime halves are 3. */
function isHalfBreak(roundNumber: number) {
  return roundNumber === 12 || (roundNumber > 24 && (roundNumber - 24) % 3 === 0)
}

function Scoreboard({ team, highlightSteamId, onPlayer }: { team: MatchDetailTeam; highlightSteamId?: string; onPlayer: (steamId: string) => void }) {
  const tone = TEAM_TONE[team.key]
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", tone.bar)} />
          <span className={cn("truncate text-sm font-semibold", tone.text)}>{team.name}</span>
        </div>
        <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase", team.won ? "border-chart-2/40 bg-chart-2/15 text-chart-2" : "border-destructive/30 bg-destructive/10 text-destructive")}>
          {team.won ? "Win" : "Loss"} · {team.score}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="sticky left-0 z-[1] bg-background px-3 py-2 text-left font-medium">Player</th>
              {["K", "D", "A", "+/-", "HS%", "ADR", "KAST", "MVP", "Rating"].map((column) => (
                <th key={column} className="px-2 py-2 text-right font-medium">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="stagger-in">
            {team.players.map((player) => {
              const highlighted = Boolean(highlightSteamId) && player.steamId === highlightSteamId
              return (
                <tr
                  key={player.steamId || player.username}
                  className={cn("border-t border-white/[0.05] transition-colors hover:bg-white/[0.04]", highlighted && "bg-white/[0.06]")}
                >
                  {/* Sticky so the name stays visible while the stats scroll sideways on phones. */}
                  <td className="sticky left-0 z-[1] bg-background px-3 py-2">
                    <button
                      type="button"
                      disabled={!player.steamId}
                      onClick={() => onPlayer(player.steamId)}
                      className="group flex min-w-0 items-center gap-2.5 text-left disabled:cursor-default"
                    >
                      <PlayerAvatar avatar={player.avatar} name={player.username} className={cn("size-7 rounded-md text-[10px]", highlighted && "ring-2 ring-white/60")} />
                      <span className="truncate font-medium group-enabled:group-hover:underline">{player.username}</span>
                    </button>
                  </td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums">{player.kills}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/70">{player.deaths}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/70">{player.assists}</td>
                  <td className={cn("px-2 py-2 text-right tabular-nums", player.kdDiff > 0 ? "text-chart-2" : player.kdDiff < 0 ? "text-destructive" : "text-white/60")}>
                    {player.kdDiff > 0 ? `+${player.kdDiff}` : player.kdDiff}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/70">{player.headshotPercent}%</td>
                  <td className="px-2 py-2 text-right tabular-nums">{dash(player.adr)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/70">{dash(player.kastPercent, "%")}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white/70">{dash(player.mvps)}</td>
                  <td className={cn("px-2 py-2 text-right font-semibold tabular-nums", player.ratingDelta >= 0 ? "text-chart-2" : "text-destructive")}>
                    {player.ratingDelta > 0 ? `+${player.ratingDelta}` : player.ratingDelta}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RoundCell({ round, teamKey, teamName }: { round: MatchDetailRound; teamKey: "team1" | "team2"; teamName: string }) {
  const won = round.winnerTeam === teamKey
  const outcome = OUTCOME[round.outcome]
  const Icon = outcome.icon
  return (
    <div
      className={cn(
        "flex size-7 items-center justify-center rounded-md border",
        won ? (round.winnerSide ? SIDE_TONE[round.winnerSide] : "border-white/20 bg-white/10 text-white") : "border-white/[0.05] bg-white/[0.02]"
      )}
      title={won ? `Round ${round.number} · ${teamName}${round.winnerSide ? ` (${round.winnerSide.toUpperCase()})` : ""} · ${outcome.label} · ${round.score.team1}–${round.score.team2}` : undefined}
    >
      {won && <Icon className="size-3.5" />}
    </div>
  )
}

function RoundTimeline({ detail }: { detail: MatchDetail }) {
  if (detail.rounds.length === 0) {
    return <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-muted-foreground">The round timeline isn&apos;t available for this match.</p>
  }
  const sideWins = (key: "team1" | "team2", side: "t" | "ct") => detail.rounds.filter((round) => round.winnerTeam === key && round.winnerSide === side).length

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-fit gap-3">
          <div className="flex shrink-0 flex-col justify-end gap-1.5 pb-0.5 pt-5">
            {detail.teams.map((team) => (
              <div key={team.key} className={cn("flex h-7 max-w-28 items-center truncate text-xs font-semibold", TEAM_TONE[team.key].text)}>{team.name}</div>
            ))}
          </div>
          <div className="stagger-in flex gap-1">
            {detail.rounds.map((round) => (
              <div key={round.number} className={cn("flex flex-col items-center gap-1.5", isHalfBreak(round.number) && "mr-3")}>
                <span className="text-[10px] tabular-nums text-muted-foreground">{round.number}</span>
                {detail.teams.map((team) => <RoundCell key={team.key} round={round} teamKey={team.key} teamName={team.name} />)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {detail.teams.map((team) => (
          <div key={team.key} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
            <span className={cn("font-semibold", TEAM_TONE[team.key].text)}>{team.name}</span>
            <span className="flex gap-3 text-muted-foreground">
              <span><span className="font-semibold text-sky-200">{sideWins(team.key, "ct")}</span> CT</span>
              <span><span className="font-semibold text-amber-200">{sideWins(team.key, "t")}</span> T</span>
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        {(Object.keys(OUTCOME) as MatchRoundOutcome[]).filter((key) => detail.rounds.some((round) => round.outcome === key)).map((key) => {
          const Icon = OUTCOME[key].icon
          return <span key={key} className="inline-flex items-center gap-1.5"><Icon className="size-3" />{OUTCOME[key].label}</span>
        })}
      </div>
    </div>
  )
}

function sum(players: MatchDetailPlayer[], pick: (player: MatchDetailPlayer) => number | null) {
  const values = players.map(pick)
  return values.every((value) => value === null) ? null : values.reduce<number>((total, value) => total + (value ?? 0), 0)
}

function average(players: MatchDetailPlayer[], pick: (player: MatchDetailPlayer) => number | null) {
  const values = players.map(pick).filter((value): value is number => value !== null)
  return values.length ? Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10 : null
}

function ComparisonBar({ label, left, right, suffix = "" }: { label: string; left: number | null; right: number | null; suffix?: string }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    // Hidden tabs pause requestAnimationFrame; show the real split at once instead of leaving 50/50.
    if (document.visibilityState === "hidden") {
      setReady(true)
      return
    }
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  const total = (left ?? 0) + (right ?? 0)
  const leftShare = total > 0 ? ((left ?? 0) / total) * 100 : 50
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold tabular-nums text-sky-200">{dash(left, suffix)}</span>
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums text-amber-200">{dash(right, suffix)}</span>
      </div>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="match-compare-bar h-full rounded-l-full bg-sky-400" style={{ width: ready ? `${leftShare}%` : "50%" }} />
        <div className="match-compare-bar h-full flex-1 rounded-r-full bg-amber-400" />
      </div>
    </div>
  )
}

function TeamComparison({ detail, onPlayer }: { detail: MatchDetail; onPlayer: (steamId: string) => void }) {
  const [team1, team2] = detail.teams as [MatchDetailTeam, MatchDetailTeam]
  const everyone = detail.teams.flatMap((team) => team.players.map((player) => ({ player, team: team.key })))
  const best = (pick: (player: MatchDetailPlayer) => number | null) =>
    everyone.filter(({ player }) => pick(player) !== null).sort((a, b) => (pick(b.player) ?? 0) - (pick(a.player) ?? 0))[0]
  const leaders = [
    { label: "Most kills", icon: Crosshair, entry: best((player) => player.kills), value: (player: MatchDetailPlayer) => `${player.kills} kills` },
    { label: "Highest ADR", icon: Zap, entry: best((player) => player.adr), value: (player: MatchDetailPlayer) => `${dash(player.adr)} ADR` },
    { label: "Most MVPs", icon: Star, entry: best((player) => player.mvps), value: (player: MatchDetailPlayer) => `${dash(player.mvps)} MVP` },
    { label: "Best HS%", icon: Target, entry: best((player) => (player.kills >= 5 ? player.headshotPercent : null)), value: (player: MatchDetailPlayer) => `${player.headshotPercent}% HS` },
  ].filter((leader) => leader.entry)

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="stagger-in flex flex-col gap-3.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-sky-300">{team1.name}</span>
          <span className="text-amber-300">{team2.name}</span>
        </div>
        <ComparisonBar label="Kills" left={sum(team1.players, (p) => p.kills)} right={sum(team2.players, (p) => p.kills)} />
        <ComparisonBar label="Assists" left={sum(team1.players, (p) => p.assists)} right={sum(team2.players, (p) => p.assists)} />
        <ComparisonBar label="Avg ADR" left={average(team1.players, (p) => p.adr)} right={average(team2.players, (p) => p.adr)} />
        <ComparisonBar label="Avg HS%" left={average(team1.players, (p) => p.headshotPercent)} right={average(team2.players, (p) => p.headshotPercent)} suffix="%" />
        <ComparisonBar label="Opening kills" left={sum(team1.players, (p) => p.firstKills)} right={sum(team2.players, (p) => p.firstKills)} />
        <ComparisonBar label="Clutches won" left={sum(team1.players, (p) => p.clutchesWon)} right={sum(team2.players, (p) => p.clutchesWon)} />
        <ComparisonBar label="3K+ rounds" left={sum(team1.players, (p) => (p.multiKills ? p.multiKills.k3 + p.multiKills.k4 + p.multiKills.k5 : null))} right={sum(team2.players, (p) => (p.multiKills ? p.multiKills.k3 + p.multiKills.k4 + p.multiKills.k5 : null))} />
        <ComparisonBar label="Utility damage" left={sum(team1.players, (p) => p.utilityDamage)} right={sum(team2.players, (p) => p.utilityDamage)} />
      </div>
      <div className="stagger-in flex flex-col gap-2">
        {leaders.map(({ label, icon: Icon, entry, value }) => (
          <button
            key={label}
            type="button"
            disabled={!entry!.player.steamId}
            onClick={() => onPlayer(entry!.player.steamId)}
            className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5 text-left transition-colors enabled:hover:bg-white/[0.06]"
          >
            <PlayerAvatar avatar={entry!.player.avatar} name={entry!.player.username} className="size-9 rounded-lg text-xs" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><Icon className="size-3" />{label}</div>
              <div className={cn("truncate text-sm font-semibold", TEAM_TONE[entry!.team].text)}>{entry!.player.username}</div>
            </div>
            <span className="shrink-0 text-xs font-semibold tabular-nums">{value(entry!.player)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function MatchDetailsDialog({ matchId, mapNumber, highlightSteamId, onOpenChange }: {
  matchId: string | null
  mapNumber: number
  /** The profile owner, highlighted on the scoreboard. */
  highlightSteamId?: string
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const open = matchId !== null
  const { data: detail, loading, error } = useApiQuery<MatchDetail>(
    (signal) => matchesService.getMatchDetail(matchId!, mapNumber, { signal }),
    { enabled: open, queryKey: `match-detail:${matchId}:${mapNumber}` },
  )
  const art = detail ? cs2MapArtwork(detail.mapName) : null
  const [team1, team2] = (detail?.teams ?? []) as MatchDetailTeam[]

  const openPlayer = (steamId: string) => {
    if (!steamId) return
    onOpenChange(false)
    navigate(`/profile/${encodeURIComponent(steamId)}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-5xl gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          {/* Header: map art, team names and the final score */}
          <div className="relative isolate overflow-hidden px-5 pb-5 pt-6">
            {art && <img src={art} alt="" aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40" />}
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-background/70 to-background" />
            <DialogHeader className="items-center text-center sm:text-center">
              <DialogTitle className="font-display text-xl tracking-wide">{detail ? cs2MapLabel(detail.mapName) : "Match details"}</DialogTitle>
              <DialogDescription className="flex items-center justify-center gap-1.5 text-xs">
                <span>Match #{matchId} · Map {mapNumber}</span>
                {detail?.playedAt && <><span>·</span><RelativeTime value={detail.playedAt} /></>}
              </DialogDescription>
            </DialogHeader>
            {team1 && team2 && (
              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="min-w-0 text-right">
                  <div className={cn("truncate text-sm font-semibold", TEAM_TONE.team1.text)}>{team1.name}</div>
                  {team1.won && <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase text-chart-2"><Trophy className="size-3" />Winner</div>}
                </div>
                <div className="match-score-pop flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-2 backdrop-blur">
                  <span className={cn("text-3xl font-black tabular-nums", team1.won ? "text-white" : "text-white/50")}>{team1.score}</span>
                  <span className="text-sm font-bold text-white/30">:</span>
                  <span className={cn("text-3xl font-black tabular-nums", team2.won ? "text-white" : "text-white/50")}>{team2.score}</span>
                </div>
                <div className="min-w-0 text-left">
                  <div className={cn("truncate text-sm font-semibold", TEAM_TONE.team2.text)}>{team2.name}</div>
                  {team2.won && <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase text-chart-2"><Trophy className="size-3" />Winner</div>}
                </div>
              </div>
            )}
          </div>

          <div className="px-5 pb-5">
            {loading && !detail ? (
              <div className="flex flex-col gap-3">
                {[0, 1].map((i) => <div key={i} className="h-56 animate-pulse rounded-xl bg-white/[0.04]" />)}
              </div>
            ) : error || !detail ? (
              <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-muted-foreground">
                {error?.code === "not_found" ? "This match could not be found." : "Match details are unavailable right now."}
              </p>
            ) : (
              <Tabs defaultValue="scoreboard">
                <TabsList className="mb-4">
                  <TabsTrigger value="scoreboard">Scoreboard</TabsTrigger>
                  <TabsTrigger value="rounds">Rounds{detail.rounds.length ? ` (${detail.rounds.length})` : ""}</TabsTrigger>
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                </TabsList>
                <TabsContent value="scoreboard" className="flex flex-col gap-4">
                  {detail.teams.map((team) => <Scoreboard key={team.key} team={team} highlightSteamId={highlightSteamId} onPlayer={openPlayer} />)}
                </TabsContent>
                <TabsContent value="rounds"><RoundTimeline detail={detail} /></TabsContent>
                <TabsContent value="stats"><TeamComparison detail={detail} onPlayer={openPlayer} /></TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

