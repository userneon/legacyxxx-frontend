import { useState } from "react"
import { Users, Copy, Play as PlayIcon, Lock, Circle, CalendarDays, Trophy, Clock3, Crosshair, Flame, Crown, List, Map, MapPin, SlidersHorizontal, ArrowUpNarrowWide, ArrowDownWideNarrow } from "lucide-react"

import { cn } from "@/lib/utils"
import { playService, serversService, tournamentsService } from "@/api"
import type { MatchInfo, PlaySubMode, ServerInfo, TournamentInfo, TournamentMatch } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"

interface PlayPageProps {
  mode: PlaySubMode
}

const MODE_CONFIG: Record<PlaySubMode, {
  filter: string
  useCards: boolean
  label: string
  description: string
  icon: typeof Crosshair
}> = {
  "5vs5": {
    filter: "5vs5",
    useCards: true,
    label: "5vs5 Matches",
    description: "Competitive ranked matches",
    icon: Crosshair,
  },
  fun: {
    filter: "Fun",
    useCards: true,
    label: "Fun Mode",
    description: "Surf, aim, deathmatch and more",
    icon: Flame,
  },
  proleague: {
    filter: "Pro League",
    useCards: true,
    label: "Pro League",
    description: "Seasonal competitive league",
    icon: Crown,
  },
  tournaments: {
    filter: "Tournament",
    useCards: false,
    label: "Tournaments",
    description: "Scheduled prize tournaments",
    icon: Trophy,
  },
}

type MatchFilter = "all" | "live" | "waiting"
type ViewMode = "table" | "block"
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
]

const MAP_COLORS: Record<string, string> = {
  de_ancient: "from-emerald-900/40 to-emerald-950/80",
  de_anubis: "from-yellow-900/40 to-yellow-950/80",
  de_cache: "from-teal-900/40 to-teal-950/80",
  de_dust2: "from-orange-900/40 to-orange-950/80",
  de_inferno: "from-red-900/40 to-red-950/80",
  de_mirage: "from-amber-900/40 to-amber-950/80",
  de_nuke: "from-blue-900/40 to-blue-950/80",
  de_overpass: "from-sky-900/40 to-sky-950/80",
  de_train: "from-stone-900/40 to-stone-950/80",
}

function mapLabel(value: string): string {
  return MATCH_MAPS.find((m) => m.value === value)?.label ?? value.replace("de_", "")
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

  if (mode === "tournaments") {
    return <TournamentView />
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
  const [view, setView] = useState<ViewMode>("block")
  const [sort, setSort] = useState<SortMode>("asc")

  const { data: matches, loading, error, refetch } = useApiQuery<MatchInfo[]>((signal) =>
    playService.getMatchesByMode(mode, { signal }),
  )

  const allMatches = matches ?? []

  const filtered = allMatches
    .filter((m) => {
      if (filter === "live" && m.status !== "live") return false
      if (filter === "waiting" && m.status !== "waiting") return false
      if (mapFilter !== "all" && m.map !== mapFilter) return false
      if (hideEmpty && m.players === 0) return false
      if (favoritesOnly && !m.favorite) return false
      return true
    })
    .sort((a, b) => (sort === "asc" ? a.number - b.number : b.number - a.number))

  const liveCount = allMatches.filter((m) => m.status === "live").length
  const waitingCount = allMatches.filter((m) => m.status === "waiting").length

  const modeConfig = MODE_CONFIG[mode]

  return (
    <div className="flex flex-col gap-5 p-6">
      <ModeHeader config={modeConfig} liveCount={liveCount} waitingCount={waitingCount} />

      <MatchToolbar
        mode={mode}
        mapFilter={mapFilter}
        hideEmpty={hideEmpty}
        favoritesOnly={favoritesOnly}
        view={view}
        sort={sort}
        onMapChange={setMapFilter}
        onHideEmptyChange={setHideEmpty}
        onFavoritesOnlyChange={setFavoritesOnly}
        onViewChange={setView}
        onSortChange={setSort}
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
        <>
          {view === "block" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <MatchTable matches={filtered} />
          )}
        </>
      )}
    </div>
  )
}

const triggerClass =
  "h-9 w-[130px] gap-2 rounded-lg border-border/50 bg-secondary/45 text-xs text-foreground hover:bg-secondary/70 focus-visible:ring-1 focus-visible:ring-ring"

