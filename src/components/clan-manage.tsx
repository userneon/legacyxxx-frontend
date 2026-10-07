import { useState } from "react"
import { Coins, Crown, Send, ShieldAlert, Trash2, UserMinus, X } from "lucide-react"
import { toast } from "sonner"

import { clansService } from "@/api"
import type { ApiError, ClanActivityLine, ClanDetail, ClanJoinRequest, ClanMember, ClanRole } from "@/api/types"
import { PlayerAvatar } from "@/components/player-avatar"
import { formatRelativeTime } from "@/components/relative-time"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApiQuery } from "@/hooks/use-api-query"

/** What a clan costs. The server enforces these; the numbers only explain them. */
export const CLAN_FEE = 500
export const CLAN_RENAME_FEE = 200

const REASONS: Record<string, string> = {
  clan_name_taken: "That clan name or tag is already taken.",
  clan_already_member: "That player (or you) already belongs to a clan.",
  clan_full: "The clan is full.",
  clan_cooldown: "Wait a day after leaving a clan before joining another.",
  clan_requests_limit: "You can have 3 open requests at a time. Withdraw one first.",
  clan_no_coins: "Your wallet is short on coins.",
  clan_forbidden: "You are not allowed to do that.",
  clan_rename_cooldown: "A clan can change its name or tag once a week.",
  clan_player_not_found: "No player has that name.",
  clan_invites_limit: "Too many invitations are waiting. Withdraw one first.",
  clan_leader_cannot_leave: "Hand the clan to someone else or delete it before leaving.",
  clan_too_many_members: "The clan already has more members than that.",
  clan_not_member: "That player is not in the clan.",
  clan_not_found: "That does not exist any more.",
}

/** One sentence for why a clan action failed, from the server's reason code when it sent one. */
export function clanFailure(error: unknown, fallback: string) {
  const failure = error as Partial<ApiError> | null
  if (failure?.reason && REASONS[failure.reason]) return REASONS[failure.reason]
  if (failure?.status === 401) return "Sign in with Steam first."
  if (failure?.status === 429) return "Too many tries. Wait a moment."
  return fallback
}

const ROLE_LABEL: Record<ClanRole, string> = { leader: "Leader", "co-leader": "Manager", member: "Member" }
export function roleLabel(role: string) {
  return ROLE_LABEL[role as ClanRole] ?? role
}

const iconButton = "flex size-8 items-center justify-center rounded-lg text-[var(--text-dim)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)] disabled:opacity-50"

/** The buttons next to a member: make or unmake a manager, hand the clan over, remove. Only what the viewer may do shows. */
export function MemberControls({ clanId, member, viewerRole, onChanged }: { clanId: string; member: ClanMember; viewerRole: ClanRole | null; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const target = member.role as ClanRole
  if (target === "leader" || !viewerRole || viewerRole === "member") return null
  const mayRemove = viewerRole === "leader" || target === "member"
  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true)
    try {
      await action()
      toast.success(done)
      onChanged()
    } catch (error) {
      toast.error("That did not work", { description: clanFailure(error, "Try again in a moment.") })
    } finally {
      setBusy(false)
    }
  }
  return (
    <span className="mr-2 flex shrink-0 items-center">
      {viewerRole === "leader" && (
        <>
          <button type="button" disabled={busy} aria-label={target === "co-leader" ? `Make ${member.name} a member` : `Make ${member.name} a manager`} title={target === "co-leader" ? "Remove manager" : "Make manager"} onClick={() => void run(() => clansService.setRole(clanId, member.id, target === "co-leader" ? "member" : "co-leader"), target === "co-leader" ? `${member.name} is a member again` : `${member.name} is a manager`)} className={iconButton}>
            <Crown className="size-4" aria-hidden="true" />
          </button>
          <button type="button" disabled={busy} aria-label={`Hand the clan to ${member.name}`} title="Make leader" onClick={() => { if (window.confirm(`Hand the clan to ${member.name}? You become a co-leader.`)) void run(() => clansService.transfer(clanId, member.id), `${member.name} leads the clan now`) }} className={iconButton}>
            <Send className="size-4" aria-hidden="true" />
          </button>
        </>
      )}
      {mayRemove && (
        <button type="button" disabled={busy} aria-label={`Remove ${member.name}`} title="Remove" onClick={() => { if (window.confirm(`Remove ${member.name} from the clan?`)) void run(() => clansService.removeMember(clanId, member.id), `${member.name} was removed`) }} className={iconButton}>
          <UserMinus className="size-4" aria-hidden="true" />
        </button>
      )}
    </span>
  )
}

