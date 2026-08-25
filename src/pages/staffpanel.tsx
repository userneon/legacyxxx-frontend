// LEGACY-X Staff Panel: dark neutral operational console; server-authoritative Owner/Manager RBAC, no client-side trust.
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Database, PackagePlus, Power, ShieldAlert, UserRoundCog, UsersRound, Map, Megaphone, MonitorUp, Loader2, LockKeyhole, ServerCog } from "lucide-react"
import { setAccessToken } from "@/api/client"
import { staffPanelService } from "@/api/staffpanel"
import type { ApiError, StaffPanelAccess, StaffPanelActionRequest, StaffPanelDatabaseOverview, StaffPanelOverview, StaffPanelProduct } from "@/api/types"

const apiOrigin = (import.meta.env.VITE_API_URL?.trim() || (import.meta.env.PROD ? "https://api.legacyx.cc" : "")).replace(/\/$/, "")

const managerActions: Array<{ type: StaffPanelActionRequest["type"]; label: string; icon: typeof UsersRound; needsPlayer?: boolean; needsMessage?: boolean; needsMap?: boolean }> = [
  { type: "ban", label: "Player ban", icon: ShieldAlert, needsPlayer: true, needsMessage: true },
  { type: "kick", label: "Kick player", icon: UsersRound, needsPlayer: true, needsMessage: true },
  { type: "mute", label: "Mute player", icon: LockKeyhole, needsPlayer: true, needsMessage: true },
  { type: "rename", label: "Rename player", icon: UserRoundCog, needsPlayer: true, needsMessage: true },
  { type: "map_change", label: "Change map", icon: Map, needsMap: true },
  { type: "server_announcement", label: "Server announcement", icon: Megaphone, needsMessage: true },
  { type: "match_announcement", label: "Match announcement", icon: Megaphone, needsMessage: true },
  { type: "hud_announcement", label: "HUD announcement", icon: MonitorUp, needsMessage: true },
  { type: "player_message", label: "Player message", icon: MonitorUp, needsPlayer: true, needsMessage: true },
]

