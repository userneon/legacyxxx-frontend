/** Report a player from their profile (owner request 2026-11-13): a category, what happened in a few words and, if there is one, a link to a clip or
 *  screenshot. Staff read it on the staff site and the reporter is told the outcome in the bell; the player reported is never told who reported. */
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { REPORT_CATEGORIES, reportsService, type ReportCategory } from "@/api/reports"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const field = "w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--line-strong)] focus:outline-none"
const REASON_MIN = 5

export function ReportPlayerDialog({ open, onOpenChange, userId, name }: { open: boolean; onOpenChange: (open: boolean) => void; userId: string; name: string }) {
  const [category, setCategory] = useState<ReportCategory | null>(null)
  const [reason, setReason] = useState("")
  const [evidence, setEvidence] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = category !== null && reason.trim().length >= REASON_MIN

  const send = async () => {
    if (!category || sending) return
    setSending(true)
    setError(null)
    try {
      await reportsService.create({ reportedUserId: userId, category, reason: reason.trim(), evidenceUrl: evidence.trim() || undefined })
      toast.success("Report sent. Staff will look at it and you will see the answer in your notifications.")
      setCategory(null)
      setReason("")
      setEvidence("")
      onOpenChange(false)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not send the report.")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Report {name}</DialogTitle>
          <DialogDescription>Staff read every report. {name} is never told who reported them. Please report only what you saw.</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="What happened" className="flex flex-col gap-1.5">
          {REPORT_CATEGORIES.map((entry) => (
            <button key={entry.id} type="button" role="radio" aria-checked={category === entry.id} onClick={() => setCategory(entry.id)} className={cn("flex flex-col rounded-lg border px-3 py-2 text-left transition-colors", category === entry.id ? "border-[var(--text)] bg-[var(--raised)] ring-1 ring-[var(--text)]" : "border-[var(--line)] hover:bg-[var(--raised)]")}>
              <span className="text-[13px] font-semibold text-[var(--text)]">{entry.label}</span>
              <span className="text-[11px] text-[var(--text-dim)]">{entry.hint}</span>
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">What happened</span>
          <textarea value={reason} maxLength={300} rows={3} onChange={(event) => setReason(event.target.value)} placeholder="For example: walls in round 4 on Mirage, he pre-aimed every angle" className={cn(field, "resize-none py-2")} />
          <span className="text-right text-[11px] text-[var(--text-faint)]">{reason.length}/300</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">Clip or screenshot link (optional)</span>
          <input value={evidence} maxLength={300} onChange={(event) => setEvidence(event.target.value)} placeholder="https://youtu.be/..." inputMode="url" className={cn(field, "h-9")} />
        </label>
        {error && <p role="alert" className="text-xs text-[var(--text-2)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className="inline-flex h-9 items-center rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3.5 text-[13px] text-[var(--text-2)] hover:border-[var(--line-strong)]">Cancel</button>
          <button type="button" disabled={!ready || sending} onClick={() => void send()} className="lx-primary-button inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50">
            {sending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}Send report
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
