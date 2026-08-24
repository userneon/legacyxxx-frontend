import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { Users, Copy, Play as PlayIcon, Lock, Circle, CalendarDays, Trophy, Clock3, Crosshair, Flame, Crown, Map, MapPin, ArrowDown, ArrowUp, ArrowUpDown, Star, RefreshCw, Info } from "lucide-react"

import { cn } from "@/lib/utils"
import { competitiveService, playService, serversService, tournamentsService } from "@/api"
import type { CompetitiveAccess, MatchInfo, PlaySubMode, ServerInfo, TournamentInfo, TournamentMatch } from "@/api/types"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { QueryState } from "@/components/query-state"
import { SteamLoginGate } from "@/components/steam-login-gate"
import { ServerLiveMatchDialog } from "@/components/server-live-match-dialog"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { toast } from "sonner"

interface PlayPageProps {
  mode: PlaySubMode
}

const MODE_CONFIG: Record<PlaySubMode, {
  filter: string
  useCards: boolean
  label: string
  description: string
  icon: typeof Crosshair
  accent: "sky" | "pink" | "white" | "gold"
}> = {
  "5vs5": {
    filter: "5x5",
    useCards: true,
    label: "5x5 MATCHES",
    description: "Competitive matches",
    icon: Crosshair,
    accent: "sky",
  },
  fun: {
    filter: "Fun",
    useCards: true,
    label: "Fun Mode",
    description: "Surf, aim, deathmatch and more",
    icon: Flame,
    accent: "pink",
  },
  proleague: {
    filter: "Pro League",
    useCards: true,
    label: "Pro League",
    description: "Seasonal competitive league",
    icon: Crown,
    accent: "white",
  },
  tournaments: {
    filter: "Tournament",
    useCards: false,
    label: "Tournaments",
    description: "Scheduled prize tournaments",
    icon: Trophy,
    accent: "gold",
  },
}

const MODE_ACCENTS = {
  sky: {
    headerGlow: "from-sky-400/15",
    iconSurface: "border-sky-300/20 bg-sky-300/[0.1]",
    iconColor: "text-sky-200",
    cardKicker: "text-sky-100/75",
  },
  pink: {
    headerGlow: "from-pink-400/15",
    iconSurface: "border-pink-300/20 bg-pink-300/[0.1]",
    iconColor: "text-pink-200",
    cardKicker: "text-pink-100/75",
  },
  white: {
    headerGlow: "from-white/10",
    iconSurface: "border-white/20 bg-white/[0.09]",
    iconColor: "text-white",
    cardKicker: "text-white/70",
  },
  gold: {
    headerGlow: "from-amber-300/10",
    iconSurface: "border-amber-300/15 bg-amber-300/[0.08]",
    iconColor: "text-amber-300",
    cardKicker: "text-amber-200/75",
  },
} as const

type MatchFilter = "all" | "live" | "waiting"
type SortMode = "asc" | "desc"

const MATCH_MAPS = [
  { value: "de_ancient", label: "Ancient" },
  { value: "de_anubis", label: "Anubis" },
  { value: "de_cache", label: "Cache" },
  { value: "de_dust2", label: "Dust II" },
  { value: "de_inferno", label: "Inferno" },
  { value: "de_mirage", label: "Mirage" },
  { value: "de_nuke", label: "Nuke" },
  { value: "de_overpass", label: "Overpass" },
  { value: "de_train", label: "Train" },
  { value: "de_vertigo", label: "Vertigo" },
]

async function copyConnectionAddress(address: string | undefined, subject: string) {
  if (!address) {
    toast.error("Server IP unavailable", { description: `${subject} does not currently expose a connection address.` })
    return
  }

  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable")
    await Promise.race([
      navigator.clipboard.writeText(address),
      new Promise<void>((_, reject) => window.setTimeout(() => reject(new Error("Clipboard timeout")), 800)),
    ])
  } catch {
    const textarea = document.createElement("textarea")
    textarea.value = address
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand("copy")
    textarea.remove()

    if (!copied) {
      toast.error("Copy failed", { description: "Please copy the connection address manually." })
      return
    }
  }

  toast.success("Server IP copied", { description: address })
}

