/**
 * Play: 5x5 Matches, Fun Mode and Pro League (docs/design/play-5x5, play-5x5-server, play-fun, play-pro-locked).
 * One shared page per mode. Quick join is the only primary action; the server grid is for manual browsing.
 * Map/mode chips, "Hide full", "Favourites" and the open details sheet live in the URL. Favourite servers are
 * kept in this browser only.
 */
import { useCallback, useMemo, useState, type ReactNode } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Copy, Eye, Lock, Play, Star, X, Zap } from "lucide-react"
import { toast } from "sonner"

import { competitiveService, serversService, type CompetitiveAccess, type ServerInfo, type ServerLiveMatch, type ServerLiveMatchPlayer } from "@/api"
import { cs2MapArtwork, cs2MapLabel, normalizeCs2MapKey } from "@/lib/cs2-map-art"
import { formatInt } from "@/lib/format"
import { PRO_LEAGUE_RANK_ID, rankById, rankForExp } from "@/lib/ranks"
import { cn } from "@/lib/utils"
import { Card, PageHeader } from "@/components/page"
import { PlayerAvatar } from "@/components/player-avatar"
import { RankBadge, RankEmblem } from "@/components/rank"
import { EmptyState, ErrorState, InlineLoader, Skeleton } from "@/components/states"
import { SteamLoginGate } from "@/components/steam-login-gate"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { useLiveServers } from "@/hooks/use-live-servers"
import { useMyRank } from "@/hooks/use-my-rank"
import { useUrlState } from "@/hooks/use-url-state"

export type PlayMode = "5v5" | "fun" | "pro"

const COPY: Record<PlayMode, { title: string; description: string; pickRule: string }> = {
  "5v5": {
    title: "5x5 Matches",
    description: "Competitive 5v5. Every match counts toward your rank.",
    pickRule: "We pick the open server closest to starting, on your maps.",
  },
  fun: {
    title: "Fun Mode",
    description: "Casual servers — jump in and out anytime. No rank changes.",
    pickRule: "We pick the busiest server with a free slot.",
  },
  pro: {
    title: "Pro League",
    description: "Ranked 5v5 for high-rank players only.",
    pickRule: "We pick the open server closest to starting, on your maps.",
  },
}

/* ----------------------------------------------------------------------------
 * Favourites (this browser only) and helpers
 * ------------------------------------------------------------------------- */

const FAVOURITES_KEY = "legacyx:favourite-servers"

function readFavourites(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(FAVOURITES_KEY) ?? "[]")
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []
  } catch {
    return []
  }
}

function useFavourites() {
  const [favourites, setFavourites] = useState<string[]>(readFavourites)
  const toggle = useCallback((serverId: string) => {
    setFavourites((current) => {
      const next = current.includes(serverId) ? current.filter((id) => id !== serverId) : [...current, serverId]
      try {
        localStorage.setItem(FAVOURITES_KEY, JSON.stringify(next))
      } catch {
        /* Storage can be unavailable (private mode); favourites then last until reload. */
      }
      return next
    })
  }, [])
  return { favourites, toggle }
}

async function copyAddress(address: string | undefined) {
  if (!address) {
    toast.error("No address for this server yet")
    return
  }
  try {
    await navigator.clipboard.writeText(`connect ${address}`)
    toast.success("IP copied", { description: `connect ${address}` })
  } catch {
    toast.error("Copy failed", { description: `connect ${address}` })
  }
}

const FUN_MODE_LABELS: Record<string, string> = { dm: "Deathmatch", ffa: "Deathmatch", aim: "Aim", surf: "Surf", retake: "Retakes", retakes: "Retakes", bhop: "Bhop", kz: "KZ", awp: "AWP", hns: "Hide and Seek", arena: "Arena", "1v1": "1v1" }

/** "fun_retake" → Retakes; null for plain fun servers. */
function funModeKey(server: ServerInfo): string | null {
  const raw = (server.rawMode ?? "").trim().toLowerCase().replace(/^fun[_\s-]*/, "")
  if (!raw || raw === "fun") return null
  return raw
}

