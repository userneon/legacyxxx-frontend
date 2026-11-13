/** Staff → Reports (owner request 2026-11-13): what players reported from the website, oldest first. A card shows who reported whom, why, the evidence link,
 *  how many other open reports the same player has and whether they are already banned; staff open the case, then answer "Action taken" or "No action"
 *  (with an optional note). The reporter is told the outcome in the bell. Real data from GET /moderation/reports. */
import { useState } from "react"
import { ExternalLink, Flag, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { reportCategoryLabel, reportsService, type StaffReport } from "@/api/reports"
import { PlayerAvatar } from "@/components/player-avatar"
import { RelativeTime } from "@/components/relative-time"
import { CardIcon, STAFF_BODY, STAFF_CARD, STAFF_GRID, StaffEmpty, StaffSection, type Tone } from "@/components/staff-ui"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

const TONE: Record<string, Tone> = { cheating: "red", griefing: "amber", toxic: "sky", boosting: "violet", other: "grey" }
const note = "h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--text-faint)] focus:outline-none"
const secondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"

function ReportCard({ report, onCase, onAnswered }: { report: StaffReport; onCase: (steamId: string) => void; onAnswered: () => void }) {
  const [answering, setAnswering] = useState<"actioned" | "dismissed" | null>(null)
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const open = report.status === "open"
  const answer = async () => {
    if (!answering) return
    setBusy(true)
    try {
      await reportsService.resolve(report.id, { outcome: answering, note: text.trim() || undefined })
      toast.success(answering === "actioned" ? "Marked as acted on. The reporter was told." : "Marked as no action. The reporter was told.")
      onAnswered()
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : "Could not save the answer")
      onAnswered()
    } finally {
      setBusy(false)
    }
  }
  return (
    <article data-tone={TONE[report.category] ?? "grey"} className={STAFF_CARD}>
      <header className="flex items-start gap-3">
        <CardIcon icon={Flag} />
        <div className="min-w-0 flex-1">
          <b className="block text-[13px] text-[var(--text)]">{reportCategoryLabel(report.category)}</b>
          <span className="text-[11px] text-[var(--text-dim)]"><RelativeTime value={report.createdAt} /></span>
        </div>
        {!open && <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">{report.status === "actioned" ? "Action taken" : "No action"}</span>}
      </header>
      <div className="flex items-center gap-2 text-[13px]">
        <PlayerAvatar avatar={report.reported.avatar ?? undefined} name={report.reported.username} className="size-7 rounded-full" />
        <button type="button" onClick={() => onCase(report.reported.steamId)} className="min-w-0 truncate font-semibold text-[var(--text)] hover:underline">{report.reported.username}</button>
        <span className="text-[var(--text-dim)]">reported by</span>
        <span className="min-w-0 truncate text-[var(--text-2)]">{report.reporter.username}</span>
      </div>
      <p className="break-words text-[13px] leading-relaxed text-[var(--text-2)]">{report.reason}</p>
      {report.evidenceUrl && (
        <a href={report.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 break-all text-xs text-[var(--text-muted)] hover:text-[var(--text)]"><ExternalLink className="size-3 shrink-0" aria-hidden="true" />Evidence link</a>
      )}
      {open && (report.reported.openReports > 1 || report.reported.banned) && (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {report.reported.openReports > 1 && <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[var(--text-2)]">{report.reported.openReports} open reports on this player</span>}
          {report.reported.banned && <span className="rounded-full border border-[var(--status-red)]/40 px-2 py-0.5 text-[var(--status-red)]">Already banned</span>}
        </div>
      )}
      {!open && report.staffNote && <p className="text-xs text-[var(--text-dim)]">Note: {report.staffNote}</p>}
      {open && (answering ? (
        <div className="flex flex-col gap-2">
          <input value={text} maxLength={200} onChange={(event) => setText(event.target.value)} placeholder="A note for the log (optional)" className={note} />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => void answer()} className="lx-primary-button inline-flex h-9 flex-1 items-center justify-center rounded-lg px-3 text-[13px] font-semibold disabled:opacity-50">{answering === "actioned" ? "Confirm: action taken" : "Confirm: no action"}</button>
            <button type="button" disabled={busy} onClick={() => setAnswering(null)} className={secondary}>Back</button>
          </div>
        </div>
      ) : (
        <div className="mt-auto flex flex-wrap gap-2">
          <button type="button" onClick={() => onCase(report.reported.steamId)} className={cn(secondary, "flex-1")}>Open case</button>
          <button type="button" onClick={() => setAnswering("actioned")} className={secondary}>Action taken</button>
          <button type="button" onClick={() => setAnswering("dismissed")} className={secondary}>No action</button>
        </div>
      ))}
    </article>
  )
}

export function StaffReports({ onCase, onChanged }: { onCase: (steamId: string) => void; onChanged?: () => void }) {
  const open = useApiQuery<StaffReport[]>((signal) => reportsService.list("open", { signal }), { queryKey: "staff-reports-open" })
  const closed = useApiQuery<StaffReport[]>((signal) => reportsService.list("closed", { signal }), { queryKey: "staff-reports-closed" })
  const refresh = () => { void open.refetch(); void closed.refetch(); onChanged?.() }
  return (
    <div className={STAFF_BODY}>
      <p className="text-[13px] text-[var(--text-muted)]">What players reported from the website, oldest first. Open the case, then answer: the reporter sees the outcome in their notifications, the reported player is never told who reported.</p>
      <StaffSection title="Waiting for an answer" count={open.data?.length}>
        {open.loading && !open.data ? (
          <div className={STAFF_GRID} aria-hidden="true"><Skeleton className="h-[190px] rounded-xl" /><Skeleton className="h-[190px] rounded-xl" /></div>
        ) : open.error && !open.data ? (
          <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the reports.<button type="button" onClick={open.refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" aria-hidden="true" />Retry</button></p>
        ) : (open.data ?? []).length === 0 ? (
          <StaffEmpty>No reports are waiting.</StaffEmpty>
        ) : (
          <div className={STAFF_GRID}>{(open.data ?? []).map((report) => <ReportCard key={report.id} report={report} onCase={onCase} onAnswered={refresh} />)}</div>
        )}
      </StaffSection>
      {(closed.data ?? []).length > 0 && (
        <StaffSection title="Answered" count={closed.data?.length}>
          <div className={STAFF_GRID}>{(closed.data ?? []).map((report) => <ReportCard key={report.id} report={report} onCase={onCase} onAnswered={refresh} />)}</div>
        </StaffSection>
      )}
    </div>
  )
}
