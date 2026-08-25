// LEGACY-X Staff Panel: shadcn operational console; isolated staff auth and server-authoritative actions only.
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import type { LucideIcon } from "lucide-react"
import { AlertTriangle, Database, Loader2, LockKeyhole, Map, Megaphone, MonitorUp, PackagePlus, Power, RotateCcw, ServerCog, ShieldAlert, UserRoundCog, UsersRound } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { setAccessToken } from "@/api/client"
import { staffPanelService } from "@/api/staffpanel"
import type { ApiError, StaffPanelAccess, StaffPanelActionRequest, StaffPanelDatabaseOverview, StaffPanelOverview, StaffPanelProduct } from "@/api/types"

const apiOrigin = (import.meta.env.VITE_API_URL?.trim() || (import.meta.env.PROD ? "https://api.legacyx.cc" : "")).replace(/\/$/, "")

type ActionDefinition = {
  type: StaffPanelActionRequest["type"]
  label: string
  icon: LucideIcon
  needsPlayer?: boolean
  needsMessage?: boolean
  needsMap?: boolean
  destructive?: boolean
}

const managerActions: ActionDefinition[] = [
  { type: "ban", label: "Ban player", icon: ShieldAlert, needsPlayer: true, needsMessage: true, destructive: true },
  { type: "unban", label: "Unban player", icon: ShieldAlert, needsPlayer: true, needsMessage: true, destructive: true },
  { type: "kick", label: "Kick player", icon: UsersRound, needsPlayer: true, needsMessage: true, destructive: true },
  { type: "mute", label: "Mute player", icon: LockKeyhole, needsPlayer: true, needsMessage: true, destructive: true },
  { type: "rename", label: "Rename player", icon: UserRoundCog, needsPlayer: true, needsMessage: true },
  { type: "map_change", label: "Change map", icon: Map, needsMap: true, destructive: true },
  { type: "server_announcement", label: "Server announcement", icon: Megaphone, needsMessage: true },
  { type: "match_announcement", label: "Match announcement", icon: Megaphone, needsMessage: true },
  { type: "hud_announcement", label: "HUD announcement", icon: MonitorUp, needsMessage: true },
  { type: "player_message", label: "Player message", icon: MonitorUp, needsPlayer: true, needsMessage: true },
]

const ownerActions: ActionDefinition[] = [
  { type: "restart_all", label: "Restart all servers", icon: Power, destructive: true },
  { type: "restart_server", label: "Restart selected server", icon: ServerCog, destructive: true },
  { type: "start_server", label: "Start selected server", icon: Power, destructive: true },
  { type: "stop_server", label: "Stop selected server", icon: Power, destructive: true },
  { type: "timeout", label: "Timeout game", icon: LockKeyhole, needsMessage: true, destructive: true },
  { type: "round_restart", label: "Restart round", icon: RotateCcw, destructive: true },
  { type: "round_restore", label: "Restore round", icon: RotateCcw, destructive: true },
  { type: "player_ip_lookup", label: "View player IP", icon: Database, needsPlayer: true, destructive: true },
]

function toUiError(error: unknown) {
  const api = error as ApiError
  return api?.message || "Unable to complete the requested operation."
}

