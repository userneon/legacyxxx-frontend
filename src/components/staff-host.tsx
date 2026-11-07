import { useState } from "react"
import { RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { hostService, type HostAction, type HostCheck } from "@/api/host"
import { STAFF_BODY, StaffSection } from "@/components/staff-ui"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"

const button = "inline-flex h-9 items-center justify-center gap-1.5 border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"
const MARK = { ok: "text-[var(--status-green)]", warn: "text-[var(--tone-amber)]", fail: "text-[var(--status-red)]" } as const
const WORD = { ok: "OK", warn: "WARN", fail: "FAIL" } as const

/** Staff → Host (Owner only): what is installed and loaded on the game host, and a deploy / restart that go over a locked-down SSH key. */
export function StaffHost({ isOwner }: { isOwner: boolean }) {
  const { data, loading, error, refetch } = useApiQuery((signal) => hostService.status({ signal }), { enabled: isOwner, queryKey: `staff-host:${isOwner}` })
  const [busy, setBusy] = useState<string | null>(null)
  const [log, setLog] = useState<string | null>(null)
  const [asked, setAsked] = useState<string | null>(null)
  if (!isOwner) return <div className={STAFF_BODY}><p className="text-[13px] text-[var(--text-dim)]">Only the Owner can see the host.</p></div>

  const run = async (key: string, action: HostAction) => {
    setBusy(key); setAsked(null); setLog(null)
    try {
      const result = await hostService.run(action)
      setLog(result.log ?? result.error)
      if (result.ok) toast.success(action.action === "deploy" ? "Deployed. Restart a server to load it." : `Server ${action.action === "restart" ? action.port : ""} restarted.`)
      else toast.error(result.error ?? "The host refused")
      refetch()
    } catch {
      toast.error("Could not reach the API")
    } finally { setBusy(null) }
  }
  const confirm = (key: string, action: HostAction, label: string) => asked === key
    ? <button type="button" disabled={busy !== null} onClick={() => run(key, action)} className={`${button} border-[var(--status-red)] text-[var(--status-red)]`}>{busy === key ? "Working…" : `Yes, ${label.toLowerCase()}`}</button>
    : <button type="button" disabled={busy !== null} onClick={() => setAsked(key)} className={button}>{label}</button>

  const status = data && data.configured && data.reachable ? data : null
  return (
    <div className={STAFF_BODY}>
      <p className="text-[13px] text-[var(--text-muted)]">What is installed and loaded on the game host, read by one locked-down script over SSH. Deploy pulls the latest plugins and installs them; it does not restart a server.</p>
      {loading && !data ? (
        <div className="flex flex-col gap-2" aria-hidden="true">{[0, 1, 2, 3, 4].map((index) => <Skeleton key={index} className="h-9 bg-[var(--glass-fill)]" />)}</div>
      ) : error && !data ? (
        <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the host.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
      ) : data && !data.configured ? (
        <p className="text-[13px] text-[var(--text-dim)]">The host connection is not set up. Set HOST_SSH_HOST and HOST_SSH_KEY in the API's environment (see docs/HOST_ACCESS.md in the backend), then restart the API.</p>
      ) : data && data.configured && !data.reachable ? (
        <p className="flex items-center gap-3 text-[13px] text-[var(--status-red)]">{data.error ?? "Could not reach the host."}<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
      ) : status ? (
        <>
          <StaffSection title="Checks" count={status.checks.length} end={<button type="button" onClick={refetch} className={button}><RotateCcw className="size-3.5" />Check again</button>}>
            <ul className="divide-y divide-[var(--line-soft)] border border-[var(--glass-line)]">
              {status.checks.map((check: HostCheck) => (
                <li key={check.id} className="grid grid-cols-[3.5rem_minmax(0,12rem)_minmax(0,1fr)] items-baseline gap-3 px-3 py-2 text-[13px] max-md:grid-cols-[3.5rem_minmax(0,1fr)]">
                  <span className={`adm-lbl ${MARK[check.status]}`}>{WORD[check.status]}</span>
                  <span className="truncate text-[var(--text)]">{check.label}</span>
                  <span className="text-[var(--text-dim)] max-md:col-start-2">{check.detail}</span>
                </li>
              ))}
            </ul>
            <p className="adm-lbl text-[var(--text-faint)]">Read {new Date(status.generatedAt).toLocaleTimeString()}{status.info.repo ? ` · ${status.info.repo.commit} ${status.info.repo.subject}` : ""}</p>
          </StaffSection>
          <StaffSection title="Actions">
            <div className="flex flex-wrap items-center gap-2">
              {confirm("deploy", { action: "deploy" }, "Deploy plugins")}
              {(status.info.servers ?? []).map((server) => <span key={server.port}>{confirm(`restart-${server.port}`, { action: "restart", port: server.port }, `Restart ${server.port}`)}</span>)}
            </div>
            {asked && <p className="text-[13px] text-[var(--text-dim)]">Press again to confirm. A restart drops the players on that server.</p>}
            {log && <pre className="max-h-72 overflow-auto border border-[var(--glass-line)] bg-[var(--bg)] p-3 text-[11px] text-[var(--text-2)]">{log}</pre>}
          </StaffSection>
        </>
      ) : null}
    </div>
  )
}
