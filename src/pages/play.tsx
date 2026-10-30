import { DetailSheetContent } from "@/components/detail-sheet"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown, Clock, Copy, Gamepad2, LoaderCircle, Lock, Play, Map as MapIcon, RotateCcw, SlidersHorizontal, Star } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { competitiveService, serversService } from "@/api"
import { playService, type PlayMode, type PlayServer, type PlayServerList } from "@/api/play"
import type { CompetitiveAccess, PlaySubMode, ServerLiveMatch, ServerLiveMatchPlayer } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useViewParams } from "@/hooks/use-view-params"
import { useAuth } from "@/hooks/use-auth"
import { usePlayGate, type PlayGate } from "@/hooks/use-play-gate"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { PAGE_ROUTES } from "@/lib/routes"
import { CompetitiveRankBadge, RankLabel } from "@/components/competitive-rank-badge"
import { PlayerAvatar } from "@/components/player-avatar"
import { TeamIcon, type TeamSide } from "@/components/team-icon"
import { SteamLoginGate } from "@/components/steam-login-gate"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetDescription, SheetTitle } from "@/components/ui/sheet"
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
  return <span className={cn("shrink-0 font-medium", server.status === "full" || server.status === "offline" ? "text-[var(--text-dim)]" : "text-[var(--text)]/90")}>{label}</span>
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

/* ------------------------------------------------------------------ details sheet */

/** A name made only of spaces or invisible characters (e.g. the Hangul filler) shows as "Unknown player". */
function visibleName(name: string) {
  return name.replace(/[\p{C}\p{Z}ᅟᅠㅤﾠ⠀]/gu, "") ? name : "Unknown player"
}

const SCORE_COLUMNS = "grid grid-cols-[18px_minmax(0,1fr)_26px_36px_36px_36px] items-center gap-2"

/**
 * One team as CS2-style rows: each row is tinted with its side's colour (T gold, CT blue) and fades out to the right;
 * players not on a side (warmup, spectators) get neutral rows.
 */
function TeamRows({ players, side }: { players: ServerLiveMatchPlayer[]; side?: TeamSide }) {
  const stat = (value: number | null | undefined) => (typeof value === "number" ? value : "—")
  const tint = side ? { background: `linear-gradient(90deg, color-mix(in oklab, var(--team-${side}) 16%, transparent), color-mix(in oklab, var(--team-${side}) 3%, transparent))` } : undefined
  if (players.length === 0) return <p className="px-3 py-2 text-xs text-[var(--text-dim)]">No players{side ? ` on ${side === "t" ? "T" : "CT"}` : ""}</p>
  return (
    <div className="flex flex-col gap-[3px]">
      {players.map((player) => (
        <div key={player.steamId} style={tint} className={cn(SCORE_COLUMNS, "h-[38px] rounded-md px-3 text-[13px]", !side && "bg-[var(--raised)]")}>
          {/* The side's emblem, to the left of the picture, as in the CS2 scoreboard. */}
          <span className="flex size-[18px] items-center justify-center">
            {side && <TeamIcon side={side} className="size-[18px]" />}
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <PlayerAvatar avatar={player.avatar ?? undefined} name={visibleName(player.name)} className="size-[22px] shrink-0 rounded-md text-[9px]" />
            <span className={cn("truncate font-medium", player.connected ? "text-[var(--text)]" : "text-[var(--text-dim)]")} title={visibleName(player.name)}>{visibleName(player.name)}</span>
          </span>
          <span className="flex items-center justify-center">
            {player.rankId != null && <CompetitiveRankBadge rankId={player.rankId} rankName={player.rankName ?? undefined} imageKey={player.rankImageKey} size={22} />}
          </span>
          <span className="text-center font-bold text-[var(--text)]">{stat(player.kills)}</span>
          <span className="text-center text-[var(--text-2)]">{stat(player.deaths)}</span>
          <span className="text-center text-[var(--text-2)]">{stat(player.assists)}</span>
        </div>
      ))}
    </div>
  )
}

