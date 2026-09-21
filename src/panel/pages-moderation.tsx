import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Check, Gavel, Undo2, X } from "lucide-react"

import { adminService, type Appeal, type Punishment, type Report } from "@/api/admin"
import { useApiQuery } from "@/hooks/use-api-query"
import { useStaff } from "@/hooks/use-staff"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  EmptyState, ErrorState, ExpiryText, LoadingRows, Panel, PanelPage, PlayerCell, ReasonDialog, RelativeTime, Rows, StatusPill, toastError,
} from "./ui"

function Filters<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-border/50 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn("rounded-md px-2.5 py-1 text-[12px] transition-colors", value === option.value ? "bg-amber-300/15 text-amber-200" : "text-muted-foreground hover:text-foreground")}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

const REASON_LABELS: Record<string, string> = { cheating: "Cheating", griefing: "Griefing", toxicity: "Toxicity", abuse: "Abuse", afk: "AFK", other: "Other" }

/* ---------------------------------------------------------------------------
 * Reports
 * ------------------------------------------------------------------------- */

export function ReportsPage() {
  const [status, setStatus] = useState<"open" | "actioned" | "dismissed" | "all">("open")
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.reports({ status }, { signal }), { queryKey: status })
  const { can, refreshBadge } = useStaff()

  return (
    <PanelPage
      title="Reports"
      description={data && !data.canSeeReporter ? "Reporter identity is visible to Owner and Manager only." : "Player reports from !report in game."}
      actions={<Filters value={status} onChange={setStatus} options={[{ value: "open", label: "Open" }, { value: "actioned", label: "Actioned" }, { value: "dismissed", label: "Dismissed" }, { value: "all", label: "All" }]} />}
    >
      <Panel>
        {error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <LoadingRows /> : (data?.items.length ?? 0) === 0 ? <EmptyState>No reports</EmptyState> : (
          <Rows>{data!.items.map((report) => <ReportRow key={report.id} report={report} canHandle={can("reports.handle")} onChanged={() => { refetch(); refreshBadge() }} />)}</Rows>
        )}
      </Panel>
    </PanelPage>
  )
}

export function ReportRow({ report, canHandle, onChanged }: { report: Report; canHandle: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const resolve = async (status: "actioned" | "dismissed") => {
    setBusy(true)
    try { await adminService.handleReport(report.id, status); toast.success(status === "actioned" ? "Marked as actioned" : "Report dismissed"); onChanged() }
    catch (error) { toastError(error) } finally { setBusy(false) }
  }
  const accuracy = report.reporterAccuracy?.accuracy
  return (
    <div className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center">
      <PlayerCell player={report.target} />
      <div className="min-w-0 text-[13px]">
        <span className="font-medium">{REASON_LABELS[report.reason] ?? report.reason}</span>
        {report.details && <p className="truncate text-[12px] text-muted-foreground">{report.details}</p>}
        <div className="text-[11px] text-muted-foreground">
          <RelativeTime value={report.createdAt} />
          {report.matchId && <> · <Link to={`/panel/match/${encodeURIComponent(report.matchId)}`} className="hover:text-amber-300">match</Link></>}
        </div>
      </div>
      <div className="min-w-0 text-[12px] text-muted-foreground">
        {report.reporter ? <PlayerCell player={report.reporter} subtitle="Reporter" /> : <span>Reporter hidden</span>}
        {accuracy != null && <div className="mt-0.5">Accuracy {Math.round(accuracy * 100)}% · {report.reporterAccuracy!.total} reports</div>}
      </div>
      <div className="flex items-center gap-1.5 md:justify-end">
        {report.status === "open" && canHandle ? (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => resolve("actioned")}><Check />Actioned</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => resolve("dismissed")}><X />Dismiss</Button>
          </>
        ) : <StatusPill status={report.status} />}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Bans and mutes
 * ------------------------------------------------------------------------- */

type ListStatus = "active" | "expired" | "revoked" | "all"
const LIST_FILTERS: { value: ListStatus; label: string }[] = [{ value: "active", label: "Active" }, { value: "expired", label: "Expired" }, { value: "revoked", label: "Revoked" }, { value: "all", label: "All" }]

export function BansPage() {
  const [status, setStatus] = useState<ListStatus>("active")
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.bans({ status }, { signal }), { queryKey: status })
  return (
    <PanelPage title="Bans" description="Bans are by SteamID64. The issuer's rank at the time decides who can lift them." actions={<Filters value={status} onChange={setStatus} options={LIST_FILTERS} />}>
      <Panel>
        {error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <LoadingRows /> : (data?.items.length ?? 0) === 0 ? <EmptyState>No bans</EmptyState> : (
          <Rows>{data!.items.map((ban) => <PunishmentRow key={ban.id} item={ban} onChanged={refetch} />)}</Rows>
        )}
      </Panel>
    </PanelPage>
  )
}

