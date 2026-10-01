import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Copy, Eye, Info, LoaderCircle, Lock, Play, RotateCcw, Star, X, Zap } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { competitiveService, serversService } from "@/api"
import { playService, type PlayMode, type PlayServer, type PlayServerList } from "@/api/play"
import type { CompetitiveAccess, PlaySubMode, ServerLiveMatch, ServerLiveMatchPlayer } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useViewParams } from "@/hooks/use-view-params"
import { useAuth } from "@/hooks/use-auth"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { PAGE_ROUTES } from "@/lib/routes"
import { CompetitiveRankBadge, RankLabel } from "@/components/competitive-rank-badge"
import { PlayerAvatar } from "@/components/player-avatar"
import { TeamIcon, teamTextClass, type TeamSide } from "@/components/team-icon"
import { SteamLoginGate } from "@/components/steam-login-gate"
import { Segmented } from "@/components/segmented"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/** Pro League opens at Vanguard I (RANK-SYSTEM.md §4). */
const PRO_LEAGUE_MIN_EXP = 1400
const REFRESH_MS = 15_000
const LIVE_REFRESH_MS = 5_000
const FAVOURITES_KEY = "legacyx.favourite-servers"

type PlayPageMode = Exclude<PlaySubMode, "tournaments">

const MODES: Record<PlayPageMode, { mode: PlayMode; title: string; description: string; pickRule: string; heroMap: string }> = {
  "5vs5": { mode: "5x5", title: "5x5 Matches", description: "Competitive 5v5. Every match counts toward your rank.", pickRule: "We pick the open server closest to starting, on your maps.", heroMap: "de_mirage" },
  fun: { mode: "fun", title: "Fun Mode", description: "Casual servers — jump in and out anytime. No rank changes.", pickRule: "We pick the busiest server with a free slot.", heroMap: "de_vertigo" },
  proleague: { mode: "pro", title: "Pro League", description: "Ranked 5v5 for high-rank players only.", pickRule: "We pick the open Pro server closest to starting, on your maps.", heroMap: "de_inferno" },
}

const secondary = "inline-flex h-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] px-3 text-[13px] font-medium text-[var(--text)] transition-[background-color,border-color,transform] duration-150 hover:border-[var(--line-strong)] hover:bg-[var(--raised)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 disabled:pointer-events-none disabled:opacity-50"
const primary = "lx-primary-button inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50 disabled:pointer-events-none disabled:opacity-40 disabled:saturate-50"
/** On/off switches in the same tray as the Segmented control (Leaders' EXP / K/D / Win rate). */
const toggleTray = "flex shrink-0 gap-0.5 rounded-[10px] border border-[var(--line)] bg-[var(--glass-fill)] p-[3px]"
const toggleItem = "inline-flex h-[30px] items-center gap-1.5 rounded-[7px] px-3 text-[13px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
const toggleOn = "bg-[var(--line)] text-[var(--text)]"
const toggleOff = "text-[var(--text-muted)] hover:text-[var(--text)]"

const validAddress = (address: string | null | undefined) => Boolean(address && /^[a-zA-Z0-9.-]+:\d{1,5}$/.test(address.trim()))

function connect(address: string | null | undefined, name: string) {
  if (!address || !validAddress(address)) {
    toast.error("Server address unavailable", { description: `${name} does not expose a connection address right now.` })
    return
  }
  toast("Opening Steam…", { description: `Connecting to ${name}` })
  window.location.assign(`steam://connect/${address.trim()}`)
}

async function copyAddress(address: string | null | undefined) {
  if (!address) return
  try {
    await navigator.clipboard.writeText(`connect ${address}`)
    toast.success("Server IP copied", { description: address })
  } catch {
    toast.error("Could not copy the address")
  }
}

/** Feeds the pointer position to a card's spotlight (--mx / --my). */

/* ------------------------------------------------------------------ favourites (per device) */

function readFavourites(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FAVOURITES_KEY) ?? "[]") as unknown
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []
  } catch {
    return []
  }
}

function useFavourites() {
  const [favourites, setFavourites] = useState<string[]>(readFavourites)
  const toggle = (serverId: string) => setFavourites((current) => {
    const next = current.includes(serverId) ? current.filter((id) => id !== serverId) : [...current, serverId]
    try { window.localStorage.setItem(FAVOURITES_KEY, JSON.stringify(next)) } catch { /* storage blocked: keep for this visit */ }
    return next
  })
  return { favourites, toggle }
}

