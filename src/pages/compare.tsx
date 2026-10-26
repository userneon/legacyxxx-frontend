/**
 * Compare: two players side by side. Each side is a normal profile overview, so the numbers are the ones on their
 * profiles; a section a player hid stays hidden here and is never compared.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeftRight, Download, Link2, LoaderCircle, RotateCcw, Search, X } from "lucide-react"
import { toast } from "sonner"

import { clansService, competitiveService, searchService } from "@/api"
import type { ClanCard, ClanDetail, ClanStats } from "@/api/types"
import { ClanMark } from "@/components/clan-mark"
import { compareService, profileOverviewService, type HeadToHead, type ProfileOverview } from "@/api/profile-overview"
import type { CommunityPlayer } from "@/api/types"
import { CompetitiveRankBadge, rankTierColor } from "@/components/competitive-rank-badge"
import { AnimatedNumber } from "@/components/animated-number"
import { PageBar, PageBarEnd, PageTabs } from "@/components/page-tabs"
import { PlayerAvatar } from "@/components/player-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { useViewParams } from "@/hooks/use-view-params"
import { renderComparePng } from "@/lib/compare-image"
import { cs2MapLabel } from "@/lib/cs2-map-art"
import { cn } from "@/lib/utils"

type Side = "a" | "b"

/** Brightness tells the two players apart, no hue (the site's neutral team tones). */
const TONE: Record<Side, { dot: string; text: string; bar: string }> = {
  a: { dot: "bg-[var(--text)]", text: "text-[var(--text)]", bar: "bg-[var(--text)]" },
  b: { dot: "bg-[var(--text-dim)]", text: "text-[var(--text-muted)]", bar: "bg-[var(--text-dim)]" },
}

/** Ahead is green, behind is red, level is grey (the site's win / loss colours; draw is neutral). */
type Outcome = "win" | "loss" | "draw"
const OUTCOME: Record<Outcome, { text: string; bar: string; pill: string }> = {
  win: { text: "text-[var(--result-win)]", bar: "bg-[var(--result-win)]", pill: "border-[var(--result-win)]/40 bg-[var(--result-win)]/15 text-[var(--result-win)]" },
  loss: { text: "text-[var(--result-loss)]", bar: "bg-[var(--result-loss)]", pill: "border-[var(--result-loss)]/40 bg-[var(--result-loss)]/15 text-[var(--result-loss)]" },
  draw: { text: "text-[var(--result-draw)]", bar: "bg-[var(--result-draw)]", pill: "border-[var(--line)] bg-[var(--raised)] text-[var(--result-draw)]" },
}
const outcomeOf = (lead: Side | null, side: Side): Outcome => (lead === null ? "draw" : lead === side ? "win" : "loss")

const MIN_MAP_MATCHES = 3

interface Row {
  key: string
  label: string
  a: number | null
  b: number | null
  show: (value: number) => string
  /** How the number counts up on screen. */
  decimals: number
  suffix: string
  /** The gap between the two, for the pill next to the leader. */
  gap: (difference: number) => string
  /** Smaller is better (a ladder place). */
  lowerBetter?: boolean
}

const statValue = (overview: ProfileOverview, key: NonNullable<ProfileOverview["stats"]>[number]["key"]) => overview.stats?.find((entry) => entry.key === key)?.value ?? null

function buildRows(a: ProfileOverview, b: ProfileOverview): Row[] {
  const whole = (value: number) => Math.round(value).toLocaleString()
  const points = (value: number) => `${Math.round(value)} pts`
  return [
    { key: "rank", label: "EXP", a: a.competitive?.exp ?? null, b: b.competitive?.exp ?? null, show: whole, decimals: 0, suffix: "", gap: whole },
    { key: "matches", label: "Matches", a: statValue(a, "matches"), b: statValue(b, "matches"), show: whole, decimals: 0, suffix: "", gap: whole },
    { key: "winRate", label: "Win rate", a: statValue(a, "winRate"), b: statValue(b, "winRate"), show: (value) => `${Math.round(value)}%`, decimals: 0, suffix: "%", gap: points },
    { key: "kd", label: "K/D", a: statValue(a, "kd"), b: statValue(b, "kd"), show: (value) => value.toFixed(2), decimals: 2, suffix: "", gap: (value) => value.toFixed(2) },
    { key: "hs", label: "Headshot %", a: statValue(a, "hs"), b: statValue(b, "hs"), show: (value) => `${Math.round(value)}%`, decimals: 0, suffix: "%", gap: points },
    { key: "avgKills", label: "Avg. kills", a: statValue(a, "avgKills"), b: statValue(b, "avgKills"), show: (value) => value.toFixed(1), decimals: 1, suffix: "", gap: (value) => value.toFixed(1) },
    { key: "place", label: "Ladder place", a: a.competitive?.position ?? null, b: b.competitive?.position ?? null, show: (value) => `#${Math.round(value)}`, decimals: 0, suffix: "", gap: (value) => `${Math.round(value)} places`, lowerBetter: true },
    { key: "week", label: "EXP this week", a: weekExp(a), b: weekExp(b), show: (value) => `${value > 0 ? "+" : ""}${Math.round(value)}`, decimals: 0, suffix: "", gap: whole },
    { key: "form", label: "Last 10 wins", a: lastWins(a), b: lastWins(b), show: (value) => `${Math.round(value)}/10`, decimals: 0, suffix: "", gap: whole },
  ]
}

