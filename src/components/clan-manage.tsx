import { useState } from "react"
import { ArrowRight, Coins, Crown, Flag, Send, ShieldAlert, Trash2, UserMinus, X } from "lucide-react"
import { toast } from "sonner"

import { clansService, walletService, type Wallet } from "@/api"
import type { ApiError, ClanActivityLine, ClanDetail, ClanJoinRequest, ClanMember, ClanRole } from "@/api/types"
import { PlayerPicker } from "@/components/player-picker"
import { PlayerAvatar } from "@/components/player-avatar"
import { formatRelativeTime } from "@/components/relative-time"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"

/** What a clan costs, as the API says (the server enforces it). Null until it is known. */
function useClanPrices() {
  const { user } = useAuth()
  const { data } = useApiQuery<Wallet>((signal) => walletService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `wallet:${user.id}` : "wallet:guest" })
  return data?.clanPrices ?? null
}
export const useClanFee = (): number | null => useClanPrices()?.create ?? null
export const useClanRenameFee = (): number | null => useClanPrices()?.rename ?? null

const REASONS: Record<string, string> = {
  clan_name_taken: "That clan name or tag is already taken.",
  clan_already_member: "That player (or you) already belongs to a clan.",
  clan_full: "The clan is full.",
  clan_cooldown: "Wait a day after leaving a clan before joining another.",
  clan_requests_limit: "You can have 3 open requests at a time. Withdraw one first.",
  clan_no_coins: "Your wallet is short on LX.",
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

const ROLE_LABEL: Record<ClanRole, string> = { leader: "Leader", "co-leader": "Manager", captain: "Captain", member: "Member" }
export function roleLabel(role: string) {
  return ROLE_LABEL[role as ClanRole] ?? role
}

const iconButton = "flex size-8 items-center justify-center rounded-lg text-[var(--text-dim)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)] disabled:opacity-50"

/** The buttons next to a member: make or unmake a manager, hand the clan over, remove. Only what the viewer may do shows. */
/**
 * Handing the clan to another member, with a confirmation that cannot be clicked through: it shows you and them, says in plain words what
 * changes and what cannot be undone, asks for a tick and for the clan's name typed out, and only then enables the button.
 */
export function HandOverDialog({ clanId, clanName, member, open, onOpenChange, onDone }: { clanId: string; clanName: string; member: ClanMember | null; open: boolean; onOpenChange: (open: boolean) => void; onDone: () => void }) {
  const { user } = useAuth()
  const [typed, setTyped] = useState("")
  const [understood, setUnderstood] = useState(false)
  const [busy, setBusy] = useState(false)
  const ready = Boolean(member) && understood && typed.trim().toLowerCase() === clanName.trim().toLowerCase()
  const close = (next: boolean) => { if (busy) return; if (!next) { setTyped(""); setUnderstood(false) } onOpenChange(next) }
  const submit = async () => {
    if (!member || !ready) return
    setBusy(true)
    try {
      await clansService.transfer(clanId, member.id)
      toast.success(`${member.name} leads ${clanName} now`, { description: "You are a manager." })
      setTyped(""); setUnderstood(false)
      onOpenChange(false)
      onDone()
    } catch (error) {
      toast.error("The clan was not handed over", { description: clanFailure(error, "Try again in a moment.") })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open && Boolean(member)} onOpenChange={close}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Hand {clanName} to {member?.name}?</DialogTitle>
          <DialogDescription>Read this before you confirm. The leader decides who is in the clan.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--card-surface)] px-4 py-3.5">
          <span className="flex min-w-0 flex-col items-center gap-1.5 text-center">
            <PlayerAvatar avatar={user?.avatar} name={user?.username} className="size-11 rounded-xl text-sm" />
            <span className="max-w-[110px] truncate text-[12px] font-medium">{user?.username ?? "You"}</span>
            <span className="text-[10px] text-[var(--text-dim)]">Leader → Manager</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
          <span className="flex min-w-0 flex-col items-center gap-1.5 text-center">
            <PlayerAvatar avatar={member?.avatar} name={member?.name} className="size-11 rounded-xl text-sm" />
            <span className="max-w-[110px] truncate text-[12px] font-medium">{member?.name}</span>
            <span className="text-[10px] text-[var(--text-dim)]">{roleLabel(member?.role ?? "member")} → Leader</span>
          </span>
        </div>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[12px] leading-snug text-[var(--text-muted)]">
          <li><b className="text-[var(--text)]">{member?.name}</b> gets every leader power: edit the clan, spend the bank, change managers, remove members and delete the clan.</li>
          <li>You stay in the clan as a <b className="text-[var(--text)]">manager</b>. They can take that away from you.</li>
          <li><b className="text-[var(--text)]">Only {member?.name} can give it back.</b> You cannot undo this yourself.</li>
          <li>{member?.name} gets a notification that they lead the clan now.</li>
        </ul>
        <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); void submit() }}>
          <label className="flex cursor-pointer items-start gap-2.5 text-[12px] text-[var(--text-2)]">
            <Checkbox checked={understood} onCheckedChange={(value) => setUnderstood(value === true)} className="mt-0.5" aria-label="I understand" />
            I understand that {member?.name} becomes the leader and I cannot take it back.
          </label>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="handover-name" className="text-[12px] font-normal text-[var(--text-dim)]">Type <b className="text-[var(--text)]">{clanName}</b> to confirm</Label>
            <Input id="handover-name" value={typed} onChange={(event) => setTyped(event.target.value)} placeholder={clanName} autoComplete="off" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={!ready || busy}>{busy ? "Handing over…" : `Hand over to ${member?.name ?? ""}`}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Edit clan: a clearly named place to hand the clan over, so it is not only a small arrow on a roster row. */