function openSteamConnect(address: string | undefined, subject: string) {
  const safeAddress = address?.trim()
  if (!safeAddress || !/^[a-zA-Z0-9.-]+:\d{1,5}$/.test(safeAddress)) {
    toast.error("Server IP unavailable", { description: `${subject} does not currently expose a valid connection address.` })
    return
  }

  toast.info("Opening Steam…", { description: `Connecting to ${safeAddress}` })
  window.location.assign(`steam://connect/${safeAddress}`)
}

function connectToMatchServer(match: MatchInfo) {
  if (!match.connectAddress) {
    openSteamConnect(undefined, `Match #${match.number}`)
    return
  }

  // Record the join intent without delaying the user's Steam connection flow.
  void playService.joinMatch(match.id).catch(() => undefined)
  openSteamConnect(match.connectAddress, `Match #${match.number}`)
}

function mapLabel(value: string): string {
  return cs2MapLabel(value)
}

function MongoliaFlag({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 overflow-hidden rounded-sm", className)} aria-hidden="true">
      <svg viewBox="0 0 30 20" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <rect width="10" height="20" fill="#DA2032" />
        <rect x="10" width="10" height="20" fill="#0066CC" />
        <rect x="20" width="10" height="20" fill="#DA2032" />
      </svg>
    </span>
  )
}

export function PlayPage({ mode }: PlayPageProps) {
  const config = MODE_CONFIG[mode]
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { data: competitiveAccess, loading: competitiveLoading } = useApiQuery<CompetitiveAccess>((signal) => competitiveService.getMyAccess({ signal }), {
    enabled: mode === "proleague" && isAuthenticated,
    queryKey: mode === "proleague" && isAuthenticated ? "competitive-proleague-access" : "competitive-proleague-access-disabled",
  })

  if (mode === "tournaments") {
    return <TournamentView />
  }

  if (mode === "proleague" && !authLoading && !isAuthenticated) {
    return <SteamLoginGate pageName="Pro League" />
  }
  if (mode === "proleague" && isAuthenticated && competitiveLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Checking competitive access…</div>
  }
  if (mode === "proleague" && isAuthenticated && competitiveAccess && !competitiveAccess.proLeagueUnlocked) {
    return <div className="flex min-h-[320px] items-center justify-center p-6"><div className="glass max-w-md rounded-xl p-6 text-center"><Lock className="mx-auto size-6 text-white/70" /><h1 className="mt-3 font-semibold">Pro League is locked</h1><p className="mt-2 text-sm text-muted-foreground">Reach {competitiveAccess.requiredRankName} (Rank {competitiveAccess.requiredRankId}) through competitive gameplay to unlock this queue.</p></div></div>
  }

  if (config.useCards) {
    return <MatchCardView mode={mode} />
  }

  return <ServerListView mode={config.filter} />
}