export function StaffPanelPage() {
  const [params] = useSearchParams()
  const [access, setAccess] = useState<StaffPanelAccess | null>(null)
  const [overview, setOverview] = useState<StaffPanelOverview | null>(null)
  const [database, setDatabase] = useState<StaffPanelDatabaseOverview | null>(null)
  const [products, setProducts] = useState<StaffPanelProduct[]>([])
  const [selectedServer, setSelectedServer] = useState("")
  const [playerSteamId, setPlayerSteamId] = useState("")
  const [message, setMessage] = useState("")
  const [map, setMap] = useState("de_mirage")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [pendingAction, setPendingAction] = useState<ActionDefinition | null>(null)
  const [pendingArchive, setPendingArchive] = useState<StaffPanelProduct | null>(null)
  const [productName, setProductName] = useState("")
  const [productCategory, setProductCategory] = useState("service")
  const [productPrice, setProductPrice] = useState("10")

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

  useEffect(() => {
    if (params.get("reauth") === "done") void load()
  }, [params])

  const visibleActions = useMemo(() => access?.role === "OWNER" ? [...managerActions, ...ownerActions] : managerActions, [access?.role])
  const selectedServerName = overview?.servers.find((server) => server.server_id === selectedServer)?.name || selectedServer

  const requestAction = (action: ActionDefinition) => {
    if (!selectedServer) return setNotice("Select a server first.")
    if (action.needsPlayer && !/^\d{17}$/.test(playerSteamId)) return setNotice("Enter a valid 17-digit SteamID.")
    if (action.needsMap && !map.trim()) return setNotice("Enter a map name.")
    if (action.needsMessage && !message.trim()) return setNotice("Enter a reason or announcement.")
    setPendingAction(action)
  }

  const queuePendingAction = async () => {
    if (!pendingAction) return
    setBusy(true)
    try {
      const result = await staffPanelService.queueAction({
        serverId: selectedServer,
        type: pendingAction.type,
        playerSteamId: playerSteamId || undefined,
        message: message || undefined,
        map: map || undefined,
      })
      setNotice(`${result.action.action_type.replaceAll("_", " ")} is queued and audited. It will run only after an authorized game server plugin acknowledges it.`)
      setPendingAction(null)
      await load()
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
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="absolute right-0 top-0 h-36 w-64 bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[.22em] text-primary">Isolated Steam staff session</p><h1 className="mt-2 text-3xl font-semibold text-foreground">Staff Panel</h1><p className="mt-2 text-sm text-muted-foreground">{access.username} · <span className="text-foreground">{access.role}</span> access</p></div>
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">Every operation requires confirmation, queueing and an audit record.</div>
      </div>
    </section>

    {notice && <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">{notice}</div>}
    <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <Card><CardHeader className="pb-3"><CardTitle>Server operations</CardTitle><CardDescription>Select a server, add only fields required by the operation, then review the confirmation.</CardDescription></CardHeader><CardContent>
        <Label className="mb-2 block" htmlFor="staff-server">Target server</Label>
        <select id="staff-server" value={selectedServer} onChange={(event) => setSelectedServer(event.target.value)} className="mb-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"><option value="">Select server</option>{overview?.servers.map((server) => <option key={server.server_id} value={server.server_id}>{server.name || server.server_id} · {server.mode} · {server.map_name}</option>)}</select>
        <div className="grid gap-2 sm:grid-cols-2">{visibleActions.map((action) => { const Icon = action.icon; return <Button key={action.type} type="button" disabled={busy} onClick={() => requestAction(action)} variant={action.destructive ? "outline" : "secondary"} className="h-auto justify-start gap-3 px-3 py-3 text-left"><Icon className="h-4 w-4 shrink-0" />{action.label}</Button> })}</div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><div><Label className="mb-1.5 block" htmlFor="staff-steam-id">Player SteamID</Label><Input id="staff-steam-id" value={playerSteamId} onChange={(event) => setPlayerSteamId(event.target.value)} placeholder="7656119..." /></div><div><Label className="mb-1.5 block" htmlFor="staff-map">Map</Label><Input id="staff-map" value={map} onChange={(event) => setMap(event.target.value)} placeholder="de_mirage" /></div><div><Label className="mb-1.5 block" htmlFor="staff-message">Reason or announcement</Label><Input id="staff-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Required by selected action" /></div></div>
      </CardContent></Card>
      <Card><CardHeader className="pb-3"><CardTitle>Action queue</CardTitle><CardDescription>Game server acknowledgement is required before an operation is complete.</CardDescription></CardHeader><CardContent className="space-y-2">{overview?.pendingActions.length ? overview.pendingActions.map((action) => <div key={action.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-xs"><span className="min-w-0 truncate text-foreground">{action.action_type.replaceAll("_", " ")} · {action.server_id}</span><span className="uppercase text-muted-foreground">{action.status}</span></div>) : <p className="text-sm text-muted-foreground">No pending server operations.</p>}</CardContent></Card>
    </section>

    {access.role === "OWNER" && <section className="grid gap-4 lg:grid-cols-2"><Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" />Database overview</CardTitle><CardDescription>Metadata only. Raw SQL is never exposed in the browser.</CardDescription></CardHeader><CardContent><div className="grid grid-cols-2 gap-2">{database?.tables.map((table) => <div key={table.name} className="rounded-lg border border-border px-3 py-3"><p className="text-xs text-muted-foreground">{table.name}</p><p className="mt-1 text-xl font-semibold text-foreground">{table.count}</p></div>)}</div></CardContent></Card><Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><PackagePlus className="h-4 w-4" />Products</CardTitle><CardDescription>Owner-only management. Deployment controls remain server-side and are not exposed to the browser.</CardDescription></CardHeader><CardContent><div className="grid gap-2 sm:grid-cols-[1fr_.8fr_.5fr_auto]"><Input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Product name" /><Input value={productCategory} onChange={(event) => setProductCategory(event.target.value)} placeholder="Category" /><Input value={productPrice} onChange={(event) => setProductPrice(event.target.value)} inputMode="numeric" placeholder="Coins" /><Button disabled={busy} onClick={() => void createProduct()} size="sm">Add</Button></div><div className="mt-3 space-y-2">{products.slice(0, 5).map((product) => <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"><span className="min-w-0 truncate text-foreground">{product.name}</span><span className={product.active ? "text-foreground" : "text-muted-foreground"}>{product.active ? `${product.price} coins` : "archived"}</span>{product.active && <Button disabled={busy} onClick={() => setPendingArchive(product)} variant="outline" size="sm">Archive</Button>}</div>)}</div></CardContent></Card></section>}

    <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open && !busy) setPendingAction(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Confirm queued operation</AlertDialogTitle><AlertDialogDescription>{pendingAction?.destructive ? "This operation can affect players, a match or server availability." : "Review the target before this operation is queued."}</AlertDialogDescription></AlertDialogHeader><div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm"><p><span className="text-muted-foreground">Operation:</span> {pendingAction?.label}</p><p><span className="text-muted-foreground">Server:</span> {pendingAction?.type === "restart_all" ? `All configured servers; queue context: ${selectedServerName}` : selectedServerName}</p>{pendingAction?.needsPlayer && <p><span className="text-muted-foreground">Player:</span> {playerSteamId}</p>}{pendingAction?.needsMap && <p><span className="text-muted-foreground">Map:</span> {map}</p>}{pendingAction?.needsMessage && <p><span className="text-muted-foreground">Message:</span> {message}</p>}<p className="pt-1 text-xs text-muted-foreground">The operation is audited and remains pending until an authorized game-server plugin acknowledges it.</p></div><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void queuePendingAction() }}>{busy ? "Queueing" : "Confirm and queue"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={Boolean(pendingArchive)} onOpenChange={(open) => { if (!open && !busy) setPendingArchive(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Archive product</AlertDialogTitle><AlertDialogDescription>This hides the product from future purchases. Existing purchase history remains intact.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void archiveProduct() }}>{busy ? "Archiving" : "Confirm archive"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </main>
}