const ownerActions: Array<{ type: StaffPanelActionRequest["type"]; label: string; icon: typeof Power; needsPlayer?: boolean; needsMessage?: boolean }> = [
  { type: "restart_all", label: "Restart all servers", icon: Power },
  { type: "restart_server", label: "Restart selected server", icon: ServerCog },
  { type: "start_server", label: "Start selected server", icon: Power },
  { type: "stop_server", label: "Stop selected server", icon: Power },
  { type: "timeout", label: "Timeout game", icon: LockKeyhole, needsMessage: true },
  { type: "player_ip_lookup", label: "Player IP lookup", icon: Database, needsPlayer: true },
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
  const queue = async (type: StaffPanelActionRequest["type"]) => {
    if (!selectedServer) return setNotice("Select a server first.")
    setBusy(true)
    try {
      const result = await staffPanelService.queueAction({ serverId: selectedServer, type, playerSteamId: playerSteamId || undefined, message: message || undefined, map: map || undefined })
      setNotice(`${result.action.action_type} queued safely. It will run only after an authorized game server plugin claims it.`)
      await load()
    } catch (error) {
      setNotice(toUiError(error))
    } finally {
      setBusy(false)
    }
  }

  const createProduct = async () => {
    if (!productName.trim()) return setNotice("Product name is required.")
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

  const archiveProduct = async (itemId: string) => {
    setBusy(true)
    try {
      await staffPanelService.archiveProduct(itemId)
      setNotice("Product archived. Purchase history remains intact.")
      await load()
    } catch (error) {
      setNotice(toUiError(error))
    } finally {
      setBusy(false)
    }
  }

  if (!access) return <div className="flex min-h-[65vh] items-center justify-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Steam re-authentication required…</div>

  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-7">
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(120deg,rgba(10,15,22,.96),rgba(24,30,36,.92))] p-6 shadow-2xl">
      <div className="absolute right-0 top-0 h-36 w-64 bg-amber-400/10 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[.22em] text-amber-300">Isolated Steam staff session</p><h1 className="mt-2 text-3xl font-semibold text-white">Staff Panel</h1><p className="mt-2 text-sm text-slate-300">{access.username} · <span className="text-amber-200">{access.role}</span> access</p></div>
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs text-amber-100">Every game action is queued and audited. Browser cannot execute raw server commands.</div>
      </div>
    </section>

    {notice && <div className="rounded-xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-sm text-sky-100">{notice}</div>}
    <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-2xl border border-white/10 bg-card/70 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Server operations</h2><span className="text-xs text-muted-foreground">{overview?.servers.length || 0} registered</span></div>
        <select value={selectedServer} onChange={(event) => setSelectedServer(event.target.value)} className="mb-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
          <option value="">Select server</option>{overview?.servers.map((server) => <option key={server.server_id} value={server.server_id}>{server.name || server.server_id} · {server.mode} · {server.map_name}</option>)}
        </select>
        <div className="grid gap-2 sm:grid-cols-2">{visibleActions.map((action) => { const Icon = action.icon; return <button key={action.type} disabled={busy} onClick={() => void queue(action.type)} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3 text-left text-sm transition hover:border-amber-300/40 hover:bg-amber-300/10 disabled:opacity-50"><Icon className="h-4 w-4 text-amber-300" />{action.label}</button> })}</div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3"><input value={playerSteamId} onChange={(event) => setPlayerSteamId(event.target.value)} placeholder="Player SteamID" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs" /><input value={map} onChange={(event) => setMap(event.target.value)} placeholder="Map" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs" /><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Reason / announcement" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs" /></div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-card/70 p-5"><h2 className="font-semibold">Queue</h2><div className="mt-4 space-y-2">{overview?.pendingActions.length ? overview.pendingActions.map((action) => <div key={action.id} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-xs"><span>{action.action_type} · {action.server_id}</span><span className="uppercase text-amber-300">{action.status}</span></div>) : <p className="text-sm text-muted-foreground">No pending server operations.</p>}</div></div>
    </section>
    {access.role === "OWNER" && <section className="grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-card/70 p-5"><h2 className="flex items-center gap-2 font-semibold"><Database className="h-4 w-4 text-amber-300" />Database overview</h2><div className="mt-4 grid grid-cols-2 gap-2">{database?.tables.map((table) => <div key={table.name} className="rounded-xl border border-white/10 px-3 py-3"><p className="text-xs text-muted-foreground">{table.name}</p><p className="mt-1 text-xl font-semibold">{table.count}</p></div>)}</div><p className="mt-3 text-xs text-muted-foreground">Metadata only. Raw SQL is never exposed in the browser.</p></div><div className="rounded-2xl border border-white/10 bg-card/70 p-5"><h2 className="flex items-center gap-2 font-semibold"><PackagePlus className="h-4 w-4 text-amber-300" />Products</h2><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_.8fr_.5fr_auto]"><input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Product name" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs" /><input value={productCategory} onChange={(event) => setProductCategory(event.target.value)} placeholder="Category" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs" /><input value={productPrice} onChange={(event) => setProductPrice(event.target.value)} inputMode="numeric" placeholder="Coins" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs" /><button disabled={busy} onClick={() => void createProduct()} className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100 disabled:opacity-50">Add</button></div><div className="mt-3 space-y-2">{products.slice(0, 5).map((product) => <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2 text-sm"><span className="min-w-0 truncate">{product.name}</span><span className={product.active ? "text-emerald-300" : "text-muted-foreground"}>{product.active ? `${product.price} coins` : "archived"}</span>{product.active && <button disabled={busy} onClick={() => void archiveProduct(product.id)} className="text-xs text-rose-200 disabled:opacity-50">Archive</button>}</div>)}</div><p className="mt-3 text-xs text-muted-foreground">Owner-only product create/archive. Repository download metadata is source-only; browser shell controls are not exposed.</p></div></section>}
  </main>
}