function MatchCardView({ mode }: { mode: PlaySubMode }) {
  const [filter, setFilter] = useState<MatchFilter>("all")
  const [mapFilter, setMapFilter] = useState("all")
  const [hideEmpty, setHideEmpty] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sort, setSort] = useState<SortMode>("asc")
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({})
  const [manualRefreshPulse, setManualRefreshPulse] = useState(false)
  const refreshPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: matches, loading, error, refetch } = useApiQuery<MatchInfo[]>((signal) =>
    playService.getMatchesByMode(mode, { signal }),
  )

  useEffect(() => () => {
    if (refreshPulseTimerRef.current) clearTimeout(refreshPulseTimerRef.current)
  }, [])

  const triggerRefresh = () => {
    if (loading || manualRefreshPulse) return

    setManualRefreshPulse(true)
    refetch()

    if (refreshPulseTimerRef.current) clearTimeout(refreshPulseTimerRef.current)
    refreshPulseTimerRef.current = setTimeout(() => {
      setManualRefreshPulse(false)
      refreshPulseTimerRef.current = null
    }, 520)
  }

  const allMatches = (matches ?? []).map((match) => ({
    ...match,
    favorite: favoriteOverrides[match.id] ?? match.favorite,
  }))

  const toggleFavorite = (matchId: string) => {
    setFavoriteOverrides((current) => ({
      ...current,
      [matchId]: !(current[matchId] ?? allMatches.find((match) => match.id === matchId)?.favorite ?? false),
    }))
  }

  const filtered = allMatches
    .filter((m) => {
      if (filter === "live" && m.status !== "live") return false
      if (filter === "waiting" && m.status !== "waiting") return false
      if (mapFilter !== "all" && m.map !== mapFilter) return false
      if (hideEmpty && m.players === 0) return false
      if (favoritesOnly && !m.favorite) return false
      return true
    })
    .sort((a, b) => {
      const playerDifference = sort === "asc" ? a.players - b.players : b.players - a.players
      return playerDifference || (sort === "asc" ? a.number - b.number : b.number - a.number)
    })

  const liveCount = allMatches.filter((m) => m.status === "live").length
  const waitingCount = allMatches.filter((m) => m.status === "waiting").length
  const resultMotionKey = `${filter}:${mapFilter}:${hideEmpty}:${favoritesOnly}:${sort}:${filtered.map((match) => match.id).join("|")}`

  const modeConfig = MODE_CONFIG[mode]

  return (
    <div className="flex flex-col gap-5 p-6">
      <ModeHeader config={modeConfig} />

      <MatchToolbar
        mode={mode}
        mapFilter={mapFilter}
        hideEmpty={hideEmpty}
        favoritesOnly={favoritesOnly}
        sort={sort}
        onMapChange={setMapFilter}
        onHideEmptyChange={setHideEmpty}
        onFavoritesOnlyChange={setFavoritesOnly}
        onSortChange={setSort}
        isRefreshing={manualRefreshPulse || (loading && matches !== null)}
        onRefresh={triggerRefresh}
      />

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <FilterTab active={filter === "all"} onClick={() => setFilter("all")} label="All" count={allMatches.length} />
        <FilterTab active={filter === "live"} onClick={() => setFilter("live")} label="LIVE" count={liveCount} accent />
        <FilterTab active={filter === "waiting"} onClick={() => setFilter("waiting")} label="Waiting" count={waitingCount} />
      </div>

      <QueryState
        loading={loading}
        error={error}
        empty={!loading && !error && filtered.length === 0}
        emptyMessage="No matches available right now."
        onRetry={refetch}
      />

      {/* Match content */}
      {!loading && !error && filtered.length > 0 && (
        <div key={resultMotionKey} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {filtered.map((match, index) => (
            <div key={match.id} className="play-filter-result" style={filterMotionStyle(index)}>
              <MatchCard match={match} mode={mode} onToggleFavorite={toggleFavorite} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function filterMotionStyle(index: number): CSSProperties {
  return { "--filter-delay": `${Math.min(index, 11) * 32}ms` } as CSSProperties
}

const triggerClass =
  "h-9 w-[130px] gap-2 rounded-lg border-border/50 bg-secondary/45 text-xs text-foreground hover:bg-secondary/70 focus-visible:ring-1 focus-visible:ring-ring"

function MatchToolbar({
  mode,
  mapFilter,
  hideEmpty,
  favoritesOnly,
  sort,
  onMapChange,
  onHideEmptyChange,
  onFavoritesOnlyChange,
  onSortChange,
  isRefreshing,
  onRefresh,
}: {
  mode: PlaySubMode
  mapFilter: string
  hideEmpty: boolean
  favoritesOnly: boolean
  sort: SortMode
  onMapChange: (value: string) => void
  onHideEmptyChange: (value: boolean) => void
  onFavoritesOnlyChange: (value: boolean) => void
  onSortChange: (value: SortMode) => void
  isRefreshing: boolean
  onRefresh: () => void
}) {
  const mapsDisabled = mode === "fun"

  return (
    <div className="glass flex flex-wrap items-center gap-2 rounded-xl p-2">
      {/* Maps */}
      <Select
        value={mapsDisabled ? "" : mapFilter}
        onValueChange={onMapChange}
        disabled={mapsDisabled}
      >
        <SelectTrigger className={triggerClass} aria-label="Maps">
          <Map className="size-3.5 text-muted-foreground" />
          <SelectValue placeholder="Maps" />
        </SelectTrigger>
        <SelectContent className="play-dropdown-content" position="popper" align="start">
          <SelectItem value="all">All maps</SelectItem>
          {MATCH_MAPS.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Location — Mongolia only */}
      <Select defaultValue="mongolia" aria-label="Location">
        <SelectTrigger className={cn(triggerClass, "w-[150px]")}>
          <MapPin className="size-3.5 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="play-dropdown-content" position="popper" align="start">
          <SelectItem value="mongolia">
            <MongoliaFlag className="size-4" />
            Mongolia
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Hide empty */}
      <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-secondary/45 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary/70">
        <Checkbox checked={hideEmpty} onCheckedChange={(checked) => onHideEmptyChange(checked === true)} />
        Hide empty
      </label>

      {/* Favourites only */}
      <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-secondary/45 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary/70">
        <Checkbox checked={favoritesOnly} onCheckedChange={(checked) => onFavoritesOnlyChange(checked === true)} />
        Show favourites only
      </label>

      {/* Sorting — ascending / descending */}
      <Select value={sort} onValueChange={(v) => onSortChange(v as SortMode)}>
        <SelectTrigger
          className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-lg border-border/50 bg-secondary/45 p-0 text-muted-foreground hover:bg-secondary/70 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
          hideIndicator
          aria-label={sort === "asc" ? "Sort players: fewest first" : "Sort players: most first"}
          title={sort === "asc" ? "Sort players: fewest first" : "Sort players: most first"}
        >
          <ArrowUpDown className="size-3.5" />
        </SelectTrigger>
        <SelectContent className="play-dropdown-content" position="popper" align="end">
          <SelectItem value="asc">
            <ArrowUp className="size-3.5" />
            Fewest players
          </SelectItem>
          <SelectItem value="desc">
            <ArrowDown className="size-3.5" />
            Most players
          </SelectItem>
        </SelectContent>
      </Select>

      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Refresh server matches"
        title="Refresh server matches"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-secondary/45 text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground disabled:cursor-wait disabled:opacity-55 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
      </button>
    </div>
  )
}

function ModeHeader({
  config,
}: {
  config: (typeof MODE_CONFIG)[PlaySubMode]
}) {
  const Icon = config.icon
  const accent = MODE_ACCENTS[config.accent]

  return (
    <section className="glass shiny-slow relative overflow-hidden rounded-xl p-6">
      <div className={cn("pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l to-transparent", accent.headerGlow)} />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span className="flex size-2 rounded-full bg-chart-2 animate-pulse" />
            Live Now
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("flex size-11 items-center justify-center rounded-xl border", accent.iconSurface)}>
              <Icon className={cn("size-5", accent.iconColor)} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{config.label}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FilterTab({ active, onClick, label, count, accent }: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
        active
          ? "bg-secondary text-foreground"
          : "text-foreground/70 hover:text-foreground hover:bg-secondary/50"
      )}
    >
      {accent && <Circle className={cn("size-2", active ? "fill-chart-2 text-chart-2 animate-pulse" : "fill-chart-2/40 text-chart-2/40")} />}
      {label}
      <span className={cn(
        "tabular-nums text-[10px] rounded px-1 py-0.5",
        active ? "bg-muted text-muted-foreground" : "text-foreground/50"
      )}>
        {count}
      </span>
    </button>
  )
}

function MatchCard({ match, mode, onToggleFavorite }: { match: MatchInfo; mode: PlaySubMode; onToggleFavorite: (matchId: string) => void }) {
  const isLive = match.status === "live"
  const isLocked = match.status === "locked"
  const isFinished = match.status === "finished"
  const isWaiting = match.status === "waiting"

  const canDirectConnect = Boolean(match.connectAddress) && !isLocked
  const mapBackground = cs2MapArtwork(match.map)
  const accent = MODE_ACCENTS[MODE_CONFIG[mode].accent]

  const statusTone = isLive ? "border-emerald-300/35 bg-emerald-300/12 text-emerald-100" : isWaiting ? "border-white/15 bg-black/25 text-white/65" : "border-white/10 bg-black/25 text-white/45"
  const statusLabel = isLive ? "Live" : isWaiting ? "Warming" : "Locked"
  const showStatus = !isFinished

  return (
    <article
      className={cn(
        "group relative isolate min-h-44 overflow-hidden rounded-xl border border-white/[0.08] bg-[#181818] transition-all duration-300",
        isLocked && "cursor-not-allowed opacity-55",
        !isLocked && "hover:-translate-y-0.5 hover:bg-[#1d1d1d] hover:shadow-lg hover:shadow-black/20"
      )}
    >
      {mapBackground && <img src={mapBackground} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-35 transition-transform duration-700 group-hover:scale-105" />}
      {mapBackground && <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/35 via-[#181818]/75 to-[#181818]" />}
      <div className="relative z-10 flex h-full min-h-44 flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><div className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", accent.cardKicker)}>{MODE_CONFIG[mode].filter}</div><h3 className="mt-1 text-sm font-semibold text-white/90">Match #{match.number}</h3></div>
          <div className="flex items-center gap-1.5"><button type="button" aria-label={match.favorite ? `Remove Match #${match.number} from favourites` : `Add Match #${match.number} to favourites`} aria-pressed={match.favorite} onClick={() => onToggleFavorite(match.id)} className={cn("inline-flex size-7 items-center justify-center rounded-md border border-white/10 bg-black/20 transition-colors hover:border-white/25 hover:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40", match.favorite ? "text-white" : "text-white/40 hover:text-white/75")} title={match.favorite ? "Remove favourite" : "Add favourite"}><Star className={cn("size-3.5", match.favorite && "fill-current")} /></button>{showStatus && <span className={cn("shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", statusTone)}>{isLocked ? <Lock className="mr-1 inline size-2.5" /> : null}{statusLabel}</span>}</div>
        </div>
        {(isLive || isFinished) && <div className="my-auto flex items-center justify-center gap-2"><span className="text-2xl font-black tabular-nums text-white/90">{match.scoreT}</span><span className="text-xs font-bold text-white/25">:</span><span className="text-2xl font-black tabular-nums text-white/65">{match.scoreCT}</span></div>}
        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="min-w-0"><div className="font-mono text-xs font-medium text-white/65">{match.map}</div><div className="mt-1 flex items-center gap-1.5 text-xs text-white/45 tabular-nums"><Users className="size-3" />{match.players}/{match.maxPlayers} players</div></div>
          <div className="flex shrink-0 items-center gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <button type="button" disabled={!match.connectAddress} onClick={() => void copyConnectionAddress(match.connectAddress, `Match #${match.number}`)} className="inline-flex size-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-white/65 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label={`Copy Match #${match.number} server IP`} title={match.connectAddress ? `Copy ${match.connectAddress}` : "Server IP unavailable"}><Copy className="size-3.5" /></button>
            <button type="button" disabled={!canDirectConnect} onClick={() => connectToMatchServer(match)} className="inline-flex size-8 items-center justify-center rounded-md border border-emerald-300/35 bg-emerald-300/18 text-emerald-50 transition-colors hover:border-emerald-200/65 hover:bg-emerald-300/30 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60" aria-label={`Play Match #${match.number} in Steam`} title={canDirectConnect ? `Connect through Steam to ${match.connectAddress}` : "Steam connection unavailable"}><PlayIcon className="size-3.5 fill-current" /></button>
          </div>
        </div>
      </div>
    </article>
  )
}

function TournamentView() {
  const { data: matches, loading, error, refetch } = useApiQuery<TournamentMatch[]>((signal) =>
    tournamentsService.getMatches(undefined, { signal }),
  )
  const { data: info } = useApiQuery<TournamentInfo>((signal) =>
    tournamentsService.getInfo({ signal }),
  )

  const all = matches ?? []
  const upcoming = all.filter((match) => match.status === "upcoming")
  const live = all.filter((match) => match.status === "live")
  const completed = all.filter((match) => match.status === "completed")

  return (
    <div className="flex flex-col gap-5 p-6">
      <QueryState
        loading={loading}
        error={error}
        empty={false}
        onRetry={refetch}
      />

      {!loading && !error && all.length === 0 && (
        <div className="flex min-h-[calc(100dvh-7rem)] items-center justify-center">
          <div className="w-fit rounded-lg border border-white/[0.1] bg-white/[0.035] px-4 py-2 text-sm font-semibold text-white/78">
            Nothing is here!
          </div>
        </div>
      )}

      {!loading && !error && all.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <TournamentStat icon={CalendarDays} label="Next match" value={info?.nextMatchTime ?? upcoming[0]?.time ?? "TBD"} />
            <TournamentStat icon={Users} label="Registered clans" value={`${info?.registeredClans ?? all.length} clans`} />
            <TournamentStat icon={Trophy} label="Prize pool" value={info?.prizePool ?? "—"} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.05fr_1.4fr]">
            <section className="glass rounded-xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Match schedule</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Live and upcoming tournament rounds</p>
                </div>
                <span className="rounded-md border border-white/[0.12] bg-white/[0.05] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/70">{info?.season ?? "Season"}</span>
              </div>
              <div className="flex flex-col gap-2">
                {[...live, ...upcoming, ...completed].map((match) => <TournamentRow key={match.id} match={match} />)}
              </div>
            </section>

            <section className="glass rounded-xl p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Playoff bracket</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Follow every round through to the final</p>
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{info?.format ?? "Best of 3"}</span>
              </div>
              <TournamentBracket matches={all} />
            </section>
          </div>
        </>
      )}
    </div>
  )
}

function TournamentStat({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <Icon className="size-4 text-muted-foreground" />
      <div className="mt-2 text-sm font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function TournamentRow({ match }: { match: TournamentMatch }) {
  const live = match.status === "live"
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/45 px-3 py-3 transition-colors hover:bg-secondary/70">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", live ? "bg-chart-2/15 text-chart-2" : "bg-secondary text-muted-foreground")}>
          {live ? <Circle className="size-2.5 fill-current animate-pulse" /> : <Clock3 className="size-3.5" />}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium leading-5">{match.teamA} <span className="text-muted-foreground">vs</span> {match.teamB}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{match.round} · {match.map}</div>
        </div>
      </div>
      <div className="ml-3 shrink-0 text-right">
        <div className="text-xs font-semibold tabular-nums">{match.score ?? match.time}</div>
        <div className={cn("mt-0.5 text-[10px] uppercase", live ? "text-chart-2" : "text-muted-foreground")}>{live ? "Live" : match.status}</div>
      </div>
    </div>
  )
}

