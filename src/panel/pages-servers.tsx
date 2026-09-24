import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Ban, ChevronDown, Map as MapIcon, MicOff, RotateCcw, UserX } from "lucide-react"

import { adminService, type ChatMessage, type SessionRow } from "@/api/admin"
import { useApiQuery } from "@/hooks/use-api-query"
import { useStaff } from "@/hooks/use-staff"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { AuditRow } from "./pages-core"
import { ReportRow } from "./pages-moderation"
import {
  AboveRank, BanDialog, ChoiceGroup, EmptyState, ErrorState, FlagBadges, KICK_PRESETS, LoadingRows, MUTE_PRESETS, Panel, PanelPage, PlayerCell,
  RelativeTime, Rows, StatusPill, runWithUndo, toastError,
} from "./ui"

/* ---------------------------------------------------------------------------
 * Player actions: kick and mute are one click with undo, ban opens the preset modal
 * ------------------------------------------------------------------------- */

export function PlayerActions({ steamId, name, aboveRank, live, onDone, size = "xs" }: { steamId: string; name: string; aboveRank: boolean; live: boolean; onDone?: () => void; size?: "xs" | "sm" }) {
  const { can } = useStaff()
  const [banOpen, setBanOpen] = useState(false)
  if (aboveRank) return <AboveRank />

  return (
    <div className="flex flex-wrap items-center gap-1">
      {can("players.kick") && live && (
        <PresetMenu size={size} icon={UserX} label="Kick" items={KICK_PRESETS.map((reason) => ({
          label: reason,
          run: () => runWithUndo(`Kicking ${name} · ${reason}`, () => adminService.kick(steamId, reason), () => { toast.success(`${name} kicked`); onDone?.() }),
        }))} />
      )}
      {can("mutes.issue") && (
        <PresetMenu size={size} icon={MicOff} label="Mute" items={MUTE_PRESETS.map((preset) => ({
          label: preset.label,
          run: () => runWithUndo(`Muting ${name} · ${preset.label}`, () => adminService.issueMute({ steamId, kind: preset.kind, reason: preset.reason, duration: { permanent: false, minutes: preset.minutes } }), () => { toast.success(`${name} muted`); onDone?.() }),
        }))} />
      )}
      {can("bans.issue") && <Button size={size} variant="destructive" onClick={() => setBanOpen(true)}><Ban />Ban</Button>}
      <BanDialog open={banOpen} onOpenChange={setBanOpen} target={{ steamId, name }} allowPermanent={can("bans.permanent.issue")} onDone={onDone} />
    </div>
  )
}

