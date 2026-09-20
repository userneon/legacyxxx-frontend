import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react"
import type { ComponentProps, CSSProperties } from "react"
import { Users, Copy, Play as PlayIcon, Lock, Circle, CalendarDays, Trophy, Clock3, Crosshair, Flame, Crown, Map, MapPin, ArrowDown, ArrowUp, ArrowUpDown, Star, RefreshCw, Loader2, FilterX } from "lucide-react"

import { cn } from "@/lib/utils"
import { competitiveService, playService, serversService, tournamentsService } from "@/api"
import type { CompetitiveAccess, MatchInfo, PlaySubMode, ServerInfo, TournamentInfo, TournamentMatch } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { QueryState } from "@/components/query-state"
import { AnimatedNumber } from "@/components/animated-number"
import { SteamLoginGate } from "@/components/steam-login-gate"
import { ServerLiveMatchDialog } from "@/components/server-live-match-dialog"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { isFeatureEnabled } from "@/lib/features"
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


/** sessionStorage is cleared when the browser session ends, which is the lifetime guests' favourites should have. */
const GUEST_FAVORITES_KEY = "legacyx_guest_favorite_matches"

function readGuestFavorites(): Record<string, true> {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(GUEST_FAVORITES_KEY) ?? "{}")
    return stored && typeof stored === "object" ? (stored as Record<string, true>) : {}
  } catch {
    return {}
  }
}

function writeGuestFavorites(favorites: Record<string, true>) {
  try {
    sessionStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(favorites))
  } catch {
    /* Storage may be unavailable (private mode); favourites then last until reload. */
  }
}

