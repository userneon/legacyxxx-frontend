import { useState } from "react"
import { Check, Plus, RotateCcw, ScanSearch, Trash2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { checksService, type CheckFinding, type PlayerCheck, type PlayerCheckDetail } from "@/api/checks"
import type { ApiError } from "@/api/types"
import { NewCheckDialog } from "@/components/new-check-dialog"
import { PageBar } from "@/components/page-tabs"
import { RelativeTime } from "@/components/relative-time"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

const STATUS: Record<PlayerCheck["status"], string> = { pending: "Waiting for the player", completed: "Done", expired: "Code expired" }
const KIND: Record<CheckFinding["kind"], string> = { file: "File", process: "Process", trace: "Trace", steam: "Steam", tamper: "Tampering" }

function StatusDot({ status }: { status: PlayerCheck["status"] }) {
  return <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", status === "completed" ? "bg-[var(--status-green)]" : status === "pending" ? "bg-[var(--text-2)]" : "bg-[var(--text-faint)]")} />
}

function Detail({ id, onClose, onRemoved }: { id: string; onClose: () => void; onRemoved: () => void }) {
  const { data, loading, error, refetch } = useApiQuery<PlayerCheckDetail>((signal) => checksService.get(id, { signal }), { queryKey: `check:${id}` })
  const [busy, setBusy] = useState(false)
  const remove = async () => {
    if (!window.confirm("Remove this check and its result for good?")) return
    setBusy(true)
    try { await checksService.remove(id); onRemoved(); onClose() } catch (caught) { toast.error("Could not remove it", { description: (caught as Partial<ApiError>)?.status === 403 ? "An Admin can only remove their own checks." : "Try again in a moment." }) } finally { setBusy(false) }
  }
  const report = data?.report ?? null
  const detections = report?.findings.filter((finding) => finding.confidence === "detection") ?? []
  const suspicions = report?.findings.filter((finding) => finding.confidence === "suspicion") ?? []
  const group = (title: string, list: CheckFinding[]) => list.length > 0 && (
    <section className="flex flex-col gap-1.5" aria-label={title}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">{title} <span className="text-[var(--text-faint)]">{list.length}</span></h3>
      <ul className="flex flex-col gap-1.5">
        {list.map((finding, index) => (
          <li key={`${finding.name}:${index}`} className="rounded-lg border border-[var(--line-soft)] bg-[var(--card-surface)] px-3 py-2">
            <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text)]">{finding.name}</span><span className="shrink-0 rounded-md border border-[var(--line)] px-1.5 py-px text-[10px] text-[var(--text-muted)]">{KIND[finding.kind]}</span></div>
            {finding.path && <p className="mt-0.5 truncate text-[11px] text-[var(--text-dim)]" title={finding.path}>{finding.path}</p>}
            {finding.note && <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{finding.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{data ? data.targetName ?? data.targetSteamId : "Check"}</DialogTitle>
          <DialogDescription>{data ? `Asked by ${data.requestedBy} · ${STATUS[data.status]}` : "Loading…"}</DialogDescription>
        </DialogHeader>
        {loading && !data ? <Skeleton className="h-40 rounded-xl" /> : error || !data ? (
          <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load this check.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
        ) : !report ? (
          <p className="text-[13px] text-[var(--text-dim)]">{data.status === "pending" ? "The player has not run the checker yet. The code ends at the time shown in the list." : "No result: the code ended before the player used it."}</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[var(--line-soft)] px-2 py-2"><b className={cn("block text-xl", report.detections > 0 && "text-[var(--status-red)]")}>{report.detections}</b><span className="text-[11px] text-[var(--text-dim)]">detections</span></div>
              <div className="rounded-lg border border-[var(--line-soft)] px-2 py-2"><b className="block text-xl">{report.suspicions}</b><span className="text-[11px] text-[var(--text-dim)]">suspicions</span></div>
              <div className="rounded-lg border border-[var(--line-soft)] px-2 py-2"><b className="block text-xl">{report.filesScanned.toLocaleString()}</b><span className="text-[11px] text-[var(--text-dim)]">files · {report.durationSeconds < 90 ? `${report.durationSeconds} s` : `${Math.round(report.durationSeconds / 60)} min`}</span></div>
            </div>
            {!report.matchesTarget && (
              <p className="flex items-start gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 py-2 text-xs text-[var(--text-2)]"><TriangleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />The player's Steam account was not among the accounts found on this PC. It may have been run on another computer.</p>
            )}
            {report.findings.length === 0 ? <p className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]"><Check className="size-4 text-[var(--status-green)]" aria-hidden="true" />Nothing was found.</p> : <>{group("Detections", detections)}{group("Suspicions", suspicions)}</>}
            <p className="text-[11px] leading-relaxed text-[var(--text-dim)]">A result is not a verdict. Read it, look at the player's history, and decide. Checker {report.checkerVersion}.</p>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <Button type="button" variant="outline" onClick={() => void remove()} disabled={busy}><Trash2 className="size-4" aria-hidden="true" /> Remove</Button>
          <Button type="button" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Staff page: ask a player to run the checker, and read what came back. Results are deleted after 30 days. */
export function ChecksPage() {
  const { data, loading, error, refetch } = useApiQuery<PlayerCheck[]>((signal) => checksService.list({ signal }), { queryKey: "checks" })
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const forbidden = (error as Partial<ApiError> | null)?.status === 403

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        <span className="text-[13px] font-semibold text-[var(--text)]">Player checks</span>
        {!forbidden && (
          <button type="button" onClick={() => setCreating(true)} className="lx-primary-button ml-auto inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold"><Plus className="size-4" aria-hidden="true" /> Ask for a check</button>
        )}
      </PageBar>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-md:px-4">
        {loading && !data ? (
          <div className="flex flex-col gap-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-14 rounded-xl" />)}</div>
        ) : forbidden ? (
          <p className="py-24 text-center text-[13px] text-[var(--text-dim)]">Only an Admin, Manager or Owner can use this page.</p>
        ) : error || !data ? (
          <p className="flex items-center justify-center gap-3 py-24 text-[13px] text-[var(--text-dim)]">Could not load the checks.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
        ) : data.length === 0 ? (
          <p className="flex items-center gap-2 py-8 text-[13px] text-[var(--text-dim)]"><ScanSearch className="size-4" aria-hidden="true" /> No checks yet. Ask for one and send the player the code.</p>
        ) : (
          <ul className="flex max-w-3xl flex-col gap-2">
            {data.map((check) => (
              <li key={check.id}>
                <button type="button" onClick={() => setOpen(check.id)} className="flex w-full items-center gap-3 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] px-4 py-3 text-left transition-colors hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50">
                  <StatusDot status={check.status} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-semibold text-[var(--text)]">{check.targetName ?? check.targetSteamId}</span>
                    <span className="truncate text-[11px] text-[var(--text-dim)]">{STATUS[check.status]} · asked by {check.requestedBy} · <RelativeTime value={check.createdAt} /></span>
                  </span>
                  {check.summary && (
                    <span className="flex shrink-0 items-center gap-3 text-xs">
                      <span className={cn("font-semibold", check.summary.detections > 0 ? "text-[var(--status-red)]" : "text-[var(--text-muted)]")}>{check.summary.detections} detections</span>
                      <span className="text-[var(--text-muted)]">{check.summary.suspicions} suspicions</span>
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <NewCheckDialog open={creating} onOpenChange={setCreating} onCreated={() => void refetch()} />
      {open && <Detail id={open} onClose={() => setOpen(null)} onRemoved={() => void refetch()} />}
    </div>
  )
}