function funModeLabel(key: string) {
  return FUN_MODE_LABELS[key] ?? key.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function isJoinable(server: ServerInfo) {
  return server.status === "online" && server.players < server.maxPlayers && Boolean(server.connectAddress)
}

type Pill = { label: string; tone: "live" | "neutral" | "dim" }

function statusPill(server: ServerInfo): Pill {
  if (server.status === "offline") return { label: "Offline", tone: "dim" }
  const live = server.live
  if (live && (live.state === "live" || live.state === "paused")) {
    const score = live.score ? `${live.score.t} : ${live.score.ct}` : "Live"
    return { label: live.round ? `${score} · R${live.round}` : score, tone: "live" }
  }
  if (server.status === "full") return { label: "Full", tone: "dim" }
  if (live?.state === "waiting" && server.players > 0) return { label: "Warmup", tone: "neutral" }
  return { label: "Waiting", tone: "neutral" }
}

function StatusPill({ pill, className }: { pill: Pill; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold tabular-nums backdrop-blur-sm",
        pill.tone === "live" ? "bg-panel/85 text-live" : pill.tone === "dim" ? "bg-panel/85 text-text-dim" : "bg-panel/85 text-text-2",
        className,
      )}
    >
      {pill.tone === "live" && <span className="size-1.5 rounded-full bg-live" aria-hidden />}
      {pill.label}
    </span>
  )
}