function TournamentBracket({ matches }: { matches: TournamentMatch[] }) {
  const quarterfinals = matches.slice(0, 4)
  const semifinals = matches.slice(4, 6)
  const final = matches.slice(6, 7)

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[660px] grid-cols-[minmax(150px,1fr)_32px_minmax(150px,1fr)_32px_minmax(150px,1fr)] items-stretch">
        <BracketRound title="Quarterfinals" matches={quarterfinals} slots={4} />
        <BracketConnectors count={2} />
        <BracketRound title="Semifinals" matches={semifinals} slots={2} centered />
        <BracketConnectors count={1} finalRound />
        <BracketRound title="Final" matches={final} slots={1} centered finalRound />
      </div>
    </div>
  )
}

function BracketRound({ title, matches, slots, centered = false, finalRound = false }: { title: string; matches: TournamentMatch[]; slots: number; centered?: boolean; finalRound?: boolean }) {
  const entries = Array.from({ length: slots }, (_, index) => matches[index])

  return (
    <div className="flex min-w-0 flex-col">
      <div className={cn("mb-3 flex items-center gap-2", finalRound && "text-amber-300")}>
        <span className={cn("h-px flex-1 bg-white/[0.08]", finalRound && "bg-amber-300/30")} />
        <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{title}</span>
        <span className={cn("h-px flex-1 bg-white/[0.08]", finalRound && "bg-amber-300/30")} />
      </div>
      <div className={cn("flex min-h-[268px] flex-1 flex-col justify-around gap-4", centered && "justify-center")}>
        {entries.map((match, index) => match ? <BracketMatch key={match.id} match={match} finalRound={finalRound} /> : <BracketEmpty key={`${title}-${index}`} />)}
      </div>
    </div>
  )
}

