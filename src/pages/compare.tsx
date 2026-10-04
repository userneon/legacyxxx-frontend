/**
 * Compare: two players side by side. Each side is a normal profile overview, so the numbers are the ones on their
 * profiles; a section a player hid stays hidden here and is never compared.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeftRight, Link2, RotateCcw, Search, X } from "lucide-react"
import { toast } from "sonner"

import { competitiveService, searchService } from "@/api"
import { profileOverviewService, type ProfileOverview } from "@/api/profile-overview"
import type { CommunityPlayer } from "@/api/types"
import { CompetitiveRankBadge, rankTierColor } from "@/components/competitive-rank-badge"
import { PlayerAvatar } from "@/components/player-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { useViewParams } from "@/hooks/use-view-params"
import { cs2MapLabel } from "@/lib/cs2-map-art"
import { PAGE_TITLES } from "@/lib/routes"
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
  /** The gap between the two, for the pill next to the leader. */
  gap: (difference: number) => string
}

const statValue = (overview: ProfileOverview, key: NonNullable<ProfileOverview["stats"]>[number]["key"]) => overview.stats?.find((entry) => entry.key === key)?.value ?? null

function buildRows(a: ProfileOverview, b: ProfileOverview): Row[] {
  const whole = (value: number) => Math.round(value).toLocaleString()
  const points = (value: number) => `${Math.round(value)} pts`
  return [
    { key: "rank", label: "EXP", a: a.competitive?.exp ?? null, b: b.competitive?.exp ?? null, show: whole, gap: whole },
    { key: "matches", label: "Matches", a: statValue(a, "matches"), b: statValue(b, "matches"), show: whole, gap: whole },
    { key: "winRate", label: "Win rate", a: statValue(a, "winRate"), b: statValue(b, "winRate"), show: (value) => `${Math.round(value)}%`, gap: points },
    { key: "kd", label: "K/D", a: statValue(a, "kd"), b: statValue(b, "kd"), show: (value) => value.toFixed(2), gap: (value) => value.toFixed(2) },
    { key: "hs", label: "Headshot %", a: statValue(a, "hs"), b: statValue(b, "hs"), show: (value) => `${Math.round(value)}%`, gap: points },
    { key: "avgKills", label: "Avg. kills", a: statValue(a, "avgKills"), b: statValue(b, "avgKills"), show: (value) => value.toFixed(1), gap: (value) => value.toFixed(1) },
  ]
}

