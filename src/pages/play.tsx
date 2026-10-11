import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown, Copy, Crown, Gamepad2, LayoutGrid, List, LoaderCircle, Lock, Play, Map as MapIcon, RotateCcw, SlidersHorizontal, Star, Swords, Trophy, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { competitiveService, serversService } from "@/api"
import { playService, type PlayMode, type PlayServer, type PlayServerList } from "@/api/play"
import type { CompetitiveAccess, HomeStats, PlaySubMode, ServerLiveMatch, ServerLiveMatchPlayer } from "@/api/types"
import { tournamentsService } from "@/api/tournaments"
import { useApiQuery } from "@/hooks/use-api-query"
import { useViewParams } from "@/hooks/use-view-params"
import { useAuth } from "@/hooks/use-auth"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { PAGE_ROUTES } from "@/lib/routes"
import { CompetitiveRankBadge, RankLabel } from "@/components/competitive-rank-badge"
import { PlayerAvatar } from "@/components/player-avatar"
import { TeamIcon, teamTextClass, type TeamSide } from "@/components/team-icon"
import { SteamLoginGate } from "@/components/steam-login-gate"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/** Pro League opens at Vanguard I (RANK-SYSTEM.md §4). */
const PRO_LEAGUE_MIN_EXP = 1400
const REFRESH_MS = 15_000
const LIVE_REFRESH_MS = 5_000
const FAVOURITES_KEY = "legacyx.favourite-servers"
const VIEW_KEY = "legacyx.play-view"

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

/** A card or row opens its details when you click it anywhere except on its own buttons and links. */
function openOnClick(onDetails: () => void) {
  return (event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button, a")) return
    onDetails()
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

/** Servers as rows (default) or as cards; the choice is kept on this device. */
type PlayView = "list" | "cards"

function useView() {
  const [view, setView] = useState<PlayView>(() => {
    try { return window.localStorage.getItem(VIEW_KEY) === "cards" ? "cards" : "list" } catch { return "list" }
  })
  const choose = (next: PlayView) => {
    setView(next)
    try { window.localStorage.setItem(VIEW_KEY, next) } catch { /* storage blocked: keep for this visit */ }
  }
  return { view, choose }
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
        Live
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
            "lx-map-img absolute inset-0 size-full object-cover transition-[opacity] duration-[1000ms] ease-[cubic-bezier(0.37,0,0.18,1)]",
            loaded ? "opacity-70" : "opacity-0",
            zoomOnHover && "group-hover:opacity-90 group-hover:duration-700 group-hover:ease-[cubic-bezier(0.22,1,0.36,1)]",
          )}
        />
      )}
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[rgba(10,10,10,0.55)] to-transparent" />
      {children}
    </div>
  )
}

/** Status as plain text for a compact row: a live score with its dot, or the state's name. */
function StatusText({ server }: { server: PlayServer }) {
  if (server.status === "live") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-[var(--text)]">
        <span className="lx-live-dot size-1.5 rounded-full bg-[var(--status-green)]" />
        Live
      </span>
    )
  }
  const label = { waiting: "Waiting", warmup: "Warmup", full: "Full", offline: "Offline" }[server.status]
  return <span className={cn("shrink-0 font-medium", server.status === "full" || server.status === "offline" ? "text-[var(--text-dim)]" : "text-[var(--text-2)]")}>{label}</span>
}