/** The open server's live match (teams, score, round), refreshed every 5 s while it is shown. */
function useLiveMatch(serverId: string) {
  const { data, loading, error, refetch } = useApiQuery<ServerLiveMatch>((signal) => serversService.getLiveMatch(serverId, { signal }), {
    enabled: Boolean(serverId),
    queryKey: `live:${serverId}`,
    keepPreviousData: true,
  })
  useEffect(() => {
    if (!serverId) return
    const timer = window.setInterval(refetch, LIVE_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [serverId, refetch])
  return { live: data && data.serverId === serverId ? data : null, loading, error, refetch }
}

/** Scoreboard of the open server: both teams in a live match, else who is connected, else a short note. */
function Scoreboard({ live, loading, error, refetch }: ReturnType<typeof useLiveMatch>) {
  const header = (
    <div className={cn(SCORE_COLUMNS, "px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]")}>
      <span />
      <span className="flex items-center gap-2">
        Player
        {loading && live && <LoaderCircle aria-label="Updating" className="size-3 animate-spin" />}
      </span>
      <span />
      <span className="text-center">K</span><span className="text-center">D</span><span className="text-center">A</span>
    </div>
  )
  if (live && live.availability === "live_snapshot") {
    return (
      <div className="flex flex-col gap-2">
        {header}
        <TeamRows side="t" players={live.teams.t} />
        {/* The score between the teams, as in the CS2 scoreboard. */}
        <div className="flex items-center justify-center gap-4 py-1.5">
          <span key={`t${live.score?.t}`} className="lx-swap-in min-w-8 text-right text-[28px] font-bold leading-none text-[var(--team-t)]">{live.score ? live.score.t : "—"}</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">{live.round ? `Round ${live.round}` : "Score"}</span>
          <span key={`ct${live.score?.ct}`} className="lx-swap-in min-w-8 text-[28px] font-bold leading-none text-[var(--team-ct)]">{live.score ? live.score.ct : "—"}</span>
        </div>
        <TeamRows side="ct" players={live.teams.ct} />
      </div>
    )
  }
  if (live && live.connectedPlayers.length > 0) {
    return <div className="flex flex-col gap-2">{header}<TeamRows players={live.connectedPlayers} /></div>
  }
  if (error && !live) {
    return (
      <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">
        Live data unavailable.
        <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
      </p>
    )
  }
  if (!live) return <Skeleton className="h-40 rounded-xl bg-[var(--glass-fill)]" />
  return <p className="text-[13px] text-[var(--text-dim)]">No one on this server right now.</p>
}

function ServerSheet({ server, onClose, gate }: { server: PlayServer | null; onClose: () => void; gate: PlayGate }) {
  const serverId = server?.id ?? ""
  const liveMatch = useLiveMatch(serverId)
  const { live } = liveMatch
  const address = live?.connectAddress ?? server?.connectAddress ?? null
  const connectable = Boolean(server?.joinable && validAddress(address))
  return (
    <Sheet open={server !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DetailSheetContent width="max-w-4xl" backdrop={server && cs2MapArtwork(live?.map ?? server.map) ? <img src={cs2MapArtwork(live?.map ?? server.map)!} alt="" className="size-full object-cover opacity-30" /> : undefined}>
        {server && (
          <>
            <MapArt map={live?.map ?? server.map} className="mx-3 h-[220px] shrink-0 overflow-hidden rounded-xl sm:mx-[18px]">
              <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.1),rgba(10,10,10,0.35)_45%,var(--panel))]" />
              <span aria-hidden="true" className="lx-hero-glow absolute -inset-10 opacity-60" />
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
              </div>
            </MapArt>
            <div className="lx-sheet-rise flex flex-col gap-3.5 px-[18px] py-4">
              <Scoreboard {...liveMatch} />
            </div>
            <div className="flex shrink-0 gap-2 border-t border-[var(--line-soft)] bg-[var(--panel)]/60 px-[18px] py-3.5">
              <button type="button" disabled={!address} onClick={() => void copyAddress(address)} className={cn(secondary, "h-10 flex-1")}>
                <Copy className="size-3.5" />
                Copy IP
              </button>
              <button type="button" disabled={!connectable || gate.reason !== null} onClick={() => connect(address, server.name)} className={cn(primary, "h-10 flex-1 text-[13px]")}>
                <Play className="size-3.5" />
                Connect
              </button>
            </div>
            {gate.reason !== null && <GateNote gate={gate} className="border-t border-[var(--line-soft)] px-[18px] py-2.5" />}
          </>
        )}
      </DetailSheetContent>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ page */

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

/** Wide screens show the list and the open server side by side; narrower ones open the server in a sheet. */
function useWide() {
  const query = "(min-width: 1180px)"
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setWide(media.matches)
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])
  return wide
}