function PresetMenu({ icon: Icon, label, items, size }: { icon: typeof UserX; label: string; items: { label: string; run: () => void }[]; size: "xs" | "sm" }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size={size} variant="outline"><Icon />{label}<ChevronDown className="opacity-60" /></Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="glass w-52 p-1">
        {items.map((item) => (
          <button key={item.label} className="flex w-full rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-accent" onClick={() => { setOpen(false); item.run() }}>
            {item.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

/* ---------------------------------------------------------------------------
 * Session rows (live / last hours / match)
 * ------------------------------------------------------------------------- */

function SessionList({ rows, live, onChanged, showTimes }: { rows: SessionRow[]; live: boolean; onChanged?: () => void; showTimes?: boolean }) {
  const { staff } = useStaff()
  const myImmunity = staff?.immunity ?? 0
  if (rows.length === 0) return <EmptyState>{live ? "Nobody is on the server" : "Nobody in this window"}</EmptyState>
  return (
    <Rows>
      {rows.map((row) => {
        const connected = !row.disconnectedAt
        return (
          <div key={row.sessionId} className="grid gap-2 px-4 py-2.5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center">
            <div className="flex min-w-0 items-center gap-2">
              <PlayerCell player={{ steamId: row.steamId, name: row.name, avatar: row.avatar }} />
              {!connected && <span className="text-[11px] text-muted-foreground">(left)</span>}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <FlagBadges flags={row.flags} />
              {showTimes && (
                <span className="text-[11px] text-muted-foreground">
                  <RelativeTime value={row.connectedAt} prefix="Joined " />{row.disconnectedAt && <> · <RelativeTime value={row.disconnectedAt} prefix="left " /></>}
                </span>
              )}
            </div>
            <div className="md:justify-self-end">
              <PlayerActions steamId={row.steamId} name={row.name} aboveRank={row.immunity >= myImmunity} live={connected} onDone={onChanged} />
            </div>
          </div>
        )
      })}
    </Rows>
  )
}

function ChatList({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) return <EmptyState>No chat yet</EmptyState>
  return (
    <Rows>
      {messages.map((message) => (
        <div key={message.id} className="flex gap-3 px-4 py-2 text-[13px]">
          <span className="w-14 shrink-0 text-[11px] tabular-nums text-muted-foreground">{new Date(message.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <div className="min-w-0">
            <Link to={`/u/${message.steamId}`} className="font-medium hover:text-amber-300">{message.name}</Link>
            {message.teamOnly && <span className="ml-1.5 rounded bg-secondary px-1 text-[10px] text-muted-foreground">team</span>}
            <span className="ml-2 break-words text-muted-foreground">{message.message}</span>
          </div>
        </div>
      ))}
    </Rows>
  )
}

/* ---------------------------------------------------------------------------
 * /panel/servers/:id
 * ------------------------------------------------------------------------- */

export function ServerDetailPage() {
  const { serverId = "" } = useParams()
  const { can } = useStaff()
  const [tab, setTab] = useState("live")
  const detail = useApiQuery((signal) => adminService.server(serverId, { signal }), { queryKey: serverId })

  return (
    <PanelPage
      title={detail.data?.server.name ?? "Server"}
      description={detail.data ? `${detail.data.server.map} · ${detail.data.server.mode} · ${detail.data.players.length}/${detail.data.server.maxPlayers} players` : undefined}
      actions={detail.data && <ServerCommands serverId={serverId} />}
    >
      {detail.error ? <Panel><ErrorState error={detail.error} onRetry={detail.refetch} /></Panel> : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="live">Live</TabsTrigger>
            {can("players.sessions.view") && <TabsTrigger value="recent">Last 5 hours</TabsTrigger>}
            {can("players.chat.view") && <TabsTrigger value="chat">Chat log</TabsTrigger>}
            {can("reports.view") && <TabsTrigger value="reports">Reports</TabsTrigger>}
            {can("audit.view") && <TabsTrigger value="actions">Actions</TabsTrigger>}
          </TabsList>
          <TabsContent value="live">
            <Panel title={<span className="flex items-center gap-2"><span className={cn("size-2 rounded-full", detail.data?.server.online ? "bg-emerald-400" : "bg-muted-foreground/40")} />{detail.data?.server.online ? "Online" : "Offline"}</span>}
              actions={detail.data?.matchId && <Link to={`/panel/match/${encodeURIComponent(detail.data.matchId)}`} className="text-[12px] text-amber-300 hover:underline">Match view</Link>}>
              {detail.loading && !detail.data ? <LoadingRows /> : <SessionList rows={detail.data?.players ?? []} live onChanged={detail.refetch} />}
            </Panel>
          </TabsContent>
          {tab === "recent" && <TabsContent value="recent"><RecentTab serverId={serverId} /></TabsContent>}
          {tab === "chat" && <TabsContent value="chat"><ChatTab serverId={serverId} /></TabsContent>}
          {tab === "reports" && <TabsContent value="reports"><ServerReportsTab serverId={serverId} /></TabsContent>}
          {tab === "actions" && <TabsContent value="actions"><ActionsTab serverId={serverId} /></TabsContent>}
        </Tabs>
      )}
    </PanelPage>
  )
}

function RecentTab({ serverId }: { serverId: string }) {
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.serverRecent(serverId, 5, { signal }), { queryKey: serverId })
  return <Panel title="Everyone seen in the last 5 hours">{error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <LoadingRows /> : <SessionList rows={data?.rows ?? []} live={false} showTimes onChanged={refetch} />}</Panel>
}

function ChatTab({ serverId }: { serverId: string }) {
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.serverChat(serverId, undefined, { signal }), { queryKey: serverId })
  return <Panel title="Chat log" actions={<Button size="xs" variant="ghost" onClick={refetch}>Refresh</Button>}>{error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <LoadingRows /> : <ChatList messages={data?.messages ?? []} />}</Panel>
}

function ServerReportsTab({ serverId }: { serverId: string }) {
  const { can, refreshBadge } = useStaff()
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.reports({ status: "all", serverId }, { signal }), { queryKey: serverId })
  return (
    <Panel title="Reports from this server">
      {error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <LoadingRows /> : (data?.items.length ?? 0) === 0 ? <EmptyState>No reports</EmptyState> : (
        <Rows>{data!.items.map((report) => <ReportRow key={report.id} report={report} canHandle={can("reports.handle")} onChanged={() => { refetch(); refreshBadge() }} />)}</Rows>
      )}
    </Panel>
  )
}

function ActionsTab({ serverId }: { serverId: string }) {
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.serverActions(serverId, { signal }), { queryKey: serverId })
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Sent to the server">
        {error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <LoadingRows rows={2} /> : (data?.queue.length ?? 0) === 0 ? <EmptyState>Nothing queued</EmptyState> : (
          <Rows>
            {data!.queue.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-[13px]">
                <span className="font-mono text-[12px]">{item.action}</span>
                {item.targetSteamId && <Link to={`/u/${item.targetSteamId}`} className="font-mono text-[12px] text-amber-300">{item.targetSteamId}</Link>}
                {item.failure && <span className="text-[12px] text-rose-300">{item.failure}</span>}
                <span className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground"><StatusPill status={item.status} /><RelativeTime value={item.createdAt} /></span>
              </div>
            ))}
          </Rows>
        )}
      </Panel>
      <Panel title="Staff actions on this server">
        {loading ? <LoadingRows rows={3} /> : (data?.audit.length ?? 0) === 0 ? <EmptyState>No actions</EmptyState> : <Rows>{data!.audit.map((entry) => <AuditRow key={entry.id} entry={entry} />)}</Rows>}
      </Panel>
    </div>
  )
}