export function MutesPage() {
  const [status, setStatus] = useState<ListStatus>("active")
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.mutes({ status }, { signal }), { queryKey: status })
  return (
    <PanelPage title="Mutes" actions={<Filters value={status} onChange={setStatus} options={LIST_FILTERS} />}>
      <Panel>
        {error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <LoadingRows /> : (data?.items.length ?? 0) === 0 ? <EmptyState>No mutes</EmptyState> : (
          <Rows>{data!.items.map((mute) => <PunishmentRow key={mute.id} item={mute} onChanged={refetch} />)}</Rows>
        )}
      </Panel>
    </PanelPage>
  )
}

export function PunishmentRow({ item, onChanged, hidePlayer }: { item: Punishment; onChanged: () => void; hidePlayer?: boolean }) {
  const { can } = useStaff()
  const [revoking, setRevoking] = useState(false)
  const canRevoke = item.status === "active" && (item.type === "ban" ? (item.canRevoke ?? can("bans.revoke")) : can("mutes.revoke"))

  return (
    <div className={cn("grid gap-2 px-4 py-3 md:items-center", hidePlayer ? "md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto]" : "md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]")}>
      {!hidePlayer && <PlayerCell player={item.player ?? { steamId: item.steamId, name: item.steamId, avatar: "" }} />}
      <div className="min-w-0 text-[13px]">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase">{item.type === "ban" ? "Ban" : `Mute${item.kind && item.kind !== "all" ? ` · ${item.kind}` : ""}`}</span>
          <span className="truncate font-medium">{item.reason}</span>
        </div>
        <div className="text-[11px] text-muted-foreground"><RelativeTime value={item.createdAt} prefix="Issued " /> · via {item.source}</div>
      </div>
      <div className="text-[12px]"><ExpiryText permanent={item.permanent} expiresAt={item.expiresAt} /></div>
      <div className="min-w-0 text-[12px] text-muted-foreground">
        {item.issuer ? <PlayerCell player={item.issuer} subtitle={`Issued by · rank ${item.issuerImmunity}`} /> : "—"}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
        {item.reviewStatus === "pending" && <StatusPill status="pending" />}
        <StatusPill status={item.status} />
        {canRevoke && <Button size="sm" variant="ghost" onClick={() => setRevoking(true)}><Undo2 />{item.type === "ban" ? "Unban" : "Unmute"}</Button>}
      </div>
      <ReasonDialog
        open={revoking}
        onOpenChange={setRevoking}
        title={item.type === "ban" ? "Lift this ban" : "Lift this mute"}
        confirmLabel={item.type === "ban" ? "Unban" : "Unmute"}
        onConfirm={async (reason) => {
          if (item.type === "ban") await adminService.revokeBan(item.id, reason)
          else await adminService.revokeMute(item.id, reason)
          toast.success(item.type === "ban" ? "Ban lifted" : "Mute lifted")
          onChanged()
        }}
      />
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Review queue
 * ------------------------------------------------------------------------- */

export function ReviewQueuePage() {
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.reviewQueue({ signal }))
  const { refreshBadge } = useStaff()
  const [rejecting, setRejecting] = useState<Punishment | null>(null)
  const approve = async (ban: Punishment) => {
    try { await adminService.reviewBan(ban.id, "approve"); toast.success("Ban approved"); refetch(); refreshBadge() } catch (error) { toastError(error) }
  }

  return (
    <PanelPage title="Review queue" description="Permanent bans issued below manager rank. They are already in force; approving keeps them, rejecting lifts them.">
      <Panel>
        {error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <LoadingRows /> : (data?.items.length ?? 0) === 0 ? <EmptyState>Nothing to review</EmptyState> : (
          <Rows>
            {data!.items.map((ban) => (
              <div key={ban.id} className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,1fr)_auto] md:items-center">
                <PlayerCell player={ban.player ?? { steamId: ban.steamId, name: ban.steamId, avatar: "" }} />
                <div className="min-w-0 text-[13px]">
                  <div className="flex items-center gap-1.5"><Gavel className="size-3.5 text-rose-300" /><span className="truncate font-medium">{ban.reason}</span></div>
                  <div className="text-[11px] text-muted-foreground"><RelativeTime value={ban.createdAt} prefix="Issued " /> · via {ban.source}</div>
                </div>
                <div className="text-[12px]">{ban.issuer ? <PlayerCell player={ban.issuer} subtitle="Issued by" /> : "—"}</div>
                <div className="flex items-center gap-1.5 md:justify-end">
                  <Button size="sm" variant="outline" onClick={() => approve(ban)}><Check />Approve</Button>
                  <Button size="sm" variant="ghost" onClick={() => setRejecting(ban)}><X />Reject</Button>
                </div>
              </div>
            ))}
          </Rows>
        )}
      </Panel>
      <ReasonDialog
        open={rejecting !== null}
        onOpenChange={(open) => { if (!open) setRejecting(null) }}
        title="Reject and lift this ban"
        confirmLabel="Reject ban"
        destructive
        placeholder="Why is this ban being lifted?"
        onConfirm={async (note) => { await adminService.reviewBan(rejecting!.id, "reject", note); toast.success("Ban rejected and lifted"); refetch(); refreshBadge() }}
      />
    </PanelPage>
  )
}

