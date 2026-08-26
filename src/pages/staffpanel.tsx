// LEGACY-X Staff Panel: player-first shadcn console; isolated staff auth, allowlisted queue payloads and no direct CS2 execution.
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import type { LucideIcon } from "lucide-react"
import { AlertTriangle, BellRing, Database, Gavel, Loader2, LockKeyhole, Map, Megaphone, MonitorUp, PackagePlus, Power, RefreshCw, RotateCcw, ServerCog, ShieldAlert, UserRoundCog, UsersRound } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { setAccessToken } from "@/api/client"
import { staffPanelService } from "@/api/staffpanel"
import type { ApiError, StaffPanelAccess, StaffPanelActionRequest, StaffPanelDatabaseOverview, StaffPanelOverview, StaffPanelProduct, StaffPanelRosterPlayer, StaffPanelServerRoster } from "@/api/types"
import { cs2MapArtwork, cs2MapLabel, normalizeCs2MapKey } from "@/lib/cs2-map-art"

const apiOrigin = (import.meta.env.VITE_API_URL?.trim() || (import.meta.env.PROD ? "https://api.legacyx.cc" : "")).replace(/\/$/, "")
const banTerms: Array<NonNullable<StaffPanelActionRequest["banTerm"]>> = ["10m", "30m", "1h", "1d", "7d", "permanent"]
const alertColors: Array<NonNullable<StaffPanelActionRequest["alertColor"]>> = ["gold", "sky", "red", "green", "neutral"]
const staffPanelMaps = ["de_ancient", "de_anubis", "de_cache", "de_dust2", "de_inferno", "de_mirage", "de_nuke", "de_overpass", "de_train", "de_vertigo"] as const
const alertColorClasses = { gold: "border-amber-300/50 bg-amber-300/10 text-amber-100", sky: "border-sky-300/50 bg-sky-300/10 text-sky-100", red: "border-red-300/50 bg-red-300/10 text-red-100", green: "border-emerald-300/50 bg-emerald-300/10 text-emerald-100", neutral: "border-border bg-muted text-foreground" } as const

type ActionDefinition = {
  type: StaffPanelActionRequest["type"]
  label: string
  icon: LucideIcon
  scope: "player" | "server"
  workflow: "ban" | "reason" | "mute" | "rename" | "hud" | "message" | "map" | "none"
  destructive?: boolean
}

const managerPlayerActions: ActionDefinition[] = [
  { type: "ban", label: "Ban", icon: Gavel, scope: "player", workflow: "ban", destructive: true },
  { type: "unban", label: "Unban", icon: ShieldAlert, scope: "player", workflow: "reason", destructive: true },
  { type: "kick", label: "Kick", icon: UsersRound, scope: "player", workflow: "reason", destructive: true },
  { type: "mute", label: "Mute", icon: LockKeyhole, scope: "player", workflow: "mute", destructive: true },
  { type: "rename", label: "Rename", icon: UserRoundCog, scope: "player", workflow: "rename" },
  { type: "player_hud_alert", label: "HUD alert", icon: BellRing, scope: "player", workflow: "hud" },
  { type: "player_message", label: "Direct message", icon: MonitorUp, scope: "player", workflow: "message" },
]

const managerServerActions: ActionDefinition[] = [
  { type: "map_change", label: "Change map", icon: Map, scope: "server", workflow: "map", destructive: true },
  { type: "match_announcement", label: "Match announcement", icon: Megaphone, scope: "server", workflow: "message" },
  { type: "hud_announcement", label: "Server HUD alert", icon: MonitorUp, scope: "server", workflow: "hud" },
]

const ownerPlayerActions: ActionDefinition[] = [
  { type: "player_ip_lookup", label: "View connection IP", icon: Database, scope: "player", workflow: "none", destructive: true },
]

