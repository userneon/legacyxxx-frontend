import { useEffect, useMemo, useState } from "react"
import { Database, Loader2, LockKeyhole, Map, Megaphone, MonitorUp, Power, RotateCcw, ServerCog, ShieldAlert, UserRoundCog, UsersRound } from "lucide-react"

import { ServerLive } from "@/components/staff-server-live"
import { ACTION_HINTS } from "@/lib/staff-action-hints"
import { PlayerPicker } from "@/components/player-picker"
import { ServerMapCard } from "@/components/staff-server-card"
import { STAFF_BODY, STAFF_CARD, StaffEmpty, Tip, type Tone } from "@/components/staff-ui"
import { CS2_MAP_KEYS, cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { staffPanelService } from "@/api/staffpanel"
import type { ApiError, StaffPanelAccess, StaffPanelActionRequest, StaffPanelDatabaseOverview, StaffPanelOverview } from "@/api/types"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** An action's colour: red hurts a player or stops a server, amber restarts, green starts, sky talks, violet moves the game, none just looks. */
const ACTION_TONE: Partial<Record<string, Tone>> = { ban: "red", kick: "red", mute: "red", timeout: "red", stop_server: "red", rename: "violet", map_change: "violet", server_announcement: "sky", match_announcement: "sky", hud_announcement: "sky", player_message: "sky", restart_all: "amber", restart_server: "amber", start_server: "green" }

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
  // While an action waits for the game server (it checks every few seconds), refresh so its result shows up.
  const waiting = (overview?.pendingActions ?? []).some((action) => action.status === "pending" || action.status === "claimed")
  useEffect(() => {
    if (!waiting) return
    const timer = window.setInterval(() => { void load() }, 3000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting])

  const actions = useMemo(() => (access?.role === "OWNER" ? [...MANAGER_ACTIONS, ...OWNER_ACTIONS] : MANAGER_ACTIONS), [access?.role])

  const queue = async (action: ActionDef) => {
    if (!server && action.type !== "restart_all") return setNotice("Pick a server first.")
    if (action.needsPlayer && !/^\d{17}$/.test(steamId.trim())) return setNotice("Type the player's Steam ID (17 digits).")
    if (action.needsMessage && !message.trim()) return setNotice("Type the reason or the message.")
    if (action.confirm && !window.confirm(action.confirm)) return
    setBusy(true)
    try {
      const result = await staffPanelService.queueAction({ serverId: server, type: action.type, playerSteamId: action.needsPlayer ? steamId.trim() : undefined, message: action.needsMessage ? message.trim() : undefined, map: action.needsMap ? map : undefined })
      setNotice(`${action.label} sent. The server runs it within a few seconds; the result shows under Recent actions.`)
      void result
      await load()
    } catch (error) {
      setNotice(messageOf(error))
    } finally {
      setBusy(false)
    }
  }

  /** An action on one player from their card on the live view; true when it was queued. */
  const actOn = async (type: StaffPanelActionRequest["type"], playerSteamId: string, text: string): Promise<boolean> => {
    if (!server) { setNotice("Pick a server first."); return false }
    setBusy(true)
    try {
      await staffPanelService.queueAction({ serverId: server, type, playerSteamId, message: text || undefined })
      setNotice("Sent. The server runs it within a few seconds; the result shows under Recent actions.")
      await load()
      return true
    } catch (error) {
      setNotice(messageOf(error))
      return false
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
    <div className={STAFF_BODY}>
      {notice && <p className="rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 py-2 text-[13px] text-[var(--text-2)]" role="status">{notice}</p>}
      <p className="text-[13px] text-[var(--text-dim)]">{access.username} · {access.role}. Every action is queued and audited; the browser never runs a server command itself.</p>

      <section aria-label="Servers" className="flex flex-col gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]">Servers · {overview?.servers.length ?? 0} <span className="font-normal normal-case tracking-normal">· pick one for the actions below</span></h3>
        {(overview?.servers ?? []).length === 0 ? (
          <StaffEmpty>No server has reported in yet.</StaffEmpty>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label="Server">
            {overview?.servers.map((item) => <li key={item.server_id}><ServerMapCard server={item} picked={item.server_id === server} onPick={() => setServer(item.server_id)} /></li>)}
          </ul>
        )}
      </section>

      {server && <ServerLive serverId={server} busy={busy} onAct={actOn} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-label="Actions" className="flex flex-col gap-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]">Server actions · or a player who is not on it</h3>
          <div role="group" aria-label="Map" className="grid grid-cols-5 gap-2 lg:grid-cols-10">
            {CS2_MAP_KEYS.map((key) => (
              <button key={key} type="button" aria-pressed={map === key} onClick={() => setMap(key)} className={cn("group flex flex-col overflow-hidden rounded-lg border bg-[var(--card-surface)] text-left transition-colors", map === key ? "border-[var(--text)]" : "border-[var(--line)] hover:border-[var(--line-strong)]")}>
                <img src={cs2MapArtwork(key) ?? undefined} alt="" loading="lazy" draggable={false} className={cn("h-12 w-full object-cover transition-[filter]", map === key ? "" : "brightness-75 group-hover:brightness-100")} />
                <span className="truncate px-1.5 py-1 text-[11px] text-[var(--text-2)]">{cs2MapLabel(key)}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <PlayerPicker compact value={steamId} onChange={setSteamId} label="Player" placeholder="Player (name or Steam ID)" />
            <Input value={map} onChange={(event) => setMap(event.target.value)} placeholder="Map" aria-label="Map" />
            <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Reason or message" aria-label="Reason or message" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {actions.map((action) => (
              <Tip key={action.type} text={ACTION_HINTS[action.type] ?? action.label}>
                <button type="button" data-tone={ACTION_TONE[action.type]} disabled={busy} onClick={() => void queue(action)} className={cn(STAFF_CARD, "flex-row items-center gap-3 px-3.5 py-3 text-left text-[13px] text-[var(--text)] disabled:opacity-50")}>
                  <action.icon className={cn("size-4 shrink-0", ACTION_TONE[action.type] ? "lx-tone-text" : "text-[var(--text-2)]")} aria-hidden="true" />{action.label}
                </button>
              </Tip>
            ))}
          </div>
        </section>

        <section aria-label="Queue" className="flex flex-col gap-3 self-start">
          <h3 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]">Recent actions</h3>
          {(overview?.pendingActions ?? []).length === 0 ? (
            <StaffEmpty>No actions yet.</StaffEmpty>
          ) : (
            <ul className="grid gap-3">
              {overview?.pendingActions.map((action) => (
                <li key={action.id} data-tone={action.status === "completed" ? "green" : action.status === "failed" ? "red" : "amber"} className={cn(STAFF_CARD, "gap-1 px-3.5 py-3 text-[13px]")}>
                  <span className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-[var(--text)]">{action.action_type.replace(/_/g, " ")} <span className="text-[var(--text-dim)]">· {action.server_id}</span></span>
                    <span className={cn("flex shrink-0 items-center gap-1.5 text-[11px] font-semibold", action.status === "completed" ? "text-[var(--status-green)]" : action.status === "failed" ? "text-[var(--status-red)]" : "text-[var(--text-dim)]")}>
                      {(action.status === "pending" || action.status === "claimed") && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
                      {{ pending: "Waiting", claimed: "Running", completed: "Done", failed: "Failed", cancelled: "Cancelled" }[action.status]}
                    </span>
                  </span>
                  {action.result?.message && <span className="text-xs text-[var(--text-muted)]">{action.result.message}</span>}
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
