import { useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { Ban, ClipboardCheck, MessageSquareWarning, MicOff, Radio, Scale, Search, Users } from "lucide-react"

import { adminService, type AuditEntry, type ServerSummary } from "@/api/admin"
import { useApiQuery } from "@/hooks/use-api-query"
import { useStaff } from "@/hooks/use-staff"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { EmptyState, ErrorState, LoadingRows, Panel, PanelPage, PlayerCell, RelativeTime, Rows, StatTile } from "./ui"

/* ---------------------------------------------------------------------------
 * Dashboard
 * ------------------------------------------------------------------------- */

export function DashboardPage() {
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.dashboard({ signal }))
  const { can } = useStaff()

  return (
    <PanelPage title="Dashboard" description="What needs attention across LEGACY-X right now.">
      {error ? <Panel><ErrorState error={error} onRetry={refetch} /></Panel> : (
        <>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
            {data?.openReports !== null && <StatTile label="Open reports" value={loading ? "…" : data?.openReports ?? 0} icon={MessageSquareWarning} to="/panel/reports" tone={(data?.openReports ?? 0) > 0 ? "warn" : "default"} />}
            {data?.reviewQueue !== null && <StatTile label="Review queue" value={loading ? "…" : data?.reviewQueue ?? 0} icon={ClipboardCheck} to="/panel/review" tone={(data?.reviewQueue ?? 0) > 0 ? "warn" : "default"} />}
            {data?.openAppeals !== null && <StatTile label="Open appeals" value={loading ? "…" : data?.openAppeals ?? 0} icon={Scale} to="/panel/appeals" />}
            {data?.activeBans !== null && <StatTile label="Active bans" value={loading ? "…" : data?.activeBans ?? 0} icon={Ban} to="/panel/bans" tone="danger" />}
            {data?.activeMutes !== null && <StatTile label="Active mutes" value={loading ? "…" : data?.activeMutes ?? 0} icon={MicOff} to="/panel/mutes" />}
            <StatTile label="Players online" value={loading ? "…" : data?.onlinePlayers ?? 0} icon={Users} to="/panel/live" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            {can("servers.view") && (
              <Panel title="Servers" actions={<Link to="/panel/live" className="text-[12px] text-amber-300 hover:underline">Live view</Link>}>
                {loading ? <LoadingRows rows={3} /> : <ServerList servers={data?.servers ?? []} />}
              </Panel>
            )}
            {can("audit.view") && (
              <Panel title="Recent staff actions" actions={<Link to="/panel/audit" className="text-[12px] text-amber-300 hover:underline">Audit log</Link>}>
                {loading ? <LoadingRows rows={4} /> : (data?.recentActions.length ?? 0) === 0 ? <EmptyState>No staff actions yet</EmptyState> : (
                  <Rows>{data!.recentActions.map((entry) => <AuditRow key={entry.id} entry={entry} compact />)}</Rows>
                )}
              </Panel>
            )}
          </div>
        </>
      )}
    </PanelPage>
  )
}

export function ServerList({ servers }: { servers: ServerSummary[] }) {
  if (servers.length === 0) return <EmptyState>No servers registered yet</EmptyState>
  return (
    <Rows>
      {servers.map((server) => (
        <Link key={server.id} to={`/panel/servers/${server.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40">
          <span className={cn("size-2 shrink-0 rounded-full", server.online ? "bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/60" : "bg-muted-foreground/40")} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium">{server.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">{server.map} · {server.mode}{server.address ? ` · ${server.address}` : ""}</div>
          </div>
          <span className="text-[12px] tabular-nums text-muted-foreground">{server.players}/{server.maxPlayers}</span>
        </Link>
      ))}
    </Rows>
  )
}

/* ---------------------------------------------------------------------------
 * Live: jump to the match you are connected to
 * ------------------------------------------------------------------------- */

export function LivePage() {
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.live({ signal }))
  if (data?.current) {
    return <Navigate replace to={data.current.matchId ? `/panel/match/${encodeURIComponent(data.current.matchId)}` : `/panel/servers/${data.current.serverId}`} />
  }
  return (
    <PanelPage title="Live" description="You are not connected to a server, so here is every server instead.">
      <Panel title={<span className="flex items-center gap-2"><Radio className="size-4 text-emerald-300" />Servers</span>} actions={<Button size="xs" variant="ghost" onClick={refetch}>Refresh</Button>}>
        {error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <LoadingRows rows={3} /> : <ServerList servers={data?.servers ?? []} />}
      </Panel>
    </PanelPage>
  )
}

/* ---------------------------------------------------------------------------
 * Players
 * ------------------------------------------------------------------------- */

export function PlayersPage() {
  const [query, setQuery] = useState("")
  const [submitted, setSubmitted] = useState("")
  const { data, loading, error } = useApiQuery((signal) => adminService.search(submitted, { signal }), { enabled: submitted.length >= 2, queryKey: submitted })

  return (
    <PanelPage title="Players" description="Find anyone by SteamID64, current name or a name they used before.">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setSubmitted(query.trim()) }}>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="SteamID64 or name" className="max-w-md" />
        <Button type="submit" disabled={query.trim().length < 2}><Search />Search</Button>
      </form>
      <Panel>
        {submitted.length < 2 ? <EmptyState>Search for a player to open their staff profile.</EmptyState>
          : error ? <ErrorState error={error} />
          : loading ? <LoadingRows rows={3} />
          : (data?.players.length ?? 0) === 0 ? <EmptyState>No players found</EmptyState>
          : <Rows>{data!.players.map((player) => <div key={player.steamId} className="px-4 py-2.5"><PlayerCell player={player} /></div>)}</Rows>}
      </Panel>
      {(data?.matches.length ?? 0) > 0 && (
        <Panel title="Matches">
          <Rows>
            {data!.matches.map((match) => (
              <Link key={match.matchId} to={`/panel/match/${encodeURIComponent(match.matchId)}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-accent/40">
                <span className="truncate font-mono text-[12px]">{match.matchId}</span>
                <span className="text-[11px] text-muted-foreground"><RelativeTime value={match.lastSeenAt} /></span>
              </Link>
            ))}
          </Rows>
        </Panel>
      )}
    </PanelPage>
  )
}