/* ------------------------------------------------------------------ pieces */

function funModeLabel(modeLabel: string) {
  const rest = modeLabel.replace(/^fun[_\s-]*/i, "").replace(/[_-]+/g, " ").trim()
  return rest ? rest.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Classic"
}

function StatusPill({ server }: { server: PlayServer }) {
  if (server.status === "live") {
    return (
      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[rgba(10,10,10,0.72)] px-2.5 text-xs font-semibold text-[var(--text)] backdrop-blur-sm">
        <span className="lx-live-dot size-1.5 rounded-full bg-[var(--status-green)]" />
        {server.score ? <><span className="text-[var(--team-t)]">{server.score.t}</span>:<span className="text-[var(--team-ct)]">{server.score.ct}</span></> : "Live"}
        {server.round !== null && <span className="font-medium text-[var(--text-muted)]">· R{server.round}</span>}
      </span>
    )
  }
  const label = { waiting: "Waiting", warmup: "Warmup", full: "Full", offline: "Offline" }[server.status]
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full bg-[rgba(10,10,10,0.72)] px-2.5 text-xs font-medium backdrop-blur-sm", server.status === "full" || server.status === "offline" ? "text-[var(--text-dim)]" : "text-[var(--text-2)]")}>
      {label}
    </span>
  )
}

function MapArt({ map, className, children, zoomOnHover }: { map: string; className?: string; children?: React.ReactNode; zoomOnHover?: boolean }) {
  const art = cs2MapArtwork(map)
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={cn("relative overflow-hidden bg-[linear-gradient(135deg,#1c1c1c,#151515)]", className)}>
      {art && (
        <img
          src={art}
          alt=""
          onLoad={() => setLoaded(true)}
          className={cn(
            "lx-map-img absolute inset-0 size-full object-cover transition-[opacity,scale] duration-[1000ms] ease-[cubic-bezier(0.37,0,0.18,1)]",
            loaded ? "opacity-70" : "opacity-0",
            zoomOnHover && "group-hover:scale-[1.07] group-hover:opacity-90 group-hover:duration-700 group-hover:ease-[cubic-bezier(0.22,1,0.36,1)]",
          )}
        />
      )}
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[rgba(10,10,10,0.55)] to-transparent" />
      {children}
    </div>
  )
}

function Slots({ server }: { server: PlayServer }) {
  if (server.mode === "fun" || server.maxPlayers > 12) {
    const share = Math.min(100, (server.players / server.maxPlayers) * 100)
    return (
      <div className="flex flex-1 items-center gap-3">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line-soft)]">
          <span className="lx-progress-fill block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${share}%` }} />
        </span>
        <span className="text-xs text-[var(--text-muted)]">{server.players}/{server.maxPlayers}</span>
      </div>
    )
  }
  return (
    <div className="flex flex-1 items-center justify-between gap-3">
      {/* Terrorists first, then Counter-Terrorists, then players not on a side yet (warmup, spectators), then free slots. */}
      <span aria-hidden="true" className="flex gap-[3px]">
        {Array.from({ length: server.maxPlayers }, (_, index) => {
          const t = server.teams?.t ?? 0
          const ct = server.teams?.ct ?? 0
          const tone = index >= server.players ? "bg-[var(--line-soft)]" : index < t ? "bg-[var(--team-t)]" : index < t + ct ? "bg-[var(--team-ct)]" : "lx-slot-on"
          return <span key={index} className={cn("size-3.5 rounded-[4px] transition-[background-color,box-shadow] duration-500", tone)} style={{ transitionDelay: `${index * 30}ms` }} />
        })}
      </span>
      <span className="text-xs text-[var(--text-muted)]">{server.players}/{server.maxPlayers}</span>
    </div>
  )
}

/**
 * Favourite star: the fill and colour ease in, and turning it on gives the star a small pop plus a
 * soft yellow ring, so the change is felt rather than snapped.
 */