/** EXP the player gained or lost in ranked matches over the last 7 days, from their own match rows (null while hidden). */
function weekExp(overview: ProfileOverview) {
  if (!overview.recentMatches) return null
  const since = Date.now() - 7 * 86_400_000
  return overview.recentMatches.filter((match) => match.playedAt && Date.parse(match.playedAt) >= since).reduce((sum, match) => sum + (match.expDelta ?? 0), 0)
}

/** Wins in the last ten matches (null while hidden or with fewer than ten). */
function lastWins(overview: ProfileOverview) {
  const matches = overview.recentMatches
  if (!matches || matches.length < 10) return null
  return matches.slice(0, 10).filter((match) => match.result === "Win").length
}

function leader(row: Row): Side | null {
  if (row.a === null || row.b === null || row.a === row.b) return null
  return (row.a > row.b) !== Boolean(row.lowerBetter) ? "a" : "b"
}

/** A search box for one side. Arrow keys move through the results, Enter picks, Escape clears. */
function SearchBox({ side, onPick }: { side: Side; onPick: (steamId: string) => void }) {
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [query])
  const searching = debounced.length >= 2
  const found = useApiQuery<CommunityPlayer[]>(
    (signal) => searchService.searchPlayers(debounced, { signal }).then((response) => response.players),
    { enabled: searching, queryKey: `compare-search:${side}:${debounced}` },
  )
  // With nothing typed, the leaderboard's top players are a one-click start.
  const top = useApiQuery<{ steamId: string; name: string; avatar: string }[]>(
    (signal) => competitiveService.getLeaderboard({ signal }).then((entries) => entries.slice(0, 5).map((entry) => ({ steamId: entry.steam_id, name: entry.username, avatar: entry.avatar }))),
    { queryKey: "compare-top-players" },
  )
  const results = (found.data ?? []).filter((player) => player.steamId).slice(0, 8)

  const pick = (steamId: string) => { onPick(steamId); setQuery(""); setOpen(false) }
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((index) => Math.min(results.length - 1, index + 1)) }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(0, index - 1)) }
    else if (event.key === "Enter" && open && results[active]) { event.preventDefault(); pick(results[active]!.steamId!) }
    else if (event.key === "Escape") { setQuery(""); setOpen(false) }
  }
  const label = side === "a" ? "Player 1" : "Player 2"

  return (
    <div ref={root} className="relative flex flex-col gap-3" onBlur={(event) => { if (!root.current?.contains(event.relatedTarget as Node | null)) setOpen(false) }}>
      <label className="flex h-12 cursor-text items-center gap-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--panel)]/80 px-3.5 transition-[border-color] focus-within:border-[var(--line-strong)]">
        <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
        <input
          type="search"
          role="combobox"
          aria-expanded={open && searching}
          aria-controls={`compare-results-${side}`}
          aria-label={`Find ${label}`}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={`${label}: name or Steam ID`}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]"
        />
      </label>
      {open && searching && (
        <ul id={`compare-results-${side}`} role="listbox" aria-label={`${label} results`} className="animate-in fade-in-0 slide-in-from-top-1 absolute inset-x-0 top-[52px] z-20 max-h-72 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--card-surface)] p-1 shadow-lg duration-150">
          {found.loading && !found.data ? (
            <li className="px-3 py-3 text-xs text-[var(--text-dim)]">Searching…</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-3 text-xs text-[var(--text-dim)]">No player matches this search.</li>
          ) : (
            results.map((player, index) => (
              <li key={player.steamId} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pick(player.steamId!)}
                  className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-[var(--text)] transition-colors", index === active && "bg-[var(--raised)]")}
                >
                  <PlayerAvatar avatar={player.avatar} name={player.name} className="size-7 rounded-lg text-[10px]" />
                  <span className="truncate">{player.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {!searching && (top.data?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-[var(--text-dim)]">Top players</span>
          <div className="flex flex-wrap gap-1.5">
            {top.data!.map((player) => (
              <button key={player.steamId} type="button" onClick={() => pick(player.steamId)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--glass-fill)] py-0 pl-1 pr-3 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]">
                <PlayerAvatar avatar={player.avatar} name={player.name} className="size-6 rounded-full text-[9px]" />
                <span className="max-w-24 truncate">{player.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerPanel({ side, selectedId, overview, loading, failed, onPick, onClear, onRetry }: {
  side: Side
  selectedId: string | null
  overview: ProfileOverview | null
  loading: boolean
  failed: boolean
  onPick: (steamId: string) => void
  onClear: () => void
  onRetry: () => void
}) {
  const navigate = useNavigate()
  const label = side === "a" ? "Player 1" : "Player 2"
  const panel = "relative flex min-h-0 flex-row items-center gap-3.5 p-4 md:min-h-[148px] md:flex-col md:justify-center md:gap-3 md:p-5 md:text-center"

  if (!selectedId) return <div className={panel}><SearchBox side={side} onPick={onPick} /></div>

  if (failed) {
    return (
      <div className={cn(panel, "flex-col items-center text-center")}>
        <span className="text-[13px] text-[var(--text-dim)]">This player could not be loaded.</span>
        <span className="flex items-center gap-4">
          <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
          <button type="button" onClick={onClear} className="text-[13px] text-[var(--text-dim)] hover:text-[var(--text)]">Choose someone else</button>
        </span>
      </div>
    )
  }
  if (loading || !overview) {
    return (
      <div className={cn(panel, "items-center")} aria-hidden="true">
        <Skeleton className="size-12 shrink-0 rounded-xl bg-[var(--line-soft)] md:size-16 md:rounded-2xl" />
        <div className="flex flex-col gap-2 md:items-center">
          <Skeleton className="h-4 w-32 rounded-full bg-[var(--line)]" />
          <Skeleton className="h-3 w-24 rounded-full bg-[var(--line-soft)]" />
        </div>
      </div>
    )
  }
  const { user, competitive } = overview
  return (
    <div key={user.steamId} className={cn(panel, "lx-swap-in")}>
      <button type="button" onClick={onClear} aria-label={`Change ${label}`} className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-[var(--text-dim)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]"><X className="size-4" /></button>
      <PlayerAvatar avatar={user.avatar} name={user.username} className="size-12 shrink-0 rounded-xl text-sm md:size-16 md:rounded-2xl md:text-lg" />
      <div className="flex min-w-0 flex-col items-start gap-1.5 pr-8 md:items-center md:pr-0">
      <button type="button" onClick={() => navigate(`/profile/${encodeURIComponent(user.steamId)}`)} className="flex max-w-full items-center gap-2 text-base font-semibold text-[var(--text)] hover:underline md:text-[17px]">
        <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", TONE[side].dot)} />
        <span className="truncate">{user.username}</span>
      </button>
      {competitive ? (
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <CompetitiveRankBadge rankId={competitive.rankId} rankName={competitive.rankName} imageKey={competitive.rankImageKey} size={26} />
          <span className="text-[13px] font-semibold" style={{ color: rankTierColor(competitive.rankId) }}>{competitive.rankName}</span>
          <span className="text-xs text-[var(--text-dim)]">{competitive.exp.toLocaleString()} EXP</span>
        </span>
      ) : (
        <span className="text-xs text-[var(--text-dim)]">Unranked</span>
      )}
      </div>
    </div>
  )
}

function StatRow({ row, names, index }: { row: Row; names: { a: string; b: string }; index: number }) {
  // The bars start empty and grow in, then glide whenever the players change.
  const [grown, setGrown] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  const barStyle = (share: number) => ({ width: grown && total ? `${share * 100}%` : 0, transitionDelay: grown ? "0ms" : `${index * 60}ms` })
  const lead = leader(row)
  // A smaller-is-better number fills its bar by the inverse, so the better player still has the longer bar.
  const amount = (value: number | null) => (value === null ? 0 : row.lowerBetter ? 1 / Math.max(value, 1e-9) : Math.max(value, 0))
  const total = row.a !== null && row.b !== null ? Math.max(amount(row.a) + amount(row.b), 1e-9) : 0
  const difference = row.a !== null && row.b !== null ? Math.abs(row.a - row.b) : 0
  const known = row.a !== null && row.b !== null
  const cell = (side: Side) => {
    const value = row[side]
    const outcome = OUTCOME[outcomeOf(lead, side)]
    const gap = !known ? null : lead === null ? "Draw" : lead === side ? `+${row.gap(difference)}` : null
    return (
      <div className={cn("flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2", side === "a" ? "items-end text-right sm:flex-row-reverse sm:justify-start" : "items-start text-left sm:justify-start")}>
        <span className={cn("text-[22px] font-bold leading-none transition-colors duration-500 sm:text-[24px]", value === null ? "text-[var(--text-faint)]" : known ? outcome.text : "text-[var(--text)]")}>{value === null ? "—" : <AnimatedNumber value={value} decimals={row.decimals} suffix={row.suffix} durationMs={800} />}</span>
        {value === null ? <span className="text-[10px] text-[var(--text-faint)]">Hidden</span> : gap ? <span key={gap} className={cn("lx-swap-in rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors duration-500", outcome.pill)}>{gap}</span> : null}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--line-soft)] px-4 py-4 transition-colors last:border-b-0 hover:bg-[var(--raised)]/40" role="group" aria-label={`${row.label}: ${names.a} ${row.a === null ? "hidden" : row.show(row.a)}, ${names.b} ${row.b === null ? "hidden" : row.show(row.b)}`}>
      <div className="grid grid-cols-[1fr_88px_1fr] items-center gap-3">
        {cell("a")}
        <span className="text-center text-[11px] font-medium uppercase tracking-wider text-[var(--text-dim)]">{row.label}</span>
        {cell("b")}
      </div>
      <div aria-hidden="true" className="flex h-1.5 gap-1">
        <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-[var(--line-soft)]"><div className={cn("h-full rounded-full transition-[width,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]", known ? OUTCOME[outcomeOf(lead, "a")].bar : TONE.a.bar)} style={barStyle(amount(row.a) / (total || 1))} /></div>
        <div className="flex flex-1 overflow-hidden rounded-full bg-[var(--line-soft)]"><div className={cn("h-full rounded-full transition-[width,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]", known ? OUTCOME[outcomeOf(lead, "b")].bar : TONE.b.bar)} style={barStyle(amount(row.b) / (total || 1))} /></div>
      </div>
    </div>
  )
}

const RESULT_DOT: Record<string, string> = { Win: "bg-[var(--result-win)]", Loss: "bg-[var(--result-loss)]", Draw: "bg-[var(--result-draw)]" }

/** Each player's last ten results as dots (newest on the right) and their EXP over those matches as a small line. */
function RecentForm({ a, b }: { a: ProfileOverview; b: ProfileOverview }) {
  if (!a.recentMatches?.length || !b.recentMatches?.length) return null
  const line = (overview: ProfileOverview, side: Side) => {
    const last = (overview.recentMatches ?? []).slice(0, 10).reverse()
    const exp = last.map((match) => match.expAfter).filter((value): value is number => typeof value === "number")
    const low = Math.min(...exp), high = Math.max(...exp)
    const points = exp.map((value, index) => `${exp.length === 1 ? 50 : (index / (exp.length - 1)) * 100},${high === low ? 12 : 22 - ((value - low) / (high - low)) * 20}`).join(" ")
    const change = exp.length > 1 ? exp[exp.length - 1] - exp[0] : null
    return (
      <div className={cn("flex min-w-0 flex-col gap-2", side === "a" ? "items-end" : "items-start")}>
        <div className="flex gap-1" aria-label={`${overview.user.username}: ${last.map((match) => match.result).join(", ")}`}>
          {last.map((match, index) => <span key={match.matchId ?? index} title={`${match.result} · ${cs2MapLabel(match.map)} · ${match.score}`} className={cn("size-3 rounded-[4px]", RESULT_DOT[match.result] ?? "bg-[var(--line)]")} />)}
        </div>
        {exp.length > 1 && (
          <div className={cn("flex items-center gap-2", side === "a" && "flex-row-reverse")}>
            <svg viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true" className="h-6 w-28"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" className={change === null || change === 0 ? "text-[var(--result-draw)]" : change > 0 ? "text-[var(--result-win)]" : "text-[var(--result-loss)]"} /></svg>
            {change !== null && <span className={cn("text-[11px] font-semibold", change > 0 ? "text-[var(--result-win)]" : change < 0 ? "text-[var(--result-loss)]" : "text-[var(--result-draw)]")}>{change > 0 ? "+" : change < 0 ? "−" : ""}{Math.abs(change).toLocaleString()} EXP</span>}
          </div>
        )}
      </div>
    )
  }
  return (
    <section aria-label="Recent form" className="lx-swap-in overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
      <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line-soft)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">Recent form</h2>
        <span className="text-xs text-[var(--text-dim)]">Last 10 ranked matches · EXP over them</span>
      </div>
      <div className="grid grid-cols-[1fr_88px_1fr] items-center gap-3 px-4 py-4">
        {line(a, "a")}
        <span className="text-center text-[11px] font-medium uppercase tracking-wider text-[var(--text-dim)]">Form</span>
        {line(b, "b")}
      </div>
    </section>
  )
}

/** The ranked matches both played: against each other (who won, kills) and on the same team (how that team did). */
function HeadToHeadPanel({ idA, idB, a, b }: { idA: string; idB: string; a: ProfileOverview; b: ProfileOverview }) {
  const { data, loading, error, refetch } = useApiQuery<HeadToHead>((signal) => compareService.headToHead(idA, idB, { signal }), { queryKey: `h2h:${idA}:${idB}` })
  const shell = (body: React.ReactNode, note?: string) => (
    <section aria-label="Head to head" className="lx-swap-in overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
      <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line-soft)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">Head to head</h2>
        {note && <span className="text-xs text-[var(--text-dim)]">{note}</span>}
      </div>
      {body}
    </section>
  )
  if (loading && !data) return shell(<div className="p-4"><Skeleton className="h-16 rounded-lg" /></div>)
  if (error || !data) return shell(<p className="flex items-center gap-3 px-4 py-4 text-[13px] text-[var(--text-dim)]">Could not load their matches together.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>)
  if (data.hidden) return shell(<p className="px-4 py-4 text-[13px] text-[var(--text-dim)]">One of them hides their matches.</p>)
  const against = data.against!, together = data.together!
  if (against.matches + together.matches === 0) return shell(<p className="px-4 py-4 text-[13px] text-[var(--text-dim)]">They have not played a ranked match together yet.</p>)
  const lead: Side | null = against.aWins === against.bWins ? null : against.aWins > against.bWins ? "a" : "b"
  return shell(
    <>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4">
        <div className="flex flex-col items-end gap-0.5">
          <span className={cn("text-[30px] font-black leading-none", against.matches ? OUTCOME[outcomeOf(lead, "a")].text : "text-[var(--text-faint)]")}>{against.aWins}</span>
          <span className="text-[11px] text-[var(--text-dim)]">{against.aKills.toLocaleString()} kills</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-dim)]">Against each other</span>
          <span className="text-[13px] text-[var(--text-2)]">{against.matches} match{against.matches === 1 ? "" : "es"}{against.draws ? ` · ${against.draws} draw${against.draws === 1 ? "" : "s"}` : ""}</span>
        </div>
        <div className="flex flex-col items-start gap-0.5">
          <span className={cn("text-[30px] font-black leading-none", against.matches ? OUTCOME[outcomeOf(lead, "b")].text : "text-[var(--text-faint)]")}>{against.bWins}</span>
          <span className="text-[11px] text-[var(--text-dim)]">{against.bKills.toLocaleString()} kills</span>
        </div>
      </div>
      {together.matches > 0 && (
        <p className="border-t border-[var(--line-soft)] px-4 py-3 text-center text-[13px] text-[var(--text-2)]">
          On the same team {together.matches} time{together.matches === 1 ? "" : "s"}: <span className="font-semibold text-[var(--result-win)]">{together.wins} won</span>, <span className="font-semibold text-[var(--result-loss)]">{together.losses} lost</span>{together.draws ? `, ${together.draws} drawn` : ""}
          {together.matches >= 3 && <span className="text-[var(--text-dim)]"> · {Math.round((together.wins / together.matches) * 100)}% as a duo</span>}
        </p>
      )}
      {(data.recent ?? []).length > 0 && (
        <ul className="border-t border-[var(--line-soft)]">
          {(data.recent ?? []).map((match) => {
            const label = match.together ? (match.outcome === "win" ? "Won together" : match.outcome === "loss" ? "Lost together" : "Drew together") : match.outcome === "a" ? `${a.user.username} won` : match.outcome === "b" ? `${b.user.username} won` : "Draw"
            const tone = match.together ? (match.outcome === "win" ? "text-[var(--result-win)]" : match.outcome === "loss" ? "text-[var(--result-loss)]" : "text-[var(--result-draw)]") : "text-[var(--text)]"
            return (
              <li key={match.matchId} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-[var(--line-soft)] px-4 py-2 text-[13px] last:border-b-0">
                <span className="text-right text-[var(--text-2)]">{match.aKills} kills</span>
                <span className="flex flex-col items-center"><span className={cn("truncate font-semibold", tone)}>{label}</span><span className="text-[11px] text-[var(--text-dim)]">{match.map ? cs2MapLabel(match.map) : "Map"} · {new Date(match.at).toLocaleDateString()}</span></span>
                <span className="text-[var(--text-2)]">{match.bKills} kills</span>
              </li>
            )
          })}
        </ul>
      )}
    </>,
    "Ranked matches both played",
  )
}

function SharedMaps({ a, b }: { a: ProfileOverview; b: ProfileOverview }) {
  if (!a.maps || !b.maps) return null
  const shared = a.maps.flatMap((left) => {
    const right = b.maps!.find((entry) => entry.map === left.map)
    return right && left.matches >= MIN_MAP_MATCHES && right.matches >= MIN_MAP_MATCHES ? [{ map: left.map, a: left, b: right }] : []
  })
  if (shared.length === 0) return null
  return (
    <section aria-label="Maps both have played" className="lx-swap-in overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
      <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line-soft)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">Maps both have played</h2>
        <span className="text-xs text-[var(--text-dim)]">Win rate · {MIN_MAP_MATCHES}+ matches each</span>
      </div>
      {shared.map(({ map, a: left, b: right }) => {
        const lead: Side | null = left.winRate === right.winRate ? null : left.winRate > right.winRate ? "a" : "b"
        const value = (win: number, matches: number, align: "right" | "left") => (
          <span className={cn("flex items-baseline gap-1.5", align === "right" ? "justify-end" : "justify-start")}>
            {align === "left" && <span className="text-[11px] text-[var(--text-dim)]">{matches}</span>}
            <span className={cn("text-lg font-bold", OUTCOME[outcomeOf(lead, align === "right" ? "a" : "b")].text)}>{win}%</span>
            {align === "right" && <span className="text-[11px] text-[var(--text-dim)]">{matches}</span>}
          </span>
        )
        return (
          <div key={map} className="grid grid-cols-[1fr_104px_1fr] items-center gap-3 border-b border-[var(--line-soft)] px-4 py-3 last:border-b-0 hover:bg-[var(--raised)]/40">
            {value(left.winRate, left.matches, "right")}
            <span className="truncate text-center text-xs text-[var(--text-2)]">{cs2MapLabel(map)}</span>
            {value(right.winRate, right.matches, "left")}
          </div>
        )
      })}
    </section>
  )
}

type CompareTab = "players" | "clans"
const COMPARE_TABS: Array<{ value: CompareTab; label: string }> = [{ value: "players", label: "Players" }, { value: "clans", label: "Clans" }]

/** One side of the clan compare: a clan search (name), or the picked clan with its level. */
function ClanSide({ side, clan, loading, onPick, onClear }: { side: Side; clan: ClanDetail | null; loading: boolean; onPick: (id: string) => void; onClear: () => void }) {
  const [query, setQuery] = useState("")
  const { data } = useApiQuery<ClanCard[]>((signal) => clansService.getClans({ q: query.trim() || undefined, sort: "name", limit: 6 }, { signal }), { enabled: !clan && !loading, queryKey: `compare-clans:${side}:${query.trim()}` })
  const panel = "relative flex min-h-[148px] flex-col items-center justify-center gap-3 p-5 text-center"
  if (loading) return <div className={panel}><Skeleton className="size-16 rounded-2xl bg-[var(--line-soft)]" /><Skeleton className="h-4 w-32 rounded-full bg-[var(--line)]" /></div>
  if (clan) {
    return (
      <div className={cn(panel, "lx-swap-in")}>
        <button type="button" onClick={onClear} aria-label="Change clan" className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-[var(--text-dim)] hover:bg-[var(--raised)] hover:text-[var(--text)]"><X className="size-4" /></button>
        <ClanMark logo={clan.logo} tag={clan.tag} className="size-16 text-[13px]" />
        <span className="flex items-center gap-2 text-[17px] font-semibold"><span aria-hidden="true" className={cn("size-2 rounded-full", TONE[side].dot)} /><span className="truncate">{clan.name}</span></span>
        <span className="text-xs text-[var(--text-dim)]">[{clan.tag}] · Lv {clan.level ?? 1} · {clan.currentPlayers} members</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2.5 p-4">
      <label className="flex h-11 items-center gap-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--panel)]/80 px-3.5 focus-within:border-[var(--line-strong)]">
        <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={`Find clan ${side === "a" ? 1 : 2}`} placeholder={`Clan ${side === "a" ? 1 : 2}: name`} className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--text-dim)]" />
      </label>
      <ul className="flex flex-col gap-1">
        {(data ?? []).map((entry) => (
          <li key={entry.id}>
            <button type="button" onClick={() => onPick(String(entry.number ?? entry.id))} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-[var(--raised)]">
              <ClanMark logo={entry.logo} tag={entry.tag} className="size-7 text-[9px]" />
              <span className="min-w-0 flex-1 truncate">{entry.name} <span className="text-[var(--text-dim)]">[{entry.tag}]</span></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function clanRows(a: { clan: ClanDetail; stats: ClanStats }, b: { clan: ClanDetail; stats: ClanStats }): Row[] {
  const whole = (value: number) => Math.round(value).toLocaleString()
  const pct = (value: number) => `${Math.round(value)}%`
  const row = (key: string, label: string, pick: (side: { clan: ClanDetail; stats: ClanStats }) => number, show = whole, decimals = 0, suffix = "", gap = whole): Row => ({ key, label, a: pick(a), b: pick(b), show, decimals, suffix, gap })
  return [
    row("level", "Level", (side) => side.stats.progress.level),
    row("war", "War rating", (side) => side.stats.progress.war.rating),
    row("warWins", "Wars won", (side) => side.stats.progress.war.wins),
    row("members", "Members", (side) => side.clan.currentPlayers),
    row("matches", "Matches", (side) => side.stats.totals.matches),
    row("winRate", "Win rate", (side) => side.stats.totals.winRate, pct, 0, "%", (value) => `${Math.round(value)} pts`),
    row("kd", "K/D", (side) => side.stats.totals.kd, (value) => value.toFixed(2), 2, "", (value) => value.toFixed(2)),
    row("hs", "Headshot %", (side) => side.stats.totals.headshotRate, pct, 0, "%", (value) => `${Math.round(value)} pts`),
    row("aces", "Aces", (side) => side.stats.totals.aces),
    row("clutches", "Clutches", (side) => side.stats.totals.clutches),
  ]
}

/** Two clans side by side: level, Clan War record and the members' real ranked numbers (GET /clans/:id and /clans/:id/stats). */
function ClanCompare({ params, setParams }: { params: URLSearchParams; setParams: ReturnType<typeof useViewParams>[1] }) {
  const idA = params.get("ca"), idB = params.get("cb")
  const load = (id: string | null) => async (signal: AbortSignal) => { const [clan, stats] = await Promise.all([clansService.getClan(id!, { signal }), clansService.getStats(id!, { signal })]); return { clan, stats } }
  const first = useApiQuery(load(idA), { enabled: Boolean(idA), queryKey: `compare-clan:${idA}` })
  const second = useApiQuery(load(idB), { enabled: Boolean(idB), queryKey: `compare-clan:${idB}` })
  const set = (key: "ca" | "cb", value: string | null) => setParams((current) => { const next = new URLSearchParams(current); next.set("tab", "clans"); if (value) next.set(key, value); else next.delete(key); return next })
  const a = idA ? first.data : null, b = idB ? second.data : null
  const same = Boolean(a && b && a.clan.id === b.clan.id)
  const rows = a && b && !same ? clanRows(a, b) : []
  const leads = { a: rows.filter((row) => leader(row) === "a").length, b: rows.filter((row) => leader(row) === "b").length }
  const overall: Side | null = leads.a === leads.b ? null : leads.a > leads.b ? "a" : "b"
  return (
    <>
      <section aria-label="Clans" className="grid rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] md:grid-cols-[1fr_auto_1fr]">
        <ClanSide side="a" clan={a?.clan ?? null} loading={Boolean(idA) && first.loading && !first.data} onPick={(id) => set("ca", id)} onClear={() => set("ca", null)} />
        <div className="flex items-center justify-center border-y border-[var(--line-soft)] px-2 py-2 md:w-28 md:border-x md:border-y-0">
          {rows.length ? (
            <span className="flex flex-col items-center gap-1"><span className="flex items-baseline gap-2 text-[30px] font-black leading-none"><span className={OUTCOME[outcomeOf(overall, "a")].text}>{leads.a}</span><span className="text-lg text-[var(--text-faint)]">:</span><span className={OUTCOME[outcomeOf(overall, "b")].text}>{leads.b}</span></span><span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">stats led</span></span>
          ) : <span className="text-sm font-bold tracking-widest text-[var(--text-faint)]">VS</span>}
        </div>
        <ClanSide side="b" clan={b?.clan ?? null} loading={Boolean(idB) && second.loading && !second.data} onPick={(id) => set("cb", id)} onClear={() => set("cb", null)} />
      </section>
      {(first.error || second.error) && <p className="flex items-center justify-center gap-3 text-[13px] text-[var(--text-dim)]">A clan could not be loaded.<button type="button" onClick={() => { first.refetch(); second.refetch() }} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>}
      {same ? <p className="py-10 text-center text-[13px] text-[var(--text-dim)]">Pick two different clans.</p>
        : !idA || !idB ? <p className="py-10 text-center text-[13px] text-[var(--text-dim)]">Choose {idA || idB ? "one more clan" : "two clans"} to compare.</p>
        : rows.length > 0 && a && b ? (
          <section aria-label="Clan stats" className="lx-swap-in overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
            <div className="stagger-in">{rows.map((row, index) => <StatRow key={row.key} row={row} index={index} names={{ a: a.clan.name, b: b.clan.name }} />)}</div>
          </section>
        ) : null}
    </>
  )
}

export function ComparePage() {
  const { user } = useAuth()
  const [params, setParams] = useViewParams()
  const idA = params.get("a")
  const idB = params.get("b")

  // Player 1 starts as the signed-in player, so comparing yourself with a friend is one search.
  const [seeded, setSeeded] = useState(false)
  useEffect(() => {
    if (seeded || !user?.steamId) return
    setSeeded(true)
    if (!params.get("a") && !params.get("b")) setParams((current) => { const next = new URLSearchParams(current); next.set("a", user.steamId); return next })
  }, [seeded, user?.steamId, params, setParams])

  const set = (side: Side, value: string | null) => setParams((current) => {
    const next = new URLSearchParams(current)
    if (value) next.set(side, value)
    else next.delete(side)
    return next
  })
  const swap = () => setParams((current) => {
    const next = new URLSearchParams()
    const left = current.get("a")
    const right = current.get("b")
    if (right) next.set("a", right)
    if (left) next.set("b", left)
    return next
  })
  const copyLink = async () => {
    const link = `${window.location.origin}/compare?a=${encodeURIComponent(idA!)}&b=${encodeURIComponent(idB!)}`
    try {
      await navigator.clipboard.writeText(link)
      toast.success("Link copied", { description: "Anyone with it sees this comparison." })
    } catch {
      toast.error("Could not copy the link", { description: link })
    }
  }

  const [saving, setSaving] = useState(false)

  const first = useApiQuery<ProfileOverview>((signal) => profileOverviewService.get(idA!, { signal }), { enabled: Boolean(idA), queryKey: `compare:${idA}` })
  const second = useApiQuery<ProfileOverview>((signal) => profileOverviewService.get(idB!, { signal }), { enabled: Boolean(idB), queryKey: `compare:${idB}` })

  const a = idA ? first.data : null
  const b = idB ? second.data : null
  const same = Boolean(idA && idB && idA === idB)
  const ready = Boolean(a && b && !same)
  const rows = useMemo(() => (a && b ? buildRows(a, b) : []), [a, b])
  const leads = { a: rows.filter((row) => leader(row) === "a").length, b: rows.filter((row) => leader(row) === "b").length }
  const compared = rows.filter((row) => row.a !== null && row.b !== null).length

  const downloadPng = async () => {
    if (!a || !b || saving) return
    setSaving(true)
    try {
      const player = (overview: ProfileOverview) => ({
        name: overview.user.username,
        avatar: overview.user.avatar,
        rankId: overview.competitive?.rankId ?? null,
        rankName: overview.competitive?.rankName ?? null,
        rankImageKey: overview.competitive?.rankImageKey ?? null,
        exp: overview.competitive?.exp ?? null,
      })
      const blob = await renderComparePng({
        players: [player(a), player(b)],
        score: compared > 0 ? leads : null,
        rows: rows.map((row) => {
          const known = row.a !== null && row.b !== null
          return {
            label: row.label,
            a: row.a === null ? null : row.show(row.a),
            b: row.b === null ? null : row.show(row.b),
            lead: leader(row),
            compared: known,
            gap: known ? row.gap(Math.abs(row.a! - row.b!)) : null,
            share: known ? row.a! / Math.max(row.a! + row.b!, 1e-9) : 0.5,
          }
        }),
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "player"
      link.href = url
      // The time makes every file name different, so saving the same pair again never overwrites or renames the first one.
      const now = new Date()
      const pad = (value: number, size = 2) => String(value).padStart(size, "0")
      const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`
      link.download = `legacyx-${slug(a.user.username)}-vs-${slug(b.user.username)}-${stamp}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      toast.error("Could not create the image", { description: "Try again in a moment." })
    } finally {
      setSaving(false)
    }
  }

  const tab = (params.get("tab") === "clans" ? "clans" : "players") as CompareTab
  const setTab = (next: CompareTab) => setParams(() => { const fresh = new URLSearchParams(); if (next !== "players") fresh.set("tab", next); return fresh })
  if (tab !== "players") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageBar>
          <PageTabs<CompareTab> ariaLabel="Compare" value={tab} onChange={setTab} options={COMPARE_TABS} />
          <PageBarEnd><span className="text-[13px] text-[var(--text-dim)] max-lg:hidden">Put two clans side by side</span></PageBarEnd>
        </PageBar>
        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 pb-8 pt-4">
            <ClanCompare params={params} setParams={setParams} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageBar>
        <PageTabs<CompareTab> ariaLabel="Compare" value="players" onChange={setTab} options={COMPARE_TABS} />
        <PageBarEnd>
          <span className="text-[13px] text-[var(--text-dim)] max-lg:hidden">Put two players side by side</span>
          <button type="button" onClick={swap} disabled={!idA && !idB} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text)] transition-colors enabled:hover:border-[var(--line-strong)] disabled:opacity-40"><ArrowLeftRight className="size-4" />Swap</button>
          <button type="button" onClick={copyLink} disabled={!ready} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text)] transition-colors enabled:hover:border-[var(--line-strong)] disabled:opacity-40"><Link2 className="size-4" />Copy link</button>
          <button type="button" onClick={downloadPng} disabled={!ready || saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text)] transition-colors enabled:hover:border-[var(--line-strong)] disabled:opacity-40">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}Download PNG</button>
        </PageBarEnd>
      </PageBar>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 pb-8 pt-4">
        <section aria-label="Players" className="grid rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] md:grid-cols-[1fr_auto_1fr]">
          <PlayerPanel side="a" selectedId={idA} overview={first.data} loading={first.loading} failed={Boolean(first.error)} onPick={(id) => set("a", id)} onClear={() => set("a", null)} onRetry={first.refetch} />
          <div className="flex items-center justify-center border-y border-[var(--line-soft)] px-2 py-2 md:w-28 md:border-x md:border-y-0 md:py-0" aria-live="polite">
            {ready && compared > 0 ? (
              <div className="flex flex-col items-center gap-1">
                <span className="flex items-baseline gap-2 text-[30px] font-black leading-none text-[var(--text)]">
                  <span className={cn("transition-colors duration-500", OUTCOME[outcomeOf(leads.a === leads.b ? null : leads.a > leads.b ? "a" : "b", "a")].text)}><AnimatedNumber value={leads.a} durationMs={700} /></span>
                  <span className="text-lg text-[var(--text-faint)]">:</span>
                  <span className={cn("transition-colors duration-500", OUTCOME[outcomeOf(leads.a === leads.b ? null : leads.a > leads.b ? "a" : "b", "b")].text)}><AnimatedNumber value={leads.b} durationMs={700} /></span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">stats led</span>
              </div>
            ) : (
              <span className="text-sm font-bold tracking-widest text-[var(--text-faint)]">VS</span>
            )}
          </div>
          <PlayerPanel side="b" selectedId={idB} overview={second.data} loading={second.loading} failed={Boolean(second.error)} onPick={(id) => set("b", id)} onClear={() => set("b", null)} onRetry={second.refetch} />
        </section>

        {same ? (
          <p className="py-10 text-center text-[13px] text-[var(--text-dim)]">Pick two different players.</p>
        ) : !idA || !idB ? (
          <p className="py-10 text-center text-[13px] text-[var(--text-dim)]">Choose {idA || idB ? "one more player" : "two players"} to compare.</p>
        ) : ready && a && b ? (
          <>
            <section aria-label="Stats" className="lx-swap-in overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
              <div className="grid grid-cols-[1fr_88px_1fr] items-center gap-3 border-b border-[var(--line-soft)] px-4 py-2.5 text-xs font-semibold">
                <span className="flex items-center justify-end gap-2 text-[var(--text)]"><span className="truncate">{a.user.username}</span><span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", TONE.a.dot)} /></span>
                <span />
                <span className="flex items-center gap-2 text-[var(--text-muted)]"><span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", TONE.b.dot)} /><span className="truncate">{b.user.username}</span></span>
              </div>
              <div className="stagger-in">
                {rows.map((row, index) => <StatRow key={row.key} row={row} index={index} names={{ a: a.user.username, b: b.user.username }} />)}
              </div>
            </section>
            <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-dim)]">
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={cn("size-2 rounded-full", OUTCOME.win.bar)} />Ahead</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={cn("size-2 rounded-full", OUTCOME.loss.bar)} />Behind</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={cn("size-2 rounded-full", OUTCOME.draw.bar)} />Draw</span>
            </p>
            <HeadToHeadPanel idA={idA} idB={idB} a={a} b={b} />
            <RecentForm a={a} b={b} />
            <SharedMaps a={a} b={b} />
          </>
        ) : null}
      </div>
      </div>
    </div>
  )
}