const ownerServerActions: ActionDefinition[] = [
  { type: "server_announcement", label: "Server announcement", icon: Megaphone, scope: "server", workflow: "message" },
  { type: "restart_all", label: "Restart all servers", icon: Power, scope: "server", workflow: "none", destructive: true },
  { type: "restart_server", label: "Restart selected server", icon: ServerCog, scope: "server", workflow: "none", destructive: true },
  { type: "start_server", label: "Start selected server", icon: Power, scope: "server", workflow: "none", destructive: true },
  { type: "stop_server", label: "Stop selected server", icon: Power, scope: "server", workflow: "none", destructive: true },
  { type: "timeout", label: "Timeout game", icon: LockKeyhole, scope: "server", workflow: "message", destructive: true },
  { type: "round_restart", label: "Restart round", icon: RotateCcw, scope: "server", workflow: "none", destructive: true },
  { type: "round_restore", label: "Restore round", icon: RotateCcw, scope: "server", workflow: "none", destructive: true },
]

function toUiError(error: unknown) {
  const api = error as ApiError
  return api?.message || "Unable to complete the requested operation."
}

function teamClass(team: StaffPanelRosterPlayer["team"]) {
  if (team === "T") return "border-amber-300/25 bg-amber-300/[0.06] text-amber-100"
  if (team === "CT") return "border-sky-300/25 bg-sky-300/[0.06] text-sky-100"
  if (team === "SPECTATOR") return "border-violet-300/25 bg-violet-300/[0.06] text-violet-100"
  return "border-border bg-muted/30 text-muted-foreground"
}

function teamLabel(team: StaffPanelRosterPlayer["team"]) {
  return team === "UNASSIGNED" ? "Connected" : team
}

