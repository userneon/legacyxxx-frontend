import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Calendar, ChevronRight, LoaderCircle, Play, RotateCcw, Trophy, UserPlus, Users, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { tournamentsService, type PastTournament, type TournamentDetail, type TournamentMatch, type TournamentPhase, type TournamentPlayer, type TournamentSummary } from "@/api/tournaments"
import type { ApiError } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { LINKS } from "@/lib/links"
import { formatDate, formatDateTime, useWebsitePreferences } from "@/lib/preferences"
import { PlayerAvatar } from "@/components/player-avatar"
import { Segmented } from "@/components/segmented"
import { SteamLoginButton } from "@/components/steam-login-gate"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

type Tab = "overview" | "bracket" | "players" | "matches"
const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "bracket", label: "Bracket" },
  { value: "players", label: "Players" },
  { value: "matches", label: "Matches" },
]
const readTab = (value: string | null): Tab => (TABS.some((tab) => tab.value === value) ? (value as Tab) : "overview")

const primaryButton = "flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent-solid)] text-sm font-semibold text-[var(--accent-on)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 disabled:pointer-events-none disabled:opacity-50"
const secondaryButton = "flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--line)] text-sm font-medium text-[var(--text)] transition-[background-color,border-color,transform] duration-150 hover:border-[var(--line-strong)] hover:bg-[var(--raised)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 disabled:pointer-events-none disabled:opacity-50"
const card = "rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)]"

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

function countdown(target: string | null, now: number) {
  const ms = target ? Date.parse(target) - now : Number.NaN
  if (!Number.isFinite(ms) || ms <= 0) return null
  const seconds = Math.floor(ms / 1000)
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const pad = (n: number) => String(n).padStart(2, "0")
  return days > 0 ? `${days}d ${pad(hours)}h ${pad(minutes)}m` : `${pad(hours)}:${pad(minutes)}:${pad(seconds % 60)}`
}

function errorMessage(caught: unknown, fallback: string) {
  const message = (caught as Partial<ApiError>)?.message
  return typeof message === "string" && message && !/unexpected/i.test(message) ? message : fallback
}

function PhasePill({ phase }: { phase: TournamentPhase }) {
  const meta = {
    registration: { label: "Registration open", className: "bg-[var(--accent-solid)]/12 text-[var(--text)]", dot: "bg-[var(--accent-solid)]" },
    live: { label: "Live", className: "bg-[var(--status-green)]/12 text-[var(--status-green)]", dot: "bg-[var(--status-green)]" },
    upcoming: { label: "Upcoming", className: "bg-[var(--raised)] text-[var(--text-muted)]", dot: "bg-[var(--text-dim)]" },
    finished: { label: "Finished", className: "bg-[var(--raised)] text-[var(--text-muted)]", dot: "bg-[var(--text-dim)]" },
  }[phase]
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold", meta.className)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  )
}

function PageHeader({ loading }: { loading?: boolean }) {
  return (
    <div className="flex items-end justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-[22px] font-semibold leading-[1.2] tracking-[-0.3px] text-[var(--text)]">
          Tournaments
          {loading && <LoaderCircle aria-label="Updating" className="size-4 animate-spin text-[var(--text-dim)]" />}
        </h1>
        <span className="text-[13px] leading-[1.2] text-[var(--text-muted)]">5v5 events on Legacy-X servers.</span>
      </div>
    </div>
  )
}

function PastTournaments({ past, onOpen }: { past: PastTournament[]; onOpen: (id: string) => void }) {
  if (past.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-[var(--text)]">Past tournaments</h2>
      <div className={cn(card, "overflow-hidden")}>
        {past.map((tournament) => (
          <button
            key={tournament.id}
            type="button"
            onClick={() => onOpen(tournament.id)}
            className="grid h-[60px] w-full grid-cols-[minmax(0,1fr)_200px_120px_20px] items-center gap-4 border-b border-[var(--raised)] px-[18px] text-left transition-colors duration-150 last:border-b-0 hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/60 max-sm:grid-cols-[minmax(0,1fr)_20px]"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-[13px] font-medium text-[var(--text)]">{tournament.name}</span>
              <span className="text-xs text-[var(--text-dim)]">{tournament.startsAt ? formatDate(tournament.startsAt) : "—"}</span>
            </span>
            <span className="flex min-w-0 items-center gap-2 max-sm:hidden">
              <Trophy className="size-3.5 shrink-0 text-[var(--text)]" />
              <span className="truncate text-[13px] text-[var(--text-2)]">{tournament.winner ?? "—"}</span>
            </span>
            <span className="text-xs text-[var(--text-dim)] max-sm:hidden">Winner</span>
            <ChevronRight className="size-4 text-[var(--text-faint)]" />
          </button>
        ))}
      </div>
    </section>
  )
}