/** One server in the list: map, name, state and players. Clicking it opens it on the right (or in a sheet on phones). */
function ServerListItem({ server, selected, favourite, onFavourite, onSelect }: { server: PlayServer; selected: boolean; favourite: boolean; onFavourite: () => void; onSelect: () => void }) {
  const art = cs2MapArtwork(server.map)
  const unavailable = server.status === "offline"
  return (
    <div className={cn("group relative flex items-center gap-3 overflow-hidden rounded-[10px] border px-3 py-2.5 transition-[border-color] duration-150", selected ? "border-[var(--line-strong)]" : "border-transparent hover:border-[var(--line)]", unavailable && !selected && "opacity-60")}>
      {/* The map fills the row and fades out from left to right. */}
      {art && <img src={art} alt="" aria-hidden="true" className={cn("lx-map-img lx-list-art pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-300", selected ? "opacity-70" : "opacity-45 group-hover:opacity-60")} />}
      <button type="button" onClick={onSelect} aria-current={selected ? "true" : undefined} className="relative flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[13px] font-semibold text-[var(--text)] [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]" title={server.name}>{server.name}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--text)]/80 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
            <StatusText server={server} />
            <span aria-hidden="true" className="text-[var(--text-dim)]">·</span>
            <span className="truncate">{cs2MapLabel(server.map)}{server.mode === "fun" ? ` · ${funModeLabel(server.modeLabel)}` : ""}</span>
          </span>
        </span>
        <span className="shrink-0 text-xs text-[var(--text-2)]">{server.players}/{server.maxPlayers}</span>
      </button>
      <span className="relative"><FavouriteButton inline favourite={favourite} name={server.name} onToggle={onFavourite} /></span>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-1" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-3">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-2/3 rounded-full bg-[var(--line)]" />
            <Skeleton className="h-2.5 w-1/3 rounded-full bg-[var(--line-soft)]" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Says why Connect is inactive, in text (a tooltip does not show on a phone). */
function GateNote({ gate, className }: { gate: PlayGate; className?: string }) {
  return (
    <p className={cn("flex items-center gap-2 text-[12px] text-[var(--text-dim)]", className)}>
      <Clock className="size-3.5 shrink-0" aria-hidden="true" />
      {gate.reason}
    </p>
  )
}

/** The open server on wide screens: its map with name and score, both teams, and Copy IP / Connect. */
function ServerDetail({ server, gate }: { server: PlayServer; gate: PlayGate }) {
  const liveMatch = useLiveMatch(server.id)
  const { live } = liveMatch
  const address = live?.connectAddress ?? server.connectAddress ?? null
  const connectable = Boolean(server.joinable && validAddress(address))
  const reason = server.status === "offline" ? "Server is offline" : server.status === "full" || server.players >= server.maxPlayers ? "Server is full" : "No connection address"
  return (
    <section aria-label={server.name} className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card-surface)]">
      <MapArt key={server.id} map={live?.map ?? server.map} className="h-[210px] shrink-0">
        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.05),rgba(10,10,10,0.35)_50%,var(--card-surface))]" />
        <div className="absolute inset-x-[22px] bottom-4 z-10 flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span>
              {server.status === "live" ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--status-green)]">
                  <span className="lx-live-dot size-1.5 rounded-full bg-[var(--status-green)]" />
                  Live{live?.round ? ` · Round ${live.round}` : ""}
                </span>
              ) : <StatusText server={server} />}
            </span>
            <h2 className="truncate text-[26px] font-bold leading-tight tracking-[-0.4px] text-[var(--text)]" title={server.name}>{server.name}</h2>
            <span className="text-[13px] text-[var(--text-2)]">{cs2MapLabel(live?.map ?? server.map)}{server.mode === "fun" ? ` · ${funModeLabel(server.modeLabel)}` : ""} · {server.players}/{server.maxPlayers} players</span>
          </div>
        </div>
      </MapArt>
      <div className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-[22px] py-4">
        <Scoreboard {...liveMatch} />
      </div>
      <div className="flex shrink-0 gap-2.5 border-t border-[var(--line-soft)] px-[22px] py-4">
        <button type="button" disabled={!address} onClick={() => void copyAddress(address)} className={cn(secondary, "h-11 flex-1")}>
          <Copy className="size-3.5" />
          Copy IP
        </button>
        {connectable && gate.reason === null ? (
          <button type="button" onClick={() => connect(address, server.name)} className={cn(primary, "h-11 flex-[2] text-[14px]")}>
            <Play className="size-4 fill-current" />
            Connect
          </button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex flex-[2]" tabIndex={0}>
                <button type="button" disabled className={cn(secondary, "h-11 w-full")}><Play className="size-4" />Connect</button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{gate.reason ?? reason}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {gate.reason !== null && <GateNote gate={gate} className="border-t border-[var(--line-soft)] px-[22px] py-3" />}
    </section>
  )
}