/** Slots for a compact row: small pips (or a short bar on big servers) and the count, in a fixed width. */
function SlotsCompact({ server }: { server: PlayServer }) {
  const big = server.mode === "fun" || server.maxPlayers > 12
  const share = Math.min(100, (server.players / Math.max(1, server.maxPlayers)) * 100)
  const t = server.teams?.t ?? 0
  const ct = server.teams?.ct ?? 0
  return (
    <span className="flex items-center gap-2.5">
      {big ? (
        <span aria-hidden="true" className="h-1.5 w-[84px] overflow-hidden rounded-full bg-[var(--line-soft)]">
          <span className="lx-progress-fill block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${share}%` }} />
        </span>
      ) : (
        <span aria-hidden="true" className="flex gap-[2px]">
          {Array.from({ length: server.maxPlayers }, (_, index) => {
            const tone = index >= server.players ? "bg-[var(--line-soft)]" : index < t ? "bg-[var(--team-t)]" : index < t + ct ? "bg-[var(--team-ct)]" : "lx-slot-on"
            return <span key={index} className={cn("size-[9px] rounded-[3px] transition-[background-color,box-shadow] duration-500", tone)} />
          })}
        </span>
      )}
      <span className="w-[38px] text-right text-xs text-[var(--text-muted)]">{server.players}/{server.maxPlayers}</span>
    </span>
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
function FavouriteButton({ favourite, name, onToggle, inline }: { favourite: boolean; name: string; onToggle: () => void; inline?: boolean }) {
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
        inline ? "relative size-[30px] shrink-0" : "absolute right-2.5 top-2.5 size-[30px]",
        "flex items-center justify-center rounded-lg border bg-[rgba(15,15,15,0.7)] transition-[color,border-color,background-color] duration-300 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60",
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
      onClick={openOnClick(onDetails)}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      className={cn("lx-fx-card group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]", unavailable && "opacity-70 hover:opacity-100")}
    >
      <MapArt map={server.map} className="h-[120px]" zoomOnHover>
        {server.status === "live" && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-bright)] to-transparent" />}
        <span className="absolute left-3 top-3"><StatusPill server={server} /></span>
        <FavouriteButton favourite={favourite} name={server.name} onToggle={onFavourite} />
      </MapArt>
      <div className="relative z-[2] flex flex-col gap-3 p-3.5">
        <div className="flex min-w-0 flex-col gap-1">
          <button type="button" onClick={onDetails} aria-label={`${server.name} details`} className="min-w-0 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
            <span className="block truncate text-sm font-semibold text-[var(--text)] transition-colors duration-500 group-hover:text-white" title={server.name}>{server.name}</span>
          </button>
          <span className="truncate text-xs text-[var(--text-dim)]">{cs2MapLabel(server.map)}{server.mode === "fun" ? ` · ${funModeLabel(server.modeLabel)}` : ""}</span>
        </div>
        <div className="flex items-center"><Slots server={server} /></div>
        <div className="flex gap-2">
          <button type="button" aria-label={`Copy ${server.name} IP`} disabled={!server.connectAddress} onClick={() => void copyAddress(server.connectAddress)} className={cn(secondary, "flex-1")}>
            <Copy className="size-3.5" />
            Copy IP
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

/**
 * One server as a row, kept small: one line of name and state, the slots, a star and Connect. The map is the row's
 * background, fading out from the left so the text on it stays clean. Rows sit two to a line on wide pages, so a row
 * decides what to show by its own width (a container query): Copy and Details join in from ~576px, and a row wider
 * than ~768px leaves room for the map on its left. Clicking the name opens the details.
 */
function ServerRow({ server, favourite, onFavourite, onDetails, index }: { server: PlayServer; favourite: boolean; onFavourite: () => void; onDetails: () => void; index: number }) {
  const connectable = server.joinable && validAddress(server.connectAddress)
  const unavailable = server.status === "full" || server.status === "offline"
  const art = cs2MapArtwork(server.map)
  const [loaded, setLoaded] = useState(false)
  const connectButton = (
    <button type="button" disabled={!connectable} onClick={() => connect(server.connectAddress, server.name)} className={cn(connectable ? cn(primary, "h-[30px] text-[12px]") : cn(secondary, "h-[30px] text-[12px]"), "w-full px-3")}>
      <Play className="size-3" />
      Connect
    </button>
  )
  return (
    <article
      onClick={openOnClick(onDetails)}
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
      className={cn("lx-fx-card @container/row group relative cursor-pointer overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]", unavailable && "opacity-70 hover:opacity-100")}
    >
      {art && (
        <img
          src={art}
          alt=""
          onLoad={() => setLoaded(true)}
          className={cn("lx-row-art", loaded && "lx-row-art-on")}
        />
      )}
      <div className="relative z-[2] flex items-center gap-3 px-3 py-2.5 @3xl/row:gap-5 @3xl/row:py-3 @3xl/row:pl-[150px] @3xl/row:pr-3.5">
        <button type="button" onClick={onDetails} className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
          <span className="truncate text-[13px] font-semibold text-[var(--text)] transition-colors duration-500 group-hover:text-white" title={server.name}>{server.name}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <StatusText server={server} />
            <span aria-hidden="true" className="text-[var(--text-faint)]">·</span>
            <span className="truncate">{cs2MapLabel(server.map)}{server.mode === "fun" ? ` · ${funModeLabel(server.modeLabel)}` : ""}</span>
          </span>
        </button>
        <div className="shrink-0"><SlotsCompact server={server} /></div>
        <div className="flex shrink-0 items-center gap-1.5">
          <FavouriteButton inline favourite={favourite} name={server.name} onToggle={onFavourite} />
          <button type="button" aria-label={`Copy ${server.name} IP`} title="Copy IP" disabled={!server.connectAddress} onClick={() => void copyAddress(server.connectAddress)} className={cn(secondary, "size-[30px] px-0")}>
            <Copy className="size-3.5" />
          </button>
          {connectable ? <span className="flex w-[92px]">{connectButton}</span> : (
            <Tooltip>
              <TooltipTrigger asChild><span className="flex w-[92px]" tabIndex={0}>{connectButton}</span></TooltipTrigger>
              <TooltipContent>{server.status === "offline" ? "Server is offline" : server.status === "full" ? "Server is full" : "No connection address"}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </article>
  )
}

function RowSkeleton() {
  return (
    <div className="flex h-[56px] items-center gap-3 overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] px-3" aria-hidden="true">
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3 w-1/2 rounded-full bg-[var(--line)]" />
        <Skeleton className="h-2.5 w-1/3 rounded-full bg-[var(--line-soft)]" />
      </div>
      <Skeleton className="h-[30px] w-[92px] rounded-lg bg-[var(--raised)]" />
    </div>
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

/** A name made only of spaces or invisible characters (e.g. the Hangul filler) shows as "Unknown player". */
function visibleName(name: string) {
  return name.replace(/[\p{C}\p{Z}ᅟᅠㅤﾠ⠀]/gu, "") ? name : "Unknown player"
}

function TeamTable({ title, players, side }: { title: string; players: ServerLiveMatchPlayer[]; side?: TeamSide }) {
  const stat =(value: number | null | undefined) => (typeof value === "number" ? value : "—")
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
            <PlayerAvatar avatar={player.avatar ?? undefined} name={visibleName(player.name)} className="size-[22px] shrink-0 rounded-md text-[9px]" />
            <span className={cn("truncate", player.connected ? "text-[var(--text)]" : "text-[var(--text-dim)]")} title={visibleName(player.name)}>{visibleName(player.name)}</span>
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

type ModeTab = { key: PlaySubMode; label: string; tag: string; route: string; Icon: typeof Swords }
const MODE_TABS: ModeTab[] = [
  { key: "5vs5", label: "5x5", tag: "Ranked", route: PAGE_ROUTES["play-5vs5"], Icon: Swords },
  { key: "fun", label: "Fun", tag: "Casual", route: PAGE_ROUTES["play-fun"], Icon: Gamepad2 },
  { key: "proleague", label: "Pro League", tag: "High rank", route: PAGE_ROUTES["play-proleague"], Icon: Crown },
  { key: "tournaments", label: "Tournaments", tag: "Events", route: PAGE_ROUTES["play-tournaments"], Icon: Trophy },
]
const TOURNAMENT_PHASE = { registration: "Registration open", upcoming: "Starting soon", live: "Live now", finished: "Finished" } as const

/** The lobby's mode switch: one tile per way to play, each with its real player count (or the tournament's state). */
function ModeTabs({ active }: { active: PlaySubMode }) {
  const { data: stats } = useApiQuery<HomeStats>((signal) => serversService.getHomeStats({ signal }), { queryKey: "play-mode-counts" })
  const { data: tournaments } = useApiQuery((signal) => tournamentsService.list({ signal }), { queryKey: "play-tournament-state" })
  const status = (key: PlaySubMode): { text: string; live: boolean } | null => {
    if (key === "tournaments") {
      if (!tournaments) return null
      const current = tournaments.current
      return current ? { text: TOURNAMENT_PHASE[current.phase], live: current.phase === "live" } : { text: "None scheduled", live: false }
    }
    const players = stats?.modes?.[key === "5vs5" ? "5x5" : key === "proleague" ? "pro" : "fun"]
    if (players === undefined) return null
    return { text: players > 0 ? `${players} playing` : "No one playing", live: players > 0 }
  }
  return (
    <nav aria-label="Ways to play" className="grid grid-cols-2 gap-2 @3xl:grid-cols-4">
      {MODE_TABS.map(({ key, label, tag, route, Icon }) => {
        const on = key === active
        const state = status(key)
        return (
          <Link
            key={key}
            to={route}
            aria-current={on ? "page" : undefined}
            className={cn(
              "play-tab group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-3 transition-[border-color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60",
              on ? "play-tab-on border-[var(--line-strong)] bg-[var(--raised)]" : "border-[var(--glass-line)] bg-[var(--glass-fill)] hover:border-[var(--line-strong)] hover:bg-[var(--raised)]",
            )}
          >
            <span className={cn("hidden size-9 shrink-0 items-center justify-center rounded-[9px] border transition-colors @md:flex", on ? "border-[var(--line-strong)] bg-[var(--bg)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-muted)] group-hover:text-[var(--text)]")}>
              <Icon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="play-label">{tag}</span>
              <span className={cn("truncate text-[15px] font-semibold leading-tight", on ? "text-[var(--text)]" : "text-[var(--text-2)]")}>{label}</span>
              <span className={cn("flex h-4 items-center gap-1.5 text-[11px] text-[var(--text-dim)] transition-opacity", state ? "opacity-100" : "opacity-0")}>
                <span className={cn("size-1.5 shrink-0 rounded-full", state?.live ? "lx-live-dot bg-[var(--status-green)]" : "bg-[var(--text-faint)]")} />
                <span className="truncate">{state?.text ?? " "}</span>
              </span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

/** Live figures of the mode, all counted from the server list itself. */
function lobbyStats(list: PlayServerList | null) {
  const servers = list?.servers ?? []
  const open = servers.filter((server) => server.status !== "offline")
  return [
    { label: "Playing", value: list ? list.players : null, live: Boolean(list && list.players > 0) },
    { label: "Live matches", value: list ? servers.filter((server) => server.status === "live").length : null },
    { label: "Open servers", value: list ? servers.filter((server) => server.joinable).length : null },
    { label: "Free slots", value: list ? open.reduce((sum, server) => sum + Math.max(0, server.maxPlayers - server.players), 0) : null },
  ]
}

/**
 * Play's lobby: the mode's map behind it, its name and live figures on the left, and the launch pad on the right with one
 * big Play button that asks the API for the best open server and connects. A locked or signed-out Pro League shows its
 * reason in the launch pad's place.
 */
function PlayLobby({ title, description, heroMap, list, loading, mode, pickRule, favouriteMaps, anyJoinable, launch }: {
  title: string
  description: string
  heroMap: string
  list: PlayServerList | null
  loading?: boolean
  mode: PlayMode
  pickRule: string
  favouriteMaps: string[]
  anyJoinable: boolean
  launch?: React.ReactNode
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
  return (
    <section aria-label={title} className="play-panel relative overflow-hidden rounded-2xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
      {art && (
        <div aria-hidden="true" className="lx-map-drift pointer-events-none absolute inset-0">
          <img key={heroMap} src={art} alt="" className="lx-map-img lx-swap-fade size-full object-cover opacity-35" />
        </div>
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--card-surface)] via-[var(--card-surface)]/80 to-[var(--card-surface)]/25" />
      <div aria-hidden="true" className="play-scan pointer-events-none absolute inset-0" />

      <div className="relative z-10 grid gap-6 p-5 @3xl:grid-cols-[minmax(0,1fr)_300px] @3xl:items-center @3xl:p-7">
        <div key={title} className="lx-swap-in flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="play-label flex items-center gap-2">
              <span className={cn("size-1.5 rounded-full", list && list.onlineServers > 0 ? "lx-live-dot bg-[var(--status-green)]" : "bg-[var(--text-faint)]")} />
              Lobby
              {loading && <LoaderCircle aria-label="Updating" className="size-3 animate-spin" />}
            </span>
            <h1 className="text-[30px] font-bold leading-[1.05] tracking-[-0.8px] text-[var(--text)] @2xl:text-[40px]">{title}</h1>
            <p className="max-w-lg text-[13px] leading-relaxed text-[var(--text-2)] @2xl:text-[15px]">{description}</p>
          </div>
          <dl className="lx-stat-grid w-full grid-cols-2 @xl:w-fit @xl:grid-cols-4">
            {lobbyStats(list).map((stat) => (
              <div key={stat.label} className="lx-stat-cell min-w-[104px] gap-1.5 px-4 py-2.5">
                <dt className="lx-stat-label flex items-center gap-1.5">
                  {stat.live && <span className="lx-live-dot size-1.5 rounded-full bg-[var(--status-green)]" />}
                  {stat.label}
                </dt>
                <dd className="text-lg font-semibold leading-none text-[var(--text)]">{stat.value ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </div>

        {launch ?? (
          <div aria-label="Quick play" className="play-launchpad relative flex flex-col items-center gap-3 rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] p-5 text-center">
            <button
              type="button"
              disabled={!anyJoinable || busy}
              onClick={() => void playNow()}
              aria-label={anyJoinable ? `Play ${title} now` : "No open servers"}
              className="play-launch group relative flex size-[112px] flex-col items-center justify-center gap-1 rounded-full bg-[var(--accent-solid)] text-[var(--bg)] transition-[transform,opacity] duration-200 hover:scale-[1.04] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-solid)]/40 disabled:pointer-events-none disabled:opacity-35"
            >
              {busy ? <LoaderCircle className="size-7 animate-spin" /> : <Play className="size-7 translate-x-0.5 fill-current" />}
              <span className="text-[13px] font-bold uppercase tracking-[0.18em]">Play</span>
            </button>
            <span key={pickRule} className="lx-swap-in line-clamp-2 min-h-[36px] max-w-[240px] text-xs leading-[1.5] text-[var(--text-muted)]">
              {anyJoinable ? pickRule : mode === "fun" ? "Every Fun server is full or offline right now." : <>No open server right now. <Link to={PAGE_ROUTES["play-fun"]} className="text-[var(--text)] underline-offset-4 hover:underline">Fun Mode</Link> usually has room.</>}
            </span>
            <span className="play-label">or pick a server below</span>
          </div>
        )}
      </div>
    </section>
  )
}

/** A group of servers under one heading (Live now, Waiting for players …) with its count. */
function ServerGroup({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2.5">
      <h2 className="flex items-center gap-2.5">
        <span className="play-label text-[var(--text-muted)]">{title}</span>
        <span className="text-[11px] text-[var(--text-dim)]">{count}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--line-soft)]" />
      </h2>
      {children}
    </section>
  )
}

/** The Filter dropdown: which servers (by state) and in what order. Both live in the URL, so a link keeps them. */
const STATUS_OPTIONS = [
  { value: "all", label: "All servers" },
  { value: "live", label: "Live now" },
  { value: "waiting", label: "Not started yet" },
  { value: "free", label: "Has a free slot" },
] as const
const SORT_OPTIONS = [
  { value: "default", label: "Default order" },
  { value: "most", label: "Most players" },
  { value: "fewest", label: "Fewest players" },
  { value: "name", label: "Name A–Z" },
] as const
type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"]
type SortOrder = (typeof SORT_OPTIONS)[number]["value"]

const matchesStatus = (server: PlayServer, status: StatusFilter) => {
  if (status === "live") return server.status === "live"
  if (status === "waiting") return server.status === "waiting" || server.status === "warmup"
  if (status === "free") return server.status !== "offline" && server.players < server.maxPlayers
  return true
}

function sortServers(servers: PlayServer[], order: SortOrder) {
  if (order === "most") return [...servers].sort((a, b) => b.players - a.players)
  if (order === "fewest") return [...servers].sort((a, b) => a.players - b.players)
  if (order === "name") return [...servers].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  return servers
}

function OptionList<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string; hint?: string }[]; onChange: (value: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-0.5">
      <span className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-dim)]">{label}</span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn("flex h-8 items-center justify-between gap-2 rounded-lg px-2 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60", value === option.value ? "bg-[var(--line)] text-[var(--text)]" : "text-[var(--text-muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]")}
        >
          <span className="truncate">{option.label}</span>
          <span className="flex shrink-0 items-center gap-2">
            {option.hint && <span className="text-xs text-[var(--text-dim)]">{option.hint}</span>}
            {value === option.value && <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--text)]" />}
          </span>
        </button>
      ))}
    </div>
  )
}

/**
 * Servers in the order a player decides: live matches first, then servers waiting for players, then full or offline ones.
 * With a status filter or another sort order the list stays one block in that order.
 */
function groupServers(servers: PlayServer[], grouped: boolean): { title: string | null; servers: PlayServer[] }[] {
  if (!grouped) return [{ title: null, servers }]
  const groups = [
    { title: "Live now", servers: servers.filter((server) => server.status === "live") },
    { title: "Waiting for players", servers: servers.filter((server) => server.status === "waiting" || server.status === "warmup") },
    { title: "Full or offline", servers: servers.filter((server) => server.status === "full" || server.status === "offline") },
  ]
  return groups.filter((group) => group.servers.length > 0)
}

function ServerBrowser({ tab, mode, title, description, pickRule, heroMap, launch }: { tab: PlaySubMode; mode: PlayMode; title: string; description: string; pickRule: string; heroMap: string; launch?: React.ReactNode }) {
  const [params, setParams] = useViewParams()
  const filter = params.get("filter") ?? "all"
  const hideFull = params.get("full") === "hide"
  const onlyFavourites = params.get("fav") === "1"
  const statusFilter: StatusFilter = STATUS_OPTIONS.find((option) => option.value === params.get("status"))?.value ?? "all"
  const sortOrder: SortOrder = SORT_OPTIONS.find((option) => option.value === params.get("sort"))?.value ?? "default"
  const activeFilters = (statusFilter !== "all" ? 1 : 0) + (sortOrder !== "default" ? 1 : 0)
  const selectedId = params.get("server")
  const { favourites, toggle } = useFavourites()
  const { view, choose } = useView()
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
  const visible = sortServers(servers, sortOrder).filter((server) => {
    if (filter !== "all" && (mode === "fun" ? server.modeLabel.toLowerCase() : server.map.toLowerCase()) !== filter) return false
    if (!matchesStatus(server, statusFilter)) return false
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
          <ModeTabs active={tab} />
          <PlayLobby
            launch={launch}
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
            {/* Maps (modes on Fun): a dropdown, so it stays one button however many there are. */}
            <Popover>
              <div className={toggleTray}>
                <PopoverTrigger asChild>
                  <button type="button" aria-label={mode === "fun" ? "Filter by mode" : "Filter by map"} className={cn(toggleItem, "group", filter !== "all" ? toggleOn : toggleOff)}>
                    {mode === "fun" ? <Gamepad2 className="size-3.5" /> : <MapIcon className="size-3.5" />}
                    {filter === "all" ? (mode === "fun" ? "All modes" : "All maps") : chips.find(([value]) => value === filter)?.[1] ?? filter}
                    <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                </PopoverTrigger>
              </div>
              <PopoverContent align="start" sideOffset={8} className="max-h-[340px] w-[232px] overflow-y-auto rounded-xl border-[var(--line)] bg-[var(--panel)] p-2 shadow-[0_18px_44px_rgba(0,0,0,0.55)]">
                <OptionList
                  label={mode === "fun" ? "Mode" : "Map"}
                  value={filter}
                  onChange={(value) => update({ filter: value === "all" ? null : value })}
                  options={[
                    { value: "all", label: mode === "fun" ? "All modes" : "All maps", hint: String(servers.length) },
                    ...chips.map(([value, label]) => ({ value, label, hint: String(servers.filter((server) => (mode === "fun" ? server.modeLabel : server.map).toLowerCase() === value).length) })),
                  ]}
                />
              </PopoverContent>
            </Popover>
            <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <div className={toggleTray}>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="Filter servers" className={cn(toggleItem, "group", activeFilters > 0 ? toggleOn : toggleOff)}>
                    <SlidersHorizontal className="size-3.5" />
                    Filter
                    {activeFilters > 0 && <span className="flex size-4 items-center justify-center rounded-full bg-[var(--text)] text-[10px] font-semibold text-[var(--bg)]">{activeFilters}</span>}
                    <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                </PopoverTrigger>
              </div>
              <PopoverContent align="end" sideOffset={8} className="w-[232px] rounded-xl border-[var(--line)] bg-[var(--panel)] p-2 shadow-[0_18px_44px_rgba(0,0,0,0.55)]">
                <div className="flex flex-col gap-2.5">
                  <OptionList label="Show" value={statusFilter} options={STATUS_OPTIONS} onChange={(value) => update({ status: value === "all" ? null : value })} />
                  <span aria-hidden="true" className="h-px bg-[var(--line-soft)]" />
                  <OptionList label="Sort by" value={sortOrder} options={SORT_OPTIONS} onChange={(value) => update({ sort: value === "default" ? null : value })} />
                  {activeFilters > 0 && (
                    <button type="button" onClick={() => update({ status: null, sort: null })} className="mt-0.5 flex h-8 items-center justify-center gap-1.5 rounded-lg text-[13px] text-[var(--text-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]">
                      <RotateCcw className="size-3.5" />
                      Reset
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <div role="group" aria-label="View" className={toggleTray}>
              <button type="button" aria-label="List view" aria-pressed={view === "list"} onClick={() => choose("list")} className={cn(toggleItem, "px-2.5", view === "list" ? toggleOn : toggleOff)}><List className="size-4" /></button>
              <button type="button" aria-label="Card view" aria-pressed={view === "cards"} onClick={() => choose("cards")} className={cn(toggleItem, "px-2.5", view === "cards" ? toggleOn : toggleOff)}><LayoutGrid className="size-4" /></button>
            </div>
            <div role="group" aria-label="Show" className={toggleTray}>
              <button type="button" aria-pressed={hideFull} onClick={() => update({ full: hideFull ? null : "hide" })} className={cn(toggleItem, hideFull ? toggleOn : toggleOff)}>Hide full</button>
              <button type="button" aria-pressed={onlyFavourites} onClick={() => update({ fav: onlyFavourites ? null : "1" })} className={cn(toggleItem, onlyFavourites ? toggleOn : toggleOff)}>
                <Star className={cn("size-3.5 text-[var(--star)] transition-[fill] duration-200", onlyFavourites ? "fill-[var(--star)]" : "fill-transparent")} />
                Favourites
              </button>
            </div>
            </div>
          </div>
          {!data && loading ? (
            view === "list"
              ? <div className="grid grid-cols-1 gap-2.5 @4xl:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <RowSkeleton key={index} />)}</div>
              : <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">{Array.from({ length: 6 }, (_, index) => <CardSkeleton key={index} />)}</div>
          ) : error && !data ? (
            <p className="flex items-center justify-center gap-3 py-16 text-[13px] text-[var(--text-dim)]">
              Could not load servers.
              <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] transition-colors hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
            </p>
          ) : visible.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-[var(--text-dim)]">{servers.length === 0 ? "No servers online right now." : "No server matches these filters."}</p>
          ) : (
            <div className="flex flex-col gap-5">
              {groupServers(visible, statusFilter === "all" && sortOrder === "default").map((group) => {
                const items = view === "list" ? (
                  <div className="grid grid-cols-1 gap-2.5 @4xl:grid-cols-2">
                    {group.servers.map((server, index) => (
                      <ServerRow key={server.id} index={index} server={server} favourite={favourites.includes(server.id)} onFavourite={() => toggle(server.id)} onDetails={() => update({ server: server.id })} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
                    {group.servers.map((server, index) => (
                      <ServerCard key={server.id} index={index} server={server} favourite={favourites.includes(server.id)} onFavourite={() => toggle(server.id)} onDetails={() => update({ server: server.id })} />
                    ))}
                  </div>
                )
                return group.title ? <ServerGroup key={group.title} title={group.title} count={group.servers.length}>{items}</ServerGroup> : <div key="all">{items}</div>
              })}
            </div>
          )}
        </div>
        <ServerSheet server={selected} onClose={() => update({ server: null })} />
      </div>
    </TooltipProvider>
  )
}

/** Pro League's launch pad when the player may not join yet: their rank against the one it opens at, and how far to go. */
function ProLockPad({ access }: { access: CompetitiveAccess }) {
  const exp = access.competitive?.current_exp ?? 1000
  const toGo = Math.max(0, PRO_LEAGUE_MIN_EXP - exp)
  const share = Math.min(100, (exp / PRO_LEAGUE_MIN_EXP) * 100)
  return (
    <div aria-label="Pro League is locked" className="play-launchpad relative flex flex-col items-center gap-3 rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] p-5 text-center">
      <span className="flex size-12 items-center justify-center rounded-[12px] border border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text-2)]"><Lock className="size-5" /></span>
      <span className="flex flex-wrap items-center justify-center gap-1.5 text-[13px] font-semibold text-[var(--text)]">
        Opens at
        <RankLabel rankId={access.requiredRankId} rankName={access.requiredRankName} size={20} nameClassName="text-[13px] font-semibold" />
      </span>
      <div className="flex w-full flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <CompetitiveRankBadge rankId={access.competitive?.rank_id ?? 7} rankName={access.competitive?.rank_name ?? "Your rank"} imageKey={access.competitive?.rank_image_key} size={18} />
            You
          </span>
          <span>{toGo.toLocaleString()} EXP to go</span>
        </div>
        <span className="h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)]">
          <span className="lx-progress-fill block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${share}%` }} />
        </span>
      </div>
      <Link to={PAGE_ROUTES["play-5vs5"]} className={cn(primary, "h-9 w-full px-4 text-[13px]")}>
        <Play className="size-3.5 fill-current" />
        Play 5x5 to rank up
      </Link>
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

  // Pro League is for signed-in players only: a visitor sees the sign-in page, not the servers.
  if (isPro && !authLoading && !isAuthenticated) return <SteamLoginGate pageName="Pro League" />
  let launch: React.ReactNode = undefined
  if (isPro) {
    if (authLoading || (accessLoading && !access)) launch = <Skeleton aria-hidden="true" className="h-[236px] rounded-2xl bg-[var(--raised)]" />
    else if (!access && accessError) {
      launch = (
        <p className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] p-5 text-center text-[13px] text-[var(--text-dim)]">
          Could not check your Pro League access.
          <button type="button" onClick={refetchAccess} className="inline-flex items-center gap-1.5 text-[var(--text-2)] transition-colors hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
        </p>
      )
    } else if (access && !access.proLeagueUnlocked) launch = <ProLockPad access={access} />
  }
  return <ServerBrowser tab={mode} mode={config.mode} title={config.title} description={config.description} pickRule={config.pickRule} heroMap={config.heroMap} launch={launch} />
}