function NoTournament({ past, onOpen }: { past: PastTournament[]; onOpen: (id: string) => void }) {
  return (
    <>
      <section className={cn(card, "flex flex-col items-center gap-3 px-8 py-10 text-center")}>
        <span className="flex size-[52px] items-center justify-center rounded-[14px] border border-[var(--line)] bg-[var(--raised)] text-[var(--text-muted)]">
          <Trophy className="size-[22px]" />
        </span>
        <span className="text-base font-semibold text-[var(--text)]">No tournament scheduled right now</span>
        <span className="max-w-[420px] text-[13px] leading-[1.5] text-[var(--text-muted)]">
          New tournaments are announced on Discord first. Turn on notifications so you don't miss registration.
        </span>
        {LINKS.discordAnnouncements && (
          <a href={LINKS.discordAnnouncements} target="_blank" rel="noreferrer" className={cn(primaryButton, "mt-1.5 h-[38px] px-4 text-[13px]")}>
            <DiscordMark className="size-4" />
            Get notified on Discord
          </a>
        )}
      </section>
      <PastTournaments past={past} onOpen={onOpen} />
    </>
  )
}

function DiscordMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.61 1.25a18.3 18.3 0 0 0-5.49 0 12.6 12.6 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.1 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1 0-.12l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08 0l.37.3a.08.08 0 0 1 0 .12c-.6.35-1.22.64-1.87.89a.08.08 0 0 0-.04.1c.36.7.78 1.36 1.23 1.99a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.68-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42Z" />
    </svg>
  )
}

function Hero({ tournament, now }: { tournament: TournamentSummary; now: number }) {
  useWebsitePreferences()
  const target = tournament.phase === "registration" ? tournament.registrationClosesAt ?? tournament.startsAt
    : tournament.phase === "upcoming" ? tournament.startsAt
    : tournament.phase === "live" ? tournament.nextMatchTime
    : null
  const label = tournament.phase === "registration" ? "Registration closes in" : tournament.phase === "upcoming" ? "Starts in" : "Round ends in"
  const left = countdown(target, now)
  const slots = tournament.maxPlayers
  const share = slots ? Math.min(100, (tournament.registeredPlayers / slots) * 100) : 0
  const meta = [
    { icon: Calendar, label: "Starts", value: tournament.startsAt ? formatDateTime(tournament.startsAt) : "TBA" },
    { icon: Users, label: "Format", value: tournament.format ?? `${tournament.teamSize}v${tournament.teamSize}` },
    { icon: Trophy, label: "Prize", value: tournament.prizePool ?? "—" },
  ]
  return (
    <section className={cn(card, "grid items-end gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_auto]")}>
      <div className="flex min-w-0 flex-col gap-3.5">
        <span><PhasePill phase={tournament.phase} /></span>
        <div className="flex flex-col gap-2">
          <h2 className="truncate text-2xl font-semibold tracking-[-0.3px] text-[var(--text)]">{tournament.name}</h2>
          {tournament.description && <p className="max-w-[640px] text-[13px] leading-[1.5] text-[var(--text-muted)]">{tournament.description}</p>}
        </div>
        <div className="flex flex-wrap gap-5">
          {meta.map((item) => (
            <span key={item.label} className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
              <item.icon className="size-4" />
              <span>{item.label}</span>
              <span className="font-medium text-[var(--text)]">{item.value}</span>
            </span>
          ))}
        </div>
      </div>
      {tournament.phase !== "finished" && (
        <div className="flex min-w-[260px] flex-col gap-3 lg:items-end">
          {left && <span className="text-xs text-[var(--text-dim)]">{label}</span>}
          {left && <span className="text-[26px] font-semibold leading-none tabular-nums text-[var(--text)]">{left}</span>}
          <div className="flex w-full flex-col gap-1.5">
            {slots ? (
              <span className="h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)]">
                <span className="block h-full rounded-full bg-[var(--accent-solid)] transition-[width] duration-300" style={{ width: `${share}%` }} />
              </span>
            ) : null}
            <span className="flex justify-between text-xs text-[var(--text-dim)]">
              <span>Players</span>
              <span className="tabular-nums text-[var(--text-2)]">{tournament.registeredPlayers}{slots ? ` / ${slots}` : ""}</span>
            </span>
          </div>
        </div>
      )}
    </section>
  )
}

