import { useEffect, useMemo, useState } from "react"
import { Database, Loader2, LockKeyhole, Map, Megaphone, MonitorUp, Power, RotateCcw, ServerCog, ShieldAlert, UserRoundCog, UsersRound } from "lucide-react"

import { staffPanelService } from "@/api/staffpanel"
import type { ApiError, StaffPanelAccess, StaffPanelActionRequest, StaffPanelDatabaseOverview, StaffPanelOverview } from "@/api/types"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ActionDef = { type: StaffPanelActionRequest["type"]; label: string; icon: typeof UsersRound; needsPlayer?: boolean; needsMessage?: boolean; needsMap?: boolean; confirm?: string }

const MANAGER_ACTIONS: ActionDef[] = [
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

const OWNER_ACTIONS: ActionDef[] = [
  { type: "restart_all", label: "Restart all servers", icon: Power, confirm: "Restart every server?" },
  { type: "restart_server", label: "Restart selected server", icon: ServerCog, confirm: "Restart the selected server?" },
  { type: "start_server", label: "Start selected server", icon: Power },
  { type: "stop_server", label: "Stop selected server", icon: Power, confirm: "Stop the selected server?" },
  { type: "timeout", label: "Timeout game", icon: LockKeyhole, needsMessage: true },
  { type: "player_ip_lookup", label: "Player IP lookup", icon: Database, needsPlayer: true },
]

function messageOf(error: unknown) {
  return (error as ApiError | null)?.message || "Could not complete that."
}

function isOnline(lastHeartbeat: string | null) {
  return lastHeartbeat !== null && Date.now() - Date.parse(lastHeartbeat) < 90_000
}

/**
 * The game servers: pick one, queue an action (ban, kick, map, announcements, restarts for the Owner). Nothing runs from the browser: every action is queued, audited
 * and carried out only when a game server plugin claims it. Only an active Owner or Manager may use it.
 */
export function ServersPanel() {
  const [access, setAccess] = useState<StaffPanelAccess | null>(null)
  const [overview, setOverview] = useState<StaffPanelOverview | null>(null)
  const [database, setDatabase] = useState<StaffPanelDatabaseOverview | null>(null)
  const [server, setServer] = useState("")
  const [steamId, setSteamId] = useState("")
  const [message, setMessage] = useState("")
  const [map, setMap] = useState("de_mirage")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const load = async () => {
    try {
      const [nextAccess, nextOverview] = await Promise.all([staffPanelService.access(), staffPanelService.overview()])
      setAccess(nextAccess)
      setOverview(nextOverview)
      setServer((current) => current || nextOverview.servers[0]?.server_id || "")
      if (nextAccess.role === "OWNER") setDatabase(await staffPanelService.database())
    } catch (error) {
      {
        // The server answers 404 for the whole console until STAFF_PANEL_ENABLED=true is set there.
        setNotice((error as ApiError | null)?.status === 404 ? "The server console is switched off on the server. Set STAFF_PANEL_ENABLED=true in the backend settings and restart it." : messageOf(error))
        setFailed(true)
      }
    }
  }
  useEffect(() => { void load() }, [])

  const actions = useMemo(() => (access?.role === "OWNER" ? [...MANAGER_ACTIONS, ...OWNER_ACTIONS] : MANAGER_ACTIONS), [access?.role])

  const queue = async (action: ActionDef) => {
    if (!server && action.type !== "restart_all") return setNotice("Pick a server first.")
    if (action.needsPlayer && !/^\d{17}$/.test(steamId.trim())) return setNotice("Type the player's Steam ID (17 digits).")
    if (action.needsMessage && !message.trim()) return setNotice("Type the reason or the message.")
    if (action.confirm && !window.confirm(action.confirm)) return
    setBusy(true)
    try {
      const result = await staffPanelService.queueAction({ serverId: server, type: action.type, playerSteamId: action.needsPlayer ? steamId.trim() : undefined, message: action.needsMessage ? message.trim() : undefined, map: action.needsMap ? map : undefined })
      setNotice(`${action.label} queued. It runs when a game server claims it.`)
      void result
      await load()
    } catch (error) {
      setNotice(messageOf(error))
    } finally {
      setBusy(false)
    }
  }

  if (!access) {
    return failed ? (
      <p className="flex items-center gap-3 px-6 py-10 text-[13px] text-[var(--text-dim)]">{notice} <button type="button" onClick={() => { setFailed(false); setNotice(""); void load() }} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" aria-hidden="true" />Retry</button></p>
    ) : (
      <div className="flex items-center gap-2 px-6 py-10 text-[13px] text-[var(--text-dim)]"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Opening the console…</div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-6 pb-8 pt-4">
      {notice && <p className="rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 py-2 text-[13px] text-[var(--text-2)]" role="status">{notice}</p>}
      <p className="text-[13px] text-[var(--text-dim)]">{access.username} · {access.role}. Every action is queued and audited; the browser never runs a server command itself.</p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <section aria-label="Servers" className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]">Servers · {overview?.servers.length ?? 0}</h3>
            {(overview?.servers ?? []).length === 0 ? (
              <p className="text-[13px] text-[var(--text-dim)]">No server has reported in yet.</p>
            ) : (
              <ul className="flex flex-col gap-2" role="radiogroup" aria-label="Server">
                {overview?.servers.map((item) => {
                  const picked = item.server_id === server
                  return (
                    <li key={item.server_id}>
                      <button type="button" role="radio" aria-checked={picked} onClick={() => setServer(item.server_id)} className={cn("flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors", picked ? "border-[var(--line-strong)] bg-[var(--raised)]" : "border-[var(--glass-line)] bg-[var(--glass-fill)] hover:border-[var(--line-strong)]")}>
                        <span className={cn("size-2 shrink-0 rounded-full", isOnline(item.last_heartbeat_at) ? "bg-[var(--status-green)]" : "bg-[var(--text-faint)]")} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-[var(--text)]">{item.name || item.server_id}</span>
                          <span className="block text-[11px] text-[var(--text-dim)]">{item.mode} · {item.map_name} · {item.player_count} players · {isOnline(item.last_heartbeat_at) ? "online" : "not reporting"}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-label="Actions" className="flex flex-col gap-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]">Action</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input value={steamId} onChange={(event) => setSteamId(event.target.value)} inputMode="numeric" placeholder="Player Steam ID" className="font-mono" aria-label="Player Steam ID" />
              <Input value={map} onChange={(event) => setMap(event.target.value)} placeholder="Map" aria-label="Map" />
              <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Reason or message" aria-label="Reason or message" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {actions.map((action) => (
                <button key={action.type} type="button" disabled={busy} onClick={() => void queue(action)} className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 py-2.5 text-left text-[13px] text-[var(--text)] transition-colors hover:border-[var(--line-strong)] disabled:opacity-50">
                  <action.icon className="size-4 shrink-0 text-[var(--text-2)]" aria-hidden="true" />{action.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <section aria-label="Queue" className="flex flex-col gap-2 self-start">
          <h3 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]">Queue</h3>
          {(overview?.pendingActions ?? []).length === 0 ? (
            <p className="text-[13px] text-[var(--text-dim)]">Nothing is waiting for a server.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {overview?.pendingActions.map((action) => (
                <li key={action.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] px-3 py-2 text-[13px]">
                  <span className="min-w-0 truncate text-[var(--text)]">{action.action_type} <span className="text-[var(--text-dim)]">· {action.server_id}</span></span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[1px] text-[var(--text-dim)]">{action.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {access.role === "OWNER" && database && (
        <section aria-label="Database" className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]"><Database className="size-3.5" aria-hidden="true" />Database · counts only</h3>
          <div className="lx-stat-grid grid-cols-2 sm:grid-cols-4">
            {database.tables.map((table) => (
              <div key={table.name} className="lx-stat-cell shadow-none!">
                <span className="lx-stat-label">{table.name}</span>
                <span className="text-xl font-semibold leading-none text-[var(--text)]">{table.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