function MatchToolbar({
  mode,
  mapFilter,
  hideEmpty,
  favoritesOnly,
  view,
  sort,
  onMapChange,
  onHideEmptyChange,
  onFavoritesOnlyChange,
  onViewChange,
  onSortChange,
}: {
  mode: PlaySubMode
  mapFilter: string
  hideEmpty: boolean
  favoritesOnly: boolean
  view: ViewMode
  sort: SortMode
  onMapChange: (value: string) => void
  onHideEmptyChange: (value: boolean) => void
  onFavoritesOnlyChange: (value: boolean) => void
  onViewChange: (value: ViewMode) => void
  onSortChange: (value: SortMode) => void
}) {
  const mapsDisabled = mode === "fun"

  return (
    <div className="glass flex flex-wrap items-center gap-2 rounded-xl p-2">
      {/* View: table / block */}
      <Select value={view} onValueChange={(v) => onViewChange(v as ViewMode)}>
        <SelectTrigger className={triggerClass} aria-label="View">
          <List className="size-3.5 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value="table">Table</SelectItem>
          <SelectItem value="block">Block</SelectItem>
        </SelectContent>
      </Select>

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
        <SelectContent position="popper" align="start">
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
        <SelectContent position="popper" align="start">
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
        <SelectTrigger className={cn(triggerClass, "ml-auto w-[140px]")}>
          <SlidersHorizontal className="size-3.5 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="end">
          <SelectItem value="asc">
            <ArrowUpNarrowWide className="size-3.5" />
            Ascending
          </SelectItem>
          <SelectItem value="desc">
            <ArrowDownWideNarrow className="size-3.5" />
            Descending
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function ModeHeader({
  config,
  liveCount,
  waitingCount,
}: {
  config: (typeof MODE_CONFIG)[PlaySubMode]
  liveCount: number
  waitingCount: number
}) {
  const Icon = config.icon

  return (
    <section className="glass shiny-slow relative overflow-hidden rounded-xl p-6">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-primary/10 to-transparent" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span className="flex size-2 rounded-full bg-chart-2 animate-pulse" />
            Live Now
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-secondary">
              <Icon className="size-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{config.label}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-md bg-chart-2/10 px-2 py-1.5 text-chart-2">{liveCount} live</span>
          <span className="rounded-md bg-secondary px-2 py-1.5">{waitingCount} waiting</span>
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

function MatchCard({ match }: { match: MatchInfo }) {
  const isLive = match.status === "live"
  const isLocked = match.status === "locked"
  const isFinished = match.status === "finished"
  const isWaiting = match.status === "waiting"
  const fillPercent = Math.round((match.players / match.maxPlayers) * 100)

  const mapGradient = MAP_COLORS[match.map] || "from-neutral-900/40 to-neutral-950/80"

  const statusColor = isLive
    ? "bg-chart-2"
    : isWaiting
      ? "bg-chart-4"
      : "bg-muted-foreground/40"

  const handleJoin = (e: React.MouseEvent) => {
    e.stopPropagation()
    void playService.joinMatch(match.id)
  }

  return (
    <button
      disabled={isLocked || isFinished}
      onClick={handleJoin}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border/50 transition-all duration-200",
        isLocked && "opacity-50 cursor-not-allowed",
        isFinished && "opacity-60 cursor-not-allowed",
        !isLocked && !isFinished && "hover:border-border hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20"
      )}
    >
      {/* Map background area */}
      <div className={cn("relative h-28 bg-gradient-to-b", mapGradient)}>
        {/* Match number */}
        <div className="absolute top-2 left-2.5 flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-white/70 tabular-nums">
            #{match.number}
          </span>
        </div>

        {/* Status badge */}
        <div className="absolute top-2 right-2.5">
          {isLive && (
            <span className="flex items-center gap-1 rounded bg-chart-2/20 px-1.5 py-0.5 text-[10px] font-bold text-chart-2 uppercase">
              <Circle className="size-1.5 fill-current animate-pulse" />
              Live
            </span>
          )}
          {isLocked && <Lock className="size-3.5 text-white/30" />}
        </div>

        {/* Score overlay — center */}
        {(isLive || isFinished) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tabular-nums text-orange-400/90">{match.scoreT}</span>
              <span className="text-xs font-bold text-white/30">:</span>
              <span className="text-2xl font-black tabular-nums text-blue-400/90">{match.scoreCT}</span>
            </div>
          </div>
        )}

        {/* Waiting state — player count center */}
        {isWaiting && match.players > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-1 text-white/50">
              <Users className="size-4" />
              <span className="text-lg font-bold tabular-nums">{match.players}</span>
              <span className="text-xs text-white/30">/ {match.maxPlayers}</span>
            </div>
          </div>
        )}

        {isWaiting && match.players === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-white/25 font-medium">Empty</span>
          </div>
        )}

        {/* Map name */}
        <div className="absolute bottom-2 left-2.5">
          <span className="text-[11px] font-medium text-white/60">{mapLabel(match.map)}</span>
        </div>

        {/* Action buttons — bottom right */}
        {!isLocked && !isFinished && (
          <div className="absolute bottom-2 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span className="flex size-6 items-center justify-center rounded-md bg-white/10 text-white/70 hover:bg-white/20 transition-colors">
              <Copy className="size-3" />
            </span>
            <span className="flex size-6 items-center justify-center rounded-md bg-chart-2/80 text-white hover:bg-chart-2 transition-colors">
              <PlayIcon className="size-3 fill-current" />
            </span>
          </div>
        )}
      </div>

      {/* Bottom progress bar */}
      <div className="h-1 w-full bg-muted/50">
        <div
          className={cn("h-full transition-all duration-300", statusColor)}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </button>
  )
}

