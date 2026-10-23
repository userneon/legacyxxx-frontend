import { useState } from "react"
import { Pencil, Plus, RotateCcw, Shield } from "lucide-react"
import { toast } from "sonner"

import { get, patch, post } from "@/api/client"
import { PlayerAvatar } from "@/components/player-avatar"
import { STAFF_BODY, type Tone } from "@/components/staff-ui"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

type StaffRole = "OWNER" | "MANAGER" | "ADMIN" | "DEVELOPER" | "DESIGNER"
type StaffStatus = "active" | "suspended" | "revoked"
interface StaffMember { id: string; userId: string; username: string; steamId: string; avatar: string; role: StaffRole; status: StaffStatus; stamina: number; immunity: number; expiresAt: string | null; createdAt: string }

/** Each role has its own colour (owner request 2026-10-23): Owner violet, Manager red, Admin sky, Developer green, Designer amber. */
const ROLES: Array<{ id: StaffRole; label: string; note: string; level: number; tone: Tone }> = [
  { id: "OWNER", label: "Owner", note: "Everything, including this list", level: 1000, tone: "violet" },
  { id: "MANAGER", label: "Manager", note: "Staff tools, server console, creators", level: 750, tone: "red" },
  { id: "ADMIN", label: "Admin", note: "Bans, mutes, kicks in game and on the site", level: 500, tone: "sky" },
  { id: "DEVELOPER", label: "Developer", note: "Team badge, no moderation", level: 0, tone: "green" },
  { id: "DESIGNER", label: "Designer", note: "Team badge, no moderation", level: 0, tone: "amber" },
]
const STATUS_LABEL: Record<StaffStatus, string> = { active: "Active", suspended: "Suspended", revoked: "Removed" }

const input = "h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--text-faint)] focus:outline-none"
const secondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"

type Draft = { id: string | null; steamId: string; role: StaffRole; immunity: number; stamina: number; term: Term; until: string }

/** How long a grant lasts: no end, a fixed number of days from now, or a chosen date. */
type Term = "none" | "7" | "30" | "90" | "date"
const TERMS: Array<{ id: Term; label: string }> = [
  { id: "none", label: "No end" },
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "date", label: "Until a date" },
]
const DAY = 86_400_000

/** The end date the API gets: null for no end, else the end of the chosen day (local time). */
function endOf(draft: Draft): string | null | "invalid" {
  if (draft.term === "none") return null
  if (draft.term === "date") {
    const end = new Date(`${draft.until}T23:59:59`)
    return Number.isFinite(end.getTime()) && end.getTime() > Date.now() ? end.toISOString() : "invalid"
  }
  return new Date(Date.now() + Number(draft.term) * DAY).toISOString()
}

function untilText(expiresAt: string | null) {
  if (!expiresAt) return "No end"
  const date = new Date(expiresAt)
  const days = Math.ceil((date.getTime() - Date.now()) / DAY)
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  return days <= 0 ? `Ended ${day}` : `Until ${day} · ${days} day${days === 1 ? "" : "s"} left`
}

