import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Ban, ExternalLink, MicOff, Radio, ShieldCheck, StickyNote } from "lucide-react"

import { adminService, type AuditEntry, type ChatMessage, type ModerationHeader, type ModerationTab, type Punishment, type Report } from "@/api/admin"
import { PlayerAvatar } from "@/components/player-avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useApiQuery } from "@/hooks/use-api-query"
import { useStaff } from "@/hooks/use-staff"
import { AuditRow } from "./pages-core"
import { PunishmentRow, ReportRow } from "./pages-moderation"
import { PlayerActions } from "./pages-servers"
import { AboveRank, EmptyState, ErrorState, ExpiryText, FlagBadges, LoadingRows, Panel, RelativeTime, Rows, ViewToggle, toastError } from "./ui"

const STEAM_ID = /^\d{17}$/

export function StaffProfilePage() {
  const { steamId = "" } = useParams()
  const [asPlayer, setAsPlayer] = useState(false)
  const valid = STEAM_ID.test(steamId)
  const header = useApiQuery((signal) => adminService.moderation(steamId, { signal }), { enabled: valid && !asPlayer, queryKey: steamId })

  if (!valid) return <div className="p-6"><Panel><EmptyState>That is not a SteamID64.</EmptyState></Panel></div>

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <div className="flex justify-end"><ViewToggle asPlayer={asPlayer} onChange={setAsPlayer} /></div>
      {asPlayer ? <PublicView steamId={steamId} /> : header.error ? <Panel><ErrorState error={header.error} onRetry={header.refetch} /></Panel> : !header.data ? <Panel><LoadingRows rows={3} /></Panel> : (
        <StaffView steamId={steamId} data={header.data} onChanged={header.refetch} />
      )}
    </div>
  )
}

/** Exactly what a player would see: the public endpoint only, no moderation data. */
function PublicView({ steamId }: { steamId: string }) {
  const { data, loading, error } = useApiQuery((signal) => adminService.publicPlayer(steamId, { signal }), { queryKey: steamId })
  if (loading) return <Panel><LoadingRows rows={2} /></Panel>
  if (error) return <Panel><ErrorState error={error} /></Panel>
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-4 p-5">
        <PlayerAvatar avatar={data?.avatar} name={data?.username} className="size-16 rounded-xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{data?.username}</h1>
          <p className="text-[13px] text-muted-foreground">Level {data?.level} · {data?.rank || "Unranked"} · member since {data ? new Date(data.memberSince).toLocaleDateString() : ""}</p>
        </div>
        <Button size="sm" variant="outline" asChild><Link to={`/profile/${steamId}`}><ExternalLink />Public profile</Link></Button>
      </div>
      <p className="border-t border-border/40 px-5 py-3 text-[12px] text-muted-foreground">This is all a player can see. Moderation history never leaves the staff endpoints.</p>
    </Panel>
  )
}

