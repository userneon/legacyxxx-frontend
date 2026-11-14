/**
 * The matchmaking panel of a Play page (owner decision 2026-11-14: "close the community servers, go to a queue, real fights"; the layout follows a FACEIT
 * matchmaking screenshot): one big card in the middle that is the whole flow. Find match → searching (timer, players in the queue) → Match found (Accept
 * with a 30 s clock and how many of the ten accepted) → waiting for a server → the match is ready: the map, both teams and the one Connect button.
 * Every number comes from the queue API (`/queue/status`); nothing is invented.
 */
import { useEffect, useState } from "react"
import { LoaderCircle, Play, X } from "lucide-react"
import { toast } from "sonner"

import type { QueueMode, QueueStatus } from "@/api/queue"
import { useAuth } from "@/hooks/use-auth"
import { useQueue } from "@/hooks/use-queue"
import { PartyBar } from "@/components/party-bar"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { steamConnect } from "@/lib/steam-connect"
import { cn } from "@/lib/utils"

const TITLES: Record<QueueMode, string> = { "5x5": "5x5 Matches", pro: "Pro League" }

function useClock(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [active])
  return now
}

const mmss = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.max(0, Math.floor(seconds % 60))).padStart(2, "0")}`

export function PlayQueue({ mode }: { mode: QueueMode }) {
  const { isAuthenticated, loginWithSteam, user } = useAuth()
  const { status, busy, join, leave, accept, invite, acceptInvite, declineInvite, leaveParty, kick } = useQueue()
  const state = status?.state ?? "idle"
  const now = useClock(state === "queued" || state === "found")
  const inQueue = status?.counts[mode] ?? 0

  const shell = "lx-glass @container relative flex min-h-[340px] flex-col items-center justify-center gap-5 overflow-hidden px-6 py-10 text-center"

  if (!isAuthenticated) {
    return (
      <section aria-label="Find match" className={shell}>
        <h2 className="text-[22px] font-bold text-[var(--text)]">Sign in to play</h2>
        <p className="max-w-[360px] text-[13px] text-[var(--text-muted)]">Matches are made by the queue. Your LEGACY-X account is your Steam account.</p>
        <button type="button" onClick={loginWithSteam} className="lx-primary-button h-11 rounded-xl px-8 text-[14px] font-bold">Sign in with Steam</button>
      </section>
    )
  }

  if (state === "ready" && status?.match) return <ReadyMatch match={status.match} />

  if (state === "found" || state === "preparing") {
    const match = status!.match!
    const left = Math.max(0, Math.ceil((Date.parse(match.acceptDeadline) - now) / 1000))
    const preparing = state === "preparing"
    return (
      <section aria-label="Match found" className={cn(shell, "border-[var(--brand)]/50")} aria-live="polite">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-bright)]">{preparing ? "Everyone accepted" : "Match found"}</span>
        <h2 className="text-[28px] font-bold leading-tight text-[var(--text)]">{preparing ? "Getting a server ready" : TITLES[match.mode]}</h2>
        <div className="flex items-center gap-1.5" aria-label={`${match.accepted} of ${match.total} accepted`}>
          {Array.from({ length: match.total }, (_, index) => <span key={index} className={cn("h-2 w-7 rounded-full", index < match.accepted ? "bg-[var(--status-green)]" : "bg-[var(--line-strong)]")} />)}
        </div>
        <span className="text-[13px] text-[var(--text-muted)]">{match.accepted} / {match.total} accepted · {cs2MapLabel(match.map)}</span>
        {preparing ? (
          <span className="flex items-center gap-2 text-[13px] text-[var(--text-2)]"><LoaderCircle className="size-4 animate-spin" />Waiting for a free server…</span>
        ) : (
          <>
            <span className="text-[34px] font-bold tabular-nums leading-none text-[var(--text)]">{left}s</span>
            {match.myAccepted ? (
              <span className="text-[13px] text-[var(--text-2)]">You accepted. Waiting for the others…</span>
            ) : (
              <button type="button" disabled={busy} onClick={() => void accept(match.id)} className="h-12 rounded-xl bg-[var(--status-green)] px-12 text-[15px] font-bold text-[#04110a] transition-opacity hover:opacity-90 disabled:opacity-60">Accept</button>
            )}
            <button type="button" disabled={busy} onClick={() => void leave()} className="text-[12px] text-[var(--text-dim)] underline-offset-2 transition-colors hover:text-[var(--text)] hover:underline">Decline</button>
          </>
        )}
      </section>
    )
  }

  if (state === "queued" && status?.queue) {
    const waited = Math.max(0, (now - Date.parse(status.queue.joinedAt)) / 1000)
    return (
      <section aria-label="Finding match" className={shell} aria-live="polite">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]"><LoaderCircle className="size-3.5 animate-spin" />Finding match</span>
        <h2 className="text-[44px] font-bold tabular-nums leading-none text-[var(--text)]">{mmss(waited)}</h2>
        <p className="text-[13px] text-[var(--text-muted)]">{TITLES[status.queue.mode]} · {status.counts[status.queue.mode]} in the queue{status.party && status.party.members.length > 1 ? ` · party of ${status.party.members.length}` : ""}. We look for players close to your level.</p>
        {status.party && status.party.members.length > 1 ? <PartyBar party={status.party} invitations={[]} busy={busy} locked onInvite={() => undefined} onKick={() => undefined} onLeave={() => undefined} onAccept={() => undefined} onDecline={() => undefined} /> : null}
        <button type="button" disabled={busy} onClick={() => void leave()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--line-strong)] px-6 text-[13px] font-semibold text-[var(--text-2)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]"><X className="size-4" />Cancel</button>
      </section>
    )
  }

  const party = status?.party ?? null
  const inParty = Boolean(party && party.members.length > 1)
  const waitsForLeader = inParty && party!.leaderId !== user?.id
  return (
    <section aria-label="Find match" className={shell}>
      <span className="rounded-full border border-[var(--brand)]/50 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-bright)]">{TITLES[mode]} queue</span>
      <PartyBar party={party} invitations={status?.invitations ?? []} busy={busy} locked={false} onInvite={(id) => void invite(id)} onKick={(id) => void kick(id)} onLeave={() => void leaveParty()} onAccept={(id) => void acceptInvite(id)} onDecline={(id) => void declineInvite(id)} />
      <button
        type="button"
        disabled={busy || waitsForLeader}
        onClick={() => void join(mode).then(() => undefined)}
        className="lx-primary-button inline-flex h-14 items-center gap-3 rounded-2xl px-14 text-[17px] font-bold disabled:opacity-60"
      >
        {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Play className="size-5 fill-current" />}
        Find match
      </button>
      <span className="text-[12px] text-[var(--text-dim)]">Players queueing: <b className="font-semibold text-[var(--text-2)]">{inQueue}</b></span>
    </section>
  )
}

function ReadyMatch({ match }: { match: NonNullable<QueueStatus["match"]> }) {
  const players = match.players ?? []
  const side = (team: 1 | 2) => players.filter((player) => player.team === team)
  const connect = () => {
    if (!steamConnect(match.connectAddress ?? undefined)) toast.error("No server address yet", { description: "Wait a few seconds and try again." })
  }
  return (
    <section aria-label="Your match" className="lx-glass flex flex-col overflow-hidden">
      <div className="relative flex min-h-[170px] flex-col justify-end gap-1 px-6 pb-5 pt-10">
        <img src={cs2MapArtwork(match.map) ?? undefined} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover opacity-45" />
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--glass-fill)] via-[var(--glass-fill)]/60 to-transparent" />
        <span className="relative text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--status-green)]">Your match is ready</span>
        <h2 className="relative text-[30px] font-bold leading-tight text-[var(--text)]">{cs2MapLabel(match.map)}</h2>
        <span className="relative text-[13px] text-[var(--text-muted)]">{TITLES[match.mode]} · you are on team {match.team ?? 1}</span>
      </div>
      <div className="grid gap-3 p-4 @xl:grid-cols-2">
        {([1, 2] as const).map((team) => (
          <div key={team} className="flex flex-col gap-1 rounded-xl border border-[var(--line)] p-3">
            <span className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">Team {team}</span>
            {side(team).map((player) => (
              <div key={player.userId} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px] odd:bg-[var(--raised)]/40">
                <span className="truncate text-[var(--text)]">{player.username}</span>
                <span className="text-[12px] text-[var(--text-dim)]">{player.exp.toLocaleString()} EXP</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-4">
        <span className="text-[12px] text-[var(--text-dim)]">The server loads your match. Only these ten players can join it.</span>
        <button type="button" onClick={connect} disabled={!match.connectAddress} className="lx-primary-button inline-flex h-12 items-center gap-2.5 rounded-xl px-10 text-[15px] font-bold disabled:opacity-50"><Play className="size-4 fill-current" />Connect</button>
      </div>
    </section>
  )
}