function FavouriteButton({ favourite, name, onToggle }: { favourite: boolean; name: string; onToggle: () => void }) {
  const starRef = useRef<SVGSVGElement>(null)
  const ringRef = useRef<HTMLSpanElement>(null)
  const toggle = () => {
    const turningOn = !favourite
    onToggle()
    starRef.current?.animate(
      turningOn
        ? [{ transform: "scale(1)" }, { transform: "scale(1.35) rotate(-12deg)", offset: 0.45 }, { transform: "scale(0.92)", offset: 0.75 }, { transform: "scale(1)" }]
        : [{ transform: "scale(1)" }, { transform: "scale(0.8)", offset: 0.5 }, { transform: "scale(1)" }],
      { duration: turningOn ? 420 : 260, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    )
    if (turningOn) {
      ringRef.current?.animate(
        [{ opacity: 0.7, transform: "scale(0.6)" }, { opacity: 0, transform: "scale(1.6)" }],
        { duration: 480, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      )
    }
  }
  return (
    <button
      type="button"
      aria-label={favourite ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
      aria-pressed={favourite}
      onClick={toggle}
      className={cn(
        "absolute right-2.5 top-2.5 flex size-[30px] items-center justify-center rounded-lg border bg-[rgba(15,15,15,0.7)] transition-[color,border-color,background-color] duration-300 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60",
        favourite ? "border-[var(--star)]/45 text-[var(--star)]" : "border-[var(--line)] text-[var(--text-muted)] hover:text-[var(--star)]",
      )}
    >
      <span ref={ringRef} aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-lg border-2 border-[var(--star)] opacity-0" />
      <Star ref={starRef} className={cn("size-4 transition-[fill,color] duration-300 ease-[var(--ease-out)]", favourite ? "fill-[var(--star)]" : "fill-transparent")} />
    </button>
  )
}

function ServerCard({ server, favourite, onFavourite, onDetails, index }: { server: PlayServer; favourite: boolean; onFavourite: () => void; onDetails: () => void; index: number }) {
  const connectable = server.joinable && validAddress(server.connectAddress)
  const unavailable = server.status === "full" || server.status === "offline"
  const connectButton = (
    <button type="button" disabled={!connectable} onClick={() => connect(server.connectAddress, server.name)} className={cn(connectable ? cn(primary, "h-[34px] text-[13px]") : secondary, "w-full")}>
      <Play className="size-3.5" />
      Connect
    </button>
  )
  return (
    <article
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      className={cn("lx-fx-card group relative flex flex-col overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]", unavailable && "opacity-70 hover:opacity-100")}
    >
      <MapArt map={server.map} className="h-[120px]" zoomOnHover>
        {server.status === "live" && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-bright)] to-transparent" />}
        <span className="absolute left-3 top-3"><StatusPill server={server} /></span>
        <FavouriteButton favourite={favourite} name={server.name} onToggle={onFavourite} />
      </MapArt>
      <div className="relative z-[2] flex flex-col gap-3 p-3.5">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-semibold text-[var(--text)] transition-colors duration-500 group-hover:text-white" title={server.name}>{server.name}</span>
          <span className="truncate text-xs text-[var(--text-dim)]">{cs2MapLabel(server.map)}{server.mode === "fun" ? ` · ${funModeLabel(server.modeLabel)}` : ""}</span>
        </div>
        <div className="flex items-center"><Slots server={server} /></div>
        <div className="flex gap-2">
          <button type="button" aria-label={`Copy ${server.name} IP`} disabled={!server.connectAddress} onClick={() => void copyAddress(server.connectAddress)} className={secondary}>
            <Copy className="size-3.5" />
          </button>
          <button type="button" onClick={onDetails} className={cn(secondary, "flex-1")}>
            <Info className="size-3.5" />
            Details
          </button>
          {connectable ? <span className="flex flex-1">{connectButton}</span> : (
            <Tooltip>
              <TooltipTrigger asChild><span className="flex flex-1" tabIndex={0}>{connectButton}</span></TooltipTrigger>
              <TooltipContent>{server.status === "offline" ? "Server is offline" : server.status === "full" ? "Server is full" : "No connection address"}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </article>
  )
}

function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]" aria-hidden="true">
      <Skeleton className="h-[120px] rounded-none bg-[var(--raised)]" />
      <div className="flex flex-col gap-3 p-3.5">
        <Skeleton className="h-2.5 w-1/2 rounded-full bg-[var(--line)]" />
        <Skeleton className="h-2 w-1/3 rounded-full bg-[var(--line-soft)]" />
        <Skeleton className="h-3.5 w-full rounded bg-[var(--line-soft)]" />
        <Skeleton className="h-[34px] w-full rounded-lg bg-[var(--raised)]" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ details sheet */

function TeamTable({ title, players, side }: { title: string; players: ServerLiveMatchPlayer[]; side?: TeamSide }) {
  const stat = (value: number | null | undefined) => (typeof value === "number" ? value : "—")
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
      <div
        className="grid h-[36px] grid-cols-[minmax(0,1fr)_34px_34px_34px] items-center gap-2 px-3 text-[11px] font-semibold text-[var(--text-muted)]"
        style={side ? { background: `linear-gradient(90deg, color-mix(in oklab, var(--team-${side}) 14%, transparent), transparent 70%)` } : undefined}
      >
        <span className={cn("flex items-center gap-2", side && teamTextClass(side))}>{side && <TeamIcon side={side} />}{title}</span><span>K</span><span>D</span><span>A</span>
      </div>
      {players.length === 0 ? (
        <div className="border-t border-[var(--raised)] px-3 py-3 text-xs text-[var(--text-dim)]">No players</div>
      ) : players.map((player) => (
        <div key={player.steamId} className="grid h-[38px] grid-cols-[minmax(0,1fr)_34px_34px_34px] items-center gap-2 border-t border-[var(--raised)] px-3 text-[13px] transition-colors duration-300 hover:bg-[var(--raised)]">
          <span className="flex min-w-0 items-center gap-2">
            <PlayerAvatar name={player.name} className="size-[22px] shrink-0 rounded-md text-[9px]" />
            <span className={cn("truncate", player.connected ? "text-[var(--text)]" : "text-[var(--text-dim)]")} title={player.name}>{player.name}</span>
          </span>
          <span className="font-semibold text-[var(--text)]">{stat(player.kills)}</span>
          <span className="text-[var(--text-2)]">{stat(player.deaths)}</span>
          <span className="text-[var(--text-2)]">{stat(player.assists)}</span>
        </div>
      ))}
    </div>
  )
}

function ServerSheet({ server, onClose }: { server: PlayServer | null; onClose: () => void }) {
  const serverId = server?.id ?? ""
  const { data, loading, error, refetch } = useApiQuery<ServerLiveMatch>((signal) => serversService.getLiveMatch(serverId, { signal }), {
    enabled: Boolean(serverId),
    queryKey: `live:${serverId}`,
    keepPreviousData: true,
  })
  // Live data refreshes every 5s while the sheet is open.
  useEffect(() => {
    if (!serverId) return
    const timer = window.setInterval(refetch, LIVE_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [serverId, refetch])

  const live = data && data.serverId === serverId ? data : null
  const address = live?.connectAddress ?? server?.connectAddress ?? null
  const gotv = live?.gotvAddress ?? server?.gotvAddress ?? null
  const connectable = Boolean(server?.joinable && validAddress(address))
  return (
    <Sheet open={server !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        overlayClassName="lx-sheet-overlay bg-[rgba(10,10,10,0.55)] data-[state=open]:duration-300 data-[state=closed]:duration-200"
        className="lx-sheet inset-y-2 right-2 h-auto w-[460px] max-w-[calc(100%-16px)] gap-0 overflow-hidden rounded-2xl border border-[var(--line)] p-0 data-[state=open]:duration-[450ms] data-[state=open]:ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:duration-[250ms] data-[state=closed]:ease-[cubic-bezier(0.4,0,1,1)] sm:max-w-[460px]"
      >
        {server && (
          <>
            <MapArt map={live?.map ?? server.map} className="h-[180px] shrink-0">
              <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.1),rgba(10,10,10,0.35)_45%,var(--panel))]" />
              <span aria-hidden="true" className="lx-hero-glow absolute -inset-10 opacity-60" />
              <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[rgba(15,15,15,0.7)] text-[var(--text-muted)] backdrop-blur transition-[color,border-color,rotate] duration-300 hover:rotate-90 hover:border-[var(--line-strong)] hover:text-[var(--text)]">
                <X className="size-4" />
              </button>
              <span className="absolute left-[18px] top-3.5 z-10">
                {server.status === "live" ? (
                  <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[var(--status-green)]/35 bg-[rgba(10,10,10,0.7)] px-2.5 text-xs font-semibold text-[var(--status-green)] backdrop-blur-sm">
                    <span className="lx-live-dot size-1.5 rounded-full bg-[var(--status-green)]" />
                    Live{live?.round ? ` · Round ${live.round}` : ""}
                  </span>
                ) : <StatusPill server={server} />}
              </span>
              <div className="absolute inset-x-[18px] bottom-4 z-10 flex items-end justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <SheetTitle className="truncate text-lg font-bold tracking-[-0.2px] text-[var(--text)]">{server.name}</SheetTitle>
                  <SheetDescription className="text-xs text-[var(--text-2)]">{cs2MapLabel(live?.map ?? server.map)} · {server.players}/{server.maxPlayers} players</SheetDescription>
                </div>
                {live?.score && (
                  <span className="flex shrink-0 items-center gap-2 rounded-xl border border-[var(--line)] bg-[rgba(10,10,10,0.7)] px-3 py-1.5 backdrop-blur">
                    <TeamIcon side="t" className="size-5" />
                    <span className="flex items-center gap-1.5 text-2xl font-bold">
                      <span key={`t${live.score.t}`} className="lx-swap-in text-[var(--team-t)]">{live.score.t}</span>
                      <span className="text-[var(--text-faint)]">:</span>
                      <span key={`ct${live.score.ct}`} className="lx-swap-in text-[var(--team-ct)]">{live.score.ct}</span>
                    </span>
                    <TeamIcon side="ct" className="size-5" />
                  </span>
                )}
              </div>
            </MapArt>
            <div className="scrollbar-hidden lx-sheet-rise flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-[18px] py-4">
              <div className="flex items-center justify-between text-xs text-[var(--text-dim)]">
                <span className="flex items-center gap-2 font-medium text-[var(--text-muted)]">
                  <span aria-hidden="true" className="h-3 w-[3px] rounded-full bg-[var(--text-faint)]" />
                  Scoreboard
                </span>
                <span className="flex items-center gap-1.5">
                  {loading && live && <LoaderCircle aria-label="Updating" className="size-3.5 animate-spin" />}
                  Updates every 5s
                </span>
              </div>
              {live && live.availability === "live_snapshot" ? (
                <>
                  <TeamTable title="Terrorists" side="t" players={live.teams.t} />
                  <TeamTable title="Counter-Terrorists" side="ct" players={live.teams.ct} />
                </>
              ) : live && live.connectedPlayers.length > 0 ? (
                <TeamTable title="Connected players" players={live.connectedPlayers} />
              ) : error && !live ? (
                <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">
                  Live data unavailable.
                  <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
                </p>
              ) : !live ? (
                <Skeleton className="h-40 rounded-xl bg-[var(--glass-fill)]" />
              ) : (
                <p className="text-[13px] text-[var(--text-dim)]">No live match data for this server yet.</p>
              )}
            </div>
            <div className="flex shrink-0 gap-2 border-t border-[var(--line-soft)] bg-[var(--panel)]/60 px-[18px] py-3.5">
              <button type="button" disabled={!address} onClick={() => void copyAddress(address)} className={cn(secondary, "h-10 flex-1")}>
                <Copy className="size-3.5" />
                Copy IP
              </button>
              {gotv && validAddress(gotv) && (
                <a href={`steam://connect/${gotv}`} className={cn(secondary, "h-10 flex-1")}>
                  <Eye className="size-3.5" />
                  Spectate
                </a>
              )}
              <button type="button" disabled={!connectable} onClick={() => connect(address, server.name)} className={cn(primary, "h-10 flex-1 text-[13px]")}>
                <Play className="size-3.5" />
                Connect
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ page */

/** Play hero: the mode's map art behind the title, live counts and Quick join. */
function PlayHero({ title, description, heroMap, list, loading, mode, pickRule, favouriteMaps, anyJoinable }: {
  title: string
  description: string
  heroMap: string
  list: PlayServerList | null
  loading?: boolean
  mode: PlayMode
  pickRule: string
  favouriteMaps: string[]
  anyJoinable: boolean
}) {
  const art = cs2MapArtwork(heroMap)
  const [busy, setBusy] = useState(false)
  const playNow = async () => {
    setBusy(true)
    try {
      const server = await playService.quickJoin(mode, favouriteMaps)
      if (server) connect(server.connectAddress, server.name)
      else toast("No open servers right now", { description: mode === "fun" ? "Try again in a moment." : "Fun Mode usually has room." })
    } catch {
      toast.error("Could not find a server. Try again.")
    } finally {
      setBusy(false)
    }
  }
  const live = Boolean(list && list.onlineServers > 0)
  return (
    <section aria-label={title} className="relative overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
      {art && (
        <div aria-hidden="true" className="lx-map-drift pointer-events-none absolute inset-0">
          <img key={heroMap} src={art} alt="" className="lx-map-img lx-swap-fade size-full object-cover opacity-30" />
        </div>
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--card-surface)] via-[var(--card-surface)]/85 to-[var(--card-surface)]/30" />
      <div aria-hidden="true" className="lx-hero-glow pointer-events-none absolute -inset-10" />
      <div aria-hidden="true" className="lx-hero-grid pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent" />

      <div className="relative z-10 flex flex-col gap-5 p-6 @3xl:min-h-[212px] @3xl:flex-row @3xl:items-end @3xl:justify-between @3xl:p-7">
        <div key={title} className="lx-swap-in flex min-w-0 flex-col gap-3">
          <h1 className="flex items-center gap-2.5 text-[28px] font-bold leading-[1.1] tracking-[-0.6px] text-[var(--text)] @2xl:text-[34px]">
            <span aria-hidden="true" className="h-7 w-1 rounded-full bg-[var(--text-faint)]" />
            {title}
            {loading && <LoaderCircle aria-label="Updating" className="size-4 animate-spin text-[var(--text-dim)]" />}
          </h1>
          <span className="min-h-[46px] max-w-xl text-[14px] leading-relaxed text-[var(--text-2)] @3xl:min-h-0">{description}</span>
          <div className="lx-stat-grid w-fit grid-flow-col">
            <span className="lx-stat-cell min-w-[112px] gap-1.5 px-4 py-2.5">
              <span className="lx-stat-label flex items-center gap-1.5">
                <span className={cn("size-1.5 rounded-full", live ? "lx-live-dot bg-[var(--status-green)]" : "bg-[var(--text-faint)]")} />
                Playing
              </span>
              <span className="text-lg font-semibold leading-none text-[var(--text)]">{list ? list.players : "—"}</span>
            </span>
            <span className="lx-stat-cell min-w-[112px] gap-1.5 px-4 py-2.5">
              <span className="lx-stat-label">Servers online</span>
              <span className="text-lg font-semibold leading-none text-[var(--text)]">{list ? list.onlineServers : "—"}</span>
            </span>
          </div>
        </div>

        <div aria-label="Quick join" className="flex shrink-0 flex-col gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)]/75 p-4 backdrop-blur-md @3xl:w-[320px]">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text)]">
            <Zap className="size-4 fill-[var(--text-2)] text-[var(--text-2)]" />
            Quick join
          </span>
          {/* Always two lines tall, so every mode's hero is the same height. */}
          <span key={pickRule} className="lx-swap-in line-clamp-2 min-h-[36px] text-xs leading-[1.5] text-[var(--text-muted)]">
            {anyJoinable ? pickRule : mode === "fun" ? "Every Fun server is full or offline right now." : <>No open server right now. <Link to={PAGE_ROUTES["play-fun"]} className="text-[var(--text)] underline-offset-4 hover:underline">Fun Mode</Link> usually has room.</>}
          </span>
          <button type="button" disabled={!anyJoinable || busy} onClick={() => void playNow()} className={cn(primary, "group mt-1 h-11 gap-2 rounded-[10px] px-[22px] text-[15px]")}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4 fill-current transition-[scale] duration-300 group-hover:scale-110" />}
            {anyJoinable ? "Play now" : "No open servers"}
          </button>
        </div>
      </div>
    </section>
  )
}

function Header({ title, description, list, loading }: { title: string; description: string; list: PlayServerList | null; loading?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-[22px] font-semibold leading-[1.2] tracking-[-0.3px] text-[var(--text)]">
          {title}
          {loading && <LoaderCircle aria-label="Updating" className="size-4 animate-spin text-[var(--text-dim)]" />}
        </h1>
        <span className="text-[13px] leading-[1.2] text-[var(--text-muted)]">{description}</span>
      </div>
      {list && list.onlineServers > 0 && (
        <span className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
          <span className="size-1.5 rounded-full bg-[var(--status-green)]" />
          {list.players} player{list.players === 1 ? "" : "s"} · {list.onlineServers} server{list.onlineServers === 1 ? "" : "s"}
        </span>
      )}
    </div>
  )
}

function ServerBrowser({ mode, title, description, pickRule, heroMap }: { mode: PlayMode; title: string; description: string; pickRule: string; heroMap: string }) {
  const [params, setParams] = useViewParams()
  const filter = params.get("filter") ?? "all"
  const hideFull = params.get("full") === "hide"
  const onlyFavourites = params.get("fav") === "1"
  const selectedId = params.get("server")
  const { favourites, toggle } = useFavourites()
  const { data: result, loading, error, refetch } = useApiQuery<PlayServerList>((signal) => playService.getServers(mode, { signal }), { queryKey: `play:${mode}`, keepPreviousData: true })
  // The page stays mounted across Play modes; never show the previous mode's servers while this one loads.
  const data = result && result.mode === mode ? result : null
  useEffect(() => {
    const timer = window.setInterval(refetch, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [refetch])

  const update = (changes: Record<string, string | null>) => setParams((current) => {
    const next = new URLSearchParams(current)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    return next
  }, { replace: true })

  const servers = useMemo(() => data?.servers ?? [], [data])
  // Filter chips come from the real servers: maps for 5x5/Pro, the servers' modes for Fun.
  const chips = useMemo(() => {
    const values = new Map<string, string>()
    for (const server of servers) {
      if (mode === "fun") values.set(server.modeLabel.toLowerCase(), funModeLabel(server.modeLabel))
      else values.set(server.map.toLowerCase(), cs2MapLabel(server.map))
    }
    return Array.from(values.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [servers, mode])
  const visible = servers.filter((server) => {
    if (filter !== "all" && (mode === "fun" ? server.modeLabel.toLowerCase() : server.map.toLowerCase()) !== filter) return false
    if (hideFull && (server.status === "full" || server.status === "offline")) return false
    if (onlyFavourites && !favourites.includes(server.id)) return false
    return true
  })
  const favouriteMaps = Array.from(new Set(servers.filter((server) => favourites.includes(server.id)).map((server) => server.map)))
  const selected = selectedId ? servers.find((server) => server.id === selectedId) ?? null : null

  return (
    <TooltipProvider delayDuration={200}>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
        <div className="@container flex flex-col gap-[18px] p-4 @2xl:p-6">
          <PlayHero
            title={title}
            description={description}
            heroMap={heroMap}
            list={data}
            loading={loading && Boolean(data)}
            mode={mode}
            pickRule={pickRule}
            favouriteMaps={favouriteMaps}
            anyJoinable={servers.some((server) => server.joinable)}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              ariaLabel={mode === "fun" ? "Modes" : "Maps"}
              value={filter}
              onChange={(value) => update({ filter: value === "all" ? null : value })}
              options={[{ value: "all", label: mode === "fun" ? "All modes" : "All maps" }, ...chips.map(([value, label]) => ({ value, label }))]}
              className="scrollbar-hidden max-w-full overflow-x-auto"
            />
            <div role="group" aria-label="Show" className={toggleTray}>
              <button type="button" aria-pressed={hideFull} onClick={() => update({ full: hideFull ? null : "hide" })} className={cn(toggleItem, hideFull ? toggleOn : toggleOff)}>Hide full</button>
              <button type="button" aria-pressed={onlyFavourites} onClick={() => update({ fav: onlyFavourites ? null : "1" })} className={cn(toggleItem, onlyFavourites ? toggleOn : toggleOff)}>
                <Star className={cn("size-3.5 text-[var(--star)] transition-[fill] duration-200", onlyFavourites ? "fill-[var(--star)]" : "fill-transparent")} />
                Favourites
              </button>
            </div>
          </div>
          {!data && loading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">{Array.from({ length: 6 }, (_, index) => <CardSkeleton key={index} />)}</div>
          ) : error && !data ? (
            <p className="flex items-center justify-center gap-3 py-16 text-[13px] text-[var(--text-dim)]">
              Could not load servers.
              <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] transition-colors hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
            </p>
          ) : visible.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-[var(--text-dim)]">{servers.length === 0 ? "No servers online right now." : "No server matches these filters."}</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
              {visible.map((server, index) => (
                <ServerCard key={server.id} index={index} server={server} favourite={favourites.includes(server.id)} onFavourite={() => toggle(server.id)} onDetails={() => update({ server: server.id })} />
              ))}
            </div>
          )}
        </div>
        <ServerSheet server={selected} onClose={() => update({ server: null })} />
      </div>
    </TooltipProvider>
  )
}

function ProLocked({ access }: { access: CompetitiveAccess }) {
  const exp = access.competitive?.current_exp ?? 1000
  const toGo = Math.max(0, PRO_LEAGUE_MIN_EXP - exp)
  const share = Math.min(100, (exp / PRO_LEAGUE_MIN_EXP) * 100)
  return (
    <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-[18px] p-6">
        <Header title={MODES.proleague.title} description={MODES.proleague.description} list={null} />
        <section className="relative flex flex-col items-center gap-4 overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-9 text-center">
          <div aria-hidden="true" className="lx-hero-glow pointer-events-none absolute -inset-10 opacity-60" />
          <div aria-hidden="true" className="lx-hero-grid pointer-events-none absolute inset-0" />
          <span className="relative flex size-[52px] items-center justify-center rounded-[14px] border border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text-2)]"><Lock className="size-[22px]" /></span>
          <span className="relative flex flex-wrap items-center justify-center gap-2 text-[17px] font-semibold text-[var(--text)]">
            Pro League unlocks at
            <RankLabel rankId={access.requiredRankId} rankName={access.requiredRankName} size={24} nameClassName="text-[17px] font-semibold" />
          </span>
          <span className="relative max-w-[440px] text-[13px] leading-[1.55] text-[var(--text-muted)]">
            Pro League servers only let in players at that rank or above, so every match is even. Keep playing 5x5 to get there.
          </span>
          <div className="relative mt-1.5 flex w-full max-w-[460px] flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-2">
                <CompetitiveRankBadge rankId={access.competitive?.rank_id ?? 7} rankName={access.competitive?.rank_name ?? "Your rank"} imageKey={access.competitive?.rank_image_key} size={24} />
                You
              </span>
              <span className="flex items-center gap-2">
                Required
                <CompetitiveRankBadge rankId={access.requiredRankId} rankName={access.requiredRankName} size={24} />
              </span>
            </div>
            <span className="h-2 overflow-hidden rounded-full bg-[var(--line-soft)]">
              <span className="lx-progress-fill block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${share}%` }} />
            </span>
            <span className="text-center text-xs text-[var(--text-dim)]">{toGo.toLocaleString()} EXP to go</span>
          </div>
          <Link to={PAGE_ROUTES["play-5vs5"]} className={cn(primary, "relative mt-1 h-10 px-[18px] text-[13px]")}>
            <Play className="size-3.5 fill-current" />
            Play 5x5 to rank up
          </Link>
        </section>
      </div>
    </div>
  )
}

export function PlayPage({ mode }: { mode: PlayPageMode }) {
  const config = MODES[mode]
  const { isAuthenticated, loading: authLoading } = useAuth()
  const isPro = mode === "proleague"
  const { data: access, loading: accessLoading, error: accessError, refetch: refetchAccess } = useApiQuery<CompetitiveAccess>((signal) => competitiveService.getMyAccess({ signal }), {
    enabled: isPro && isAuthenticated,
    queryKey: isPro && isAuthenticated ? "competitive-proleague-access" : "competitive-proleague-access-disabled",
  })

  if (isPro && !authLoading && !isAuthenticated) return <SteamLoginGate pageName="Pro League" />
  if (isPro && (authLoading || (accessLoading && !access))) {
    return (
      <div className="flex flex-col gap-[18px] p-6" aria-hidden="true">
        <Skeleton className="h-10 w-72 rounded-lg bg-[var(--raised)]" />
        <Skeleton className="h-64 rounded-xl bg-[var(--glass-fill)]" />
      </div>
    )
  }
  if (isPro && !access && accessError) {
    return (
      <p className="flex items-center justify-center gap-3 py-16 text-[13px] text-[var(--text-dim)]">
        Could not check your Pro League access.
        <button type="button" onClick={refetchAccess} className="inline-flex items-center gap-1.5 text-[var(--text-2)] transition-colors hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
      </p>
    )
  }
  if (isPro && access && !access.proLeagueUnlocked) return <ProLocked access={access} />
  return <ServerBrowser mode={config.mode} title={config.title} description={config.description} pickRule={config.pickRule} heroMap={config.heroMap} />
}