/* ---------------------------------------------------------------------------
 * Audit log
 * ------------------------------------------------------------------------- */

const ACTION_LABELS: Record<string, string> = {
  "players.kick": "kicked",
  "bans.issue": "banned",
  "bans.permanent.issue": "permanently banned",
  "bans.revoke": "lifted a ban on",
  "bans.revoke.appeal": "accepted an appeal from",
  "bans.change": "changed a ban on",
  "bans.review.approve": "approved a ban on",
  "bans.review.reject": "rejected a ban on",
  "mutes.issue": "muted",
  "mutes.revoke": "unmuted",
  "reports.actioned": "actioned a report on",
  "reports.dismissed": "dismissed a report on",
  "staff_notes.create": "added a note on",
  "roles.assign": "gave a role to",
  "roles.revoke": "removed a role from",
  "roles.permissions.edit": "edited role permissions",
  "roles.immunity.edit": "changed role immunity",
  "servers.create": "registered a server",
  "servers.delete": "deleted a server",
  "servers.rotate_key": "rotated a server key",
  "servers.map_change": "changed the map",
  "servers.round_restart": "restarted the round",
  "auth.reauth": "re-authenticated",
  "site.customize": "published a website config",
  "site.rollback": "rolled back the website config",
}

export function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action
}

export function AuditRow({ entry, compact }: { entry: AuditEntry; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const hasDiff = entry.before != null || entry.after != null
  return (
    <div className="px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
        <span className="font-medium">{entry.actor?.name ?? "System"}</span>
        <span className="text-muted-foreground">{actionLabel(entry.action)}</span>
        {entry.targetSteamId && <Link to={`/u/${entry.targetSteamId}`} className="font-mono text-[12px] text-amber-300 hover:underline">{entry.targetSteamId}</Link>}
        {entry.targetType === "role" && entry.targetId && <span className="font-mono text-[12px]">{entry.targetId}</span>}
        <span className="ml-auto text-[11px] text-muted-foreground"><RelativeTime value={entry.createdAt} /></span>
      </div>
      {!compact && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-mono">{entry.action}</span>
          {typeof entry.metadata?.reason === "string" && <span>· {entry.metadata.reason}</span>}
          {typeof entry.metadata?.source === "string" && <span>· via {entry.metadata.source}</span>}
          {hasDiff && <button className="text-amber-300 hover:underline" onClick={() => setOpen((v) => !v)}>{open ? "Hide" : "Show"} before / after</button>}
        </div>
      )}
      {open && (
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <pre className="overflow-x-auto rounded-lg bg-black/30 p-2 text-[11px]"><b className="text-muted-foreground">before</b>{"\n"}{JSON.stringify(entry.before, null, 2)}</pre>
          <pre className="overflow-x-auto rounded-lg bg-black/30 p-2 text-[11px]"><b className="text-muted-foreground">after</b>{"\n"}{JSON.stringify(entry.after, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export function AuditPage() {
  const [action, setAction] = useState("")
  const [target, setTarget] = useState("")
  const [filters, setFilters] = useState<{ action?: string; target?: string }>({})
  const [pages, setPages] = useState<AuditEntry[][]>([])
  const key = JSON.stringify(filters)
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.audit(filters, { signal }), { queryKey: key })
  const [loadingMore, setLoadingMore] = useState(false)
  const all = [...(data?.items ?? []), ...pages.flat()]

  const loadMore = async () => {
    const last = all[all.length - 1]
    if (!last) return
    setLoadingMore(true)
    try {
      const next = await adminService.audit({ ...filters, beforeId: last.id })
      setPages((current) => [...current, next.items])
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <PanelPage title="Audit log" description="Every staff action, in order. Entries can never be edited or deleted.">
      <form className="flex flex-wrap gap-2" onSubmit={(e) => {
        e.preventDefault()
        setPages([])
        setFilters({ action: action.trim() || undefined, target: /^\d{17}$/.test(target.trim()) ? target.trim() : undefined })
      }}>
        <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Action prefix, e.g. bans" className="w-48" />
        <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target SteamID64" className="w-56" />
        <Button type="submit" variant="outline">Filter</Button>
      </form>
      <Panel>
        {error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <LoadingRows rows={6} /> : all.length === 0 ? <EmptyState>No entries</EmptyState> : (
          <Rows>{all.map((entry) => <AuditRow key={entry.id} entry={entry} />)}</Rows>
        )}
        {all.length >= 50 && <div className="border-t border-border/40 p-3 text-center"><Button size="sm" variant="ghost" disabled={loadingMore} onClick={loadMore}>Load older</Button></div>}
      </Panel>
    </PanelPage>
  )
}