function leader(row: Row): Side | null {
  if (row.a === null || row.b === null || row.a === row.b) return null
  return row.a > row.b ? "a" : "b"
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
        <ul id={`compare-results-${side}`} role="listbox" aria-label={`${label} results`} className="absolute inset-x-0 top-[52px] z-20 max-h-72 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--card-surface)] p-1 shadow-lg">
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
    <div className={panel}>
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

function StatRow({ row, names }: { row: Row; names: { a: string; b: string } }) {
  const lead = leader(row)
  const total = row.a !== null && row.b !== null ? Math.max(row.a + row.b, 1e-9) : 0
  const difference = row.a !== null && row.b !== null ? Math.abs(row.a - row.b) : 0
  const known = row.a !== null && row.b !== null
  const cell = (side: Side) => {
    const value = row[side]
    const outcome = OUTCOME[outcomeOf(lead, side)]
    const gap = !known ? null : lead === null ? "Draw" : lead === side ? `+${row.gap(difference)}` : null
    return (
      <div className={cn("flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2", side === "a" ? "items-end text-right sm:flex-row-reverse sm:justify-start" : "items-start text-left sm:justify-start")}>
        <span className={cn("text-[22px] font-bold leading-none sm:text-[24px]", value === null ? "text-[var(--text-faint)]" : known ? outcome.text : "text-[var(--text)]")}>{value === null ? "—" : row.show(value)}</span>
        {value === null ? <span className="text-[10px] text-[var(--text-faint)]">Hidden</span> : gap ? <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", outcome.pill)}>{gap}</span> : null}
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
        <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-[var(--line-soft)]"><div className={cn("h-full rounded-full transition-[width] duration-500", known ? OUTCOME[outcomeOf(lead, "a")].bar : TONE.a.bar)} style={{ width: total ? `${((row.a ?? 0) / total) * 100}%` : 0 }} /></div>
        <div className="flex flex-1 overflow-hidden rounded-full bg-[var(--line-soft)]"><div className={cn("h-full rounded-full transition-[width] duration-500", known ? OUTCOME[outcomeOf(lead, "b")].bar : TONE.b.bar)} style={{ width: total ? `${((row.b ?? 0) / total) * 100}%` : 0 }} /></div>
      </div>
    </div>
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
    <section aria-label="Maps both have played" className="overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
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

  const first = useApiQuery<ProfileOverview>((signal) => profileOverviewService.get(idA!, { signal }), { enabled: Boolean(idA), queryKey: `compare:${idA}` })
  const second = useApiQuery<ProfileOverview>((signal) => profileOverviewService.get(idB!, { signal }), { enabled: Boolean(idB), queryKey: `compare:${idB}` })

  const a = idA ? first.data : null
  const b = idB ? second.data : null
  const same = Boolean(idA && idB && idA === idB)
  const ready = Boolean(a && b && !same)
  const rows = useMemo(() => (a && b ? buildRows(a, b) : []), [a, b])
  const leads = { a: rows.filter((row) => leader(row) === "a").length, b: rows.filter((row) => leader(row) === "b").length }
  const compared = rows.filter((row) => row.a !== null && row.b !== null).length

  return (
    <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 pb-8 pt-6">
        <section aria-label={PAGE_TITLES.compare} className="relative overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
          <div aria-hidden="true" className="lx-hero-glow pointer-events-none absolute -inset-10" />
          <div aria-hidden="true" className="lx-hero-grid pointer-events-none absolute inset-0" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent" />
          <div className="relative z-10 flex flex-wrap items-end justify-between gap-4 p-7">
            <div className="flex flex-col gap-2.5">
              <h1 className="flex items-center gap-2.5 text-[34px] font-bold leading-[1.1] tracking-[-0.6px] text-[var(--text)]">
                <span aria-hidden="true" className="h-7 w-1 rounded-full bg-[var(--text-faint)]" />
                {PAGE_TITLES.compare}
              </h1>
              <span className="text-[14px] text-[var(--text-2)]">Put two players side by side.</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={swap} disabled={!idA && !idB} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text)] transition-colors enabled:hover:border-[var(--line-strong)] disabled:opacity-40"><ArrowLeftRight className="size-4" />Swap</button>
              <button type="button" onClick={copyLink} disabled={!ready} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text)] transition-colors enabled:hover:border-[var(--line-strong)] disabled:opacity-40"><Link2 className="size-4" />Copy link</button>
            </div>
          </div>
        </section>

        <section aria-label="Players" className="grid rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] md:grid-cols-[1fr_auto_1fr]">
          <PlayerPanel side="a" selectedId={idA} overview={first.data} loading={first.loading} failed={Boolean(first.error)} onPick={(id) => set("a", id)} onClear={() => set("a", null)} onRetry={first.refetch} />
          <div className="flex items-center justify-center border-y border-[var(--line-soft)] px-2 py-2 md:w-28 md:border-x md:border-y-0 md:py-0" aria-live="polite">
            {ready && compared > 0 ? (
              <div className="flex flex-col items-center gap-1">
                <span className="flex items-baseline gap-2 text-[30px] font-black leading-none text-[var(--text)]">
                  <span className={OUTCOME[outcomeOf(leads.a === leads.b ? null : leads.a > leads.b ? "a" : "b", "a")].text}>{leads.a}</span>
                  <span className="text-lg text-[var(--text-faint)]">:</span>
                  <span className={OUTCOME[outcomeOf(leads.a === leads.b ? null : leads.a > leads.b ? "a" : "b", "b")].text}>{leads.b}</span>
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
            <section aria-label="Stats" className="overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
              <div className="grid grid-cols-[1fr_88px_1fr] items-center gap-3 border-b border-[var(--line-soft)] px-4 py-2.5 text-xs font-semibold">
                <span className="flex items-center justify-end gap-2 text-[var(--text)]"><span className="truncate">{a.user.username}</span><span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", TONE.a.dot)} /></span>
                <span />
                <span className="flex items-center gap-2 text-[var(--text-muted)]"><span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", TONE.b.dot)} /><span className="truncate">{b.user.username}</span></span>
              </div>
              {rows.map((row) => <StatRow key={row.key} row={row} names={{ a: a.user.username, b: b.user.username }} />)}
            </section>
            <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-dim)]">
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={cn("size-2 rounded-full", OUTCOME.win.bar)} />Ahead</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={cn("size-2 rounded-full", OUTCOME.loss.bar)} />Behind</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={cn("size-2 rounded-full", OUTCOME.draw.bar)} />Draw</span>
            </p>
            <SharedMaps a={a} b={b} />
          </>
        ) : null}
      </div>
    </div>
  )
}
