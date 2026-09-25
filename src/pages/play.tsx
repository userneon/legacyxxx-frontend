import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Copy, Eye, Info, LoaderCircle, Lock, Play, RotateCcw, Star, X, Zap } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { competitiveService, serversService } from "@/api"
import { playService, type PlayMode, type PlayServer, type PlayServerList } from "@/api/play"
import type { CompetitiveAccess, PlaySubMode, ServerLiveMatch, ServerLiveMatchPlayer } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { PAGE_ROUTES } from "@/lib/routes"
import { CompetitiveRankBadge, RankLabel } from "@/components/competitive-rank-badge"
import { PlayerAvatar } from "@/components/player-avatar"
import { TeamIcon, teamTextClass, type TeamSide } from "@/components/team-icon"
import { SteamLoginGate } from "@/components/steam-login-gate"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/** Pro League opens at Vanguard I (RANK-SYSTEM.md §4). */
const PRO_LEAGUE_MIN_EXP = 1400
const REFRESH_MS = 15_000
const LIVE_REFRESH_MS = 5_000
const FAVOURITES_KEY = "legacyx.favourite-servers"

type PlayPageMode = Exclude<PlaySubMode, "tournaments">

const MODES: Record<PlayPageMode, { mode: PlayMode; title: string; description: string; pickRule: string }> = {
  "5vs5": { mode: "5x5", title: "5x5 Matches", description: "Competitive 5v5. Every match counts toward your rank.", pickRule: "We pick the open server closest to starting, on your maps." },
  fun: { mode: "fun", title: "Fun Mode", description: "Casual servers — jump in and out anytime. No rank changes.", pickRule: "We pick the busiest server with a free slot." },
  proleague: { mode: "pro", title: "Pro League", description: "Ranked 5v5 for high-rank players only.", pickRule: "We pick the open Pro server closest to starting, on your maps." },
}