export function StaffPanelPage() {
  const [params] = useSearchParams()
  const [access, setAccess] = useState<StaffPanelAccess | null>(null)
  const [overview, setOverview] = useState<StaffPanelOverview | null>(null)
  const [roster, setRoster] = useState<StaffPanelServerRoster | null>(null)
  const [selectedServer, setSelectedServer] = useState("")
  const [selectedPlayer, setSelectedPlayer] = useState<StaffPanelRosterPlayer | null>(null)
  const [activeAction, setActiveAction] = useState<ActionDefinition | null>(null)
  const [pendingAction, setPendingAction] = useState<ActionDefinition | null>(null)
  const [database, setDatabase] = useState<StaffPanelDatabaseOverview | null>(null)
  const [products, setProducts] = useState<StaffPanelProduct[]>([])
  const [reason, setReason] = useState("")
  const [message, setMessage] = useState("")
  const [map, setMap] = useState("de_mirage")
  const [mapImpactAcknowledged, setMapImpactAcknowledged] = useState(false)
  const [banTerm, setBanTerm] = useState<NonNullable<StaffPanelActionRequest["banTerm"]>>("1d")
  const [muteDuration, setMuteDuration] = useState("1800")
  const [newName, setNewName] = useState("")
  const [alertColor, setAlertColor] = useState<NonNullable<StaffPanelActionRequest["alertColor"]>>("gold")
  const [countdownSeconds, setCountdownSeconds] = useState("0")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [rosterLoading, setRosterLoading] = useState(false)
  const [pendingArchive, setPendingArchive] = useState<StaffPanelProduct | null>(null)
  const [productName, setProductName] = useState("")
  const [productCategory, setProductCategory] = useState("service")
  const [productPrice, setProductPrice] = useState("10")

  const actorLabel = access?.role === "OWNER" ? "Owner" : "Manager"
  const playerActions = useMemo(() => access?.role === "OWNER" ? [...managerPlayerActions, ...ownerPlayerActions] : managerPlayerActions, [access?.role])
  const serverActions = useMemo(() => access?.role === "OWNER" ? [...managerServerActions, ...ownerServerActions] : managerServerActions, [access?.role])
  const selectedServerName = roster?.server.name || overview?.servers.find((server) => server.server_id === selectedServer)?.name || selectedServer
  const currentMapKey = normalizeCs2MapKey(roster?.server.map || overview?.servers.find((server) => server.server_id === selectedServer)?.map_name)
  const selectedMapArtwork = cs2MapArtwork(map)
  const selectedMapIsCurrent = currentMapKey === map
  const selectedServerIsLive = roster?.server.state === "live" || roster?.server.state === "paused"

  useEffect(() => {
    if (params.get("reauth") !== "done") {
      setAccessToken(null)
      window.location.replace(`${apiOrigin}/api/v1/auth/steam?staffpanel=1`)
    }
  }, [params])

  const load = async () => {
    try {
      const [nextAccess, nextOverview] = await Promise.all([staffPanelService.access(), staffPanelService.overview()])
      setAccess(nextAccess)
      setOverview(nextOverview)
      setSelectedServer((current) => current || nextOverview.servers[0]?.server_id || "")
      if (nextAccess.role === "OWNER") {
        const [nextDatabase, nextProducts] = await Promise.all([staffPanelService.database(), staffPanelService.products()])
        setDatabase(nextDatabase)
        setProducts(nextProducts)
      }
    } catch (error) {
      const api = error as ApiError
      if (api?.status === 401) {
        setAccessToken(null)
        window.location.replace(`${apiOrigin}/api/v1/auth/steam?staffpanel=1`)
        return
      }
      setNotice(toUiError(error))
    }
  }

  const loadRoster = async (serverId = selectedServer) => {
    if (!serverId) return
    setRosterLoading(true)
    try {
      setRoster(await staffPanelService.roster(serverId))
    } catch (error) {
      setRoster(null)
      setNotice(toUiError(error))
    } finally {
      setRosterLoading(false)
    }
  }

  useEffect(() => {
    if (params.get("reauth") === "done") void load()
  }, [params])

  useEffect(() => {
    setSelectedPlayer(null)
    setActiveAction(null)
    setPendingAction(null)
    setRoster(null)
    if (selectedServer) void loadRoster(selectedServer)
  }, [selectedServer])

  const resetActionFields = () => {
    setReason("")
    setMessage("")
    setNewName("")
    setAlertColor("gold")
    setCountdownSeconds("0")
    setMuteDuration("1800")
  }

  const chooseAction = (action: ActionDefinition) => {
    if (action.scope === "player" && !selectedPlayer) return setNotice("Select a player from the roster first.")
    resetActionFields()
    if (action.type === "map_change") {
      const knownCurrentMap = currentMapKey && staffPanelMaps.includes(currentMapKey as typeof staffPanelMaps[number]) ? currentMapKey : null
      setMap(knownCurrentMap || "de_mirage")
      setMapImpactAcknowledged(false)
    }
    setActiveAction(action)
    setNotice("")
  }

  const requestConfirmation = () => {
    if (!activeAction) return
    if (activeAction.scope === "player" && !selectedPlayer) return setNotice("Select a player from the roster first.")
    if (activeAction.workflow === "ban" && !reason.trim()) return setNotice("A ban reason is required.")
    if (["reason", "mute"].includes(activeAction.workflow) && !reason.trim()) return setNotice("A reason is required.")
    if (["hud", "message"].includes(activeAction.workflow) && !message.trim()) return setNotice("Text is required for this alert or message.")
    if (activeAction.workflow === "map" && !staffPanelMaps.includes(map as typeof staffPanelMaps[number])) return setNotice("Select an approved map.")
    if (activeAction.workflow === "map" && selectedMapIsCurrent) return setNotice("Select a map different from the current server map.")
    if (activeAction.workflow === "map" && !mapImpactAcknowledged) return setNotice("Acknowledge the map-change impact before continuing.")
    if (activeAction.workflow === "rename" && newName.trim().length < 2) return setNotice("Enter the player’s new name.")
    if (activeAction.workflow === "hud" && (!Number.isInteger(Number(countdownSeconds)) || Number(countdownSeconds) < 0 || Number(countdownSeconds) > 600)) return setNotice("Countdown must be between 0 and 600 seconds.")
    setPendingAction(activeAction)
  }

  const queuePendingAction = async () => {
    if (!pendingAction) return
    setBusy(true)
    const moderationReason = ["ban", "unban", "kick", "mute"].includes(pendingAction.type) ? reason.trim() : undefined
    try {
      const result = await staffPanelService.queueAction({
        serverId: selectedServer,
        type: pendingAction.type,
        playerSteamId: selectedPlayer?.steamId,
        playerName: selectedPlayer?.name,
        message: moderationReason || message.trim() || undefined,
        reason: moderationReason,
        map: pendingAction.workflow === "map" ? map.trim() : undefined,
        mapImpactAcknowledged: pendingAction.workflow === "map" ? true : undefined,
        durationSeconds: pendingAction.type === "mute" ? Number(muteDuration) : undefined,
        banTerm: pendingAction.type === "ban" ? banTerm : undefined,
        enforceAfterSeconds: pendingAction.type === "ban" ? 10 : undefined,
        alertColor: pendingAction.workflow === "hud" ? alertColor : undefined,
        countdownSeconds: pendingAction.workflow === "hud" ? Number(countdownSeconds) : undefined,
        newName: pendingAction.type === "rename" ? newName.trim() : undefined,
      })
      setNotice(`${result.action.action_type.replaceAll("_", " ")} is queued and audited. The plugin must acknowledge it before it is marked complete.`)
      setPendingAction(null)
      setActiveAction(null)
      await Promise.all([load(), loadRoster()])
    } catch (error) {
      setNotice(toUiError(error))
    } finally {
      setBusy(false)
    }
  }

  const createProduct = async () => {
    if (!productName.trim() || !Number.isInteger(Number(productPrice)) || Number(productPrice) < 0) return setNotice("Enter a valid product name and whole coin price.")
    setBusy(true)
    try {
      await staffPanelService.createProduct({ name: productName.trim(), category: productCategory.trim() || "service", price: Number(productPrice), image: "", rarity: "Common" })
      setProductName("")
      setNotice("Product created and audited.")
      await load()
    } catch (error) {
      setNotice(toUiError(error))
    } finally {
      setBusy(false)
    }
  }

  const archiveProduct = async () => {
    if (!pendingArchive) return
    setBusy(true)
    try {
      await staffPanelService.archiveProduct(pendingArchive.id)
      setPendingArchive(null)
      setNotice("Product archived. Purchase history remains intact.")
      await load()
    } catch (error) {
      setNotice(toUiError(error))
    } finally {
      setBusy(false)
    }
  }

  if (!access) return <div className="flex min-h-[65vh] items-center justify-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Steam re-authentication required</div>

  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-7">
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm"><div className="absolute right-0 top-0 h-36 w-64 bg-primary/10 blur-3xl" /><div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.22em] text-primary">Isolated Steam staff session</p><h1 className="mt-2 text-3xl font-semibold text-foreground">Staff Panel</h1><p className="mt-2 text-sm text-muted-foreground">{access.username} · <span className="text-foreground">{access.role}</span> access</p></div><div className="max-w-sm rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">Select server, select player, configure one allowlisted action, then confirm the audited queue request.</div></div></section>
    {notice && <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">{notice}</div>}

    <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
      <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><UsersRound className="h-4 w-4" />Server roster</CardTitle><CardDescription>Selecting a server loads only the current snapshot or connected-player fallback through the isolated staff session.</CardDescription></CardHeader><CardContent>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end"><div className="min-w-0 flex-1"><Label className="mb-1.5 block" htmlFor="staff-server">Target server</Label><select id="staff-server" value={selectedServer} onChange={(event) => setSelectedServer(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"><option value="">Select server</option>{overview?.servers.map((server) => <option key={server.server_id} value={server.server_id}>{server.name || server.server_id} · {server.mode} · {server.map_name}</option>)}</select></div><Button type="button" variant="outline" disabled={!selectedServer || rosterLoading} onClick={() => void loadRoster()} className="gap-2"><RefreshCw className={`h-4 w-4 ${rosterLoading ? "animate-spin" : ""}`} />Refresh</Button></div>
        {roster && <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"><span>{roster.server.name} · {roster.server.mode} · {roster.server.map}</span><span>{roster.players.length} visible · {roster.server.availability.replaceAll("_", " ")}</span></div>}
        {rosterLoading && <div className="flex min-h-44 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading roster</div>}
        {!rosterLoading && !roster && <div className="flex min-h-44 items-center justify-center text-center text-sm text-muted-foreground">Choose a server to load its current player roster.</div>}
        {!rosterLoading && roster && <div className="overflow-hidden rounded-lg border border-border"><Table><TableHeader><TableRow><TableHead>Player</TableHead><TableHead>Team</TableHead><TableHead className="text-right">ADR</TableHead><TableHead className="text-right">Ping</TableHead></TableRow></TableHeader><TableBody>{roster.players.length ? roster.players.map((player) => <TableRow key={`${player.steamId}-${player.team}`} data-state={selectedPlayer?.steamId === player.steamId ? "selected" : undefined} onClick={() => { setSelectedPlayer(player); setActiveAction(null); setPendingAction(null) }} className="cursor-pointer"><TableCell><div className="flex min-w-0 flex-col"><span className="truncate font-medium text-foreground">{player.name}</span><span className="font-mono text-[10px] text-muted-foreground">{player.steamId}</span></div></TableCell><TableCell><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${teamClass(player.team)}`}>{teamLabel(player.team)}</span></TableCell><TableCell className="text-right text-xs tabular-nums text-muted-foreground">{player.adr === null ? "—" : player.adr.toFixed(1)}</TableCell><TableCell className="text-right text-xs tabular-nums text-muted-foreground">{player.ping === null ? "—" : `${player.ping}ms`}</TableCell></TableRow>) : <TableRow><TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">No current player snapshot received.</TableCell></TableRow>}</TableBody></Table></div>}
      </CardContent></Card>

      <Card><CardHeader className="pb-3"><CardTitle>Player actions</CardTitle><CardDescription>{selectedPlayer ? `${selectedPlayer.name} selected. Choose one action to configure.` : "Select a player from the roster to enable moderation and player alert actions."}</CardDescription></CardHeader><CardContent><div className="grid grid-cols-2 gap-2">{playerActions.map((action) => { const Icon = action.icon; return <Button key={action.type} type="button" disabled={!selectedPlayer || busy} onClick={() => chooseAction(action)} variant={action.destructive ? "outline" : "secondary"} className="h-auto justify-start gap-2 px-3 py-3 text-left"><Icon className="h-4 w-4 shrink-0" />{action.label}</Button> })}</div>{selectedPlayer && <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-xs"><p className="font-medium text-foreground">Selected target</p><p className="mt-1 text-muted-foreground">{selectedPlayer.name} · {selectedPlayer.steamId}</p><p className="mt-1 text-muted-foreground">{teamLabel(selectedPlayer.team)} · {selectedPlayer.connected ? "connected" : "disconnected"}</p></div>}</CardContent></Card>
    </section>

    {activeAction && <Card className="border-primary/30"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><activeAction.icon className="h-4 w-4 text-primary" />Configure {activeAction.label}</CardTitle><CardDescription>{activeAction.scope === "player" ? `Target: ${selectedPlayer?.name} · ${selectedPlayer?.steamId}` : `Target server: ${selectedServerName}`}</CardDescription></CardHeader><CardContent className="space-y-4">
      {activeAction.workflow === "ban" && <><div className="grid gap-3 sm:grid-cols-2"><div><Label className="mb-1.5 block" htmlFor="ban-term">Ban term</Label><select id="ban-term" value={banTerm} onChange={(event) => setBanTerm(event.target.value as typeof banTerm)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{banTerms.map((term) => <option key={term} value={term}>{term}</option>)}</select></div><div className="rounded-lg border border-amber-300/25 bg-amber-300/[0.07] p-3 text-sm text-amber-100"><p className="font-medium">Player HUD notice</p><p className="mt-1 text-xs text-amber-100/75">{actorLabel} banned you · enforcement begins in 10 seconds.</p></div></div><div><Label className="mb-1.5 block" htmlFor="ban-reason">Reason</Label><Textarea id="ban-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the moderation reason" /></div></>}
      {activeAction.workflow === "reason" && <div><Label className="mb-1.5 block" htmlFor="action-reason">Reason</Label><Textarea id="action-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder={activeAction.type === "kick" ? "This reason is shown in the player notice before removal" : "Explain this moderation change"} /><p className="mt-1.5 text-xs text-muted-foreground">{activeAction.type === "kick" ? `${actorLabel} will remove the player after confirmation. The reason is retained in the audit payload.` : "The reason is stored in the audited queue payload."}</p></div>}
      {activeAction.workflow === "mute" && <div className="grid gap-3 sm:grid-cols-2"><div><Label className="mb-1.5 block" htmlFor="mute-term">Mute duration</Label><select id="mute-term" value={muteDuration} onChange={(event) => setMuteDuration(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="300">5 minutes</option><option value="1800">30 minutes</option><option value="3600">1 hour</option><option value="86400">1 day</option></select></div><div><Label className="mb-1.5 block" htmlFor="mute-reason">Reason</Label><Input id="mute-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the communication restriction" /></div></div>}
      {activeAction.workflow === "rename" && <div><Label className="mb-1.5 block" htmlFor="new-name">New player name</Label><Input id="new-name" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="New display name" /></div>}
      {activeAction.workflow === "map" && <div className="space-y-4"><div className="overflow-hidden rounded-xl border border-border bg-muted/20"><div className="grid gap-0 md:grid-cols-[.78fr_1.22fr]">{selectedMapArtwork ? <img src={selectedMapArtwork} alt={`${cs2MapLabel(map)} map artwork`} className="h-40 w-full object-cover opacity-80 md:h-full" /> : <div className="flex min-h-40 items-center justify-center bg-muted text-muted-foreground"><Map className="h-7 w-7" /></div>}<div className="p-4"><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Target map</p><h3 className="mt-1 text-xl font-semibold text-foreground">{cs2MapLabel(map)}</h3><dl className="mt-3 grid gap-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Current</dt><dd className="text-right text-foreground">{currentMapKey ? cs2MapLabel(currentMapKey) : "Unavailable"}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Server state</dt><dd className="text-right text-foreground">{roster?.server.state || "unavailable"}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Visible players</dt><dd className="text-right text-foreground">{roster?.players.length ?? 0}</dd></div></dl></div></div></div><div><Label className="mb-2 block">Approved map catalog</Label><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{staffPanelMaps.map((mapKey) => <Button key={mapKey} type="button" variant="outline" aria-pressed={map === mapKey} onClick={() => { setMap(mapKey); setMapImpactAcknowledged(false) }} className={`h-auto min-h-16 justify-start gap-2 p-2 text-left ${map === mapKey ? "border-primary bg-primary/10" : ""}`}><img src={cs2MapArtwork(mapKey) || ""} alt="" className="h-11 w-16 rounded object-cover opacity-80" /><span className="min-w-0 truncate">{cs2MapLabel(mapKey)}</span></Button>)}</div></div><div className={`rounded-lg border p-3 ${selectedServerIsLive ? "border-amber-300/30 bg-amber-300/[0.07]" : "border-border bg-muted/30"}`}><div className="flex items-start gap-3"><Checkbox id="map-impact-acknowledgement" checked={mapImpactAcknowledged} onCheckedChange={(checked) => setMapImpactAcknowledged(checked === true)} /><div><Label htmlFor="map-impact-acknowledgement" className="cursor-pointer font-medium text-foreground">I understand that changing the map interrupts the selected server.</Label><p className="mt-1 text-xs leading-5 text-muted-foreground">{selectedServerIsLive ? "This server reports an active or paused match. The future executor must revalidate this state before any map transition." : "The executor will still revalidate server availability and map support before execution."}</p></div></div></div></div>}
      {["hud", "message"].includes(activeAction.workflow) && <div className="space-y-3"><div><Label className="mb-1.5 block" htmlFor="alert-text">{activeAction.workflow === "hud" ? "HUD text" : "Message"}</Label><Textarea id="alert-text" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write the player-facing text" /></div>{activeAction.workflow === "hud" && <div className="grid gap-3 sm:grid-cols-2"><div><Label className="mb-1.5 block">Alert color</Label><div className="flex flex-wrap gap-2">{alertColors.map((color) => <Button key={color} type="button" variant="outline" onClick={() => setAlertColor(color)} className={`capitalize ${alertColor === color ? alertColorClasses[color] : ""}`}>{color}</Button>)}</div></div><div><Label className="mb-1.5 block" htmlFor="alert-countdown">Optional countdown seconds</Label><Input id="alert-countdown" value={countdownSeconds} onChange={(event) => setCountdownSeconds(event.target.value)} inputMode="numeric" /><p className="mt-1.5 text-xs text-muted-foreground">Use 0 for no countdown.</p></div></div>}</div>}
      {activeAction.workflow === "none" && <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">This allowlisted operation has no editable browser command fields. Review its exact target in the confirmation dialog.</div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><p className="text-xs text-muted-foreground">All requests are audited. Queueing is not a CS2 execution success.</p><div className="flex gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setActiveAction(null)}>Cancel</Button><Button type="button" disabled={busy} onClick={requestConfirmation}>Review and confirm</Button></div></div>
    </CardContent></Card>}

    <Card><CardHeader className="pb-3"><CardTitle>Server actions</CardTitle><CardDescription>Server-scoped operations remain separate from the selected player workflow.</CardDescription></CardHeader><CardContent><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{serverActions.map((action) => { const Icon = action.icon; return <Button key={action.type} type="button" disabled={!selectedServer || busy} onClick={() => chooseAction(action)} variant={action.destructive ? "outline" : "secondary"} className="h-auto justify-start gap-2 px-3 py-3 text-left"><Icon className="h-4 w-4 shrink-0" />{action.label}</Button> })}</div></CardContent></Card>

    <Card><CardHeader className="pb-3"><CardTitle>Action queue</CardTitle><CardDescription>A scoped game-server plugin must acknowledge a request before the panel can treat it as complete.</CardDescription></CardHeader><CardContent className="space-y-2">{overview?.pendingActions.length ? overview.pendingActions.map((action) => <div key={action.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-xs"><span className="min-w-0 truncate text-foreground">{action.action_type.replaceAll("_", " ")} · {action.server_id}</span><span className="uppercase text-muted-foreground">{action.status}</span></div>) : <p className="text-sm text-muted-foreground">No pending server operations.</p>}</CardContent></Card>

    {access.role === "OWNER" && <section className="grid gap-4 lg:grid-cols-2"><Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" />Database overview</CardTitle><CardDescription>Metadata only. Raw SQL is never exposed in the browser.</CardDescription></CardHeader><CardContent><div className="grid grid-cols-2 gap-2">{database?.tables.map((table) => <div key={table.name} className="rounded-lg border border-border px-3 py-3"><p className="text-xs text-muted-foreground">{table.name}</p><p className="mt-1 text-xl font-semibold text-foreground">{table.count}</p></div>)}</div></CardContent></Card><Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><PackagePlus className="h-4 w-4" />Products</CardTitle><CardDescription>Owner-only management. Deployment controls remain server-side.</CardDescription></CardHeader><CardContent><div className="grid gap-2 sm:grid-cols-[1fr_.8fr_.5fr_auto]"><Input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Product name" /><Input value={productCategory} onChange={(event) => setProductCategory(event.target.value)} placeholder="Category" /><Input value={productPrice} onChange={(event) => setProductPrice(event.target.value)} inputMode="numeric" placeholder="Coins" /><Button disabled={busy} onClick={() => void createProduct()} size="sm">Add</Button></div><div className="mt-3 space-y-2">{products.slice(0, 5).map((product) => <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"><span className="min-w-0 truncate text-foreground">{product.name}</span><span className={product.active ? "text-foreground" : "text-muted-foreground"}>{product.active ? `${product.price} coins` : "archived"}</span>{product.active && <Button disabled={busy} onClick={() => setPendingArchive(product)} variant="outline" size="sm">Archive</Button>}</div>)}</div></CardContent></Card></section>}

    <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open && !busy) setPendingAction(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Confirm queued operation</AlertDialogTitle><AlertDialogDescription>{pendingAction?.destructive ? "This operation affects a player, a match or server availability." : "Review the target and player-facing content before queueing."}</AlertDialogDescription></AlertDialogHeader><div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm"><p><span className="text-muted-foreground">Operation:</span> {pendingAction?.label}</p><p><span className="text-muted-foreground">Server:</span> {pendingAction?.type === "restart_all" ? `All configured servers; queue context: ${selectedServerName}` : selectedServerName}</p>{pendingAction?.scope === "player" && <p><span className="text-muted-foreground">Player:</span> {selectedPlayer?.name} · {selectedPlayer?.steamId}</p>}{pendingAction?.type === "ban" && <><p><span className="text-muted-foreground">Term:</span> {banTerm}</p><p><span className="text-muted-foreground">Reason:</span> {reason}</p><p className="rounded-md border border-amber-300/25 bg-amber-300/[0.07] p-2 text-amber-100">Player HUD: {actorLabel} banned you · enforcement starts in 10 seconds.</p></>}{pendingAction?.type === "kick" && <><p><span className="text-muted-foreground">Reason:</span> {reason}</p><p className="rounded-md border border-border bg-background/40 p-2 text-muted-foreground">Player notice: {actorLabel} will remove you. Reason: {reason}</p></>}{pendingAction?.workflow === "mute" && <p><span className="text-muted-foreground">Mute:</span> {Math.round(Number(muteDuration) / 60)} minutes · {reason}</p>}{pendingAction?.workflow === "map" && <><p><span className="text-muted-foreground">Map:</span> {cs2MapLabel(map)} ({map})</p><p><span className="text-muted-foreground">Current map:</span> {currentMapKey ? cs2MapLabel(currentMapKey) : "Unavailable"}</p><p className="rounded-md border border-amber-300/25 bg-amber-300/[0.07] p-2 text-amber-100">Impact acknowledged: the selected server will be interrupted. The plugin revalidates the live-match state before any transition.</p></>}{pendingAction?.workflow === "rename" && <p><span className="text-muted-foreground">New name:</span> {newName}</p>}{["hud", "message"].includes(pendingAction?.workflow || "") && <><p><span className="text-muted-foreground">Text:</span> {message}</p>{pendingAction?.workflow === "hud" && <p><span className="text-muted-foreground">HUD style:</span> {alertColor} · {Number(countdownSeconds) || "no"} second countdown</p>}</>}<p className="pt-1 text-xs text-muted-foreground">The request is audited and remains pending until an authorized game-server plugin acknowledges it.</p></div><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void queuePendingAction() }}>{busy ? "Queueing" : "Confirm and queue"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={Boolean(pendingArchive)} onOpenChange={(open) => { if (!open && !busy) setPendingArchive(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Archive product</AlertDialogTitle><AlertDialogDescription>This hides the product from future purchases. Existing purchase history remains intact.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void archiveProduct() }}>{busy ? "Archiving" : "Confirm archive"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </main>
}