/** Loose match between a play mode ("5x5") and the free-form mode a plugin reports ("5v5 Competitive"). */
function normalizeMode(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

type PlayEntry =
  | { kind: "match"; id: string; match: MatchInfo; server: ServerInfo | null; map: string; players: number; status: string; favorite: boolean; order: number }
  | { kind: "server"; id: string; server: ServerInfo; map: string; players: number; status: string; favorite: boolean; order: number }

/**
 * One card list for the grid: every match, plus the live servers that do not already back one of
 * those matches. A match linked to a live server (same connect address) carries that server so the
 * card can open its roster.
 */
function playEntries(matches: MatchInfo[], servers: ServerInfo[], mode: PlaySubMode): PlayEntry[] {
  if (!isFeatureEnabled("roster")) {
    return matches.map<PlayEntry>((match) => ({ kind: "match", id: `match:${match.id}`, match, server: null, map: match.map, players: match.players, status: match.status, favorite: match.favorite, order: match.number }))
  }

  const wanted = normalizeMode(MODE_CONFIG[mode].filter)
  const modeMatched = servers.filter((server) => {
    const reported = normalizeMode(server.mode)
    return Boolean(reported) && (reported.includes(wanted) || wanted.includes(reported))
  })
  // Plugins report free-form mode names and the API does not filter by mode, so rather than hide
  // every server when none of the names line up, fall back to the full list.
  const modeServers = modeMatched.length > 0 ? modeMatched : servers

  // `Map` is the lucide icon in this module, so keep the address index as a plain record.
  const byAddress: Record<string, ServerInfo> = {}
  for (const server of modeServers) if (server.connectAddress) byAddress[server.connectAddress] = server

  const linked = new Set<string>()
  const matchEntries = matches.map<PlayEntry>((match) => {
    const server = (match.connectAddress ? byAddress[match.connectAddress] : undefined) ?? null
    if (server) linked.add(server.id)
    return { kind: "match", id: `match:${match.id}`, match, server, map: match.map, players: match.players, status: match.status, favorite: match.favorite, order: match.number }
  })

  const serverEntries = modeServers
    .filter((server) => !linked.has(server.id))
    .map<PlayEntry>((server, index) => ({
      kind: "server",
      id: `server:${server.id}`,
      server,
      map: server.map,
      players: server.players,
      status: server.status === "offline" ? "locked" : server.players > 0 ? "live" : "waiting",
      favorite: false,
      order: 1_000 + index,
    }))

  return [...matchEntries, ...serverEntries]
}

function MatchCardView({ mode }: { mode: PlaySubMode }) {
  const [filter, setFilter] = useState<MatchFilter>("all")
  const [mapFilter, setMapFilter] = useState("all")
  const [hideEmpty, setHideEmpty] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sort, setSort] = useState<SortMode>("asc")
  const { isAuthenticated } = useAuth()
  // Signed-in favourites are saved to the API (optimistic overrides); guest favourites live in this browser session only.
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({})
  const [guestFavorites, setGuestFavorites] = useState<Record<string, true>>(readGuestFavorites)
  const [manualRefreshPulse, setManualRefreshPulse] = useState(false)
  const refreshPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: matches, loading, error, refetch } = useApiQuery<MatchInfo[]>((signal) =>
    playService.getMatchesByMode(mode, { signal }),
  )
  // Live servers share the same grid: a server that backs a listed match only adds its roster to that
  // card, and a server without a match of its own becomes an ordinary card next to them.
  const { data: servers, refetch: refetchServers } = useApiQuery<ServerInfo[]>((signal) =>
    serversService.getServers(undefined, { signal }),
  { enabled: isFeatureEnabled("roster"), queryKey: "play-live-servers" })

  useEffect(() => () => {
    if (refreshPulseTimerRef.current) clearTimeout(refreshPulseTimerRef.current)
  }, [])

  const triggerRefresh = () => {
    if (loading || manualRefreshPulse) return

    setManualRefreshPulse(true)
    refetch()
    refetchServers()

    if (refreshPulseTimerRef.current) clearTimeout(refreshPulseTimerRef.current)
    refreshPulseTimerRef.current = setTimeout(() => {
      setManualRefreshPulse(false)
      refreshPulseTimerRef.current = null
    }, 520)
  }

  const allMatches = (matches ?? []).map((match) => ({
    ...match,
    favorite: isAuthenticated ? favoriteOverrides[match.id] ?? match.favorite : Boolean(guestFavorites[match.id]),
  }))

  const toggleFavorite = (matchId: string) => {
    const current = allMatches.find((match) => match.id === matchId)?.favorite ?? false
    const next = !current

    if (!isAuthenticated) {
      setGuestFavorites((previous) => {
        const updated = { ...previous }
        if (next) updated[matchId] = true
        else delete updated[matchId]
        writeGuestFavorites(updated)
        return updated
      })
      return
    }

    setFavoriteOverrides((overrides) => ({ ...overrides, [matchId]: next }))
    playService.toggleFavorite(matchId, next).catch(() => {
      setFavoriteOverrides((overrides) => ({ ...overrides, [matchId]: current }))
      toast.error("Could not update favourite", { description: "Please try again." })
    })
  }

  const entries = playEntries(allMatches, servers ?? [], mode)

  const filtered = entries
    .filter((entry) => {
      if (filter === "live" && entry.status !== "live") return false
      if (filter === "waiting" && entry.status !== "waiting") return false
      if (mapFilter !== "all" && entry.map !== mapFilter) return false
      if (hideEmpty && entry.players === 0) return false
      if (favoritesOnly && !entry.favorite) return false
      return true
    })
    .sort((a, b) => {
      const playerDifference = sort === "asc" ? a.players - b.players : b.players - a.players
      return playerDifference || (sort === "asc" ? a.order - b.order : b.order - a.order)
    })

  const liveCount = entries.filter((entry) => entry.status === "live").length
  const waitingCount = entries.filter((entry) => entry.status === "waiting").length
  const resultMotionKey = `${filter}:${mapFilter}:${hideEmpty}:${favoritesOnly}:${sort}:${filtered.map((entry) => entry.id).join("|")}`

  const modeConfig = MODE_CONFIG[mode]

  const filtersActive = filter !== "all" || mapFilter !== "all" || hideEmpty || favoritesOnly
  const clearFilters = () => {
    setFilter("all")
    setMapFilter("all")
    setHideEmpty(false)
    setFavoritesOnly(false)
  }
  const firstLoad = loading && matches === null

  return (
    <div className="@container flex flex-col gap-5 p-4 @2xl:p-6">
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

      <FilterTabs
        value={filter}
        onChange={setFilter}
        items={[
          { id: "all", label: "All", count: entries.length },
          { id: "live", label: "LIVE", count: liveCount, accent: true },
          { id: "waiting", label: "Waiting", count: waitingCount },
        ]}
      />

      {firstLoad ? (
        <div className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <MatchCardSkeleton key={i} />)}
        </div>
      ) : error && matches === null ? (
        <QueryState loading={false} error={error} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        filtersActive && entries.length > 0 ? (
          <div className="query-state-in glass flex flex-col items-center gap-3 rounded-xl p-10 text-center">
            <FilterX className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No matches fit these filters.</p>
            <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
          </div>
        ) : (
          <QueryState loading={false} error={null} empty emptyMessage="No matches or live servers are available right now." />
        )
      ) : (
        <div key={resultMotionKey} className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4">
          {filtered.map((entry, index) => (
            <div key={entry.id} className="play-filter-result" style={filterMotionStyle(index)}>
              {entry.kind === "match"
                ? <MatchCard match={entry.match} server={entry.server} mode={mode} onToggleFavorite={toggleFavorite} />
                : <ServerCard server={entry.server} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Segmented filter with a highlight that slides to the active tab; counts bump when they change. */
function FilterTabs({ value, onChange, items }: {
  value: MatchFilter
  onChange: (value: MatchFilter) => void
  items: { id: MatchFilter; label: string; count: number; accent?: boolean }[]
}) {
  const buttons = useRef<Partial<Record<MatchFilter, HTMLButtonElement | null>>>({})
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)
  const countsKey = items.map((item) => item.count).join(",")

  useLayoutEffect(() => {
    const active = buttons.current[value]
    if (active) setIndicator({ left: active.offsetLeft, width: active.offsetWidth })
  }, [value, countsKey])

  return (
    <div className="relative inline-flex w-fit items-center gap-1 rounded-xl bg-secondary/30 p-1" role="tablist">
      {indicator && <span className="filter-tab-indicator absolute inset-y-1 rounded-lg bg-secondary shadow-sm" style={{ left: indicator.left, width: indicator.width }} aria-hidden="true" />}
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            ref={(node) => { buttons.current[item.id] = node }}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative z-10 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200",
              active ? "text-foreground" : "text-foreground/60 hover:text-foreground"
            )}
          >
            {item.accent && <Circle className={cn("size-2", active ? "fill-chart-2 text-chart-2 animate-pulse" : "fill-chart-2/40 text-chart-2/40")} />}
            {item.label}
            <span key={item.count} className={cn("count-bump rounded px-1 py-0.5 text-[10px] tabular-nums", active ? "bg-muted text-muted-foreground" : "text-foreground/50")}>
              {item.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function filterMotionStyle(index: number): CSSProperties {
  return { "--filter-delay": `${Math.min(index, 11) * 32}ms` } as CSSProperties
}

const triggerClass =
  "h-9 w-[130px] gap-2 rounded-lg border-border/50 bg-secondary/45 text-xs text-foreground hover:bg-secondary/70 focus-visible:ring-1 focus-visible:ring-ring"

/** Must match the play-dropdown-close duration in index.css. */
const DROPDOWN_EXIT_MS = 170
const DropdownClosingContext = createContext(false)

// Radix Select unmounts its content the instant it closes, so hold it open while the exit animation plays.
function AnimatedSelect(props: ComponentProps<typeof Select>) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const exitTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(exitTimer.current), [])

  const handleOpenChange = (next: boolean) => {
    window.clearTimeout(exitTimer.current)
    if (next) {
      setClosing(false)
      setOpen(true)
      return
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setClosing(false)
      setOpen(false)
      return
    }
    setClosing(true)
    exitTimer.current = window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, DROPDOWN_EXIT_MS)
  }

  return (
    <DropdownClosingContext.Provider value={closing}>
      <Select {...props} open={open} onOpenChange={handleOpenChange} />
    </DropdownClosingContext.Provider>
  )
}

function AnimatedSelectTrigger({ className, ...props }: ComponentProps<typeof SelectTrigger>) {
  const closing = useContext(DropdownClosingContext)
  return <SelectTrigger {...props} data-closing={closing ? "" : undefined} className={cn("play-dropdown-trigger", className)} />
}

function AnimatedSelectContent({ className, ...props }: ComponentProps<typeof SelectContent>) {
  const closing = useContext(DropdownClosingContext)
  return <SelectContent {...props} data-closing={closing ? "" : undefined} className={cn("play-dropdown-content", className)} />
}

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
      <AnimatedSelect
        value={mapsDisabled ? "" : mapFilter}
        onValueChange={onMapChange}
        disabled={mapsDisabled}
      >
        <AnimatedSelectTrigger className={triggerClass} aria-label="Maps">
          <Map className="size-3.5 text-muted-foreground" />
          <SelectValue placeholder="Maps" />
        </AnimatedSelectTrigger>
        <AnimatedSelectContent position="popper" align="start">
          <SelectItem value="all">All maps</SelectItem>
          {MATCH_MAPS.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </AnimatedSelectContent>
      </AnimatedSelect>

      {/* Location — Mongolia only */}
      <AnimatedSelect defaultValue="mongolia" aria-label="Location">
        <AnimatedSelectTrigger className={cn(triggerClass, "w-[150px]")}>
          <MapPin className="size-3.5 text-muted-foreground" />
          <SelectValue />
        </AnimatedSelectTrigger>
        <AnimatedSelectContent position="popper" align="start">
          <SelectItem value="mongolia">
            <MongoliaFlag className="size-4" />
            Mongolia
          </SelectItem>
        </AnimatedSelectContent>
      </AnimatedSelect>

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
      <AnimatedSelect value={sort} onValueChange={(v) => onSortChange(v as SortMode)}>
        <AnimatedSelectTrigger
          className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-lg border-border/50 bg-secondary/45 p-0 text-muted-foreground hover:bg-secondary/70 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
          hideIndicator
          aria-label={sort === "asc" ? "Sort players: fewest first" : "Sort players: most first"}
          title={sort === "asc" ? "Sort players: fewest first" : "Sort players: most first"}
        >
          <ArrowUpDown className="size-3.5" />
        </AnimatedSelectTrigger>
        <AnimatedSelectContent position="popper" align="end">
          <SelectItem value="asc">
            <ArrowUp className="size-3.5" />
            Fewest players
          </SelectItem>
          <SelectItem value="desc">
            <ArrowDown className="size-3.5" />
            Most players
          </SelectItem>
        </AnimatedSelectContent>
      </AnimatedSelect>

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

const CONNECTING_FEEDBACK_MS = 2200

function MatchCard({ match, server, mode, onToggleFavorite }: { match: MatchInfo; server: ServerInfo | null; mode: PlaySubMode; onToggleFavorite: (matchId: string) => void }) {
  const [rosterOpen, setRosterOpen] = useState(false)
  const isLive = match.status === "live"
  const isLocked = match.status === "locked"
  const isFinished = match.status === "finished"
  const isWaiting = match.status === "waiting"
  const isFull = match.maxPlayers > 0 && match.players >= match.maxPlayers
  const openSlots = Math.max(0, match.maxPlayers - match.players)

  const canDirectConnect = Boolean(match.connectAddress) && !isLocked && !isFinished && !isFull
  const mapBackground = cs2MapArtwork(match.map)
  const accent = MODE_ACCENTS[MODE_CONFIG[mode].accent]
  const [connecting, setConnecting] = useState(false)
  const [favoriteBurst, setFavoriteBurst] = useState(0)
  const connectTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(connectTimer.current), [])

  const status = isLive
    ? { label: "Live", tone: "border-emerald-300/35 bg-emerald-300/12 text-emerald-100" }
    : isLocked
      ? { label: "Locked", tone: "border-white/10 bg-black/35 text-white/55" }
      : isFinished
        ? { label: "Finished", tone: "border-white/10 bg-black/35 text-white/45" }
        : isFull
          ? { label: "Full", tone: "border-amber-300/30 bg-amber-300/10 text-amber-100" }
          : { label: "Waiting", tone: "border-white/15 bg-black/30 text-white/70" }

  const joinLabel = connecting ? "Connecting…" : isLocked ? "Locked" : isFinished ? "Finished" : isFull ? "Full" : !match.connectAddress ? "Unavailable" : "Join"

  const handleJoin = () => {
    if (!canDirectConnect || connecting) return
    setConnecting(true)
    connectToMatchServer(match)
    window.clearTimeout(connectTimer.current)
    connectTimer.current = window.setTimeout(() => setConnecting(false), CONNECTING_FEEDBACK_MS)
  }

  const handleFavorite = () => {
    if (!match.favorite) setFavoriteBurst((count) => count + 1)
    onToggleFavorite(match.id)
  }

  return (
    <article
      className={cn(
        "match-card group relative isolate flex h-full min-h-56 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161616]",
        isLive && "match-card-live",
        isLocked || isFinished ? "opacity-60" : "hover:-translate-y-1 hover:border-white/20 hover:shadow-xl hover:shadow-black/40"
      )}
    >
      {mapBackground && <img src={mapBackground} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.style.display = "none" }} className="match-card-bg pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-40 group-hover:scale-110 group-hover:opacity-55" />}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-[#161616]/80 to-[#161616]" />
      <div className="match-card-shine pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

      <div className="relative z-10 flex flex-1 flex-col p-4">
        {/* Header: mode · number · status · favourite */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", accent.cardKicker)}>{MODE_CONFIG[mode].filter}</div>
            <h3 className="mt-0.5 text-sm font-semibold text-white/90">Match #{match.number}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[10px] font-bold uppercase tracking-wide", status.tone)}>
              {isLive && <span className="match-live-dot size-1.5 rounded-full bg-emerald-300" />}
              {isLocked && <Lock className="size-2.5" />}
              {status.label}
            </span>
            <button
              type="button"
              aria-label={match.favorite ? `Remove Match #${match.number} from favourites` : `Add Match #${match.number} to favourites`}
              aria-pressed={match.favorite}
              onClick={handleFavorite}
              className={cn(
                "relative inline-flex size-7 items-center justify-center rounded-md border border-white/10 bg-black/25 transition-colors hover:border-white/25 hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                match.favorite ? "text-amber-300" : "text-white/40 hover:text-white/80"
              )}
              title={match.favorite ? "Remove favourite" : "Add favourite"}
            >
              <Star key={favoriteBurst} className={cn("size-3.5", match.favorite && "match-fav-pop fill-current")} />
              {favoriteBurst > 0 && match.favorite && (
                <span key={favoriteBurst} className="star-burst" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, i) => <span key={i} style={{ "--angle": `${i * 60}deg` } as CSSProperties} />)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Centre: live/finished scoreboard, or how many players are still needed */}
        <div className="my-auto py-4">
          {isLive || isFinished ? (
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300/70">T</span>
                <span className="text-3xl font-black tabular-nums text-amber-100"><AnimatedNumber value={match.scoreT} durationMs={600} /></span>
              </div>
              <span className="pt-3 text-sm font-bold text-white/25">:</span>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-300/70">CT</span>
                <span className="text-3xl font-black tabular-nums text-sky-100"><AnimatedNumber value={match.scoreCT} durationMs={600} /></span>
              </div>
            </div>
          ) : isWaiting && !isFull ? (
            <div className="text-center">
              <div className="text-xs text-white/55">Waiting for players<span className="match-waiting-dots" aria-hidden="true" /></div>
              <div className="mt-1 text-lg font-bold tabular-nums text-white/90">{openSlots} slot{openSlots === 1 ? "" : "s"} open</div>
            </div>
          ) : null}
        </div>

        {/* Footer: map, player slots, actions */}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-white">{cs2MapLabel(match.map)}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs tabular-nums text-white/55">
              <Users className="size-3" />
              {match.players}/{match.maxPlayers}
            </div>
          </div>
        </div>

        <PlayerSlots players={match.players} maxPlayers={match.maxPlayers} full={isFull} />

        <div className="mt-3 flex items-center gap-2">
          {isFeatureEnabled("roster") && server && (
            <button
              type="button"
              onClick={() => setRosterOpen(true)}
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] text-sm font-semibold text-white/85 transition-colors hover:border-white/25 hover:bg-white/[0.12] hover:text-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label={`View the roster on Match #${match.number}`}
              title="Who is playing right now"
            >
              <Users className="size-3.5" />
              Roster
            </button>
          )}
          <button
            type="button"
            disabled={!canDirectConnect && !connecting}
            onClick={handleJoin}
            className={cn(
              "match-join-button relative inline-flex h-9 flex-1 items-center justify-center gap-2 overflow-hidden rounded-lg border text-sm font-semibold active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60",
              canDirectConnect || connecting
                ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-50 hover:border-emerald-200/70 hover:bg-emerald-400/35"
                : "cursor-not-allowed border-white/10 bg-white/[0.04] text-white/40"
            )}
            aria-label={`Join Match #${match.number} in Steam`}
            title={canDirectConnect ? `Connect through Steam to ${match.connectAddress}` : joinLabel}
          >
            {connecting ? <Loader2 className="size-3.5 animate-spin" /> : isLocked ? <Lock className="size-3.5" /> : <PlayIcon className="size-3.5 fill-current" />}
            {joinLabel}
          </button>
          <button
            type="button"
            disabled={!match.connectAddress}
            onClick={() => void copyConnectionAddress(match.connectAddress, `Match #${match.number}`)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-white/65 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label={`Copy Match #${match.number} server IP`}
            title={match.connectAddress ? `Copy ${match.connectAddress}` : "Server IP unavailable"}
          >
            <Copy className="size-3.5" />
          </button>
        </div>
      </div>

      {isFeatureEnabled("roster") && server && <ServerLiveMatchDialog server={server} open={rosterOpen} onOpenChange={setRosterOpen} />}
    </article>
  )
}

/** One pill per seat (up to 12) so fullness reads at a glance; larger lobbies fall back to a bar. */
function PlayerSlots({ players, maxPlayers, full }: { players: number; maxPlayers: number; full: boolean }) {
  const filledTone = full ? "bg-amber-300" : "bg-emerald-300"
  if (maxPlayers > 0 && maxPlayers <= 12) {
    return (
      <div className="mt-2.5 flex gap-1" aria-hidden="true">
        {Array.from({ length: maxPlayers }, (_, i) => (
          <span
            key={i}
            style={{ "--slot-i": i } as CSSProperties}
            className={cn("match-slot h-1.5 flex-1 rounded-full", i < players ? filledTone : "bg-white/10")}
          />
        ))}
      </div>
    )
  }
  const percent = maxPlayers > 0 ? Math.min(100, (players / maxPlayers) * 100) : 0
  return (
    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
      <div className={cn("h-full rounded-full transition-[width] duration-700", filledTone)} style={{ width: `${percent}%` }} />
    </div>
  )
}

function MatchCardSkeleton() {
  return (
    <div className="flex min-h-56 flex-col rounded-2xl border border-white/[0.06] bg-[#161616] p-4">
      <div className="flex justify-between"><div className="h-8 w-20 animate-pulse rounded bg-white/[0.06]" /><div className="h-6 w-16 animate-pulse rounded bg-white/[0.06]" /></div>
      <div className="mx-auto my-auto h-8 w-24 animate-pulse rounded bg-white/[0.06]" />
      <div className="h-5 w-24 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-2.5 h-1.5 animate-pulse rounded-full bg-white/[0.06]" />
      <div className="mt-3 h-9 animate-pulse rounded-lg bg-white/[0.06]" />
    </div>
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
  const [rosterOpen, setRosterOpen] = useState(false)
  const isFull = server.status === "full"
  const isOffline = server.status === "offline"
  const isEmpty = server.players === 0
  const canConnect = Boolean(server.connectAddress) && !isOffline && !isFull
  const mapBackground = cs2MapArtwork(server.map)

  const status = isOffline
    ? { label: "Offline", tone: "border-white/10 bg-black/35 text-white/50" }
    : isFull
      ? { label: "Full", tone: "border-amber-300/30 bg-amber-300/10 text-amber-100" }
      : { label: "Live", tone: "border-emerald-300/35 bg-emerald-300/12 text-emerald-100" }

  const handleConnect = () => {
    if (!canConnect) return
    void serversService.joinServer(server.id).catch(() => undefined)
    openSteamConnect(server.connectAddress, server.name)
  }

  return (
    <article
      className={cn(
        "match-card group relative isolate flex h-full min-h-52 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161616]",
        isOffline ? "opacity-60" : "hover:-translate-y-1 hover:border-white/20 hover:shadow-xl hover:shadow-black/40",
        !isOffline && !isEmpty && "match-card-live"
      )}
    >
      {mapBackground && <img src={mapBackground} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.style.display = "none" }} className="match-card-bg pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-40 group-hover:scale-110 group-hover:opacity-55" />}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-[#161616]/80 to-[#161616]" />
      <div className="match-card-shine pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

      <div className="relative z-10 flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{server.mode}</div>
            <h3 className="mt-0.5 truncate text-sm font-semibold text-white/90">{server.name}</h3>
          </div>
          <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[10px] font-bold uppercase tracking-wide", status.tone)}>
            {!isOffline && !isEmpty && <span className="match-live-dot size-1.5 rounded-full bg-emerald-300" />}
            {status.label}
          </span>
        </div>

        <div className="my-auto py-4 text-center">
          <div className="text-3xl font-black tabular-nums text-white"><AnimatedNumber value={server.players} durationMs={600} />
            <span className="text-base font-bold text-white/35">/{server.maxPlayers}</span>
          </div>
          <div className="mt-0.5 text-xs text-white/55">{isOffline ? "Server offline" : isEmpty ? "Waiting for players" : "players in game"}</div>
        </div>

        <div className="min-w-0">
          <div className="truncate text-base font-bold text-white">{mapLabel(server.map)}</div>
        </div>
        <PlayerSlots players={server.players} maxPlayers={server.maxPlayers} full={isFull} />

        <div className="mt-3 flex items-center gap-2">
          {isFeatureEnabled("roster") && <button
            type="button"
            onClick={() => setRosterOpen(true)}
            disabled={isOffline}
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] text-sm font-semibold text-white/85 transition-colors hover:border-white/25 hover:bg-white/[0.12] hover:text-white active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label={`View ${server.name} roster and live score`}
          >
            <Users className="size-3.5" />
            Roster
          </button>}
          <button
            type="button"
            disabled={!canConnect}
            onClick={handleConnect}
            className={cn(
              "match-join-button relative inline-flex h-9 flex-1 items-center justify-center gap-2 overflow-hidden rounded-lg border text-sm font-semibold active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60",
              canConnect ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-50 hover:border-emerald-200/70 hover:bg-emerald-400/35" : "cursor-not-allowed border-white/10 bg-white/[0.04] text-white/40"
            )}
            aria-label={`Join ${server.name} in Steam`}
            title={canConnect ? `Connect through Steam to ${server.connectAddress}` : isFull ? "Server is full" : "Steam connection unavailable"}
          >
            <PlayIcon className="size-3.5 fill-current" />
            {isOffline ? "Offline" : isFull ? "Full" : "Join"}
          </button>
          <button
            type="button"
            disabled={!server.connectAddress}
            onClick={() => void copyConnectionAddress(server.connectAddress, server.name)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-white/65 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label={`Copy ${server.name} server IP`}
            title={server.connectAddress ? `Copy ${server.connectAddress}` : "Server IP unavailable"}
          >
            <Copy className="size-3.5" />
          </button>
        </div>
      </div>

      {isFeatureEnabled("roster") && <ServerLiveMatchDialog server={server} open={rosterOpen} onOpenChange={setRosterOpen} />}
    </article>
  )
}