const secondary = "inline-flex h-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] px-3 text-[13px] font-medium text-[var(--text)] transition-[background-color,border-color,transform] duration-150 hover:border-[var(--line-strong)] hover:bg-[var(--raised)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 disabled:pointer-events-none disabled:opacity-50"
const primary = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-solid)] font-semibold text-[var(--accent-on)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 disabled:pointer-events-none disabled:opacity-50"
const chip = "inline-flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
const chipOn = "border-[var(--line-strong)] bg-[var(--line)] text-[var(--text)]"
const chipOff = "border-[var(--line)] text-[var(--text-muted)] hover:text-[var(--text)]"

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
      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[rgba(10,10,10,0.72)] px-2.5 text-xs font-semibold tabular-nums text-[var(--text)] backdrop-blur-sm">
        <span className="size-1.5 rounded-full bg-[var(--status-green)]" />
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

function MapArt({ map, className, children }: { map: string; className?: string; children?: React.ReactNode }) {
  const art = cs2MapArtwork(map)
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={cn("relative overflow-hidden bg-[linear-gradient(135deg,#1c1c1c,#151515)]", className)}>
      {art && <img src={art} alt="" onLoad={() => setLoaded(true)} className={cn("absolute inset-0 size-full object-cover transition-opacity duration-200", loaded ? "opacity-70" : "opacity-0")} />}
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
          <span className="block h-full rounded-full bg-[var(--accent-solid)] transition-[width] duration-300" style={{ width: `${share}%` }} />
        </span>
        <span className="text-xs tabular-nums text-[var(--text-muted)]">{server.players}/{server.maxPlayers}</span>
      </div>
    )
  }
  return (
    <div className="flex flex-1 items-center justify-between gap-3">
      <span aria-hidden="true" className="flex gap-[3px]">
        {Array.from({ length: server.maxPlayers }, (_, index) => (
          <span key={index} className={cn("size-3.5 rounded-[4px] transition-colors duration-200", index < server.players ? "bg-[var(--accent-solid)]" : "bg-[var(--line-soft)]")} />
        ))}
      </span>
      <span className="text-xs tabular-nums text-[var(--text-muted)]">{server.players}/{server.maxPlayers}</span>
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

function ServerCard({ server, favourite, onFavourite, onDetails }: { server: PlayServer; favourite: boolean; onFavourite: () => void; onDetails: () => void }) {
  const connectable = server.joinable && validAddress(server.connectAddress)
  const connectButton = (
    <button type="button" disabled={!connectable} onClick={() => connect(server.connectAddress, server.name)} className={cn(secondary, "w-full")}>
      <Play className="size-3.5" />
      Connect
    </button>
  )
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] transition-colors duration-150 hover:border-[var(--line-strong)]">
      <MapArt map={server.map} className="h-[120px]">
        <span className="absolute left-3 top-3"><StatusPill server={server} /></span>
        <FavouriteButton favourite={favourite} name={server.name} onToggle={onFavourite} />
      </MapArt>
      <div className="flex flex-col gap-3 p-3.5">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-semibold text-[var(--text)]" title={server.name}>{server.name}</span>
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
    <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)]" aria-hidden="true">
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
    <div className="overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)]">
      <div className="grid h-[34px] grid-cols-[minmax(0,1fr)_34px_34px_34px] items-center gap-2 px-3 text-[11px] font-semibold text-[var(--text-muted)]">
        <span className={cn("flex items-center gap-2", side && teamTextClass(side))}>{side && <TeamIcon side={side} />}{title}</span><span>K</span><span>D</span><span>A</span>
      </div>
      {players.length === 0 ? (
        <div className="border-t border-[var(--raised)] px-3 py-3 text-xs text-[var(--text-dim)]">No players</div>
      ) : players.map((player) => (
        <div key={player.steamId} className="grid h-[38px] grid-cols-[minmax(0,1fr)_34px_34px_34px] items-center gap-2 border-t border-[var(--raised)] px-3 text-[13px]">
          <span className="flex min-w-0 items-center gap-2">
            <PlayerAvatar name={player.name} className="size-[22px] shrink-0 rounded-md text-[9px]" />
            <span className={cn("truncate", player.connected ? "text-[var(--text)]" : "text-[var(--text-dim)]")} title={player.name}>{player.name}</span>
          </span>
          <span className="tabular-nums text-[var(--text-2)]">{stat(player.kills)}</span>
          <span className="tabular-nums text-[var(--text-2)]">{stat(player.deaths)}</span>
          <span className="tabular-nums text-[var(--text-2)]">{stat(player.assists)}</span>
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
        overlayClassName="bg-[rgba(10,10,10,0.5)] data-[state=open]:duration-200 data-[state=closed]:duration-150"
        className="inset-y-2 right-2 h-auto w-[440px] max-w-[calc(100%-16px)] gap-0 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] p-0 shadow-[-16px_0_40px_rgba(0,0,0,0.45)] data-[state=open]:duration-[250ms] data-[state=closed]:duration-150 sm:max-w-[440px]"
      >
        {server && (
          <>
            <MapArt map={live?.map ?? server.map} className="h-[120px] shrink-0">
              <button type="button" onClick={onClose} aria-label="Close" className="absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[rgba(15,15,15,0.7)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
                <X className="size-4" />
              </button>
              <div className="absolute bottom-3.5 left-[18px] flex flex-col gap-1">
                <SheetTitle className="text-base font-semibold text-[var(--text)]">{server.name}</SheetTitle>
                <SheetDescription className="text-xs text-[var(--text-2)]">{cs2MapLabel(live?.map ?? server.map)}</SheetDescription>
              </div>
            </MapArt>
            <div className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-[18px] py-4">
              <div className="flex items-center justify-between">
                {server.status === "live" ? (
                  <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[var(--status-green)]/12 px-2.5 text-xs font-semibold text-[var(--status-green)]">
                    <span className="size-1.5 rounded-full bg-[var(--status-green)]" />
                    Live
                  </span>
                ) : <StatusPill server={server} />}
                <span className="flex items-center gap-2.5 text-[13px] tabular-nums text-[var(--text-muted)]">
                  {loading && live && <LoaderCircle aria-label="Updating" className="size-3.5 animate-spin text-[var(--text-dim)]" />}
                  {live?.round ? `Round ${live.round}` : `${server.players}/${server.maxPlayers} players`}
                </span>
              </div>
              {live?.score && (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-3.5">
                  <TeamIcon side="t" className="size-7" />
                  <span className="flex items-center gap-2.5 text-2xl font-semibold tabular-nums"><span className="text-[var(--team-t)]">{live.score.t}</span><span className="text-[var(--text-faint)]">:</span><span className="text-[var(--team-ct)]">{live.score.ct}</span></span>
                  <TeamIcon side="ct" className="size-7 justify-self-end" />
                </div>
              )}
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
                <Skeleton className="h-40 rounded-xl bg-[var(--card-surface)]" />
              ) : (
                <p className="text-[13px] text-[var(--text-dim)]">No live match data for this server yet.</p>
              )}
            </div>
            <div className="flex gap-2 border-t border-[var(--line-soft)] px-[18px] py-3.5">
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
        <span className="flex items-center gap-2 text-[13px] tabular-nums text-[var(--text-muted)]">
          <span className="size-1.5 rounded-full bg-[var(--status-green)]" />
          {list.players} player{list.players === 1 ? "" : "s"} · {list.onlineServers} server{list.onlineServers === 1 ? "" : "s"}
        </span>
      )}
    </div>
  )
}