function BracketMatch({ match, finalRound = false }: { match: TournamentMatch; finalRound?: boolean }) {
  const [teamAScore, teamBScore] = match.score?.split("-") ?? ["-", "-"]
  const live = match.status === "live"

  return (
    <div className={cn("rounded-lg border bg-black/20 p-3", finalRound ? "border-amber-300/30" : "border-white/[0.1]")}>
      <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wide text-white/45">
        <span className="truncate">{match.round}</span>
        <span className={cn("shrink-0", live && "text-emerald-300")}>{live ? "Live" : match.map}</span>
      </div>
      <BracketTeam name={match.teamA} score={teamAScore} />
      <div className="my-2 h-px bg-white/[0.08]" />
      <BracketTeam name={match.teamB} score={teamBScore} />
    </div>
  )
}

function BracketTeam({ name, score }: { name: string; score: string }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="truncate font-semibold text-white/88">{name}</span><span className="shrink-0 tabular-nums text-white/55">{score}</span></div>
}

function BracketEmpty() {
  return <div className="rounded-lg border border-dashed border-white/[0.08] bg-white/[0.015] px-3 py-5 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-white/25">Awaiting match</div>
}

function BracketConnectors({ count, finalRound = false }: { count: number; finalRound?: boolean }) {
  return (
    <div className="flex min-h-[292px] flex-col justify-around px-2 pt-8">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="relative h-16">
          <span className={cn("absolute inset-y-0 right-1/2 border-r border-white/[0.14]", finalRound && "border-amber-300/35")} />
          <span className={cn("absolute left-0 right-1/2 top-1/2 border-t border-white/[0.14]", finalRound && "border-amber-300/35")} />
          <span className={cn("absolute left-1/2 right-0 top-1/2 border-t border-white/[0.14]", finalRound && "border-amber-300/35")} />
        </div>
      ))}
    </div>
  )
}