function Overview({ tournament, now }: { tournament: TournamentDetail; now: number }) {
  const final = tournament.bracket.at(-1)?.matches[0]
  const firstRound = tournament.bracket[0]?.matches[0]
  const steps = [
    { label: "Registration closes", at: tournament.registrationClosesAt },
    { label: "Check-in", at: tournament.checkInOpensAt },
    { label: tournament.bracket[0]?.round ? `${tournament.bracket[0].round}` : "Round 1", at: firstRound?.scheduledTime ?? tournament.startsAt },
    { label: "Final", at: final?.scheduledTime ?? null },
  ]
  // The current step is the first one still ahead of us.
  const current = tournament.phase === "finished" ? -1 : steps.findIndex((step) => !step.at || Date.parse(step.at) > now)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className={cn(card, "flex flex-col gap-3.5 p-[18px]")}>
        <h2 className="text-sm font-semibold text-[var(--text)]">How it works</h2>
        <ul className="flex flex-col gap-2 text-[13px] leading-[1.5] text-[var(--text-muted)]">
          <li>Join solo and we balance teams by EXP when registration closes, or register a team of {tournament.teamSize}.</li>
          <li>Check in before the start — players who don't check in lose their spot.</li>
          <li>Matches are played on Legacy-X servers; connect from this page when your match is called.</li>
          <li>Single elimination{tournament.format ? ` · ${tournament.format}` : ""}.</li>
        </ul>
        {LINKS.tournamentRules && (
          <a href={LINKS.tournamentRules} target="_blank" rel="noreferrer" className="self-start text-[13px] text-[var(--text)] underline-offset-4 hover:underline">Full rules</a>
        )}
      </section>
      <section className={cn(card, "flex flex-col gap-3.5 p-[18px]")}>
        <h2 className="text-sm font-semibold text-[var(--text)]">Schedule</h2>
        <ol>
          {steps.map((step, index) => {
            const active = index === current
            return (
              <li key={step.label} className="flex gap-3">
                <span className="flex flex-col items-center">
                  <span className={cn("mt-1 size-2.5 rounded-full", active ? "bg-[var(--accent-solid)]" : "bg-[var(--line)]")} />
                  {index < steps.length - 1 && <span className="my-1 w-px flex-1 bg-[var(--line)]" />}
                </span>
                <span className="flex flex-col gap-1 pb-4">
                  <span className={cn("text-[13px]", active ? "font-semibold text-[var(--text)]" : "font-medium text-[var(--text-muted)]")}>{step.label}</span>
                  <span className="text-xs text-[var(--text-dim)]">{step.at ? formatDateTime(step.at) : "TBA"}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}

function TeamRow({ name, score, winner, loser, mine }: { name: string | null; score: number | null; winner: boolean; loser: boolean; mine: boolean }) {
  return (
    <span className="flex h-9 items-center gap-2.5 px-3">
      <span className={cn("size-5 shrink-0 rounded-md", winner || mine ? "bg-[var(--line-strong)]" : "bg-[var(--line-soft)]")} />
      <span className={cn("min-w-0 flex-1 truncate text-[13px]", !name ? "text-[var(--text-faint)]" : winner ? "font-semibold text-[var(--text)]" : loser ? "text-[var(--text-dim)]" : "text-[var(--text-2)]")}>{name ?? "TBD"}</span>
      <span className={cn("shrink-0 text-[13px] tabular-nums", winner ? "font-semibold text-[var(--text)]" : "text-[var(--text-dim)]")}>{score ?? "–"}</span>
    </span>
  )
}

function MatchCard({ match, myTeamId }: { match: TournamentMatch; myTeamId: string | null }) {
  const mine = Boolean(myTeamId && (match.teamA?.id === myTeamId || match.teamB?.id === myTeamId))
  const aWon = match.winnerTeamId !== null && match.winnerTeamId === match.teamA?.id
  const bWon = match.winnerTeamId !== null && match.winnerTeamId === match.teamB?.id
  return (
    <div className={cn("relative w-full rounded-[10px] border bg-[var(--card-surface)]", mine ? "border-[var(--accent-solid)]/55" : "border-[var(--line-soft)]")}>
      {match.status === "live" && (
        <span className="absolute -top-[9px] right-2.5 flex h-[18px] items-center gap-[5px] rounded-full border border-[var(--line)] bg-[var(--panel)] px-[7px] text-[10px] font-bold text-[var(--status-green)]">
          <span className="size-[5px] rounded-full bg-[var(--status-green)]" />
          LIVE
        </span>
      )}
      <TeamRow name={match.teamA?.name ?? null} score={match.scoreA} winner={aWon} loser={bWon} mine={mine && match.teamA?.id === myTeamId} />
      <span className="block h-px bg-[var(--line-soft)]" />
      <TeamRow name={match.teamB?.name ?? null} score={match.scoreB} winner={bWon} loser={aWon} mine={mine && match.teamB?.id === myTeamId} />
    </div>
  )
}

function Bracket({ tournament }: { tournament: TournamentDetail }) {
  const myTeamId = tournament.me?.teamId ?? null
  if (tournament.bracket.length === 0) {
    return <section className={cn(card, "py-12 text-center text-[13px] text-[var(--text-dim)]")}>The bracket is drawn when registration closes.</section>
  }
  const columns = tournament.bracket.length + 1
  return (
    <section className={cn(card, "overflow-x-auto p-5")}>
      <div className="grid min-h-[420px] gap-7" style={{ gridTemplateColumns: `repeat(${columns}, minmax(200px, 1fr))` }}>
        {tournament.bracket.map((round) => (
          <div key={round.round} className="flex min-w-0 flex-col">
            <span className="mb-3.5 text-xs font-semibold text-[var(--text-muted)]">{round.round}</span>
            <div className="flex flex-1 flex-col justify-around gap-3.5">
              {round.matches.map((match) => <MatchCard key={match.id} match={match} myTeamId={myTeamId} />)}
            </div>
          </div>
        ))}
        <div className="flex flex-col">
          <span className="mb-3.5 text-xs font-semibold text-[var(--text-muted)]">Champion</span>
          <div className="flex flex-1 items-center">
            <div className={cn(card, "flex w-full flex-col items-center gap-2.5 p-[18px] text-center")}>
              <Trophy className={cn("size-5", tournament.winner ? "text-[var(--text)]" : "text-[var(--text-faint)]")} />
              <span className={cn("text-[13px]", tournament.winner ? "font-semibold text-[var(--text)]" : "text-[var(--text-dim)]")}>{tournament.winner?.name ?? "Decided in the final"}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PlayerLine({ player, captain, onOpen }: { player: TournamentPlayer; captain?: boolean; onOpen: (steamId: string) => void }) {
  return (
    <button
      type="button"
      disabled={!player.steamId}
      onClick={() => player.steamId && onOpen(player.steamId)}
      className="flex h-11 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors duration-150 hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 disabled:cursor-default"
    >
      <PlayerAvatar avatar={player.avatar} name={player.name} className="size-7 shrink-0 rounded-lg text-[10px]" />
      <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text)]" title={player.name}>{player.name}</span>
      {captain && <span className="text-[11px] text-[var(--text-dim)]">Captain</span>}
      {player.checkedIn && <span className="text-[11px] text-[var(--status-green)]">Checked in</span>}
    </button>
  )
}

function Players({ tournament, onProfileNavigate, onJoinTeam, busy }: { tournament: TournamentDetail; onProfileNavigate: (steamId: string) => void; onJoinTeam: (teamId: string) => void; busy: boolean }) {
  const canJoin = tournament.phase === "registration" && tournament.me !== null && !tournament.me.registered
  if (tournament.teams.length === 0 && tournament.soloPlayers.length === 0) {
    return <section className={cn(card, "py-12 text-center text-[13px] text-[var(--text-dim)]")}>No one has registered yet.</section>
  }
  return (
    <div className="flex flex-col gap-4">
      {tournament.teams.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {tournament.teams.map((team) => {
            const full = team.players.length >= tournament.teamSize
            const mine = tournament.me?.teamId === team.id
            return (
              <section key={team.id} className={cn(card, "flex flex-col gap-2 p-3", mine && "border-[var(--accent-solid)]/45")}>
                <div className="flex items-center justify-between gap-3 px-2 pt-1">
                  <span className="min-w-0 truncate text-sm font-semibold text-[var(--text)]">{team.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-[var(--text-dim)]">{team.players.length} / {tournament.teamSize}</span>
                </div>
                <div className="flex flex-col">
                  {team.players.map((player) => <PlayerLine key={player.userId} player={player} captain={player.userId === team.captainUserId} onOpen={onProfileNavigate} />)}
                </div>
                {canJoin && !team.autoBalanced && !full && (
                  <button type="button" disabled={busy} onClick={() => onJoinTeam(team.id)} className={cn(secondaryButton, "h-9 text-[13px]")}>
                    <UserPlus className="size-4" />
                    Join team
                  </button>
                )}
              </section>
            )
          })}
        </div>
      )}
      {tournament.soloPlayers.length > 0 && (
        <section className={cn(card, "flex flex-col gap-2 p-3")}>
          <div className="flex items-center justify-between px-2 pt-1">
            <span className="text-sm font-semibold text-[var(--text)]">Solo players</span>
            <span className="text-xs text-[var(--text-dim)]">{tournament.phase === "registration" ? "Balanced into teams by EXP when registration closes" : "Waiting for a team"}</span>
          </div>
          <div className="grid md:grid-cols-2">
            {tournament.soloPlayers.map((player) => <PlayerLine key={player.userId} player={player} onOpen={onProfileNavigate} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function Matches({ tournament }: { tournament: TournamentDetail }) {
  useWebsitePreferences()
  if (tournament.matches.length === 0) {
    return <section className={cn(card, "py-12 text-center text-[13px] text-[var(--text-dim)]")}>No matches scheduled yet.</section>
  }
  const sorted = [...tournament.matches].sort((a, b) => (Date.parse(a.scheduledTime ?? "") || Infinity) - (Date.parse(b.scheduledTime ?? "") || Infinity) || a.bracketOrder - b.bracketOrder)
  return (
    <section className={cn(card, "overflow-hidden")}>
      {sorted.map((match) => (
        <div key={match.id} className="grid min-h-[56px] grid-cols-[130px_minmax(0,1fr)_160px_80px] items-center gap-4 border-b border-[var(--raised)] px-[18px] py-2 last:border-b-0 max-md:grid-cols-[minmax(0,1fr)_80px]">
          <span className="flex flex-col gap-0.5 max-md:hidden">
            <span className="text-[13px] tabular-nums text-[var(--text-2)]">{match.scheduledTime ? formatDateTime(match.scheduledTime) : "TBA"}</span>
            <span className="text-[11px] text-[var(--text-dim)]">{match.round}</span>
          </span>
          <span className="flex min-w-0 items-center gap-2 text-[13px]">
            <span className={cn("truncate", match.winnerTeamId && match.winnerTeamId === match.teamA?.id ? "font-semibold text-[var(--text)]" : "text-[var(--text-2)]")}>{match.teamA?.name ?? "TBD"}</span>
            <span className="shrink-0 tabular-nums text-[var(--text-dim)]">{match.scoreA ?? "–"} : {match.scoreB ?? "–"}</span>
            <span className={cn("truncate", match.winnerTeamId && match.winnerTeamId === match.teamB?.id ? "font-semibold text-[var(--text)]" : "text-[var(--text-2)]")}>{match.teamB?.name ?? "TBD"}</span>
          </span>
          <span className="truncate text-xs text-[var(--text-dim)] max-md:hidden">{match.server?.name ?? "Server TBA"}{match.map ? ` · ${match.map}` : ""}</span>
          <span className={cn("justify-self-end text-xs font-medium", match.status === "live" ? "text-[var(--status-green)]" : "text-[var(--text-muted)]")}>
            {match.status === "live" ? "Live" : match.status === "completed" ? "Finished" : "Upcoming"}
          </span>
        </div>
      ))}
    </section>
  )
}

function TeamNameDialog({ open, onClose, onSubmit, busy, error }: { open: boolean; onClose: () => void; onSubmit: (name: string) => void; busy: boolean; error: string }) {
  const [name, setName] = useState("")
  useEffect(() => {
    if (open) return
    const timer = window.setTimeout(() => setName(""), 200)
    return () => window.clearTimeout(timer)
  }, [open])
  const valid = name.trim().length >= 2
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="lx-blur-overlay bg-black/55 backdrop-blur-[10px]"
        className="w-[440px] max-w-[calc(100%-2rem)] gap-0 rounded-2xl border-[var(--line)] bg-[var(--panel)] p-0 lx-blur-panel sm:max-w-[440px]"
      >
        <div className="flex h-14 items-center justify-between border-b border-[var(--line-soft)] pl-5 pr-3">
          <DialogTitle className="text-base font-semibold text-[var(--text)]">Register a team</DialogTitle>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]">
            <X className="size-4" />
          </button>
        </div>
        <DialogDescription className="sr-only">Choose a team name. Your teammates join it from the Players tab.</DialogDescription>
        <form className="flex flex-col gap-3 p-5" onSubmit={(event) => { event.preventDefault(); if (valid && !busy) onSubmit(name.trim()) }}>
          <label className="flex flex-col gap-2">
            <span className="text-xs text-[var(--text-muted)]">Team name</span>
            <input
              autoFocus
              value={name}
              maxLength={32}
              onChange={(event) => setName(event.target.value)}
              className="h-10 rounded-[10px] border border-[var(--line)] bg-[var(--card-surface)] px-3 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-dim)] focus:border-[var(--line-strong)]"
              placeholder="2–32 characters"
            />
          </label>
          <span className="text-xs text-[var(--text-dim)]">You become the captain. Teammates join from the Players tab.</span>
          {error && <p role="alert" className="text-xs text-[var(--text-2)]">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className={cn(secondaryButton, "h-9 px-4 text-[13px]")}>Cancel</button>
            <button type="submit" disabled={!valid || busy} className={cn(primaryButton, "h-9 px-[18px] text-[13px]")}>
              {busy && <LoaderCircle className="size-3.5 animate-spin" />}
              Register team
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function YouPanel({ tournament, busy, error, onJoinSolo, onRegisterTeam, onLeave, onCheckIn }: {
  tournament: TournamentDetail
  busy: boolean
  error: string
  onJoinSolo: () => void
  onRegisterTeam: () => void
  onLeave: () => void
  onCheckIn: () => void
}) {
  const { loginWithSteam } = useAuth()
  const me = tournament.me
  const myTeam = me?.teamId ? tournament.teams.find((team) => team.id === me.teamId) ?? null : null
  const next = me?.nextMatch ?? null
  const full = tournament.maxPlayers !== null && tournament.registeredPlayers >= tournament.maxPlayers

  let body: React.ReactNode
  if (!me) {
    body = (
      <>
        <span className="text-[13px] leading-[1.5] text-[var(--text-muted)]">Sign in with Steam to join.</span>
        <SteamLoginButton onClick={loginWithSteam} />
      </>
    )
  } else if (tournament.phase === "live" && next) {
    body = (
      <>
        <div className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--accent-solid)]/45 bg-[var(--panel)] p-3.5">
          <span className="text-xs font-semibold tracking-[0.4px] text-[var(--text)]">YOUR NEXT MATCH</span>
          <span className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">vs <span className="truncate font-medium text-[var(--text)]">{next.opponent?.name ?? "TBD"}</span></span>
          <span className="flex flex-wrap gap-3 text-xs text-[var(--text-dim)]">
            <span>{next.status === "live" ? "Live now" : next.scheduledTime ? formatDateTime(next.scheduledTime) : "Time TBA"}</span>
            {next.server && <span>{next.server.name}</span>}
          </span>
        </div>
        {next.server?.connectAddress && (
          <a href={`steam://connect/${next.server.connectAddress}`} className={primaryButton}>
            <Play className="size-4" />
            Connect to server
          </a>
        )}
      </>
    )
  } else if (me.registered) {
    body = (
      <>
        <span className="text-[13px] leading-[1.5] text-[var(--text-muted)]">
          {me.mode === "solo" && !myTeam ? "You're in as a solo player. Teams are balanced by EXP when registration closes." : "You're registered."}
        </span>
        {tournament.checkInOpen && !me.checkedInAt && (
          <button type="button" disabled={busy} onClick={onCheckIn} className={primaryButton}>
            {busy && <LoaderCircle className="size-4 animate-spin" />}
            Check in
          </button>
        )}
        {me.checkedInAt && <span className="text-[13px] text-[var(--status-green)]">Checked in</span>}
        {tournament.phase === "registration" && (
          <button type="button" disabled={busy} onClick={onLeave} className={secondaryButton}>
            {me.isCaptain ? "Disband team and leave" : "Leave tournament"}
          </button>
        )}
      </>
    )
  } else if (tournament.phase === "registration") {
    body = (
      <>
        <span className="text-[13px] leading-[1.5] text-[var(--text-muted)]">Sign up solo and we balance teams by EXP, or register a full team of {tournament.teamSize}.</span>
        <button type="button" disabled={busy || full} onClick={onJoinSolo} className={primaryButton}>
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          {full ? "Tournament is full" : "Join solo"}
        </button>
        <button type="button" disabled={busy || full} onClick={onRegisterTeam} className={secondaryButton}>
          <Users className="size-4" />
          Register a team
        </button>
        <span className="text-xs text-[var(--text-dim)]">Check-in opens {tournament.checkInOpensAt ? formatDateTime(tournament.checkInOpensAt) : "30 min before start"}.</span>
      </>
    )
  } else {
    body = <span className="text-[13px] leading-[1.5] text-[var(--text-muted)]">{tournament.phase === "finished" ? "This tournament has finished." : "Registration is closed."}</span>
  }

  return (
    <aside aria-label="Your status" className={cn(card, "flex flex-col gap-3.5 p-[18px] lg:sticky lg:top-0")}>
      <h2 className="text-sm font-semibold text-[var(--text)]">You</h2>
      {body}
      {error && <p role="alert" className="text-xs text-[var(--text-2)]">{error}</p>}
      {myTeam && (
        <div className="flex flex-col gap-2 border-t border-[var(--line-soft)] pt-3">
          <span className="text-xs text-[var(--text-dim)]">{myTeam.name}</span>
          <div className="flex -space-x-1.5">
            {myTeam.players.map((player) => <PlayerAvatar key={player.userId} avatar={player.avatar} name={player.name} className="size-7 rounded-lg border-2 border-[var(--card-surface)] text-[10px]" />)}
          </div>
        </div>
      )}
    </aside>
  )
}

function TournamentView({ tournamentId, onProfileNavigate }: { tournamentId: string; onProfileNavigate: (steamId: string) => void }) {
  const [params, setParams] = useSearchParams()
  const tab = readTab(params.get("tab"))
  const now = useNow()
  const { data, error, refetch } = useApiQuery<TournamentDetail>((signal) => tournamentsService.get(tournamentId, { signal }), { queryKey: `tournament:${tournamentId}`, keepPreviousData: true })
  const [override, setOverride] = useState<TournamentDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState("")
  const [teamDialog, setTeamDialog] = useState(false)
  useEffect(() => setOverride(null), [data])
  const tournament = override ?? data

  const setTab = (value: Tab) => setParams((current) => {
    const next = new URLSearchParams(current)
    if (value === "overview") next.delete("tab")
    else next.set("tab", value)
    return next
  }, { replace: true })

  const run = async (action: () => Promise<TournamentDetail | void>, fallback: string) => {
    setBusy(true)
    setActionError("")
    try {
      const result = await action()
      if (result) setOverride(result)
      refetch()
      return true
    } catch (caught) {
      setActionError(errorMessage(caught, fallback))
      return false
    } finally {
      setBusy(false)
    }
  }

  if (!tournament) {
    if (error) return <ErrorLine onRetry={refetch} />
    return <DetailSkeleton />
  }
  return (
    <>
      <Hero tournament={tournament} now={now} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Segmented ariaLabel="Tournament sections" value={tab} onChange={setTab} options={TABS} className="self-start" />
          <div key={tab} className="animate-in fade-in-0 duration-200 motion-reduce:animate-none">
            {tab === "overview" && <Overview tournament={tournament} now={now} />}
            {tab === "bracket" && <Bracket tournament={tournament} />}
            {tab === "players" && <Players tournament={tournament} onProfileNavigate={onProfileNavigate} busy={busy} onJoinTeam={(teamId) => void run(() => tournamentsService.register(tournament.id, { mode: "join", teamId }), "Could not join that team.")} />}
            {tab === "matches" && <Matches tournament={tournament} />}
          </div>
        </div>
        <YouPanel
          tournament={tournament}
          busy={busy}
          error={teamDialog ? "" : actionError}
          onJoinSolo={() => void run(() => tournamentsService.register(tournament.id, { mode: "solo" }), "Could not register you.")}
          onRegisterTeam={() => { setActionError(""); setTeamDialog(true) }}
          onLeave={() => void run(() => tournamentsService.leave(tournament.id), "Could not leave the tournament.")}
          onCheckIn={() => void run(() => tournamentsService.checkIn(tournament.id), "Could not check you in.")}
        />
      </div>
      <TeamNameDialog
        open={teamDialog}
        busy={busy}
        error={teamDialog ? actionError : ""}
        onClose={() => { setTeamDialog(false); setActionError("") }}
        onSubmit={async (teamName) => { if (await run(() => tournamentsService.register(tournament.id, { mode: "team", teamName }), "Could not register your team.")) setTeamDialog(false) }}
      />
    </>
  )
}

function ErrorLine({ onRetry }: { onRetry: () => void }) {
  return (
    <p className="flex items-center justify-center gap-3 py-16 text-[13px] text-[var(--text-dim)]">
      Could not load tournaments.
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 text-[var(--text-2)] transition-colors hover:text-[var(--text)]">
        <RotateCcw className="size-3.5" />
        Retry
      </button>
    </p>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden="true">
      <div className={cn(card, "flex flex-col gap-4 p-6")}>
        <Skeleton className="h-6 w-36 rounded-full bg-[var(--raised)]" />
        <Skeleton className="h-5 w-80 max-w-full rounded-full bg-[var(--line-strong)]" />
        <Skeleton className="h-2.5 w-44 rounded-full bg-[var(--line-soft)]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-64 rounded-xl bg-[var(--card-surface)]" />
        <Skeleton className="h-48 rounded-xl bg-[var(--card-surface)]" />
      </div>
    </div>
  )
}

export function TournamentsPage({ onProfileNavigate }: { onProfileNavigate: (steamId: string) => void }) {
  const [params, setParams] = useSearchParams()
  const selected = params.get("id")
  const { data, loading, error, refetch } = useApiQuery((signal) => tournamentsService.list({ signal }), { queryKey: "tournaments", keepPreviousData: true })
  const tournamentId = selected ?? data?.current?.id ?? null
  const past = useMemo(() => (data?.past ?? []).filter((tournament) => tournament.id !== tournamentId), [data, tournamentId])

  const open = (id: string) => setParams(() => new URLSearchParams({ id }))

  return (
    <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-5 p-6">
        <PageHeader loading={loading && Boolean(data)} />
        {tournamentId ? (
          <>
            <TournamentView key={tournamentId} tournamentId={tournamentId} onProfileNavigate={onProfileNavigate} />
            {!selected && <PastTournaments past={past} onOpen={open} />}
          </>
        ) : data ? (
          <NoTournament past={data.past} onOpen={open} />
        ) : error ? (
          <ErrorLine onRetry={refetch} />
        ) : (
          <DetailSkeleton />
        )}
      </div>
    </div>
  )
}