function QuickJoin({ mode, pickRule, favouriteMaps, anyJoinable }: { mode: PlayMode; pickRule: string; favouriteMaps: string[]; anyJoinable: boolean }) {
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
    <section aria-label="Quick join" className="flex flex-wrap items-center gap-5 rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] px-5 py-[18px]">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-solid)] text-[var(--accent-on)]"><Zap className="size-5" /></span>
      <div className="flex min-w-[200px] flex-1 flex-col gap-1">
        <span className="text-[15px] font-semibold text-[var(--text)]">Quick join</span>
        <span className="text-[13px] text-[var(--text-muted)]">
          {anyJoinable ? pickRule : mode === "fun" ? "Every Fun server is full or offline right now." : <>No open server right now. <Link to={PAGE_ROUTES["play-fun"]} className="text-[var(--text)] underline-offset-4 hover:underline">Fun Mode</Link> usually has room.</>}
        </span>
      </div>
      <button type="button" disabled={!anyJoinable || busy} onClick={() => void playNow()} className={cn(primary, "h-11 gap-2 rounded-[10px] px-[22px] text-[15px]")}>
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4 fill-current" />}
        {anyJoinable ? "Play now" : "No open servers"}
      </button>
    </section>
  )
}

function ServerBrowser({ mode, title, description, pickRule }: { mode: PlayMode; title: string; description: string; pickRule: string }) {
  const [params, setParams] = useSearchParams()
  const filter = params.get("filter") ?? "all"
  const hideFull = params.get("full") === "hide"
  const onlyFavourites = params.get("fav") === "1"
  const selectedId = params.get("server")
  const { favourites, toggle } = useFavourites()
  const { data, loading, error, refetch } = useApiQuery<PlayServerList>((signal) => playService.getServers(mode, { signal }), { queryKey: `play:${mode}`, keepPreviousData: true })
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
        <div className="flex flex-col gap-[18px] p-6">
          <Header title={title} description={description} list={data} loading={loading && Boolean(data)} />
          <QuickJoin mode={mode} pickRule={pickRule} favouriteMaps={favouriteMaps} anyJoinable={servers.some((server) => server.joinable)} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label={mode === "fun" ? "Modes" : "Maps"} className="flex flex-wrap gap-1.5">
              <button type="button" aria-pressed={filter === "all"} onClick={() => update({ filter: null })} className={cn(chip, filter === "all" ? chipOn : chipOff)}>{mode === "fun" ? "All modes" : "All maps"}</button>
              {chips.map(([value, label]) => (
                <button key={value} type="button" aria-pressed={filter === value} onClick={() => update({ filter: filter === value ? null : value })} className={cn(chip, filter === value ? chipOn : chipOff)}>{label}</button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button type="button" aria-pressed={hideFull} onClick={() => update({ full: hideFull ? null : "hide" })} className={cn(chip, hideFull ? chipOn : chipOff)}>Hide full</button>
              <button type="button" aria-pressed={onlyFavourites} onClick={() => update({ fav: onlyFavourites ? null : "1" })} className={cn(chip, onlyFavourites ? chipOn : chipOff)}>
                <Star className={cn("size-3 text-[var(--star)]", onlyFavourites && "fill-[var(--star)]")} />
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
              {visible.map((server) => (
                <ServerCard key={server.id} server={server} favourite={favourites.includes(server.id)} onFavourite={() => toggle(server.id)} onDetails={() => update({ server: server.id })} />
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
        <section className="flex flex-col items-center gap-4 rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-9 text-center">
          <span className="flex size-[52px] items-center justify-center rounded-[14px] border border-[var(--line)] bg-[var(--raised)] text-[var(--text-muted)]"><Lock className="size-[22px]" /></span>
          <span className="flex flex-wrap items-center justify-center gap-2 text-[17px] font-semibold text-[var(--text)]">
            Pro League unlocks at
            <RankLabel rankId={access.requiredRankId} rankName={access.requiredRankName} size={24} nameClassName="text-[17px] font-semibold" />
          </span>
          <span className="max-w-[440px] text-[13px] leading-[1.55] text-[var(--text-muted)]">
            Pro League servers only let in players at that rank or above, so every match is even. Keep playing 5x5 to get there.
          </span>
          <div className="mt-1.5 flex w-full max-w-[460px] flex-col gap-2">
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
              <span className="block h-full rounded-full bg-[var(--accent-solid)] transition-[width] duration-300" style={{ width: `${share}%` }} />
            </span>
            <span className="text-center text-xs tabular-nums text-[var(--text-dim)]">{toGo.toLocaleString()} EXP to go</span>
          </div>
          <Link to={PAGE_ROUTES["play-5vs5"]} className={cn(primary, "mt-1 h-10 px-[18px] text-[13px]")}>
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
        <Skeleton className="h-64 rounded-xl bg-[var(--card-surface)]" />
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
  return <ServerBrowser key={mode} mode={config.mode} title={config.title} description={config.description} pickRule={config.pickRule} />
}