/** Edit clan: the leader picks which members are managers (they handle requests, invitations and members). */
export function ManagersSection({ clan, onChanged }: { clan: ClanDetail; onChanged: () => void }) {
  const [busy, setBusy] = useState("")
  const others = (clan.members ?? []).filter((member) => member.role !== "leader")
  const toggle = async (member: ClanMember) => {
    const makeManager = member.role !== "co-leader"
    setBusy(member.id)
    try {
      await clansService.setRole(clan.id, member.id, makeManager ? "co-leader" : "member")
      toast.success(makeManager ? `${member.name} is a manager` : `${member.name} is a member again`)
      onChanged()
    } catch (error) {
      toast.error("That did not work", { description: clanFailure(error, "Try again in a moment.") })
    } finally {
      setBusy("")
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <Label>Managers</Label>
      {others.length === 0 ? (
        <p className="text-[13px] text-[var(--text-dim)]">No other members yet.</p>
      ) : (
        <ul className="flex flex-col rounded-lg border border-[var(--line)]">
          {others.map((member) => (
            <li key={member.id} className="flex items-center gap-3 border-b border-[var(--line-soft)] px-3 py-2 last:border-b-0">
              <PlayerAvatar avatar={member.avatar} name={member.name} className="size-7 rounded-lg text-[10px]" />
              <span className="min-w-0 flex-1 truncate text-[13px]">{member.name}</span>
              <Button type="button" size="sm" variant={member.role === "co-leader" ? "default" : "outline"} disabled={busy === member.id} onClick={() => void toggle(member)}>{member.role === "co-leader" ? "Manager ✓" : "Make manager"}</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Invite a player by name, and see (and withdraw) the invitations still waiting. */
export function InvitePanel({ clanId }: { clanId: string }) {
  const { data, refetch } = useApiQuery<ClanJoinRequest[]>((signal) => clansService.getInvites(clanId, { signal }))
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const invites = data ?? []
  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await clansService.invite(clanId, name.trim())
      toast.success(`Invitation sent to ${name.trim()}`)
      setName("")
      void refetch()
    } catch (error) {
      toast.error("Could not invite", { description: clanFailure(error, "Try again in a moment.") })
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">Invite a player</h2>
      <form onSubmit={(event) => void send(event)} className="flex max-w-md gap-2">
        <Input aria-label="Player name" placeholder="Player name" maxLength={32} value={name} onChange={(event) => setName(event.target.value)} />
        <button type="submit" disabled={!name.trim() || busy} className="lx-primary-button inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold disabled:opacity-50"><Send className="size-4" aria-hidden="true" />Invite</button>
      </form>
      {invites.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {invites.map((invite) => (
            <li key={invite.id} className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] py-1 pl-1 pr-2 text-[13px]">
              <PlayerAvatar avatar={invite.avatar} name={invite.name} className="size-6 rounded-full text-[10px]" />
              {invite.name}
              <button type="button" aria-label={`Withdraw the invitation to ${invite.name}`} onClick={() => void clansService.revokeInvite(clanId, invite.id).then(() => refetch())} className="text-[var(--text-dim)] hover:text-[var(--text)]"><X className="size-3.5" aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** What happened in the clan lately. */
export function ActivityPanel({ clanId }: { clanId: string }) {
  const { data } = useApiQuery<ClanActivityLine[]>((signal) => clansService.getActivity(clanId, { signal }))
  const lines = data ?? []
  if (lines.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">Activity</h2>
      <ul className="flex flex-col rounded-[10px] border border-[var(--glass-line)] bg-[var(--glass-fill)]">
        {lines.slice(0, 12).map((line) => (
          <li key={line.id} className="flex items-center justify-between gap-3 border-b border-[var(--line-soft)] px-4 py-2.5 text-[13px] last:border-b-0">
            <span className="min-w-0 truncate">{line.text}</span>
            <span className="shrink-0 text-[11px] text-[var(--text-dim)]">{formatRelativeTime(new Date(line.at))}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** A new name or tag, for coins, once a week (the leader only). */
export function RenameForm({ clan, onChanged }: { clan: ClanDetail; onChanged: () => void }) {
  const [name, setName] = useState(clan.name)
  const [tag, setTag] = useState(clan.tag)
  const [busy, setBusy] = useState(false)
  const changed = name.trim() !== clan.name || tag !== clan.tag
  const valid = name.trim().length >= 3 && /^[A-Za-z0-9]{2,5}$/.test(tag)
  const save = async () => {
    setBusy(true)
    try {
      await clansService.rename(clan.id, { ...(name.trim() !== clan.name ? { name: name.trim() } : {}), ...(tag !== clan.tag ? { tag } : {}) })
      toast.success("Name saved")
      onChanged()
    } catch (error) {
      toast.error("Could not rename", { description: clanFailure(error, "Try again in a moment.") })
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="clan-rename">Name and tag</Label>
      <div className="flex gap-2">
        <Input id="clan-rename" aria-label="Clan name" minLength={3} maxLength={24} value={name} onChange={(event) => setName(event.target.value)} />
        <Input aria-label="Clan tag" className="w-24" maxLength={5} value={tag} onChange={(event) => setTag(event.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())} />
      </div>
      <div>
        <Button type="button" variant="outline" size="sm" disabled={!changed || !valid || busy} onClick={() => void save()}><Coins className="size-3.5" /> Change · {CLAN_RENAME_FEE} coins</Button>
        <span className="ml-3 text-[11px] text-[var(--text-dim)]">Once a week</span>
      </div>
    </div>
  )
}

/**
 * Staff only: a "Moderate" button in the clan's top bar. It opens the same kind of box as penalties do: take a picture
 * down, clear a description, fix a name, or delete a clan that breaks the rules. Everything is written to the clan's log.
 */
export function ModerateClan({ clan, onChanged, onDeleted }: { clan: ClanDetail; onChanged: () => void; onDeleted: () => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState(clan.name)
  const [tag, setTag] = useState(clan.tag)
  const run = async (action: () => Promise<unknown>, done: string, after: () => void) => {
    setBusy(true)
    try {
      await action()
      toast.success(done)
      after()
    } catch (error) {
      toast.error("That did not work", { description: clanFailure(error, "Try again in a moment.") })
    } finally {
      setBusy(false)
    }
  }
  const renameOk = name.trim().length >= 3 && /^[A-Za-z0-9]{2,5}$/.test(tag) && (name.trim() !== clan.name || tag !== clan.tag)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] hover:border-[var(--line-strong)]">
        <ShieldAlert className="size-4" aria-hidden="true" /> Moderate
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Moderate {clan.name}</DialogTitle>
            <DialogDescription>Staff actions. The clan's leader is not asked first.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Content</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void run(() => clansService.moderateArt(clan.id, "logo"), "Logo removed", onChanged)}>Remove logo</Button>
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void run(() => clansService.moderateArt(clan.id, "banner"), "Banner removed", onChanged)}>Remove banner</Button>
                <Button type="button" variant="outline" size="sm" disabled={busy || !clan.description} onClick={() => void run(() => clansService.moderateDescription(clan.id), "Description cleared", onChanged)}>Clear description</Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="moderate-name">Name and tag</Label>
              <div className="flex gap-2">
                <Input id="moderate-name" aria-label="Clan name" maxLength={24} value={name} onChange={(event) => setName(event.target.value)} />
                <Input aria-label="Clan tag" className="w-24" maxLength={5} value={tag} onChange={(event) => setTag(event.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())} />
              </div>
              <div><Button type="button" variant="outline" size="sm" disabled={busy || !renameOk} onClick={() => void run(() => clansService.moderateRename(clan.id, { name: name.trim(), tag }), "Name changed", onChanged)}>Save name</Button></div>
            </div>
            <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Delete ${clan.name}? Its members are released.`)) void run(() => clansService.moderateDelete(clan.id), "Clan deleted", () => { setOpen(false); onDeleted() }) }} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[13px] font-semibold text-[var(--status-red)] transition-colors hover:border-[var(--line-strong)] disabled:opacity-50">
              <Trash2 className="size-4" aria-hidden="true" /> Delete clan
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