function MapArt({ map, className, children }: { map: string; className?: string; children?: ReactNode }) {
  const art = cs2MapArtwork(map)
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-[linear-gradient(135deg,#1c1c1c,#151515)]", className)}>
      {art && <img src={art} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover opacity-80" />}
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/10 to-transparent" />
      {children}
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * Server card
 * ------------------------------------------------------------------------- */

function Capacity({ server, mode }: { server: ServerInfo; mode: PlayMode }) {
  const label = `${server.players}/${server.maxPlayers}`
  if (mode === "fun") {
    const ratio = server.maxPlayers ? Math.min(1, server.players / server.maxPlayers) : 0
    return (
      <div className="flex items-center gap-2.5" aria-label={`${label} players`}>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
          <span className="block h-full rounded-full bg-text-2 transition-[width] duration-300" style={{ width: `${ratio * 100}%` }} />
        </span>
        <span className="text-xs font-medium tabular-nums text-text-muted">{label}</span>
      </div>
    )
  }
  const slots = Math.max(server.maxPlayers, 10)
  return (
    <div className="flex items-center justify-between gap-2.5" aria-label={`${label} players`}>
      <span className="flex flex-wrap gap-1">
        {Array.from({ length: slots }, (_, index) => (
          <span key={index} className={cn("size-3.5 rounded-[4px]", index < server.players ? "bg-text-2" : "bg-line-soft")} />
        ))}
      </span>
      <span className="text-xs font-medium tabular-nums text-text-muted">{label}</span>
    </div>
  )
}

function ConnectButton({ server, size = "default", className, variant = "secondary" }: { server: ServerInfo; size?: "default" | "lg"; className?: string; variant?: "secondary" | "default" }) {
  const reason = server.status === "offline" ? "Server is offline" : server.status === "full" || server.players >= server.maxPlayers ? "Server is full" : !server.connectAddress ? "No address yet" : null
  const button = (
    <Button variant={variant} size={size} disabled={Boolean(reason)} onClick={() => serversService.connect(server)} className={cn("w-full", className)}>
      <Play className="size-3" aria-hidden />
      Connect
    </Button>
  )
  if (!reason) return <span className={cn("flex flex-1", className)}>{button}</span>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("flex flex-1", className)} tabIndex={0}>
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  )
}

function ServerCard({ server, mode, favourite, onFavourite, onDetails }: { server: ServerInfo; mode: PlayMode; favourite: boolean; onFavourite: () => void; onDetails: () => void }) {
  const funKey = mode === "fun" ? funModeKey(server) : null
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line-soft bg-card transition-colors duration-150 hover:border-line">
      <MapArt map={server.map} className="h-[120px]">
        <StatusPill pill={statusPill(server)} className="absolute top-3 left-3" />
        <button
          type="button"
          aria-label={favourite ? `Remove ${server.name} from favourites` : `Add ${server.name} to favourites`}
          aria-pressed={favourite}
          onClick={onFavourite}
          className={cn(
            "press absolute top-2.5 right-2.5 flex size-[30px] items-center justify-center rounded-lg border border-line bg-panel/70 transition-colors duration-150 hover:text-text",
            favourite ? "text-text" : "text-text-muted",
          )}
        >
          <Star className={cn("size-3.5", favourite && "fill-current")} aria-hidden />
        </button>
      </MapArt>
      <div className="flex flex-col gap-3 p-3.5">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-semibold text-text" title={server.name}>{server.name}</span>
          <span className="truncate text-xs text-text-dim">
            {cs2MapLabel(server.map)}
            {funKey ? ` · ${funModeLabel(funKey)}` : ""}
          </span>
        </div>
        <Capacity server={server} mode={mode} />
        <div className="flex gap-2">
          <Button variant="outline" size="icon" aria-label="Copy server IP" onClick={() => void copyAddress(server.connectAddress)}>
            <Copy className="size-3.5" aria-hidden />
          </Button>
          <Button variant="outline" className="flex-1" onClick={onDetails}>
            Details
          </Button>
          <ConnectButton server={server} />
        </div>
      </div>
    </article>
  )
}

function ServerCardSkeleton({ mode }: { mode: PlayMode }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line-soft bg-card">
      <div className="h-[120px] bg-[linear-gradient(135deg,#1c1c1c,#151515)]" />
      <div className="flex flex-col gap-3 p-3.5">
        <span className="flex flex-col gap-2">
          <Skeleton className="h-2.5 w-1/2 bg-line" />
          <Skeleton className="h-2 w-1/3" />
        </span>
        {mode === "fun" ? <Skeleton className="h-1.5 w-full" /> : <Skeleton className="h-3.5 w-2/3" />}
        <span className="flex gap-2">
          <Skeleton className="size-[34px] rounded-lg" />
          <Skeleton className="h-[34px] flex-1 rounded-lg" />
          <Skeleton className="h-[34px] flex-1 rounded-lg" />
        </span>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * Details sheet (live data refreshes every 5s while open)
 * ------------------------------------------------------------------------- */

function stat(value: number | null | undefined) {
  return typeof value === "number" ? formatInt(value) : "–"
}

function TeamTable({ title, players }: { title: string; players: ServerLiveMatchPlayer[] }) {
  const grid = "grid grid-cols-[minmax(0,1fr)_34px_34px_34px] items-center gap-2 px-3"
  return (
    <div className="overflow-hidden rounded-xl border border-line-soft bg-card">
      <div className={cn(grid, "h-[34px] text-[11px] font-semibold text-text-muted")}>
        <span>{title}</span>
        <span>K</span>
        <span>D</span>
        <span>A</span>
      </div>
      {players.length === 0 ? (
        <div className="border-t border-raised px-3 py-3 text-xs text-text-dim">No players</div>
      ) : (
        players.map((player) => (
          <div key={player.steamId || player.name} className={cn(grid, "h-[38px] border-t border-raised")}>
            <span className="flex min-w-0 items-center gap-2">
              <PlayerAvatar name={player.name} size={22} />
              <span className={cn("truncate text-[13px]", player.connected ? "text-text" : "text-text-dim")} title={player.name}>{player.name}</span>
              {player.rankId ? <RankEmblem rankId={player.rankId} size={16} /> : null}
            </span>
            <span className="text-xs tabular-nums text-text-2">{stat(player.kills)}</span>
            <span className="text-xs tabular-nums text-text-2">{stat(player.deaths)}</span>
            <span className="text-xs tabular-nums text-text-2">{stat(player.assists)}</span>
          </div>
        ))
      )}
    </div>
  )
}

function ServerSheet({ server, onClose }: { server: ServerInfo | null; onClose: () => void }) {
  const open = Boolean(server)
  const { data, loading, error, refetch } = useApiQuery<ServerLiveMatch>((signal) => serversService.getLiveMatch(server!.id, { signal }), {
    enabled: open,
    queryKey: server?.id ?? "",
    pollMs: 5_000,
    keepPreviousData: true,
  })
  const live = data && data.serverId === server?.id ? data : null
  const pill: Pill | null = !server
    ? null
    : live && (live.state === "live" || live.state === "paused")
      ? { label: live.state === "paused" ? "Paused" : "Live", tone: "live" }
      : statusPill({ ...server, live: null })
  const snapshot = live && live.availability === "live_snapshot"

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-[440px]" showCloseButton={false}>
        {server && (
          <>
            <MapArt map={live?.map || server.map} className="h-[120px] rounded-t-[11px]">
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="press absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-lg border border-line bg-panel/70 text-text-muted transition-colors duration-150 hover:text-text"
              >
                <X className="size-4" aria-hidden />
              </button>
              <div className="absolute bottom-3.5 left-[18px] flex min-w-0 flex-col gap-1">
                <SheetTitle className="m-0 truncate text-[17px] font-semibold text-text">{server.name}</SheetTitle>
                <SheetDescription className="m-0 text-xs text-text-muted">{cs2MapLabel(live?.map || server.map)}</SheetDescription>
              </div>
            </MapArt>
            <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-[18px] py-4">
              <div className="flex items-center justify-between">
                {pill && <StatusPill pill={pill} className={pill.tone === "live" ? "bg-live/12" : "bg-raised"} />}
                <span className="flex items-center gap-2.5 text-[13px] text-text-muted">
                  <InlineLoader show={loading && Boolean(data)} />
                  Round <span className="font-semibold tabular-nums text-text">{live?.round ?? "–"}</span>
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-line-soft bg-card p-3.5">
                <span className="text-xs font-semibold text-text-muted">T</span>
                <span className="flex items-center gap-2.5 text-[22px] font-bold tabular-nums text-text">
                  {live?.score ? live.score.t : "–"}
                  <span className="text-base text-text-faint">:</span>
                  {live?.score ? live.score.ct : "–"}
                </span>
                <span className="text-right text-xs font-semibold text-text-muted">CT</span>
              </div>
              {loading && !data ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-48 w-full rounded-xl" />
                  <Skeleton className="h-48 w-full rounded-xl" />
                </div>
              ) : error && !live ? (
                <ErrorState onRetry={refetch} />
              ) : snapshot ? (
                <>
                  <TeamTable title="Terrorists" players={live.teams.t} />
                  <TeamTable title="Counter-Terrorists" players={live.teams.ct} />
                  {live.spectators.length > 0 && <p className="m-0 text-xs text-text-dim">{live.spectators.length} spectating</p>}
                </>
              ) : live && live.connectedPlayers.length > 0 ? (
                <TeamTable title={`Connected players (${live.connectedPlayers.length})`} players={live.connectedPlayers} />
              ) : (
                <EmptyState className="py-10">No live match data for this server right now.</EmptyState>
              )}
            </div>
            <div className="flex gap-2 border-t border-line-soft p-[18px]">
              <Button variant="outline" className="flex-1" onClick={() => void copyAddress(server.connectAddress)}>
                <Copy className="size-3.5" aria-hidden />
                Copy IP
              </Button>
              {server.gotvAddress && (
                <Button variant="outline" className="flex-1" onClick={() => window.location.assign(`steam://connect/${server.gotvAddress}`)}>
                  <Eye className="size-3.5" aria-hidden />
                  Spectate
                </Button>
              )}
              <ConnectButton server={server} variant="default" />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

/* ----------------------------------------------------------------------------
 * Pro League lock
 * ------------------------------------------------------------------------- */

function ProLocked({ access }: { access: CompetitiveAccess | null }) {
  const navigate = useNavigate()
  const { profile } = useMyRank()
  const required = rankById(access?.requiredRankId ?? PRO_LEAGUE_RANK_ID) ?? rankById(PRO_LEAGUE_RANK_ID)!
  const requiredExp = access?.requiredExp ?? required.minimumExp
  const exp = access?.competitive?.current_exp ?? profile?.current_exp ?? null
  const current = access?.competitive?.rank_id ? rankById(access.competitive.rank_id) : exp !== null ? rankForExp(exp) : null
  const floor = 0
  const progress = exp === null ? 0 : Math.min(1, Math.max(0, (exp - floor) / (requiredExp - floor)))
  const toGo = exp === null ? null : Math.max(0, requiredExp - exp)

  return (
    <Card className="flex flex-col items-center gap-4 p-6 text-center sm:p-9">
      <span className="flex size-[52px] items-center justify-center rounded-[14px] border border-line bg-raised text-text-muted">
        <Lock className="size-5" aria-hidden />
      </span>
      <h2 className="m-0 flex flex-wrap items-center justify-center gap-2 text-[17px] leading-none font-semibold text-text">
        <span>Pro League unlocks at</span>
        <RankBadge rank={required} size={20} nameClassName="text-[17px] font-semibold" />
      </h2>
      <p className="m-0 max-w-[420px] text-[13px] leading-5 text-text-muted">
        Pro League servers only let in players at that rank or above, so every match is even. Keep playing 5x5 to get there.
      </p>
      <div className="flex w-full max-w-[460px] flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span className="flex items-center gap-2">
            {current ? <RankEmblem rank={current} size={20} /> : null}
            You
          </span>
          <span className="flex items-center gap-2">
            Required
            <RankEmblem rank={required} size={20} />
          </span>
        </div>
        <span className="h-1.5 overflow-hidden rounded-full bg-line-soft" role="progressbar" aria-valuemin={0} aria-valuemax={requiredExp} aria-valuenow={exp ?? 0}>
          <span className="block h-full rounded-full bg-text transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
        </span>
        <span className="text-xs text-text-dim">{toGo === null ? "Play a ranked match to get your rank" : `${formatInt(toGo)} EXP to go`}</span>
      </div>
      <Button onClick={() => navigate("/play/5x5")}>
        <Play className="size-3" aria-hidden />
        Play 5x5 to rank up
      </Button>
    </Card>
  )
}

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

function QuickJoin({ mode, servers, favouriteMaps }: { mode: PlayMode; servers: ServerInfo[]; favouriteMaps: string[] }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const anyJoinable = servers.some(isJoinable)

  const play = async () => {
    setBusy(true)
    try {
      const result = await serversService.quickJoin(mode, favouriteMaps)
      if (result.server && result.connectAddress) serversService.connect({ id: result.server.id, connectAddress: result.connectAddress })
      else toast("No open servers right now", { description: mode === "fun" ? "Check back in a minute." : "Try Fun Mode while servers fill up." })
    } catch {
      toast.error("Quick join failed", { description: "Please try again." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Quick join" className="flex flex-col gap-4 rounded-xl border border-line-soft bg-card px-5 py-[18px] sm:flex-row sm:items-center sm:gap-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-contrast">
        <Zap className="size-5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[15px] font-semibold text-text">Quick join</span>
        <span className="text-[13px] text-text-muted">
          {anyJoinable || mode === "fun" ? (
            COPY[mode].pickRule
          ) : (
            <>
              No open servers right now.{" "}
              <button type="button" onClick={() => navigate("/play/fun")} className="text-text underline-offset-4 hover:underline">
                Try Fun Mode
              </button>
            </>
          )}
        </span>
      </div>
      <Button size="lg" disabled={!anyJoinable || busy} onClick={() => void play()} className="sm:w-auto">
        <Play className="size-3.5" aria-hidden />
        {anyJoinable ? "Play now" : "No open servers"}
      </Button>
    </section>
  )
}

function ServerBrowser({ mode }: { mode: PlayMode }) {
  const { servers: allServers, loading, error, refetch } = useLiveServers()
  const [params, setParams] = useSearchParams()
  const [chip, setChip] = useUrlState("map", "all")
  const [serverId, setServerId] = useUrlState("server", "")
  const hideFull = params.get("full") === "hide"
  const favouritesOnly = params.get("fav") === "1"
  const { favourites, toggle } = useFavourites()

  const setFlag = (key: string, value: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )

  const servers = useMemo(() => allServers.filter((server) => server.mode === mode), [allServers, mode])

  const chips = useMemo(() => {
    const seen = new Map<string, string>()
    for (const server of servers) {
      if (mode === "fun") {
        const key = funModeKey(server)
        if (key) seen.set(key, funModeLabel(key))
      } else {
        const key = normalizeCs2MapKey(server.map)
        if (key) seen.set(key, cs2MapLabel(server.map))
      }
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [servers, mode])

  const visible = useMemo(() => {
    const filtered = servers.filter((server) => {
      if (chip !== "all" && (mode === "fun" ? funModeKey(server) : normalizeCs2MapKey(server.map)) !== chip) return false
      if (hideFull && !isJoinable(server) && server.status !== "offline") return false
      if (favouritesOnly && !favourites.includes(server.id)) return false
      return true
    })
    // Joinable first, then the most players; offline servers last.
    return filtered.sort(
      (a, b) =>
        Number(b.status !== "offline") - Number(a.status !== "offline") ||
        Number(isJoinable(b)) - Number(isJoinable(a)) ||
        b.players - a.players ||
        a.name.localeCompare(b.name),
    )
  }, [servers, chip, mode, hideFull, favouritesOnly, favourites])

  const favouriteMaps = useMemo(
    () => [...new Set(servers.filter((server) => favourites.includes(server.id)).map((server) => server.map))],
    [servers, favourites],
  )
  const online = servers.filter((server) => server.status !== "offline")
  const players = online.reduce((total, server) => total + server.players, 0)
  const selected = serverId ? allServers.find((server) => server.id === serverId) ?? null : null

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            {COPY[mode].title}
            <InlineLoader show={loading && allServers.length > 0} />
          </span>
        }
        subtitle={COPY[mode].description}
        actions={
          <span className="flex items-center gap-2 text-[13px] text-text-muted">
            <span className={cn("size-1.5 rounded-full", players > 0 ? "bg-live" : "bg-text-faint")} aria-hidden />
            <span className="font-medium tabular-nums text-text">{formatInt(players)}</span> players ·{" "}
            <span className="font-medium tabular-nums text-text">{formatInt(online.length)}</span> servers
          </span>
        }
      />

      <QuickJoin mode={mode} servers={servers} favouriteMaps={favouriteMaps} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={mode === "fun" ? "Modes" : "Maps"} className="flex flex-wrap gap-1.5">
          <Chip active={chip === "all"} onClick={() => setChip("all")}>
            {mode === "fun" ? "All modes" : "All maps"}
          </Chip>
          {chips.map(([key, label]) => (
            <Chip key={key} active={chip === key} onClick={() => setChip(key)}>
              {label}
            </Chip>
          ))}
        </div>
        <div className="flex gap-1.5">
          <Chip active={hideFull} onClick={() => setFlag("full", hideFull ? null : "hide")}>
            Hide full
          </Chip>
          <Chip active={favouritesOnly} onClick={() => setFlag("fav", favouritesOnly ? null : "1")}>
            Favourites
          </Chip>
        </div>
      </div>

      {loading && allServers.length === 0 && !error ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-3.5" aria-busy="true" aria-label="Loading servers">
          {Array.from({ length: 6 }, (_, index) => (
            <ServerCardSkeleton key={index} mode={mode} />
          ))}
        </div>
      ) : error && allServers.length === 0 ? (
        <ErrorState onRetry={refetch} />
      ) : visible.length === 0 ? (
        <EmptyState>
          {servers.length === 0
            ? "No servers for this mode yet."
            : favouritesOnly && favourites.length === 0
              ? "Star a server to add it to your favourites."
              : "No servers match these filters."}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-3.5">
          {visible.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              mode={mode}
              favourite={favourites.includes(server.id)}
              onFavourite={() => toggle(server.id)}
              onDetails={() => setServerId(server.id)}
            />
          ))}
        </div>
      )}

      <ServerSheet server={selected} onClose={() => setServerId("")} />
    </>
  )
}

function ProLeague() {
  const { user, loading: authLoading } = useAuth()
  const { data, loading, error, refetch } = useApiQuery<CompetitiveAccess>((signal) => competitiveService.getMyAccess({ signal }), {
    enabled: Boolean(user),
    queryKey: user?.id ?? "guest",
  })

  if (!user) {
    if (authLoading) return null
    return <SteamLoginGate pageName="Pro League" description="Sign in with Steam to see your Pro League access." />
  }
  if (data?.proLeagueUnlocked) return <ServerBrowser mode="pro" />
  return (
    <>
      <PageHeader title={COPY.pro.title} subtitle={COPY.pro.description} />
      {loading && !data ? <Skeleton className="h-[330px] w-full rounded-xl" /> : error && !data ? <ErrorState onRetry={refetch} /> : <ProLocked access={data} />}
    </>
  )
}

export function PlayPage({ mode }: { mode: PlayMode }) {
  return <div className="flex flex-col gap-[18px] p-4 sm:p-6">{mode === "pro" ? <ProLeague /> : <ServerBrowser key={mode} mode={mode} />}</div>
}
