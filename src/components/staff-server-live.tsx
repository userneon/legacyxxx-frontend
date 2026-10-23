import { useEffect, useState } from "react"
import { Ban, Database, Loader2, LockKeyhole, MessageSquare, RotateCcw, Users, UsersRound } from "lucide-react"

import { serversService } from "@/api/servers"
import type { ServerLiveMatch, ServerLiveMatchPlayer } from "@/api/types"
import type { StaffPanelActionRequest } from "@/api/types"
import { PlayerAvatar } from "@/components/player-avatar"
import { STAFF_CARD, StaffEmpty, StaffSection, type Tone } from "@/components/staff-ui"
import { useApiQuery } from "@/hooks/use-api-query"
import { cs2MapLabel } from "@/lib/cs2-map-art"
import { cn } from "@/lib/utils"

type PlayerAction = { type: StaffPanelActionRequest["type"]; label: string; icon: typeof Ban; needsMessage: boolean; tone: Tone | undefined; placeholder: string }

/** What staff can do to one player from their card on the console: the same queued, audited actions as the buttons below. */
const PLAYER_ACTIONS: PlayerAction[] = [
  { type: "player_message", label: "Message", icon: MessageSquare, needsMessage: true, tone: "sky", placeholder: "Message shown to the player" },
  { type: "kick", label: "Kick", icon: UsersRound, needsMessage: true, tone: "red", placeholder: "Reason" },
  { type: "mute", label: "Mute", icon: LockKeyhole, needsMessage: true, tone: "amber", placeholder: "Reason" },
  { type: "ban", label: "Ban", icon: Ban, needsMessage: true, tone: "red", placeholder: "Reason" },
  { type: "player_ip_lookup", label: "IP", icon: Database, needsMessage: false, tone: undefined, placeholder: "" },
]

/**
 * The server console's live view (owner request 2026-10-23): the match on the picked server and everyone on it as a card with their
 * team, K/D/A and the buttons to act, refreshed every few seconds. The numbers come from the game server's own report (the same one the
 * Play page shows); when it sends none, the card list is empty and says so.
 */
export function ServerLive({ serverId, busy, onAct }: { serverId: string; busy: boolean; onAct: (type: StaffPanelActionRequest["type"], steamId: string, message: string) => Promise<boolean> }) {
  const { data, loading, error, refetch } = useApiQuery<ServerLiveMatch>((signal) => serversService.getLiveMatch(serverId, { signal }), { queryKey: `staff-live:${serverId}`, keepPreviousData: true })
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refetch() }, 5000)
    return () => window.clearInterval(timer)
  }, [refetch])

  const seated = data ? new Set([...data.teams.t, ...data.teams.ct, ...data.spectators].map((player) => player.steamId)) : new Set<string>()
  // The roster list is only for players the match report does not place on a side.
  const connected = data ? data.connectedPlayers.filter((player) => !seated.has(player.steamId)) : []
  const roster = data ? [...data.teams.t, ...data.teams.ct, ...data.spectators, ...connected] : []
  const anyone = roster.length > 0
  return (
    <StaffSection
      title="Live on this server"
      count={anyone ? new Set(roster.map((player) => player.steamId)).size : undefined}
      end={data && <span className="text-xs text-[var(--text-dim)]">{cs2MapLabel(data.map)} · {data.state === "unavailable" ? "no live report" : data.state}{data.round !== null ? ` · round ${data.round}` : ""}{data.score ? ` · T ${data.score.t} – ${data.score.ct} CT` : ""}</span>}
    >
      {loading && !data ? (
        <div className="flex items-center gap-2 text-[13px] text-[var(--text-dim)]"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading the players…</div>
      ) : error && !data ? (
        <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">No live report from this server.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" aria-hidden="true" />Retry</button></p>
      ) : !data || !anyone ? (
        <StaffEmpty>Nobody is on this server right now.</StaffEmpty>
      ) : (
        <div className="flex flex-col gap-5">
          <Team title="Terrorists" tone="amber" players={data.teams.t} busy={busy} onAct={onAct} />
          <Team title="Counter-Terrorists" tone="sky" players={data.teams.ct} busy={busy} onAct={onAct} />
          <Team title="Spectators" players={data.spectators} busy={busy} onAct={onAct} />
          <Team title="Connected" players={connected} busy={busy} onAct={onAct} />
        </div>
      )}
    </StaffSection>
  )
}

