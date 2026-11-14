/**
 * The party strip on a Play page (owner request 2026-11-14, "party"): five slots, you first. A party queues together, lands in one match and on one team.
 * Anyone can invite a player by name (a first invitation makes the party and its leader); the leader presses Find match for all and can remove people;
 * a member can leave. Invitations sent to you show above the slots. Every name and number is the API's.
 */
import { useEffect, useState } from "react"
import { Plus, Search, X } from "lucide-react"

import { searchService } from "@/api/search"
import type { CommunityPlayer } from "@/api/types"
import type { Party, PartyInvitation } from "@/api/queue"
import { PlayerAvatar } from "@/components/player-avatar"
import { useAuth } from "@/hooks/use-auth"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const SLOTS = 5

function InvitePicker({ exclude, onPick, disabled }: { exclude: Set<string>; onPick: (userId: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [players, setPlayers] = useState<CommunityPlayer[]>([])
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const text = query.trim()
    if (!open || text.length < 2) { setPlayers([]); setFailed(false); return }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchService.searchPlayers(text, { signal: controller.signal }).then((result) => { setPlayers(result.players); setFailed(false) }).catch((error) => { if (!controller.signal.aborted) { setPlayers([]); setFailed(true); void error } })
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [open, query])
  const list = players.filter((player) => player.id && !exclude.has(player.id)).slice(0, 6)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled} aria-label="Invite a player" className="grid size-12 place-items-center rounded-full border border-dashed border-[var(--line-strong)] text-[var(--text-dim)] transition-colors hover:border-[var(--text-dim)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-40"><Plus className="size-5" /></button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[280px] rounded-2xl border-[var(--line-strong)] bg-[var(--card-surface)] p-2">
        <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] px-2.5 text-[13px] text-[var(--text-dim)]">
          <Search className="size-4 shrink-0" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a player by name" aria-label="Find a player by name" className="w-full bg-transparent text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]" />
        </label>
        <div className="mt-1.5 flex flex-col">
          {query.trim().length < 2 ? <p className="px-2 py-3 text-[12px] text-[var(--text-dim)]">Type at least two letters.</p> : failed ? <p className="px-2 py-3 text-[12px] text-[var(--text-dim)]">Could not search. Try again.</p> : list.length === 0 ? <p className="px-2 py-3 text-[12px] text-[var(--text-dim)]">No players found.</p> : list.map((player) => (
            <button key={player.id} type="button" onClick={() => { onPick(player.id!); setOpen(false); setQuery("") }} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-[var(--text)] transition-colors hover:bg-[var(--raised)]">
              <PlayerAvatar avatar={player.avatar} name={player.name} className="size-7" />
              <span className="truncate">{player.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function PartyBar({ party, invitations, busy, locked, onInvite, onKick, onLeave, onAccept, onDecline }: {
  party: Party | null
  invitations: PartyInvitation[]
  busy: boolean
  /** The queue is running or a match is found: the party cannot change now. */
  locked: boolean
  onInvite: (userId: string) => void
  onKick: (userId: string) => void
  onLeave: () => void
  onAccept: (partyId: string) => void
  onDecline: (partyId: string) => void
}) {
  const { user } = useAuth()
  const myId = user?.id ?? ""
  const members = party?.members ?? (user ? [{ userId: myId, username: user.username, exp: 0 }] : [])
  const isLeader = !party || party.leaderId === myId
  const taken = new Set([...members.map((member) => member.userId), ...(party?.invited ?? []).map((invite) => invite.userId)])
  const empty = Math.max(0, SLOTS - members.length - (party?.invited.length ?? 0))
  return (
    <div aria-label="Party" className="flex w-full max-w-[560px] flex-col items-center gap-3">
      {invitations.map((invitation) => (
        <div key={invitation.partyId} className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--raised)]/60 px-4 py-2.5 text-[13px]">
          <span className="truncate text-[var(--text)]"><b className="font-semibold">{invitation.from}</b> invited you to a party</span>
          <span className="flex shrink-0 gap-2">
            <button type="button" disabled={busy || locked} onClick={() => onAccept(invitation.partyId)} className="lx-primary-button h-8 rounded-lg px-4 text-[12px] font-semibold disabled:opacity-50">Join</button>
            <button type="button" disabled={busy} onClick={() => onDecline(invitation.partyId)} className="h-8 rounded-lg px-3 text-[12px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)]">Decline</button>
          </span>
        </div>
      ))}
      <div className="flex items-center justify-center gap-3">
        {members.map((member) => {
          const leader = member.userId === (party?.leaderId ?? myId)
          const mine = member.userId === myId
          return (
            <div key={member.userId} className="group relative flex w-[64px] flex-col items-center gap-1" title={member.username}>
              <span className={cn("relative rounded-full", leader && "ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--card-surface)]")}>
                <PlayerAvatar name={member.username} className="size-12" />
                {isLeader && !mine && !locked ? <button type="button" aria-label={`Remove ${member.username}`} onClick={() => onKick(member.userId)} className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--card-surface)] text-[var(--text-dim)] opacity-0 transition-opacity hover:text-[var(--text)] focus-visible:opacity-100 group-hover:opacity-100"><X className="size-3" /></button> : null}
              </span>
              <span className="w-full truncate text-center text-[11px] text-[var(--text-muted)]">{mine ? "You" : member.username}</span>
            </div>
          )
        })}
        {(party?.invited ?? []).map((invite) => (
          <div key={invite.userId} className="group relative flex w-[64px] flex-col items-center gap-1 opacity-60" title={`${invite.username} (invited)`}>
            <span className="grid size-12 place-items-center rounded-full border border-dashed border-[var(--line-strong)] text-[11px] text-[var(--text-dim)]">···</span>
            <span className="w-full truncate text-center text-[11px] text-[var(--text-dim)]">{invite.username}</span>
            {isLeader && !locked ? <button type="button" aria-label={`Cancel invite for ${invite.username}`} onClick={() => onKick(invite.userId)} className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--card-surface)] text-[var(--text-dim)] opacity-0 transition-opacity hover:text-[var(--text)] focus-visible:opacity-100 group-hover:opacity-100"><X className="size-3" /></button> : null}
          </div>
        ))}
        {Array.from({ length: empty }, (_, index) => (
          <div key={index} className="flex w-[64px] flex-col items-center gap-1">
            {index === 0 && isLeader ? <InvitePicker exclude={taken} disabled={busy || locked} onPick={onInvite} /> : <span className="size-12 rounded-full border border-dashed border-[var(--line)]" aria-hidden="true" />}
            <span className="text-[11px] text-[var(--text-faint)]">{index === 0 && isLeader ? "Invite" : "Free"}</span>
          </div>
        ))}
      </div>
      {party && party.members.length > 1 ? (
        <span className="flex items-center gap-3 text-[12px] text-[var(--text-dim)]">
          {isLeader ? "You are the party leader. You press Find match for everyone." : "Waiting for the party leader to find a match."}
          <button type="button" disabled={busy || locked} onClick={onLeave} className="underline-offset-2 transition-colors hover:text-[var(--text)] hover:underline disabled:opacity-50">Leave party</button>
        </span>
      ) : null}
    </div>
  )
}
