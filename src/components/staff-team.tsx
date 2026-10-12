import { useState } from "react"
import { Pencil, Plus, RotateCcw, Shield } from "lucide-react"
import { toast } from "sonner"

import { get, patch, post } from "@/api/client"
import { PlayerAvatar } from "@/components/player-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

type StaffRole = "OWNER" | "MANAGER" | "ADMIN" | "DEVELOPER" | "DESIGNER"
type StaffStatus = "active" | "suspended" | "revoked"
interface StaffMember { id: string; userId: string; username: string; steamId: string; avatar: string; role: StaffRole; status: StaffStatus; stamina: number; immunity: number; createdAt: string }

const ROLES: Array<{ id: StaffRole; label: string; note: string; level: number }> = [
  { id: "OWNER", label: "Owner", note: "Everything, including this list", level: 1000 },
  { id: "MANAGER", label: "Manager", note: "Staff tools, server console, creators", level: 750 },
  { id: "ADMIN", label: "Admin", note: "Bans, mutes, kicks in game and on the site", level: 500 },
  { id: "DEVELOPER", label: "Developer", note: "Team badge, no moderation", level: 0 },
  { id: "DESIGNER", label: "Designer", note: "Team badge, no moderation", level: 0 },
]
const STATUS_LABEL: Record<StaffStatus, string> = { active: "Active", suspended: "Suspended", revoked: "Removed" }

const input = "h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--text-faint)] focus:outline-none"
const secondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"

type Draft = { id: string | null; steamId: string; role: StaffRole; immunity: number; stamina: number }

function RolePicker({ value, onChange }: { value: StaffRole; onChange: (role: StaffRole) => void }) {
  return (
    <div role="radiogroup" aria-label="Role" className="grid gap-1.5 sm:grid-cols-5">
      {ROLES.map((role) => (
        <button key={role.id} type="button" role="radio" aria-checked={value === role.id} onClick={() => onChange(role.id)} className={cn("flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors", value === role.id ? "border-[var(--brand)] bg-[var(--raised)]" : "border-[var(--line)] hover:border-[var(--line-strong)]")}>
          <span className="text-[13px] font-semibold text-[var(--text)]">{role.label}</span>
          <span className="text-[11px] leading-snug text-[var(--text-dim)]">{role.note}</span>
        </button>
      ))}
    </div>
  )
}