/**
 * Play: the mode's servers as a list on the left and the open server on the right (map, both teams, Connect), with
 * Quick play in the header. The mode itself is picked in the sidebar. On narrower screens the list fills the page and a
 * server opens in a sheet.
 */
function ServerBrowser({ mode, title, description, pickRule }: { mode: PlayMode; title: string; description: string; pickRule: string }) {
  const [params, setParams] = useViewParams()
  const wide = useWide()
  const filter = params.get("filter") ?? "all"
  const hideFull = params.get("full") === "hide"
  const onlyFavourites = params.get("fav") === "1"
  const statusFilter: StatusFilter = STATUS_OPTIONS.find((option) => option.value === params.get("status"))?.value ?? "all"
  const sortOrder: SortOrder = SORT_OPTIONS.find((option) => option.value === params.get("sort"))?.value ?? "default"
  const activeFilters = (statusFilter !== "all" ? 1 : 0) + (sortOrder !== "default" ? 1 : 0) + (hideFull ? 1 : 0) + (onlyFavourites ? 1 : 0)
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
  // Map choices come from the real servers: maps for 5x5/Pro, the servers' modes for Fun.
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
  const groups = groupServers(visible, statusFilter === "all" && sortOrder === "default")
  const ordered = groups.flatMap((group) => group.servers)
  const favouriteMaps = Array.from(new Set(servers.filter((server) => favourites.includes(server.id)).map((server) => server.map)))
  const picked = selectedId ? servers.find((server) => server.id === selectedId) ?? null : null
  // On wide screens something is always open: the picked server, else the first one a player can join, else the first one.
  const shown = wide ? picked ?? ordered.find((server) => server.joinable) ?? ordered[0] ?? null : null
  const anyJoinable = servers.some((server) => server.joinable)
  const liveCount = servers.filter((server) => server.status === "live").length

  const gate = usePlayGate()
  const [busy, setBusy] = useState(false)
  const quickPlay = async () => {
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

  const list = !data && loading ? <ListSkeleton /> : error && !data ? (
    <p className="flex items-center justify-center gap-3 py-16 text-[13px] text-[var(--text-dim)]">
      Could not load servers.
      <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] transition-colors hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
    </p>
  ) : visible.length === 0 ? (
    <p className="py-16 text-center text-[13px] text-[var(--text-dim)]">{servers.length === 0 ? "No servers online right now." : "No server matches these filters."}</p>
  ) : (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.title ?? "all"} className="flex flex-col gap-0.5">
          {group.title && (
            <h2 className="flex items-center gap-2 px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
              {group.title}
              <span className="font-medium tracking-normal">{group.servers.length}</span>
            </h2>
          )}
          {group.servers.map((server) => (
            <ServerListItem key={server.id} server={server} selected={shown?.id === server.id} favourite={favourites.includes(server.id)} onFavourite={() => toggle(server.id)} onSelect={() => update({ server: server.id })} />
          ))}
        </div>
      ))}
    </div>
  )

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("@container flex min-h-0 flex-1 flex-col gap-4 p-4 @2xl:p-6", wide ? "overflow-hidden" : "scrollbar-hidden overflow-y-auto")}>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="flex items-center gap-2.5 text-[26px] font-bold leading-tight tracking-[-0.5px] text-[var(--text)]">
              {title}
              {loading && data && <LoaderCircle aria-label="Updating" className="size-4 animate-spin text-[var(--text-dim)]" />}
            </h1>
            <span className="flex flex-wrap items-center gap-x-2 text-[13px] text-[var(--text-muted)]">
              {description}
              {data && data.players > 0 && (
                <span className="flex items-center gap-1.5 text-[var(--text-2)]">
                  <span className="lx-live-dot size-1.5 rounded-full bg-[var(--status-green)]" />
                  {data.players} playing · {liveCount} live
                </span>
              )}
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={anyJoinable && gate.reason === null ? -1 : 0}>
                <button type="button" disabled={!anyJoinable || busy || gate.reason !== null} onClick={() => void quickPlay()} className={cn(primary, "h-10 gap-2 px-5 text-[13px]")}>
                  {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4 fill-current" />}
                  Quick play
                </button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{gate.reason ?? (anyJoinable ? pickRule : "No open server right now")}</TooltipContent>
          </Tooltip>
        </header>

        <div className={cn("grid gap-4", wide ? "min-h-0 flex-1 grid-cols-[400px_minmax(0,1fr)]" : "grid-cols-1")}>
          <div className={cn("flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--card-surface)] p-2", wide && "min-h-0")}>
            <div className="flex items-center gap-2 p-1">
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" aria-label={mode === "fun" ? "Filter by mode" : "Filter by map"} className={cn(toggleItem, "group border border-[var(--line)]", filter !== "all" ? toggleOn : toggleOff)}>
                    {mode === "fun" ? <Gamepad2 className="size-3.5" /> : <MapIcon className="size-3.5" />}
                    {filter === "all" ? (mode === "fun" ? "All modes" : "All maps") : chips.find(([value]) => value === filter)?.[1] ?? filter}
                    <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                </PopoverTrigger>
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
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="Filter servers" className={cn(toggleItem, "group border border-[var(--line)]", activeFilters > 0 ? toggleOn : toggleOff)}>
                    <SlidersHorizontal className="size-3.5" />
                    Filter
                    {activeFilters > 0 && <span className="flex size-4 items-center justify-center rounded-full bg-[var(--text)] text-[10px] font-semibold text-[var(--bg)]">{activeFilters}</span>}
                    <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={8} className="w-[232px] rounded-xl border-[var(--line)] bg-[var(--panel)] p-2 shadow-[0_18px_44px_rgba(0,0,0,0.55)]">
                  <div className="flex flex-col gap-2.5">
                    <OptionList label="Show" value={statusFilter} options={STATUS_OPTIONS} onChange={(value) => update({ status: value === "all" ? null : value })} />
                    <span aria-hidden="true" className="h-px bg-[var(--line-soft)]" />
                    <OptionList label="Sort by" value={sortOrder} options={SORT_OPTIONS} onChange={(value) => update({ sort: value === "default" ? null : value })} />
                    <span aria-hidden="true" className="h-px bg-[var(--line-soft)]" />
                    <div className="flex flex-col gap-0.5">
                      <span className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-dim)]">Only</span>
                      {[
                        { on: hideFull, label: "Hide full and offline", change: () => update({ full: hideFull ? null : "hide" }) },
                        { on: onlyFavourites, label: "Favourites", change: () => update({ fav: onlyFavourites ? null : "1" }) },
                      ].map((option) => (
                        <button key={option.label} type="button" role="checkbox" aria-checked={option.on} onClick={option.change} className={cn("flex h-8 items-center justify-between gap-2 rounded-lg px-2 text-[13px] transition-colors", option.on ? "bg-[var(--line)] text-[var(--text)]" : "text-[var(--text-muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]")}>
                          {option.label}
                          {option.on && <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--text)]" />}
                        </button>
                      ))}
                    </div>
                    {activeFilters > 0 && (
                      <button type="button" onClick={() => update({ status: null, sort: null, full: null, fav: null })} className="mt-0.5 flex h-8 items-center justify-center gap-1.5 rounded-lg text-[13px] text-[var(--text-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]">
                        <RotateCcw className="size-3.5" />
                        Reset
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className={cn(wide && "scrollbar-hidden min-h-0 flex-1 overflow-y-auto")}>{list}</div>
          </div>
          {wide && (shown ? <ServerDetail server={shown} gate={gate} /> : (
            <div className="flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--card-surface)] text-[13px] text-[var(--text-dim)]">{data ? "Pick a server on the left." : ""}</div>
          ))}
        </div>
        {!wide && <ServerSheet server={picked} gate={gate} onClose={() => update({ server: null })} />}
      </div>
    </TooltipProvider>
  )
}

/** Pro League for a signed-in player below the required rank: how far they are and the way there. */
function ProLocked({ access }: { access: CompetitiveAccess }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-[340px]"><ProLockPad access={access} /></div>
    </div>
  )
}

function ProLockPad({ access }: { access: CompetitiveAccess }) {
  const exp = access.competitive?.current_exp ?? 1000
  const toGo = Math.max(0, PRO_LEAGUE_MIN_EXP - exp)
  const share = Math.min(100, (exp / PRO_LEAGUE_MIN_EXP) * 100)
  return (
    <div aria-label="Pro League is locked" className="relative flex flex-col items-center gap-3 rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] p-5 text-center">
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
  if (isPro && (authLoading || (accessLoading && !access))) {
    return (
      <div className="flex flex-col gap-4 p-6" aria-hidden="true">
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
  // Switching mode in the sidebar keeps the page but swaps what is on it: the new mode fades and rises in.
  return <div key={mode} className="lx-swap-in flex min-h-0 flex-1 flex-col"><ServerBrowser mode={config.mode} title={config.title} description={config.description} pickRule={config.pickRule} /></div>
}
