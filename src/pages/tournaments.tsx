/**
 * Tournaments (docs/design/tournaments-none, tournaments-registration, tournaments-live-bracket). Three states that
 * all look intentional: nothing scheduled (the common case), registration/upcoming, and live with a bracket.
 * The selected tournament and tab live in the URL.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Bell, Calendar, ChevronRight, Play, Trophy, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"

import { tournamentsService, type ApiError, type TournamentDetail, type TournamentMatch, type TournamentPlayer, type TournamentsOverview, type TournamentSummary } from "@/api"
import { DISCORD_ANNOUNCEMENTS_URL, TOURNAMENT_RULES_URL } from "@/lib/config"
import { formatDate, formatDateTime, formatDuration, formatInt, formatTime } from "@/lib/format"
import { profilePath } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { Card, Page, PageHeader } from "@/components/page"
import { PlayerAvatar } from "@/components/player-avatar"
import { RankEmblem } from "@/components/rank"
import { EmptyState, ErrorState, Skeleton } from "@/components/states"
import { SteamLoginButton } from "@/components/steam-login-gate"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Segmented } from "@/components/ui/segmented"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { useUrlState } from "@/hooks/use-url-state"

type Tab = "overview" | "bracket" | "players" | "matches"
const TABS: readonly Tab[] = ["overview", "bracket", "players", "matches"]
const PHASE_LABEL: Record<TournamentSummary["phase"], string> = { registration: "Registration open", upcoming: "Upcoming", live: "Live", finished: "Finished" }

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

function StatusPill({ phase }: { phase: TournamentSummary["phase"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold",
        phase === "registration" ? "bg-accent/12 text-text" : phase === "live" ? "bg-live/12 text-live" : "border border-line bg-raised text-text-muted",
      )}
    >
      <span className={cn("size-1.5 rounded-full", phase === "registration" ? "bg-accent" : phase === "live" ? "bg-live" : "bg-text-dim")} aria-hidden />
      {PHASE_LABEL[phase]}
    </span>
  )
}

function Meta({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-[13px] text-text-muted">
      <Icon className="size-[15px]" aria-hidden />
      <span>{label}</span>
      <span className="font-medium text-text">{value}</span>
    </span>
  )
}

function countdown(tournament: TournamentSummary, now: number): { label: string; value: string } | null {
  const at = (value: string | null) => (value ? Date.parse(value) : Number.NaN)
  if (tournament.phase === "registration") {
    const closes = at(tournament.registrationClosesAt)
    return Number.isFinite(closes) ? { label: "Registration closes in", value: formatDuration(closes - now) } : null
  }
  if (tournament.phase === "upcoming") {
    const starts = at(tournament.startsAt)
    return Number.isFinite(starts) && starts > now ? { label: "Starts in", value: formatDuration(starts - now) } : null
  }
  return null
}

function Hero({ tournament, detail, now }: { tournament: TournamentSummary; detail: TournamentDetail | null; now: number }) {
  const clock = countdown(tournament, now)
  const liveMatch = detail?.matches.find((match) => match.status === "live")
  const fill = tournament.maxPlayers ? Math.min(1, tournament.registeredPlayers / tournament.maxPlayers) : null
  return (
    <section className="grid gap-6 rounded-xl border border-line-soft bg-card p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end animate-fade-in">
      <div className="flex min-w-0 flex-col gap-3.5">
        <span>
          <StatusPill phase={tournament.phase} />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="m-0 text-[22px] font-semibold tracking-[-0.3px] text-text">{tournament.name}</h2>
          {tournament.description && <p className="m-0 max-w-2xl text-[13px] text-text-muted">{tournament.description}</p>}
        </div>
        <div className="flex flex-wrap gap-5">
          <Meta icon={Calendar} label="Starts" value={tournament.startsAt ? formatDateTime(tournament.startsAt) : "TBA"} />
          <Meta icon={Users} label="Format" value={tournament.format || `${tournament.teamSize}v${tournament.teamSize}`} />
          {tournament.prizePool && <Meta icon={Trophy} label="Prize" value={tournament.prizePool} />}
        </div>
      </div>
      <div className="flex min-w-[260px] flex-col gap-3 lg:items-end">
        {clock ? (
          <>
            <span className="text-xs text-text-dim">{clock.label}</span>
            <span className="text-[26px] font-semibold tabular-nums text-text">{clock.value}</span>
          </>
        ) : tournament.phase === "live" && liveMatch ? (
          <>
            <span className="text-xs text-text-dim">Live now</span>
            <span className="text-[15px] font-semibold text-text">{liveMatch.round}</span>
          </>
        ) : tournament.phase === "finished" && tournament.winner ? (
          <span className="flex items-center gap-2 text-[15px] font-semibold text-text">
            <Trophy className="size-4" aria-hidden />
            {tournament.winner.name}
          </span>
        ) : null}
        <div className="flex w-full flex-col gap-1.5">
          <span className="h-1.5 overflow-hidden rounded-full bg-line-soft">
            <span className="block h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${(fill ?? 0) * 100}%` }} />
          </span>
          <span className="flex justify-between text-xs text-text-dim tabular-nums">
            <span>Players</span>
            <span>{formatInt(tournament.registeredPlayers)}{tournament.maxPlayers ? ` / ${formatInt(tournament.maxPlayers)}` : ""}</span>
          </span>
        </div>
      </div>
    </section>
  )
}

function Overview({ tournament, detail, now }: { tournament: TournamentSummary; detail: TournamentDetail; now: number }) {
  const finalMatch = [...detail.matches].sort((a, b) => b.order - a.order)[0]
  const steps = [
    { label: "Registration closes", at: tournament.registrationClosesAt },
    { label: "Check-in", at: tournament.checkInOpensAt },
    { label: "Round 1", at: tournament.startsAt },
    { label: "Final", at: finalMatch?.scheduledAt ?? null },
  ]
  const currentIndex = (() => {
    if (tournament.phase === "finished") return steps.length
    const upcoming = steps.findIndex((step) => !step.at || Date.parse(step.at) > now)
    return upcoming === -1 ? steps.length - 1 : upcoming
  })()
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="flex flex-col gap-3.5 p-[18px]">
        <h3 className="m-0 text-sm font-semibold text-text">How it works</h3>
        <p className="m-0 text-[13px] leading-[1.6] text-text-muted">
          Sign up solo and we balance teams by EXP when registration closes, or register a team of {tournament.teamSize} and invite your
          friends to join it. Check in before the start; the bracket is drawn from checked-in teams.
        </p>
        <a href={TOURNAMENT_RULES_URL} target="_blank" rel="noreferrer" className="text-[13px] text-text transition-colors duration-150 hover:underline">Full rules</a>
      </Card>
      <Card className="flex flex-col gap-3.5 p-[18px]">
        <h3 className="m-0 text-sm font-semibold text-text">Schedule</h3>
        <ol className="m-0 list-none p-0">
          {steps.map((step, index) => {
            const current = index === currentIndex
            return (
              <li key={step.label} className="flex gap-3">
                <span className="flex flex-col items-center">
                  <span className={cn("mt-1 size-2.5 rounded-full", current ? "bg-accent" : index < currentIndex ? "bg-text-muted" : "bg-line")} aria-hidden />
                  {index < steps.length - 1 && <span className="my-1 w-px flex-1 bg-line" aria-hidden />}
                </span>
                <span className="flex flex-col gap-1 pb-4">
                  <span className={cn("text-[13px]", current ? "font-semibold text-text" : "font-medium text-text-muted")}>{step.label}</span>
                  <span className="text-xs text-text-dim">{step.at ? formatDateTime(step.at) : "To be announced"}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </Card>
    </div>
  )
}

function MatchCard({ match, viewerTeamId }: { match: TournamentMatch; viewerTeamId: string | null }) {
  const onPath = Boolean(viewerTeamId && (match.teamA?.id === viewerTeamId || match.teamB?.id === viewerTeamId))
  const decided = match.status === "completed" && match.scoreA != null && match.scoreB != null
  const winnerA = decided && match.scoreA! > match.scoreB!
  const winnerB = decided && match.scoreB! > match.scoreA!
  const side = (team: TournamentMatch["teamA"], score: number | null, winner: boolean) => (
    <span className="flex h-9 items-center gap-2.5 px-3">
      <span className={cn("size-5 shrink-0 rounded-md", team ? "bg-line-strong" : "bg-line-soft")} aria-hidden />
      <span className={cn("min-w-0 flex-1 truncate text-[13px]", !team ? "text-text-faint" : decided && !winner ? "text-text-dim" : "font-medium text-text")} title={team?.name}>
        {team?.name ?? "TBD"}
      </span>
      <span className={cn("text-[13px] tabular-nums", decided && !winner ? "text-text-dim" : "font-semibold text-text")}>{score ?? "–"}</span>
    </span>
  )
  return (
    <div className={cn("relative w-full rounded-[10px] border bg-card", onPath ? "border-accent/55" : "border-line-soft")}>
      {match.status === "live" && (
        <span className="absolute -top-[9px] right-2.5 flex h-[18px] items-center gap-[5px] rounded-full border border-line bg-panel px-[7px] text-[10px] font-bold text-live">
          <span className="size-[5px] rounded-full bg-live" aria-hidden />
          LIVE
        </span>
      )}
      {side(match.teamA, match.scoreA, winnerA)}
      <span className="block h-px bg-line-soft" aria-hidden />
      {side(match.teamB, match.scoreB, winnerB)}
    </div>
  )
}

function Bracket({ detail, viewerTeamId }: { detail: TournamentDetail; viewerTeamId: string | null }) {
  const rounds = useMemo(() => {
    const byRound = new Map<string, TournamentMatch[]>()
    for (const match of [...detail.matches].sort((a, b) => a.order - b.order)) byRound.set(match.round, [...(byRound.get(match.round) ?? []), match])
    return [...byRound.entries()]
  }, [detail.matches])
  const winner = detail.tournament.winner

  return (
    <Card className="overflow-x-auto p-5">
      {rounds.length === 0 ? (
        <EmptyState>The bracket is drawn when registration closes.</EmptyState>
      ) : (
        <div className="grid min-h-[420px] min-w-[720px] gap-7" style={{ gridTemplateColumns: `repeat(${rounds.length + 1}, minmax(0, 1fr))` }}>
          {rounds.map(([round, matches]) => (
            <div key={round} className="flex min-w-0 flex-col">
              <span className="mb-3.5 text-xs font-semibold text-text-muted">{round}</span>
              <div className="flex flex-1 flex-col justify-around gap-3.5">
                {matches.map((match) => (
                  <MatchCard key={match.id} match={match} viewerTeamId={viewerTeamId} />
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-col">
            <span className="mb-3.5 text-xs font-semibold text-text-muted">Champion</span>
            <div className="flex flex-1 items-center">
              <div className="flex w-full flex-col items-center gap-2.5 rounded-xl border border-line-soft bg-card p-[18px] text-center">
                <Trophy className={cn("size-7", winner ? "text-text" : "text-text-faint")} aria-hidden />
                <span className={cn("text-[13px]", winner ? "font-semibold text-text" : "text-text-dim")}>{winner?.name ?? "Decided in the final"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function PlayerLine({ player }: { player: TournamentPlayer }) {
  const { user } = useAuth()
  return (
    <Link to={profilePath(player.steamId, user)} className="flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-raised">
      <PlayerAvatar avatar={player.avatar} name={player.name} size={28} />
      <span className="min-w-0 flex-1 truncate text-[13px] text-text" title={player.name}>{player.name}</span>
      <RankEmblem rankId={player.rankId} size={18} />
      {player.checkedIn && <span className="size-1.5 rounded-full bg-live" aria-label="Checked in" />}
    </Link>
  )
}

function Players({ detail, canJoin, onJoinTeam, busy }: { detail: TournamentDetail; canJoin: boolean; onJoinTeam: (teamId: string) => void; busy: boolean }) {
  if (detail.teams.length === 0 && detail.soloPlayers.length === 0) return <Card><EmptyState>No one has registered yet.</EmptyState></Card>
  const size = detail.tournament.teamSize
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {detail.teams.map((team) => (
        <Card key={team.id} className="flex flex-col gap-2 p-4">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-text" title={team.name}>{team.name}</span>
            <span className="flex items-center gap-2 text-xs text-text-dim tabular-nums">
              {team.players.length}/{size}
              {canJoin && !team.autoBalanced && team.players.length < size && (
                <Button size="xs" variant="outline" disabled={busy} onClick={() => onJoinTeam(team.id)}>
                  Join
                </Button>
              )}
            </span>
          </span>
          <div className="flex flex-col">
            {team.players.map((player) => <PlayerLine key={player.userId} player={player} />)}
          </div>
        </Card>
      ))}
      {detail.soloPlayers.length > 0 && (
        <Card className="flex flex-col gap-2 p-4">
          <span className="text-sm font-semibold text-text">Solo players <span className="font-normal text-text-dim">· balanced by EXP when registration closes</span></span>
          <div className="flex flex-col">
            {detail.soloPlayers.map((player) => <PlayerLine key={player.userId} player={player} />)}
          </div>
        </Card>
      )}
    </div>
  )
}

function Matches({ detail }: { detail: TournamentDetail }) {
  const matches = [...detail.matches].sort((a, b) => (Date.parse(a.scheduledAt ?? "") || 0) - (Date.parse(b.scheduledAt ?? "") || 0) || a.order - b.order)
  if (matches.length === 0) return <Card><EmptyState>No matches scheduled yet.</EmptyState></Card>
  return (
    <Card className="overflow-hidden">
      {matches.map((match) => (
        <div key={match.id} className="grid grid-cols-[80px_minmax(0,1fr)_auto] items-center gap-4 border-b border-raised px-[18px] py-3 last:border-0 sm:grid-cols-[120px_minmax(0,1fr)_160px_90px]">
          <span className="text-[13px] tabular-nums text-text-muted">{match.scheduledAt ? `${formatDate(match.scheduledAt, { day: "numeric", month: "short" })} ${formatTime(match.scheduledAt)}` : "TBA"}</span>
          <span className="min-w-0 truncate text-[13px] text-text">
            {match.teamA?.name ?? "TBD"} <span className="text-text-dim">vs</span> {match.teamB?.name ?? "TBD"}
          </span>
          <span className="hidden truncate text-[13px] text-text-muted sm:block">{match.serverName ?? "—"}</span>
          <span className={cn("text-right text-xs font-medium", match.status === "live" ? "text-live" : "text-text-muted")}>
            {match.status === "live" ? "Live" : match.status === "completed" ? `${match.scoreA ?? 0} : ${match.scoreB ?? 0}` : "Upcoming"}
          </span>
        </div>
      ))}
    </Card>
  )
}

function TeamDialog({ open, onOpenChange, onSubmit, busy }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (name: string) => void; busy: boolean }) {
  const [name, setName] = useState("")
  const valid = name.trim().length >= 2 && name.trim().length <= 32
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 sm:max-w-[420px]">
        <DialogTitle className="text-base font-semibold">Register a team</DialogTitle>
        <DialogDescription className="-mt-2 text-[13px] text-text-muted">You become the captain. Teammates join your team from the Players tab.</DialogDescription>
        <input
          autoFocus
          value={name}
          maxLength={32}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && valid && onSubmit(name.trim())}
          placeholder="Team name"
          aria-label="Team name"
          className="h-10 rounded-[10px] border border-line bg-card px-3 text-sm text-text outline-none placeholder:text-text-dim focus:border-line-strong"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="h-9" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="h-9" disabled={!valid || busy} onClick={() => onSubmit(name.trim())}>Register</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function YouPanel({ detail, now, onChanged }: { detail: TournamentDetail; now: number; onChanged: () => void }) {
  const { user, loginWithSteam } = useAuth()
  const [busy, setBusy] = useState(false)
  const [teamDialog, setTeamDialog] = useState(false)
  const { tournament, viewer } = detail
  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)
    try {
      await action()
      toast.success(success)
      onChanged()
    } catch (error) {
      toast.error((error as ApiError)?.message ?? "That didn't work. Try again.")
    } finally {
      setBusy(false)
    }
  }
  const team = viewer?.teamId ? detail.teams.find((entry) => entry.id === viewer.teamId) : null
  const checkInOpen = Boolean(tournament.checkInOpensAt && Date.parse(tournament.checkInOpensAt) <= now && (!tournament.startsAt || Date.parse(tournament.startsAt) > now))
  const nextMatch = team
    ? detail.matches.filter((match) => match.status !== "completed" && (match.teamA?.id === team.id || match.teamB?.id === team.id)).sort((a, b) => a.order - b.order)[0]
    : null
  const opponent = nextMatch ? (nextMatch.teamA?.id === team?.id ? nextMatch.teamB : nextMatch.teamA) : null

  let body: ReactNode
  if (!user) {
    body = <SteamLoginButton onClick={loginWithSteam} size="sm" className="h-10 w-full" label="Sign in with Steam to join" />
  } else if (tournament.phase === "finished") {
    body = <span className="text-[13px] text-text-muted">This tournament has finished{tournament.winner ? `. ${tournament.winner.name} won it.` : "."}</span>
  } else if (!viewer?.registered) {
    body =
      tournament.phase === "registration" ? (
        <>
          <span className="text-[13px] leading-[1.5] text-text-muted">Sign up solo and we balance teams by EXP, or register a full team of {tournament.teamSize}.</span>
          <Button className="h-10 text-sm" disabled={busy} onClick={() => void run(() => tournamentsService.registerSolo(tournament.id), "You're registered")}>
            <Play className="size-4" aria-hidden />
            Join solo
          </Button>
          <Button variant="outline" className="h-10 text-sm" disabled={busy} onClick={() => setTeamDialog(true)}>
            <UserPlus className="size-4" aria-hidden />
            Register a team
          </Button>
          <span className="text-xs text-text-dim">
            {tournament.checkInOpensAt ? `Check-in opens ${formatDateTime(tournament.checkInOpensAt)}.` : "Check-in opens 30 min before start."}
          </span>
        </>
      ) : (
        <span className="text-[13px] text-text-muted">Registration is closed.</span>
      )
  } else if (tournament.phase === "live" && nextMatch) {
    body = (
      <>
        <div className="flex flex-col gap-2.5 rounded-[10px] border border-accent/45 bg-panel p-3.5">
          <span className="text-xs font-semibold tracking-[0.4px] text-text">YOUR NEXT MATCH</span>
          <span className="flex items-center gap-2 text-[13px] text-text-muted">
            vs <span className="font-medium text-text">{opponent?.name ?? "TBD"}</span>
          </span>
          <span className="flex flex-wrap gap-3 text-xs text-text-dim">
            <span>{nextMatch.scheduledAt ? formatTime(nextMatch.scheduledAt) : "Time TBA"}</span>
            {nextMatch.serverName && <span>{nextMatch.serverName}</span>}
          </span>
        </div>
        <Button className="h-10 text-sm" disabled={!nextMatch.connectAddress} onClick={() => nextMatch.connectAddress && window.location.assign(`steam://connect/${nextMatch.connectAddress}`)}>
          <Play className="size-3.5" aria-hidden />
          Connect to server
        </Button>
      </>
    )
  } else {
    body = (
      <>
        <span className="text-[13px] text-text-muted">
          {viewer.mode === "solo" && !team ? "You're registered solo. Your team is announced when registration closes." : `You're on ${team?.name ?? "a team"}.`}
        </span>
        {checkInOpen && !viewer.checkedIn && (
          <Button className="h-10 text-sm" disabled={busy} onClick={() => void run(() => tournamentsService.checkIn(tournament.id), "Checked in")}>Check in</Button>
        )}
        {viewer.checkedIn && <span className="flex items-center gap-1.5 text-[13px] text-text-2"><span className="size-1.5 rounded-full bg-live" aria-hidden />Checked in</span>}
        {tournament.phase === "registration" && (
          <Button variant="outline" className="h-9" disabled={busy} onClick={() => void run(() => tournamentsService.leave(tournament.id), "You left the tournament")}>Leave tournament</Button>
        )}
      </>
    )
  }

  return (
    <aside aria-label="Your status" className="flex flex-col gap-3.5 rounded-xl border border-line-soft bg-card p-[18px] lg:sticky lg:top-6">
      <h2 className="m-0 text-sm font-semibold text-text">You</h2>
      {body}
      {team && team.players.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-line-soft pt-3">
          <span className="text-xs text-text-dim">Your team</span>
          <div className="flex gap-1.5">
            {team.players.map((player) => <PlayerAvatar key={player.userId} avatar={player.avatar} name={player.name} size={28} />)}
          </div>
        </div>
      )}
      <TeamDialog
        open={teamDialog}
        onOpenChange={setTeamDialog}
        busy={busy}
        onSubmit={(name) =>
          void run(async () => {
            await tournamentsService.registerTeam(tournament.id, name)
            setTeamDialog(false)
          }, "Team registered")
        }
      />
    </aside>
  )
}

function TournamentView({ summary, onBack }: { summary: TournamentSummary; onBack?: () => void }) {
  const { user } = useAuth()
  const now = useNow()
  const [tab, setTab] = useUrlState<Tab>("tab", "overview", TABS)
  const [busy, setBusy] = useState(false)
  const { data, loading, error, refetch } = useApiQuery<TournamentDetail>((signal) => tournamentsService.getTournament(summary.id, { signal }), {
    queryKey: `${summary.id}|${user?.id ?? ""}`,
    keepPreviousData: true,
    pollMs: summary.phase === "live" ? 15_000 : undefined,
  })
  const tournament = data?.tournament ?? summary
  const canJoin = Boolean(user && data && !data.viewer?.registered && tournament.phase === "registration")

  const joinTeam = async (teamId: string) => {
    setBusy(true)
    try {
      await tournamentsService.joinTeam(tournament.id, teamId)
      toast.success("You joined the team")
      refetch()
    } catch (caught) {
      toast.error((caught as ApiError)?.message ?? "Couldn't join that team.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {onBack && (
        <button type="button" onClick={onBack} className="w-fit text-[13px] text-text-muted transition-colors duration-150 hover:text-text">← All tournaments</button>
      )}
      <Hero tournament={tournament} detail={data} now={now} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Segmented
            ariaLabel="Tournament sections"
            value={tab}
            onChange={setTab}
            options={[
              { value: "overview", label: "Overview" },
              { value: "bracket", label: "Bracket" },
              { value: "players", label: "Players" },
              { value: "matches", label: "Matches" },
            ]}
          />
          {loading && !data ? (
            <Card className="flex flex-col gap-3 p-5" aria-busy="true">
              <Skeleton className="h-3 w-1/3 bg-line" />
              <Skeleton className="h-2.5 w-4/5" />
              <Skeleton className="h-2.5 w-3/5" />
            </Card>
          ) : error && !data ? (
            <Card><ErrorState onRetry={refetch} /></Card>
          ) : data ? (
            <div key={tab} className="animate-fade-in">
              {tab === "overview" && <Overview tournament={tournament} detail={data} now={now} />}
              {tab === "bracket" && <Bracket detail={data} viewerTeamId={data.viewer?.teamId ?? null} />}
              {tab === "players" && <Players detail={data} canJoin={canJoin} onJoinTeam={(teamId) => void joinTeam(teamId)} busy={busy} />}
              {tab === "matches" && <Matches detail={data} />}
            </div>
          ) : null}
        </div>
        {data ? <YouPanel detail={data} now={now} onChanged={refetch} /> : <Card className="h-40 animate-shimmer" />}
      </div>
    </>
  )
}

function PastList({ past, onOpen }: { past: TournamentSummary[]; onOpen: (id: string) => void }) {
  if (past.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 text-sm font-semibold text-text">Past tournaments</h2>
      <Card className="overflow-hidden">
        {past.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onOpen(entry.id)}
            className="grid h-[60px] w-full grid-cols-[minmax(0,1fr)_auto_20px] items-center gap-4 border-b border-raised px-[18px] text-left transition-colors duration-150 last:border-0 hover:bg-raised sm:grid-cols-[minmax(0,1fr)_200px_120px_20px]"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-[13px] font-medium text-text">{entry.name}</span>
              <span className="truncate text-xs text-text-dim">{entry.format}</span>
            </span>
            <span className="flex min-w-0 items-center gap-2 text-[13px] text-text-2">
              <Trophy className="size-3.5 shrink-0 text-text" aria-hidden />
              <span className="truncate">{entry.winner?.name ?? "—"}</span>
            </span>
            <span className="hidden text-[13px] text-text-muted tabular-nums sm:block">{entry.startsAt ? formatDate(entry.startsAt) : "—"}</span>
            <ChevronRight className="size-4 text-text-faint" aria-hidden />
          </button>
        ))}
      </Card>
    </section>
  )
}

export function TournamentsPage() {
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useUrlState("id", "")
  const { data, loading, error, refetch } = useApiQuery<TournamentsOverview>((signal) => tournamentsService.getOverview({ signal }))
  const selected = selectedId ? [data?.current, ...(data?.past ?? [])].find((entry) => entry?.id === selectedId) ?? null : null
  const shown = selected ?? data?.current ?? null

  return (
    <Page className="gap-5">
      <PageHeader title="Tournaments" subtitle="5v5 events on Legacy-X servers." />
      {loading && !data ? (
        <Card className="flex flex-col items-center gap-3 px-8 py-10" aria-busy="true">
          <Skeleton className="size-[52px] rounded-[14px]" />
          <Skeleton className="h-3.5 w-64 bg-line" />
          <Skeleton className="h-2.5 w-80" />
        </Card>
      ) : error && !data ? (
        <Card><ErrorState onRetry={refetch} /></Card>
      ) : shown ? (
        <TournamentView key={shown.id} summary={shown} onBack={selected && selected.id !== data?.current?.id ? () => navigate("/tournaments") : undefined} />
      ) : (
        <>
          <section className="flex flex-col items-center gap-3 rounded-xl border border-line-soft bg-card px-8 py-10 text-center animate-fade-in">
            <span className="flex size-[52px] items-center justify-center rounded-[14px] border border-line bg-raised text-text-muted">
              <Trophy className="size-6" aria-hidden />
            </span>
            <span className="text-base font-semibold text-text">No tournament scheduled right now</span>
            <span className="max-w-[420px] text-[13px] leading-[1.5] text-text-muted">
              New tournaments are announced on Discord first. Turn on notifications so you don't miss registration.
            </span>
            <Button asChild className="mt-1.5 h-[38px] px-4">
              <a href={DISCORD_ANNOUNCEMENTS_URL} target="_blank" rel="noreferrer">
                <Bell className="size-[15px]" aria-hidden />
                Get notified on Discord
              </a>
            </Button>
          </section>
          <PastList past={data?.past ?? []} onOpen={setSelectedId} />
        </>
      )}
    </Page>
  )
}