/* ---------------------------------------------------------------------------
 * Appeals
 * ------------------------------------------------------------------------- */

export function AppealsPage() {
  const [status, setStatus] = useState<"open" | "accepted" | "rejected" | "all">("open")
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.appeals(status, { signal }), { queryKey: status })
  const { can } = useStaff()
  const [deciding, setDeciding] = useState<{ appeal: Appeal; decision: "accept" | "reject" } | null>(null)

  return (
    <PanelPage title="Appeals" description="Accepting an appeal lifts the ban, so it follows the same rank rules as unbanning." actions={<Filters value={status} onChange={setStatus} options={[{ value: "open", label: "Open" }, { value: "accepted", label: "Accepted" }, { value: "rejected", label: "Rejected" }, { value: "all", label: "All" }]} />}>
      <Panel>
        {error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <LoadingRows /> : (data?.items.length ?? 0) === 0 ? <EmptyState>No appeals</EmptyState> : (
          <Rows>
            {data!.items.map((appeal) => (
              <div key={appeal.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <PlayerCell player={appeal.player} />
                  <div className="flex items-center gap-1.5">
                    {appeal.status === "open" && can("appeals.handle") ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setDeciding({ appeal, decision: "accept" })}><Check />Accept</Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeciding({ appeal, decision: "reject" })}><X />Reject</Button>
                      </>
                    ) : <StatusPill status={appeal.status} />}
                  </div>
                </div>
                <p className="whitespace-pre-wrap rounded-lg bg-black/20 p-3 text-[13px]">{appeal.message}</p>
                {appeal.ban && <div className="text-[12px] text-muted-foreground">Ban: <span className="text-foreground">{appeal.ban.reason}</span> · <ExpiryText permanent={appeal.ban.permanent} expiresAt={appeal.ban.expiresAt} /> · <RelativeTime value={appeal.createdAt} prefix="Appealed " /></div>}
                {appeal.response && <p className="text-[12px] text-muted-foreground">Response: {appeal.response}</p>}
              </div>
            ))}
          </Rows>
        )}
      </Panel>
      <ReasonDialog
        open={deciding !== null}
        onOpenChange={(open) => { if (!open) setDeciding(null) }}
        title={deciding?.decision === "accept" ? "Accept appeal and lift the ban" : "Reject appeal"}
        confirmLabel={deciding?.decision === "accept" ? "Accept" : "Reject"}
        destructive={deciding?.decision === "reject"}
        placeholder="Response to the player"
        onConfirm={async (response) => { await adminService.handleAppeal(deciding!.appeal.id, deciding!.decision, response); toast.success("Appeal handled"); refetch() }}
      />
    </PanelPage>
  )
}