function ServerListView({ mode }: { mode: string }) {
  const { data: servers, loading, error, refetch } = useApiQuery<ServerInfo[]>((signal) =>
    serversService.getServers({ mode }, { signal }),
  )

  const list = servers ?? []

  return (
    <div className="flex flex-col gap-6 p-6">
      <QueryState
        loading={loading}
        error={error}
        empty={!loading && !error && list.length === 0}
        emptyMessage="No servers available in this mode right now."
        onRetry={refetch}
      />

      {!loading && !error && list.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {list.map((server) => <ServerCard key={server.id} server={server} />)}
        </div>
      )}
    </div>
  )
}

function ServerCard({ server }: { server: ServerInfo }) {
  const [matchOpen, setMatchOpen] = useState(false)
  const isFull = server.status === "full"
  const isOffline = server.status === "offline"
  const canConnect = Boolean(server.connectAddress) && !isOffline
  const mapBackground = cs2MapArtwork(server.map)
  const statusTone = isOffline ? "border-white/10 bg-black/25 text-white/45" : isFull ? "border-red-300/35 bg-red-300/12 text-red-100" : "border-emerald-300/35 bg-emerald-300/12 text-emerald-100"

  const handleConnect = () => {
    void serversService.joinServer(server.id).catch(() => undefined)
    openSteamConnect(server.connectAddress, server.name)
  }

  return (
    <article className={cn("group relative isolate min-h-44 overflow-hidden rounded-xl border border-white/[0.08] bg-[#181818] transition-all duration-300", isOffline ? "opacity-60" : "hover:-translate-y-0.5 hover:bg-[#1d1d1d] hover:shadow-lg hover:shadow-black/20")}>
      {mapBackground && <img src={mapBackground} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-35 transition-transform duration-700 group-hover:scale-105" />}
      {mapBackground && <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/35 via-[#181818]/75 to-[#181818]" />}
      <div className="relative z-10 flex h-full min-h-44 flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{server.mode}</div><h3 className="mt-1 truncate text-sm font-semibold text-white/90">{server.name}</h3></div><span className={cn("shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", statusTone)}>{isOffline ? "Offline" : isFull ? "Full" : "Live"}</span></div>
        <div className="mt-auto flex items-end justify-between gap-3"><div className="min-w-0"><div className="font-mono text-xs font-medium text-white/65">{mapLabel(server.map)}</div><div className="mt-1 flex items-center gap-1.5 text-xs text-white/45 tabular-nums"><Users className="size-3" />{server.players}/{server.maxPlayers} players</div></div><div className="flex shrink-0 items-center gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"><button type="button" onClick={() => setMatchOpen(true)} className="inline-flex size-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-white/65 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label={`View ${server.name} live match information`} title="Live server information"><Info className="size-3.5" /></button><button type="button" disabled={!server.connectAddress} onClick={() => void copyConnectionAddress(server.connectAddress, server.name)} className="inline-flex size-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-white/65 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label={`Copy ${server.name} server IP`} title={server.connectAddress ? `Copy ${server.connectAddress}` : "Server IP unavailable"}><Copy className="size-3.5" /></button><button type="button" disabled={!canConnect} onClick={handleConnect} className="inline-flex size-8 items-center justify-center rounded-md border border-emerald-300/35 bg-emerald-300/18 text-emerald-50 transition-colors hover:border-emerald-200/65 hover:bg-emerald-300/30 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60" aria-label={`Play ${server.name} in Steam`} title={canConnect ? `Connect through Steam to ${server.connectAddress}` : "Steam connection unavailable"}><PlayIcon className="size-3.5 fill-current" /></button></div></div>
      </div>
      <ServerLiveMatchDialog server={server} open={matchOpen} onOpenChange={setMatchOpen} />
    </article>
  )
}