function RolePicker({ value, onChange }: { value: StaffRole; onChange: (role: StaffRole) => void }) {
  return (
    <div role="radiogroup" aria-label="Role" className="grid gap-1.5 sm:grid-cols-5">
      {ROLES.map((role) => (
        <button key={role.id} type="button" role="radio" aria-checked={value === role.id} data-tone={role.tone} onClick={() => onChange(role.id)} className={cn("lx-tone flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors", value === role.id ? "border-[var(--tone)] bg-[var(--raised)]" : "border-[var(--line)]")}>
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
    const expiresAt = endOf(draft)
    if (expiresAt === "invalid") { toast.error("Pick a date after today"); return }
    if (draft.id) return run(() => patch(`/api/v1/staffpanel/staff/${draft.id}`, { role: draft.role, immunity: draft.immunity, stamina: draft.stamina, expiresAt }), "Staff member updated")
    if (!/^7656119\d{10}$/.test(draft.steamId.trim())) { toast.error("Enter the player's SteamID64 (7656119…)"); return }
    return run(() => post("/api/v1/staffpanel/staff", { steamId: draft.steamId.trim(), role: draft.role, immunity: draft.immunity, stamina: draft.stamina, expiresAt }), "Added to the staff")
  }
  const setStatus = (member: StaffMember, status: StaffStatus) => run(() => patch(`/api/v1/staffpanel/staff/${member.id}`, status === "active" && member.expiresAt && Date.parse(member.expiresAt) <= Date.now() ? { status, expiresAt: null } : { status }), `${member.username}: ${STATUS_LABEL[status].toLowerCase()}`)
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
    <div className={STAFF_BODY}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--text-muted)]">The LEGACY-X team. Game servers update within a minute.</p>
        {!draft && <button type="button" onClick={() => setDraft({ id: null, steamId: "", role: "ADMIN", immunity: 500, stamina: 500, term: "none", until: "" })} className="lx-primary-button inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold"><Plus className="size-4" />Add staff</button>}
      </div>

      {draft && (
        <section aria-label={draft.id ? "Edit staff member" : "Add staff member"} className="relative lx-add-box flex flex-col gap-3 rounded-2xl border p-[18px]">
          <div className="flex items-center gap-2.5"><span className="lx-add-icon"><Shield className="size-4" /></span><span className="flex flex-col"><span className="text-[15px] font-semibold text-[var(--text)]">{draft.id ? "Edit staff member" : "Add staff"}</span><span className="text-xs text-[var(--text-dim)]">The game servers pick it up within a minute.</span></span></div>
          {!draft.id && (
            <label className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">SteamID64
              <input className={input} value={draft.steamId} onChange={(event) => setDraft({ ...draft, steamId: event.target.value })} placeholder="7656119…" inputMode="numeric" />
            </label>
          )}
          <RolePicker value={draft.role} onChange={pickRole} />
          <div className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">How long
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="How long">
              {TERMS.map((term) => (
                <button key={term.id} type="button" aria-pressed={draft.term === term.id} onClick={() => setDraft({ ...draft, term: term.id })} className="h-8 rounded-lg border border-[var(--line)] px-3 text-[13px] text-[var(--text-muted)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]">{term.label}</button>
              ))}
              {draft.term === "date" && <input type="date" aria-label="End date" className={cn(input, "h-8 w-auto [color-scheme:dark]")} min={new Date(Date.now() + DAY).toISOString().slice(0, 10)} value={draft.until} onChange={(event) => setDraft({ ...draft, until: event.target.value })} />}
            </div>
            <span className="text-[11px] text-[var(--text-dim)]">{draft.term === "none" ? "Stays until you change it." : "Ends on its own: the role is suspended on that day."}</span>
          </div>
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-[230px] rounded-2xl bg-[var(--glass-fill)]" />)}</div>
      ) : members.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-[var(--text-dim)]">No staff yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <li key={member.id} data-tone={ROLES.find((role) => role.id === member.role)?.tone} className={cn("lx-tone relative flex flex-col gap-3.5 rounded-2xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-[18px]", member.status !== "active" && "opacity-60 saturate-50")}>
              <div className="flex items-center gap-3">
                <PlayerAvatar avatar={member.avatar || undefined} name={member.username} className="size-12 shrink-0 rounded-xl text-[13px] ring-1 ring-[color-mix(in_oklab,var(--tone)_45%,transparent)]" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-[15px] font-semibold text-[var(--text)]" title={member.username}>{member.username}</span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="lx-tone-text inline-flex h-6 items-center rounded-full border border-[color-mix(in_oklab,var(--tone)_45%,transparent)] bg-[color-mix(in_oklab,var(--tone)_12%,transparent)] px-2.5 text-xs font-semibold">{ROLES.find((role) => role.id === member.role)?.label ?? member.role}</span>
                    {member.status !== "active" && <span className="text-xs text-[var(--text-dim)]">{STATUS_LABEL[member.status]}</span>}
                  </span>
                </span>
              </div>
              <div className="lx-stat-grid grid-cols-2">
                <span className="lx-stat-cell gap-1 px-3 py-2"><span className="lx-stat-label">Immunity</span><span className="text-[15px] font-semibold text-[var(--text)]">{member.immunity}</span></span>
                <span className="lx-stat-cell gap-1 px-3 py-2"><span className="lx-stat-label">Stamina</span><span className="text-[15px] font-semibold text-[var(--text)]">{member.stamina}</span></span>
              </div>
              <span className="flex flex-col gap-0.5 text-[11px] text-[var(--text-dim)]">
                <span className={cn(member.expiresAt && "lx-tone-text")}>{untilText(member.expiresAt)}</span>
                <span className="truncate">{member.steamId}</span>
              </span>
              <div className="mt-auto flex gap-2">
                <button type="button" aria-label={`Edit ${member.username}`} onClick={() => setDraft({ id: member.id, steamId: member.steamId, role: member.role, immunity: member.immunity, stamina: member.stamina, term: member.expiresAt ? "date" : "none", until: member.expiresAt ? member.expiresAt.slice(0, 10) : "" })} className={cn(secondary, "w-9 shrink-0 px-0")}><Pencil className="size-4" /></button>
                {member.status === "active" ? (
                  <>
                    <button type="button" disabled={busy} onClick={() => void setStatus(member, "suspended")} className={cn(secondary, "flex-1")}>Suspend</button>
                    <button type="button" disabled={busy} onClick={() => void setStatus(member, "revoked")} className={cn(secondary, "flex-1")}>Remove</button>
                  </>
                ) : (
                  <button type="button" disabled={busy} onClick={() => void setStatus(member, "active")} className={cn(secondary, "flex-1")}>Reactivate</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