export function TransferSection({ clan, onChanged }: { clan: ClanDetail; onChanged: () => void }) {
  const others = (clan.members ?? []).filter((member) => member.role !== "leader")
  const [pick, setPick] = useState<ClanMember | null>(null)
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--line)] p-3">
      <Label>Hand over leadership</Label>
      <p className="text-[12px] leading-snug text-[var(--text-dim)]">Give the clan to another member. You stay as a manager. You will be asked to confirm.</p>
      {others.length === 0 ? (
        <p className="text-[13px] text-[var(--text-dim)]">No other members yet.</p>
      ) : (
        <>
          <ul role="radiogroup" aria-label="New leader" className="flex max-h-48 flex-col overflow-y-auto rounded-lg border border-[var(--line)]">
            {others.map((member) => (
              <li key={member.id}>
                <button type="button" role="radio" aria-checked={pick?.id === member.id} onClick={() => setPick(member)} className="flex w-full items-center gap-3 border-b border-[var(--line-soft)] px-3 py-2 text-left last:border-b-0 hover:bg-[var(--raised)] aria-checked:bg-[var(--raised)]">
                  <PlayerAvatar avatar={member.avatar} name={member.name} className="size-7 rounded-lg text-[10px]" />
                  <span className="min-w-0 flex-1 truncate text-[13px]">{member.name}</span>
                  <span className="text-[11px] text-[var(--text-dim)]">{roleLabel(member.role)}</span>
                  <span aria-hidden="true" className={`size-3.5 rounded-full border ${pick?.id === member.id ? "border-[var(--text)] bg-[var(--text)]" : "border-[var(--line-strong)]"}`} />
                </button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" className="self-start" disabled={!pick} onClick={() => setOpen(true)}><Send className="size-4" aria-hidden="true" />{pick ? `Hand over to ${pick.name}…` : "Pick a member"}</Button>
        </>
      )}
      <HandOverDialog clanId={clan.id} clanName={clan.name} member={pick} open={open} onOpenChange={setOpen} onDone={() => { setPick(null); onChanged() }} />
    </div>
  )
}

export function MemberControls({ clanId, clanName, member, viewerRole, onChanged }: { clanId: string; clanName: string; member: ClanMember; viewerRole: ClanRole | null; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  // Handing the clan over opens the same confirmation as Edit clan → Hand over leadership.
  const [handing, setHanding] = useState(false)
  const target = member.role as ClanRole
  if (target === "leader" || !viewerRole || viewerRole === "member") return null
  const mayRemove = viewerRole === "leader" || target === "member" || target === "captain"
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
          {target !== "co-leader" && (
            <button type="button" disabled={busy} aria-label={target === "captain" ? `Make ${member.name} a member` : `Make ${member.name} a captain`} title={target === "captain" ? "Remove captain" : "Make captain"} onClick={() => void run(() => clansService.setRole(clanId, member.id, target === "captain" ? "member" : "captain"), target === "captain" ? `${member.name} is a member again` : `${member.name} is a captain`)} className={iconButton}>
              <Flag className="size-4" aria-hidden="true" />
            </button>
          )}
          <button type="button" disabled={busy} aria-label={`Hand the clan to ${member.name}`} title="Make leader" onClick={() => setHanding(true)} className={iconButton}>
            <Send className="size-4" aria-hidden="true" />
          </button>
          <HandOverDialog clanId={clanId} clanName={clanName} member={member} open={handing} onOpenChange={setHanding} onDone={onChanged} />
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

/** Edit clan: the leader gives each member a role: Manager (handles requests, invitations and members), Captain (a title, no powers) or plain Member. */
export function ManagersSection({ clan, onChanged }: { clan: ClanDetail; onChanged: () => void }) {
  const [busy, setBusy] = useState("")
  const others = (clan.members ?? []).filter((member) => member.role !== "leader")
  const set = async (member: ClanMember, role: "co-leader" | "captain" | "member") => {
    if (member.role === role) return
    setBusy(member.id)
    try {
      await clansService.setRole(clan.id, member.id, role)
      toast.success(role === "co-leader" ? `${member.name} is a manager` : role === "captain" ? `${member.name} is a captain` : `${member.name} is a member again`)
      onChanged()
    } catch (error) {
      toast.error("That did not work", { description: clanFailure(error, "Try again in a moment.") })
    } finally {
      setBusy("")
    }
  }
  const choices = [["member", "Member"], ["captain", "Captain"], ["co-leader", "Manager"]] as const
  return (
    <div className="flex flex-col gap-2">
      <Label>Roles</Label>
      <p className="text-[12px] leading-snug text-[var(--text-dim)]"><b className="font-semibold text-[var(--text-2)]">Manager</b> handles requests, invitations and removes members. <b className="font-semibold text-[var(--text-2)]">Captain</b> is a title on the roster with no powers. Only you change roles.</p>
      {others.length === 0 ? (
        <p className="text-[13px] text-[var(--text-dim)]">No other members yet.</p>
      ) : (
        <ul className="flex flex-col rounded-lg border border-[var(--line)]">
          {others.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--line-soft)] px-3 py-2 last:border-b-0">
              <PlayerAvatar avatar={member.avatar} name={member.name} className="size-7 rounded-lg text-[10px]" />
              <span className="min-w-0 flex-1 truncate text-[13px]">{member.name}</span>
              <span role="radiogroup" aria-label={`Role of ${member.name}`} className="inline-flex rounded-lg border border-[var(--line)] p-0.5">
                {choices.map(([value, label]) => (
                  <button key={value} type="button" role="radio" aria-checked={member.role === value} disabled={busy === member.id} onClick={() => void set(member, value)} className="h-7 rounded-md px-2.5 text-[12px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)] aria-checked:bg-[var(--raised)] aria-checked:font-semibold aria-checked:text-[var(--text)] disabled:opacity-50">{label}</button>
                ))}
              </span>
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

/** A new name or tag, for LX, once a week (the leader only). */
export function RenameForm({ clan, onChanged }: { clan: ClanDetail; onChanged: () => void }) {
  const renameFee = useClanRenameFee()
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
        <Button type="button" variant="outline" size="sm" disabled={!changed || !valid || busy} onClick={() => void save()}><Coins className="size-3.5" /> Change{renameFee != null ? ` · ${renameFee.toLocaleString()} LX` : ""}</Button>
        <span className="ml-3 text-[11px] text-[var(--text-dim)]">Once a week</span>
      </div>
    </div>
  )
}

/**
 * Staff only: a "Moderate" button in the clan's top bar. It opens the same kind of box as penalties do: take a picture
 * down, clear a description, fix a name, or delete a clan that breaks the rules. Everything is written to the clan's log.
 */
export function ModerateClan({ clan, onChanged, onDeleted, defaultOpen = false, hideTrigger = false, onClose }: { clan: ClanDetail; onChanged: () => void; onDeleted: () => void; defaultOpen?: boolean; hideTrigger?: boolean; onClose?: () => void }) {
  const [open, setOpenState] = useState(defaultOpen)
  const setOpen = (next: boolean) => { setOpenState(next); if (!next) onClose?.() }
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState(clan.name)
  const [tag, setTag] = useState(clan.tag)
  const [heir, setHeir] = useState("")
  const leader = (clan.members ?? []).find((member) => member.role === "leader")
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
      {!hideTrigger && (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] hover:border-[var(--line-strong)]">
          <ShieldAlert className="size-4" aria-hidden="true" /> Moderate
        </button>
      )}
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
            <div className="flex flex-col gap-2">
              <Label>Leader{leader ? `: ${leader.name}` : ""}</Label>
              <PlayerPicker value={heir} onChange={setHeir} label="New leader" placeholder="Pick any player or paste a Steam ID" />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[var(--text-dim)]">A player who is in no clan joins this one first. The old leader becomes a co-leader and both are told.</p>
                <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" disabled={busy || !heir} onClick={() => { if (window.confirm(`Make this player the leader of ${clan.name}? ${leader ? `${leader.name} becomes a co-leader.` : ""}`)) void run(() => clansService.moderateTransfer(clan.id, heir), `New leader of ${clan.name} set`, () => { setHeir(""); onChanged() }) }}>Make leader</Button>
              </div>
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