function MatchTable({ matches }: { matches: MatchInfo[] }) {
  return (
    <div className="glass overflow-hidden rounded-xl">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-16 text-xs">#</TableHead>
            <TableHead className="text-xs">Map</TableHead>
            <TableHead className="w-32 text-xs">Players</TableHead>
            <TableHead className="w-28 text-xs">Status</TableHead>
            <TableHead className="w-28 text-right text-xs">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match) => {
            const isLive = match.status === "live"
            const isLocked = match.status === "locked"
            const isFinished = match.status === "finished"
            const isWaiting = match.status === "waiting"
            return (
              <TableRow key={match.id} className={cn((isLocked || isFinished) && "opacity-60")}>
                <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                  #{match.number}
                </TableCell>
                <TableCell className="text-sm font-medium">{mapLabel(match.map)}</TableCell>
                <TableCell className="text-xs tabular-nums text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="size-3" />
                    {match.players}/{match.maxPlayers}
                  </span>
                </TableCell>
                <TableCell>
                  {isLive ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-chart-2">
                      <Circle className="size-1.5 fill-current animate-pulse" />
                      Live
                    </span>
                  ) : isLocked ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground">
                      <Lock className="size-2.5" />
                      Locked
                    </span>
                  ) : isFinished ? (
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Finished</span>
                  ) : isWaiting ? (
                    <span className="text-[10px] font-bold uppercase text-chart-4">Waiting</span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm font-bold tabular-nums">
                  {(isLive || isFinished) ? (
                    <span>
                      <span className="text-orange-400/90">{match.scoreT}</span>
                      <span className="text-muted-foreground"> : </span>
                      <span className="text-blue-400/90">{match.scoreCT}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
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
        empty={!loading && !error && all.length === 0}
        emptyMessage="No tournament matches scheduled."
        onRetry={refetch}
      />

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
                <span className="rounded-md bg-chart-4/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-chart-4">{info?.season ?? "Season"}</span>
              </div>
              <div className="flex flex-col gap-2">
                {[...live, ...upcoming, ...completed].map((match) => <TournamentRow key={match.id} match={match} />)}
              </div>
            </section>

            <section className="glass rounded-xl p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Playoff bracket</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Road to the season final</p>
                </div>
                <span className="text-xs text-muted-foreground">{info?.format ?? "Best of 3"}</span>
              </div>
              <div className="grid min-w-[560px] grid-cols-3 gap-3 overflow-x-auto pb-2">
                <BracketColumn title="Quarterfinals" matches={all.slice(0, 4)} />
                <BracketColumn title="Semifinals" matches={all.slice(4, 6)} />
                <BracketColumn title="Final" matches={all.slice(6, 7)} />
              </div>
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
      <Icon className="size-4 text-chart-4" />
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
          <div className="truncate text-sm font-medium">{match.teamA} <span className="text-muted-foreground">vs</span> {match.teamB}</div>
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

function BracketColumn({ title, matches }: { title: string; matches: TournamentMatch[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="flex flex-1 flex-col justify-around gap-3">
        {matches.map((match) => (
          <div key={match.id} className="rounded-lg border border-border/60 bg-secondary/35 p-3 transition-colors hover:border-chart-4/40">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium">{match.teamA}</span><span className="tabular-nums text-muted-foreground">{match.score?.split("-")[0] ?? "-"}</span>
            </div>
            <div className="my-2 h-px bg-border/60" />
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium">{match.teamB}</span><span className="tabular-nums text-muted-foreground">{match.score?.split("-")[1] ?? "-"}</span>
            </div>
          </div>
        ))}
      </div>
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
  const isFull = server.status === "full"
  const isOffline = server.status === "offline"
  const disabled = isFull || isOffline
  const mapGradient = MAP_COLORS[server.map] || "from-neutral-900/40 to-neutral-950/80"

  const [connecting, setConnecting] = useState(false)

  const handleConnect = () => {
    setConnecting(true)
    void serversService
      .joinServer(server.id)
      .finally(() => setConnecting(false))
  }

  return (
    <div className={cn(
      "group flex flex-col overflow-hidden rounded-xl border border-border/50 transition-all duration-200",
      !disabled && "hover:border-border hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20",
      disabled && "opacity-60"
    )}>
      <div
        role="img"
        aria-label={`${server.map} map`}
        className={cn("h-36 bg-gradient-to-br", mapGradient)}
      />
      <h3 className="truncate px-3 pt-3 text-sm font-semibold tracking-tight">{mapLabel(server.map)}</h3>
      <p className="px-3 pt-1 text-xs text-muted-foreground tabular-nums">
        {server.players}/{server.maxPlayers} players
      </p>
      <div className="p-3">
        <Button
          size="sm"
          className="w-full"
          disabled={disabled || connecting}
          variant={disabled ? "secondary" : "default"}
          onClick={handleConnect}
        >
          {disabled ? (isFull ? "Full" : "Offline") : connecting ? "Connecting..." : "Connect"}
          {!disabled && !connecting && <PlayIcon className="size-3.5 fill-current" />}
        </Button>
      </div>
    </div>
  )
}
