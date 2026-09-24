/**
 * Staff Panel → Phantom anti-cheat review. Suspension cases come from the Phantom plugin; staff clear, keep or
 * confirm each one with an audited note (8+ characters, checked again by the API). Confirming queues a separate
 * permanent-ban action with the usual 10-second player notice. Raw evidence is shown for investigation only.
 */
import { useState } from "react"
import { History, Loader2, ShieldAlert } from "lucide-react"

import { staffPanelService } from "@/api/staffpanel"
import type { ApiError, PhantomEvidenceEntry, PhantomReviewDecision, PhantomSuspensionCase } from "@/api/types"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { EmptyState, ErrorState } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useApiQuery } from "@/hooks/use-api-query"

const DECISION_LABEL: Record<PhantomReviewDecision, string> = { clear: "Clear", keep: "Keep suspended", confirm_ban: "Confirm ban" }

export function StaffPhantomReview() {
  const cases = useApiQuery((signal) => staffPanelService.phantomCases({ signal }), { queryKey: "phantom-cases" })
  const evidence = useApiQuery((signal) => staffPanelService.phantomEvidence({ signal }), { queryKey: "phantom-evidence" })
  const [review, setReview] = useState<{ item: PhantomSuspensionCase; decision: PhantomReviewDecision } | null>(null)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const open = (item: PhantomSuspensionCase, decision: PhantomReviewDecision) => {
    setReview({ item, decision })
    setNote("")
    setError(null)
  }

  const submit = async () => {
    if (!review) return
    if (note.trim().length < 8) {
      setError("Write a review note of at least 8 characters.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await staffPanelService.reviewPhantomCase(review.item.id, { decision: review.decision, note: note.trim() })
      setDone(`${DECISION_LABEL[review.decision]}: ${review.item.steam_id}. The decision is audited${review.decision === "confirm_ban" ? " and a permanent ban is queued" : ""}.`)
      setReview(null)
      cases.refetch()
    } catch (reason) {
      setError((reason as ApiError)?.message || "The review could not be saved. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const list: PhantomSuspensionCase[] = cases.data?.cases ?? []
  const signals: PhantomEvidenceEntry[] = evidence.data?.evidence ?? []

  return (
    <section className="grid gap-4">
      <div className="rounded-2xl border border-white/10 bg-card/70 p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShieldAlert className="h-4 w-4 text-text-2" aria-hidden />
          Phantom suspension review
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Clearing or keeping a suspension needs an audited note. Confirming queues a separate permanent ban with the 10-second player notice.
        </p>
        {done && <p className="mt-3 rounded-lg border border-line bg-raised px-3 py-2 text-xs text-text" role="status">{done}</p>}
        <div className="mt-4">
          {cases.loading && !cases.data ? (
            <div className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading Phantom cases
            </div>
          ) : cases.error && !cases.data ? (
            <ErrorState onRetry={cases.refetch} />
          ) : list.length === 0 ? (
            <EmptyState>No Phantom suspension cases have been received.</EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-2 font-medium">Player</th>
                    <th className="px-3 py-2 font-medium">Score</th>
                    <th className="px-3 py-2 font-medium">Evidence</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((item) => {
                    const reviewable = item.status === "SUSPENDED"
                    return (
                      <tr key={item.id} className="border-b border-white/5 last:border-b-0">
                        <td className="px-3 py-2.5">
                          <p className="font-mono text-text select-text">{item.steam_id}</p>
                          <p className="text-[11px] text-muted-foreground">{item.server_id} · {item.evidence_count} signals</p>
                        </td>
                        <td className="px-3 py-2.5 font-semibold tabular-nums text-text">{item.suspicion_score.toFixed(1)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {item.evidence_summary.latest_interaction || "—"} · {Math.round((item.evidence_summary.evidence_confidence || 0) * 100)}%
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", reviewable ? "border-line-strong bg-raised text-text" : "border-line text-muted-foreground")}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-1.5">
                            <Button size="xs" variant="outline" disabled={!reviewable} onClick={() => open(item, "clear")}>Clear</Button>
                            <Button size="xs" variant="outline" disabled={!reviewable} onClick={() => open(item, "keep")}>Keep</Button>
                            <Button size="xs" variant="secondary" disabled={!reviewable} onClick={() => open(item, "confirm_ban")}>Confirm ban</Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-card/70 p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <History className="h-4 w-4 text-text-2" aria-hidden />
          Phantom evidence timeline
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">Raw signals for investigation. They never ban anyone by themselves.</p>
        <div className="mt-4 space-y-2">
          {signals.length === 0 ? (
            <p className="text-sm text-muted-foreground">{evidence.loading ? "Loading evidence…" : "No Phantom evidence has been received."}</p>
          ) : (
            signals.slice(0, 20).map((item) => (
              <div key={item.id} className="flex flex-col justify-between gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs sm:flex-row sm:items-center">
                <span className="font-mono text-text select-text">{item.steam_id}</span>
                <span className="text-muted-foreground">
                  {item.interaction_type.replace("_", " ")} · round {item.round_number} · score {item.suspicion_score.toFixed(1)} · {Math.round(item.evidence_confidence * 100)}% confidence
                </span>
                <span className="text-muted-foreground">{formatDateTime(item.occurred_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={Boolean(review)} onOpenChange={(next) => !next && !saving && setReview(null)}>
        <DialogContent>
          {review && (
            <>
              <DialogHeader>
                <DialogTitle>{DECISION_LABEL[review.decision]}</DialogTitle>
                <DialogDescription>
                  Phantom case for <span className="font-mono">{review.item.steam_id}</span> on {review.item.server_id}. This decision is audited.
                  {review.decision === "confirm_ban" && " Confirming queues a permanent ban with a 10-second notice to the player."}
                </DialogDescription>
              </DialogHeader>
              <label className="flex flex-col gap-1.5 text-sm text-text-2" htmlFor="phantom-review-note">
                Review note
                <Textarea id="phantom-review-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What did you check, and why this decision?" maxLength={1000} />
              </label>
              {error && <p className="m-0 text-xs text-text-2" role="alert">{error}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setReview(null)} disabled={saving}>Cancel</Button>
                <Button onClick={() => void submit()} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {DECISION_LABEL[review.decision]}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