/** Staff → Team: the Owner adds staff by SteamID, changes their role, and suspends or removes them. Others see why they cannot. */
export function StaffTeam() {
  const { data, loading, error, refetch } = useApiQuery((signal) => get<StaffMember[]>("/api/v1/staffpanel/staff", undefined, { signal }), { queryKey: "staff-team" })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true)
    try {
      await work()
      toast.success(done)
      setDraft(null)
      refetch()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "That did not work")
    } finally {
      setBusy(false)
    }
  }
  const save = () => {
    if (!draft) return
    if (draft.id) return run(() => patch(`/api/v1/staffpanel/staff/${draft.id}`, { role: draft.role, immunity: draft.immunity, stamina: draft.stamina }), "Staff member updated")
    if (!/^7656119\d{10}$/.test(draft.steamId.trim())) { toast.error("Enter the player's SteamID64 (7656119…)"); return }
    return run(() => post("/api/v1/staffpanel/staff", { steamId: draft.steamId.trim(), role: draft.role, immunity: draft.immunity, stamina: draft.stamina }), "Added to the staff")
  }
  const setStatus = (member: StaffMember, status: StaffStatus) => run(() => patch(`/api/v1/staffpanel/staff/${member.id}`, { status }), `${member.username}: ${STATUS_LABEL[status].toLowerCase()}`)
  const pickRole = (role: StaffRole) => draft && setDraft({ ...draft, role, immunity: ROLES.find((entry) => entry.id === role)!.level, stamina: ROLES.find((entry) => entry.id === role)!.level })

  if (error && !data) {
    return (
      <p className="flex items-center justify-center gap-3 px-6 py-16 text-[13px] text-[var(--text-dim)]">
        {error.status === 403 ? "Only the Owner can change the staff list." : <>Could not load the staff list.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></>}
      </p>
    )
  }

  const members = data ?? []
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-5 max-md:px-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--text-muted)]">Who is on the LEGACY-X team and what they can do. The game servers pick up a change within a minute.</p>
        {!draft && <button type="button" onClick={() => setDraft({ id: null, steamId: "", role: "ADMIN", immunity: 500, stamina: 500 })} className="lx-primary-button inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold"><Plus className="size-4" />Add staff</button>}
      </div>

      {draft && (
        <section aria-label={draft.id ? "Edit staff member" : "Add staff member"} className="lx-add-box flex flex-col gap-3 rounded-2xl border p-[18px]">
          <div className="flex items-center gap-2.5"><span className="lx-add-icon"><Shield className="size-4" /></span><span className="flex flex-col"><span className="text-[15px] font-semibold text-[var(--text)]">{draft.id ? "Edit staff member" : "Add staff"}</span><span className="text-xs text-[var(--text-dim)]">The game servers pick it up within a minute.</span></span></div>
          {!draft.id && (
            <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">SteamID64
              <input className={input} value={draft.steamId} onChange={(event) => setDraft({ ...draft, steamId: event.target.value })} placeholder="7656119…" inputMode="numeric" />
            </label>
          )}
          <RolePicker value={draft.role} onChange={pickRole} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Immunity (0–1000: who they can act on in game)
              <input className={input} type="number" min={0} max={1000} value={draft.immunity} onChange={(event) => setDraft({ ...draft, immunity: Math.max(0, Math.min(1000, Number(event.target.value) || 0)) })} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">Stamina (0–1000: how many actions in a row)
              <input className={input} type="number" min={0} max={1000} value={draft.stamina} onChange={(event) => setDraft({ ...draft, stamina: Math.max(0, Math.min(1000, Number(event.target.value) || 0)) })} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} className={secondary}>Cancel</button>
            <button type="button" disabled={busy} onClick={() => void save()} className="lx-primary-button inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold disabled:opacity-50">{draft.id ? "Save" : "Add"}</button>
          </div>
        </section>
      )}

      {loading && !data ? (
        <div className="flex flex-col gap-2" aria-hidden="true">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-16 rounded-xl bg-[var(--card-surface)]" />)}</div>
      ) : members.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-[var(--text-dim)]">No staff yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <li key={member.id} className={cn("lx-add-box flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3", member.status !== "active" && "opacity-60 saturate-50")}>
              <PlayerAvatar avatar={member.avatar || undefined} name={member.username} className="size-9 shrink-0 rounded-lg text-[11px] ring-1 ring-[var(--brand)]/40" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13px] font-semibold text-[var(--text)]">{member.username}</span>
                <span className="truncate text-xs text-[var(--text-dim)]">{member.steamId} · immunity {member.immunity} · stamina {member.stamina}</span>
              </span>
              <span className="inline-flex h-6 items-center rounded-full border border-[var(--brand)]/45 bg-[var(--brand)]/12 px-2.5 text-xs font-semibold text-[var(--brand-bright)]">{ROLES.find((role) => role.id === member.role)?.label ?? member.role}</span>
              {member.status !== "active" && <span className="text-xs text-[var(--text-dim)]">{STATUS_LABEL[member.status]}</span>}
              <button type="button" aria-label={`Edit ${member.username}`} onClick={() => setDraft({ id: member.id, steamId: member.steamId, role: member.role, immunity: member.immunity, stamina: member.stamina })} className={cn(secondary, "w-9 px-0")}><Pencil className="size-4" /></button>
              {member.status === "active" ? (
                <>
                  <button type="button" disabled={busy} onClick={() => void setStatus(member, "suspended")} className={secondary}>Suspend</button>
                  <button type="button" disabled={busy} onClick={() => void setStatus(member, "revoked")} className={secondary}>Remove</button>
                </>
              ) : (
                <button type="button" disabled={busy} onClick={() => void setStatus(member, "active")} className={secondary}>Reactivate</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