function Team({ title, tone, players, busy, onAct }: { title: string; tone?: Tone; players: ServerLiveMatchPlayer[]; busy: boolean; onAct: (type: StaffPanelActionRequest["type"], steamId: string, message: string) => Promise<boolean> }) {
  if (players.length === 0) return null
  const sorted = [...players].sort((a, b) => (b.kills ?? -1) - (a.kills ?? -1))
  return (
    <div className="flex flex-col gap-2.5">
      <h4 className={cn("flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1.2px]", tone ? "text-[var(--text-2)]" : "text-[var(--text-faint)]")}><Users className="size-3.5" aria-hidden="true" />{title} · {players.length}</h4>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((player) => <PlayerCard key={player.steamId} player={player} tone={tone} busy={busy} onAct={onAct} />)}
      </ul>
    </div>
  )
}

function PlayerCard({ player, tone, busy, onAct }: { player: ServerLiveMatchPlayer; tone?: Tone; busy: boolean; onAct: (type: StaffPanelActionRequest["type"], steamId: string, message: string) => Promise<boolean> }) {
  const [armed, setArmed] = useState<PlayerAction | null>(null)
  const [reason, setReason] = useState("")
  const hasStats = player.kills != null || player.deaths != null
  const confirm = async () => {
    if (!armed) return
    if (armed.needsMessage && !reason.trim()) return
    if (await onAct(armed.type, player.steamId, reason.trim())) { setArmed(null); setReason("") }
  }
  return (
    <li data-tone={tone} className={cn(STAFF_CARD, !player.connected && "opacity-60")}>
      <div className="flex items-center gap-3">
        <PlayerAvatar avatar={player.avatar ?? undefined} name={player.name} className="size-11 shrink-0 rounded-[10px] text-sm" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[13px] font-semibold text-[var(--text)]" title={player.name}>{player.name}</span>
          <span className="truncate text-[11px] text-[var(--text-dim)]">{player.rankName ?? "Unranked"}{player.connected ? "" : " · disconnected"}</span>
        </span>
        {player.ping != null && <span className="shrink-0 text-[11px] text-[var(--text-dim)]">{player.ping} ms</span>}
      </div>
      {(hasStats || player.adr != null) && (
        <div className="lx-stat-grid grid-cols-2">
          <span className="lx-stat-cell gap-1 px-3 py-1.5"><span className="lx-stat-label">K / D / A</span><span className="text-[13px] font-semibold text-[var(--text)]">{player.kills ?? "–"} / {player.deaths ?? "–"} / {player.assists ?? "–"}</span></span>
          <span className="lx-stat-cell gap-1 px-3 py-1.5"><span className="lx-stat-label">ADR</span><span className="text-[13px] font-semibold text-[var(--text)]">{player.adr != null ? Math.round(player.adr) : "–"}</span></span>
        </div>
      )}
      {armed ? (
        <div className="mt-auto flex flex-col gap-2">
          {armed.needsMessage && <input autoFocus value={reason} maxLength={200} onChange={(event) => setReason(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void confirm(); if (event.key === "Escape") setArmed(null) }} placeholder={armed.placeholder} aria-label={armed.placeholder} className="h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--text-faint)] focus:outline-none" />}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setArmed(null)} className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[13px] text-[var(--text-2)] hover:border-[var(--line-strong)]">Cancel</button>
            <button type="button" disabled={busy || (armed.needsMessage && !reason.trim())} onClick={() => void confirm()} className="lx-primary-button inline-flex h-9 items-center justify-center rounded-lg text-[13px] font-semibold disabled:opacity-50">{armed.label} {player.name.length > 10 ? "player" : player.name}</button>
          </div>
        </div>
      ) : (
        <div className="mt-auto grid grid-cols-5 gap-1.5">
          {PLAYER_ACTIONS.map((action) => (
            <button key={action.type} type="button" disabled={busy} data-tone={action.tone} onClick={() => setArmed(action)} title={`${action.label} ${player.name}`} aria-label={`${action.label} ${player.name}`} className="lx-tone flex h-11 flex-col items-center justify-center gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)] transition-colors hover:text-[var(--text)] disabled:opacity-50">
              <action.icon className={cn("size-4", action.tone && "lx-tone-text")} aria-hidden="true" />
              <span className="text-[10px] leading-none">{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </li>
  )
}