function StaffView({ steamId, data, onChanged }: { steamId: string; data: ModerationHeader; onChanged: () => void }) {
  const tabs = (Object.entries(data.tabs) as [ModerationTab, boolean][]).filter(([, visible]) => visible).map(([tab]) => tab)
  const [tab, setTab] = useState<ModerationTab>(tabs[0] ?? "punishments")
  const { player } = data

  return (
    <>
      <Panel>
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start">
          <PlayerAvatar avatar={player.avatar} name={player.name} className="size-16 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold">{player.name}</h1>
              {data.staffRole && <span className="inline-flex items-center gap-1 rounded bg-amber-300/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300"><ShieldCheck className="size-3" />{data.staffRole.name}</span>}
              {data.aboveYourRank && <AboveRank />}
              {!player.hasAccount && <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">No site account</span>}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-muted-foreground">
              <span>{player.steamId}</span>
              <a className="inline-flex items-center gap-1 hover:text-amber-300" href={`https://steamcommunity.com/profiles/${player.steamId}`} target="_blank" rel="noreferrer">Steam<ExternalLink className="size-3" /></a>
              {data.live && <Link to={data.live.matchId ? `/panel/match/${encodeURIComponent(data.live.matchId)}` : `/panel/servers/${data.live.serverId}`} className="inline-flex items-center gap-1 text-emerald-300"><Radio className="size-3" />Playing now</Link>}
            </div>
            <div className="mt-2"><FlagBadges flags={data.flags} /></div>
            <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
              {data.activeBan && <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2 py-1 text-rose-200"><Ban className="size-3.5" />Banned · {data.activeBan.reason} · <ExpiryText permanent={data.activeBan.permanent} expiresAt={data.activeBan.expiresAt} /></span>}
              {data.activeMute && <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1 text-amber-200"><MicOff className="size-3.5" />Muted · {data.activeMute.reason} · <ExpiryText permanent={data.activeMute.permanent} expiresAt={data.activeMute.expiresAt} /></span>}
              <span className="rounded-lg bg-secondary px-2 py-1 text-muted-foreground">{data.counts.bans} bans · {data.counts.mutes} mutes · {data.counts.reports} reports · {data.counts.notes} notes</span>
            </div>
          </div>
          {/* Action bar */}
          <div className="md:ml-auto">
            <PlayerActions steamId={steamId} name={player.name} aboveRank={data.aboveYourRank} live={data.actions.kick} onDone={onChanged} size="sm" />
          </div>
        </div>
      </Panel>

      {tabs.length > 0 && (
        <Tabs value={tab} onValueChange={(value) => setTab(value as ModerationTab)}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {tabs.map((key) => <TabsTrigger key={key} value={key}>{TAB_LABELS[key]}</TabsTrigger>)}
          </TabsList>
          <TabsContent value={tab}>
            <TabBody key={`${steamId}-${tab}`} steamId={steamId} tab={tab} canNote={data.actions.note} onChanged={onChanged} />
          </TabsContent>
        </Tabs>
      )}
    </>
  )
}

const TAB_LABELS: Record<ModerationTab, string> = {
  punishments: "Punishments",
  sessions: "Sessions",
  reports: "Reports",
  chat: "Chat",
  names: "Name history",
  notes: "Staff notes",
  audit: "Audit",
}

function TabBody({ steamId, tab, canNote, onChanged }: { steamId: string; tab: ModerationTab; canNote: boolean; onChanged: () => void }) {
  const { can, refreshBadge } = useStaff()
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.moderationTab<Record<string, unknown>>(steamId, tab, { signal }), { queryKey: `${steamId}:${tab}` })
  const reload = () => { refetch(); onChanged() }

  const body = error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <LoadingRows /> : (data?.items.length ?? 0) === 0 ? <EmptyState>Nothing here yet</EmptyState> : (() => {
    const items = data!.items
    switch (tab) {
      case "punishments":
        return <Rows>{(items as unknown as Punishment[]).map((item) => <PunishmentRow key={item.id} item={item} onChanged={reload} hidePlayer />)}</Rows>
      case "reports":
        return <Rows>{(items as unknown as Report[]).map((report) => <ReportRow key={report.id} report={report} canHandle={can("reports.handle")} onChanged={() => { reload(); refreshBadge() }} />)}</Rows>
      case "chat":
        return (
          <Rows>
            {(items as unknown as ChatMessage[]).map((message) => (
              <div key={message.id} className="flex gap-3 px-4 py-2 text-[13px]">
                <span className="w-28 shrink-0 text-[11px] text-muted-foreground"><RelativeTime value={message.sentAt} /></span>
                <span className="min-w-0 break-words">{message.teamOnly && <span className="mr-1.5 rounded bg-secondary px-1 text-[10px] text-muted-foreground">team</span>}{message.message}</span>
              </div>
            ))}
          </Rows>
        )
      case "sessions":
        return (
          <Rows>
            {(items as unknown as { id: string; serverId: string; serverName: string; matchId: string | null; name: string; connectedAt: string; disconnectedAt: string | null }[]).map((session) => (
              <div key={session.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[13px]">
                <Link to={`/panel/servers/${session.serverId}`} className="font-medium hover:text-amber-300">{session.serverName || "Server"}</Link>
                <span className="text-muted-foreground">as {session.name}</span>
                {session.matchId && <Link to={`/panel/match/${encodeURIComponent(session.matchId)}`} className="font-mono text-[11px] text-muted-foreground hover:text-amber-300">{session.matchId}</Link>}
                <span className="ml-auto text-[11px] text-muted-foreground"><RelativeTime value={session.connectedAt} />{session.disconnectedAt ? "" : " · online"}</span>
              </div>
            ))}
          </Rows>
        )
      case "names":
        return (
          <Rows>
            {(items as unknown as { name: string; firstSeenAt: string; lastSeenAt: string; timesSeen: number }[]).map((entry) => (
              <div key={entry.name} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[13px]">
                <span className="font-medium">{entry.name}</span>
                <span className="text-[11px] text-muted-foreground">seen {entry.timesSeen}× · first <RelativeTime value={entry.firstSeenAt} /> · last <RelativeTime value={entry.lastSeenAt} /></span>
              </div>
            ))}
          </Rows>
        )
      case "notes":
        return (
          <Rows>
            {(items as unknown as { id: string; body: string; author: { name: string } | null; createdAt: string }[]).map((note) => (
              <div key={note.id} className="px-4 py-3">
                <p className="whitespace-pre-wrap text-[13px]">{note.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{note.author?.name ?? "Staff"} · <RelativeTime value={note.createdAt} /></p>
              </div>
            ))}
          </Rows>
        )
      case "audit":
        return <Rows>{(items as unknown as AuditEntry[]).map((entry) => <AuditRow key={entry.id} entry={entry} />)}</Rows>
    }
  })()

  return (
    <Panel>
      {tab === "notes" && canNote && <NoteComposer steamId={steamId} onSaved={reload} />}
      {body}
    </Panel>
  )
}

function NoteComposer({ steamId, onSaved }: { steamId: string; onSaved: () => void }) {
  const [body, setBody] = useState("")
  const [busy, setBusy] = useState(false)
  return (
    <form className="flex flex-col gap-2 border-b border-border/40 p-4" onSubmit={async (e) => {
      e.preventDefault()
      setBusy(true)
      try { await adminService.addNote(steamId, body.trim()); setBody(""); toast.success("Note saved"); onSaved() } catch (error) { toastError(error) } finally { setBusy(false) }
    }}>
      <Textarea rows={2} maxLength={2000} placeholder="Add a staff note (only staff can read it)" value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex justify-end"><Button size="sm" type="submit" disabled={busy || body.trim().length === 0}><StickyNote />Add note</Button></div>
    </form>
  )
}
