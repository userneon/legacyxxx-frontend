import { useState } from "react"
import { toast } from "sonner"
import { Plus, RotateCcw, ShieldCheck } from "lucide-react"

import { penaltyAdminService, type ModerationAccess, type PenaltyKind } from "@/api/moderation-access"
import type { ApiError, PenaltyEntry } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

/** How long a penalty lasts, in minutes (0 is permanent). Shown as choices so nobody types a length by hand. */
export const TERMS: { label: string; minutes: number }[] = [
  { label: "1 hour", minutes: 60 },
  { label: "1 day", minutes: 1440 },
  { label: "7 days", minutes: 10_080 },
  { label: "30 days", minutes: 43_200 },
  { label: "Permanent", minutes: 0 },
]

const LIFT_LABEL: Record<string, string> = { ban: "Unban", comm: "Unmute", gag: "Ungag" }

function failure(error: unknown) {
  const status = (error as Partial<ApiError> | null)?.status
  if (status === 403) return "You are not allowed to do that."
  if (status === 409) return "That penalty was already lifted or changed."
  if (status === 404) return "That penalty no longer exists."
  if (status === 429) return "Too many tries. Wait a moment."
  return "Try again in a moment."
}

/** What the signed-in player may do to penalties. Everyone else gets { canManage: false } and sees nothing extra. */
export function useModerationAccess(): ModerationAccess | null {
  const { isAuthenticated } = useAuth()
  const { data } = useApiQuery<ModerationAccess>((signal) => penaltyAdminService.getAccess({ signal }), { enabled: isAuthenticated, queryKey: `moderation-access:${isAuthenticated}` })
  return data?.canManage ? data : null
}

function TermChoice({ value, onChange }: { value: number | null; onChange: (minutes: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Term">
      {TERMS.map((term) => (
        <button key={term.minutes} type="button" aria-pressed={value === term.minutes} onClick={() => onChange(term.minutes)} className={cn("h-8 rounded-lg border px-3 text-[13px] transition-colors", value === term.minutes ? "border-[var(--accent-solid)] bg-[var(--raised)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-dim)] hover:border-[var(--line-strong)] hover:text-[var(--text)]")}>{term.label}</button>
      ))}
    </div>
  )
}

/** Footer button of a penalty's drawer for staff: unban, unmute or ungag. Nothing for a penalty that is already lifted. */
export function PenaltyLiftButton({ penalty, access, onChanged }: { penalty: PenaltyEntry; access: ModerationAccess; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  if (penalty.isUnbanned || !access.can.unban) return null
  const lift = LIFT_LABEL[penalty.type] ?? "Lift"
  const run = async () => {
    if (!window.confirm(`${lift} ${penalty.player}?`)) return
    setBusy(true)
    try {
      await penaltyAdminService.lift(penalty.id)
      toast.success(`${penalty.player}: ${lift.toLowerCase()} done`)
      onChanged()
    } catch (error) {
      toast.error("That did not work", { description: failure(error) })
    } finally {
      setBusy(false)
    }
  }
  return (
    <button type="button" disabled={busy} onClick={() => void run()} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[13px] font-semibold text-[var(--status-green)] transition-colors hover:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50 disabled:opacity-50">
      <RotateCcw className="size-4" aria-hidden="true" /> {lift}
    </button>
  )
}

/** Staff-only block in a penalty's drawer: change its reason or length. A lifted penalty shows nothing here. */
export function PenaltyStaffControls({ penalty, access, onChanged }: { penalty: PenaltyEntry; access: ModerationAccess; onChanged: () => void }) {
  const [reason, setReason] = useState(penalty.reason)
  const [minutes, setMinutes] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  if (penalty.isUnbanned || !access.can.edit) return null

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true)
    try {
      await action()
      toast.success(done)
      onChanged()
    } catch (error) {
      toast.error("That did not work", { description: failure(error) })
    } finally {
      setBusy(false)
    }
  }
  const reasonChanged = reason.trim() !== penalty.reason && reason.trim().length > 0
  const changed = reasonChanged || minutes !== null
  return (
    <section aria-label="Staff" className="flex flex-col gap-3 rounded-xl border border-[var(--line)] p-3.5">
      <span className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]"><ShieldCheck className="size-3.5" aria-hidden="true" /> Staff</span>
      {access.can.edit && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="penalty-reason" className="text-xs text-[var(--text-dim)]">Reason</Label>
            <textarea id="penalty-reason" rows={2} maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} className="w-full resize-none rounded-lg border border-[var(--line)] bg-transparent px-3 py-2 text-[13px] text-[var(--text)] outline-none transition-[border-color] focus:border-[var(--text-faint)]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-[var(--text-dim)]">New term · counts from now</span>
            <TermChoice value={minutes} onChange={setMinutes} />
          </div>
          <div>
            <Button type="button" variant="outline" size="sm" disabled={busy || !changed} onClick={() => void run(() => penaltyAdminService.change(penalty.id, { ...(reasonChanged ? { reason: reason.trim() } : {}), ...(minutes !== null ? { durationMinutes: minutes } : {}) }), "Penalty updated")}>Save changes</Button>
          </div>
        </>
      )}
    </section>
  )
}

/** Staff-only: issue a ban, mute or gag by Steam ID from the Penalties page. */
export function IssuePenaltyDialog({ open, onOpenChange, access, onIssued }: { open: boolean; onOpenChange: (open: boolean) => void; access: ModerationAccess; onIssued: () => void }) {
  const [steamId, setSteamId] = useState("")
  const [type, setType] = useState<PenaltyKind>("ban")
  const [minutes, setMinutes] = useState<number>(1440)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const kinds = ([["ban", "Ban", access.can.ban], ["comm", "Mute", access.can.ban || access.can.edit || access.can.unban], ["gag", "Gag", access.can.ban || access.can.edit || access.can.unban]] as const).filter((entry) => entry[2])
  const valid = /^7656119\d{10}$/.test(steamId.trim()) && reason.trim().length > 0
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    try {
      await penaltyAdminService.issue({ steamId: steamId.trim(), type, durationMinutes: minutes, reason: reason.trim() })
      toast.success("Penalty issued")
      setSteamId(""); setReason("")
      onOpenChange(false)
      onIssued()
    } catch (error) {
      toast.error("That did not work", { description: failure(error) })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>New penalty</DialogTitle>
          <DialogDescription>Issues a penalty to the player by Steam ID. It shows on the Penalties page and their profile.</DialogDescription>
        </DialogHeader>
        <form className="mt-2 flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="penalty-steam">Steam ID (64-bit)</Label>
            <Input id="penalty-steam" inputMode="numeric" placeholder="7656119…" value={steamId} onChange={(event) => setSteamId(event.target.value)} />
          </div>
          <div className="flex gap-2" role="group" aria-label="Type">
            {kinds.map(([value, label]) => (
              <button key={value} type="button" aria-pressed={type === value} onClick={() => setType(value)} className={cn("h-9 flex-1 rounded-lg border text-[13px] transition-colors", type === value ? "border-[var(--accent-solid)] bg-[var(--raised)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-dim)] hover:border-[var(--line-strong)]")}>{label}</button>
            ))}
          </div>
          <div className="flex flex-col gap-2"><Label>Term</Label><TermChoice value={minutes} onChange={setMinutes} /></div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="penalty-new-reason">Reason</Label>
            <Input id="penalty-new-reason" maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <button type="submit" disabled={!valid || busy} className="lx-primary-button inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold disabled:opacity-50"><Plus className="size-4" aria-hidden="true" />Issue</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