const MAPS = ["de_mirage", "de_inferno", "de_nuke", "de_ancient", "de_anubis", "de_dust2", "de_train", "de_overpass", "de_vertigo"]

function ServerCommands({ serverId }: { serverId: string }) {
  const { can } = useStaff()
  const [confirm, setConfirm] = useState<"map" | "restart" | null>(null)
  const [map, setMap] = useState(MAPS[0]!)
  const [busy, setBusy] = useState(false)
  if (!can("servers.map_change") && !can("servers.round_restart")) return null

  const run = async () => {
    setBusy(true)
    try {
      await adminService.serverCommand(serverId, confirm === "map" ? { action: "map_change", map } : { action: "round_restart" })
      toast.success(confirm === "map" ? `Changing map to ${map}` : "Restarting the round")
      setConfirm(null)
    } catch (error) { toastError(error) } finally { setBusy(false) }
  }

  return (
    <>
      {can("servers.map_change") && <Button size="sm" variant="outline" onClick={() => setConfirm("map")}><MapIcon />Change map</Button>}
      {can("servers.round_restart") && <Button size="sm" variant="outline" onClick={() => setConfirm("restart")}><RotateCcw />Restart round</Button>}
      <Dialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null) }}>
        <DialogContent className="glass max-w-md">
          <DialogHeader>
            <DialogTitle>{confirm === "map" ? "Change the map" : "Restart the round"}</DialogTitle>
            <DialogDescription>{confirm === "map" ? "Everyone on the server is moved to the new map." : "The current round restarts for everyone on the server."}</DialogDescription>
          </DialogHeader>
          {confirm === "map" && <ChoiceGroup label="Map" options={MAPS} value={map} onChange={setMap} />}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="destructive" disabled={busy} onClick={run}>{confirm === "map" ? `Change to ${map}` : "Restart round"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ---------------------------------------------------------------------------
 * /panel/match/:matchId — laid out to work at 1024px and below
 * ------------------------------------------------------------------------- */

export function MatchPage() {
  const { matchId = "" } = useParams()
  const { can, refreshBadge } = useStaff()
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.match(matchId, { signal }), { queryKey: matchId })

  return (
    <PanelPage
      title={data?.server ? `${data.server.name} · ${data.server.map}` : "Match"}
      description={matchId}
      actions={data?.server && (
        <>
          {data.live && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-400" />Live</span>}
          <ServerCommands serverId={data.server.id} />
          <Button size="sm" variant="ghost" asChild><Link to={`/panel/servers/${data.server.id}`}>Server</Link></Button>
        </>
      )}
    >
      {error ? <Panel><ErrorState error={error} onRetry={refetch} /></Panel> : loading && !data ? <Panel><LoadingRows /></Panel> : data && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Panel title={`Players · ${data.players.length}`} actions={<Button size="xs" variant="ghost" onClick={refetch}>Refresh</Button>}>
            <SessionList rows={data.players} live={data.live} showTimes onChanged={refetch} />
          </Panel>
          <div className="flex min-w-0 flex-col gap-4">
            {can("reports.view") && (
              <Panel title={`Reports · ${data.reports.length}`}>
                {data.reports.length === 0 ? <EmptyState>No reports in this match</EmptyState> : <Rows>{data.reports.map((report) => <ReportRow key={report.id} report={report} canHandle={can("reports.handle")} onChanged={() => { refetch(); refreshBadge() }} />)}</Rows>}
              </Panel>
            )}
            {can("players.chat.view") && <Panel title="Chat"><div className="max-h-[28rem] overflow-y-auto"><ChatList messages={data.chat} /></div></Panel>}
          </div>
        </div>
      )}
    </PanelPage>
  )
}
