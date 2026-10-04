/**
 * Compare: two players side by side. Each side is a normal profile overview, so the numbers are the ones on their
 * profiles; a section a player hid stays hidden here and is never compared.
 */
import { useEffect, useMemo, useState } from "react"
import { ArrowLeftRight, RotateCcw, Search, X } from "lucide-react"

import { searchService } from "@/api"
import { profileOverviewService, type ProfileOverview } from "@/api/profile-overview"
import type { CommunityPlayer } from "@/api/types"
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

const MIN_MAP_MATCHES = 3

interface Row {
  key: string
  label: string
  a: number | null
  b: number | null
  show: (value: number) => string
  /** Extra line under the value, e.g. the rank name. */
  note?: { a?: string; b?: string }
}

const statValue = (overview: ProfileOverview, key: NonNullable<ProfileOverview["stats"]>[number]["key"]) => overview.stats?.find((entry) => entry.key === key)?.value ?? null

function buildRows(a: ProfileOverview, b: ProfileOverview): Row[] {
  const whole = (value: number) => String(Math.round(value))
  return [
    { key: "rank", label: "EXP", a: a.competitive?.exp ?? null, b: b.competitive?.exp ?? null, show: whole, note: { a: a.competitive?.rankName, b: b.competitive?.rankName } },
    { key: "matches", label: "Matches", a: statValue(a, "matches"), b: statValue(b, "matches"), show: whole },
    { key: "winRate", label: "Win rate", a: statValue(a, "winRate"), b: statValue(b, "winRate"), show: (value) => `${Math.round(value)}%` },
    { key: "kd", label: "K/D", a: statValue(a, "kd"), b: statValue(b, "kd"), show: (value) => value.toFixed(2) },
    { key: "hs", label: "Headshot %", a: statValue(a, "hs"), b: statValue(b, "hs"), show: (value) => `${Math.round(value)}%` },
    { key: "avgKills", label: "Avg. kills", a: statValue(a, "avgKills"), b: statValue(b, "avgKills"), show: (value) => value.toFixed(1) },
  ]
}

function leader(row: Row): Side | null {
  if (row.a === null || row.b === null || row.a === row.b) return null
  return row.a > row.b ? "a" : "b"
}

function PlayerPicker({ side, selectedId, overview, loading, error, onPick, onClear, onRetry }: {
  side: Side
  selectedId: string | null
  overview: ProfileOverview | null
  loading: boolean
  error: boolean
  onPick: (steamId: string) => void
  onClear: () => void
  onRetry: () => void
}) {
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [query])
  const { data: results, loading: searching } = useApiQuery<CommunityPlayer[]>(
    (signal) => searchService.searchPlayers(debounced, { signal }).then((response) => response.players),
    { enabled: !selectedId && debounced.length >= 2, queryKey: `compare-search:${side}:${debounced}` },
  )

  const frame = "flex min-h-[84px] items-center gap-3.5 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] px-4 py-3"
  const label = side === "a" ? "Player 1" : "Player 2"

  if (selectedId) {
    if (error) {
      return (
        <div className={frame}>
          <span className="text-[13px] text-[var(--text-dim)]">This player could not be loaded.</span>
          <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
          <button type="button" onClick={onClear} aria-label={`Remove ${label}`} className="ml-auto text-[var(--text-dim)] hover:text-[var(--text)]"><X className="size-4" /></button>
        </div>
      )
    }
    if (loading || !overview) {
      return (
        <div className={frame} aria-hidden="true">
          <Skeleton className="size-12 rounded-xl bg-[var(--line-soft)]" />
          <div className="flex flex-col gap-2"><Skeleton className="h-3.5 w-32 rounded-full bg-[var(--line)]" /><Skeleton className="h-2.5 w-20 rounded-full bg-[var(--line-soft)]" /></div>
        </div>
      )
    }
    return (
      <div className={frame}>
        <PlayerAvatar avatar={overview.user.avatar} name={overview.user.username} className="size-12 rounded-xl text-sm" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-2"><span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", TONE[side].dot)} /><span className="truncate text-[15px] font-semibold text-[var(--text)]">{overview.user.username}</span></span>
          <span className="truncate text-xs text-[var(--text-dim)]">{overview.competitive?.rankName ?? "Unranked"}</span>
        </div>
        <button type="button" onClick={onClear} aria-label={`Change ${label}`} className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--text-dim)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]"><X className="size-4" /></button>
      </div>
    )
  }

  return (
    <div className="relative">
      <label className={cn(frame, "cursor-text focus-within:border-[var(--line-strong)]")}>
        <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", TONE[side].dot)} />
        <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={`Find ${label}`}
          placeholder={`${label}: name or Steam ID`}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]"
        />
      </label>
      {debounced.length >= 2 && (
        <ul className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--card-surface)] p-1 shadow-lg">
          {searching && !results ? (
            <li className="px-3 py-3 text-xs text-[var(--text-dim)]">Searching…</li>
          ) : (results ?? []).length === 0 ? (
            <li className="px-3 py-3 text-xs text-[var(--text-dim)]">No player matches this search.</li>
          ) : (
            (results ?? []).slice(0, 8).map((player) => (
              <li key={player.steamId ?? player.name}>
                <button
                  type="button"
                  disabled={!player.steamId}
                  onClick={() => { if (player.steamId) { onPick(player.steamId); setQuery("") } }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-[var(--text)] transition-colors enabled:hover:bg-[var(--raised)] disabled:opacity-50"
                >
                  <PlayerAvatar avatar={player.avatar} name={player.name} className="size-7 rounded-lg text-[10px]" />
                  <span className="truncate">{player.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

function StatRow({ row, names }: { row: Row; names: { a: string; b: string } }) {
  const lead = leader(row)
  const total = row.a !== null && row.b !== null ? Math.max(row.a + row.b, 1e-9) : 0
  const cell = (side: Side) => {
    const value = row[side]
    return (
      <div className={cn("flex min-w-0 flex-col gap-0.5", side === "a" ? "items-end text-right" : "items-start text-left")}>
        <span className={cn("text-[22px] font-bold leading-none", value === null ? "text-[var(--text-faint)]" : lead === side ? "text-[var(--text)]" : lead ? "text-[var(--text-dim)]" : "text-[var(--text)]")}>{value === null ? "—" : row.show(value)}</span>
        {value === null ? <span className="text-[10px] text-[var(--text-faint)]">Hidden</span> : row.note?.[side] ? <span className="max-w-full truncate text-[11px] text-[var(--text-dim)]">{row.note[side]}</span> : null}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2.5 border-b border-[var(--line-soft)] px-4 py-3.5 last:border-b-0" role="group" aria-label={`${row.label}: ${names.a} ${row.a === null ? "hidden" : row.show(row.a)}, ${names.b} ${row.b === null ? "hidden" : row.show(row.b)}`}>
      <div className="grid grid-cols-[1fr_96px_1fr] items-center gap-3">
        {cell("a")}
        <span className="text-center text-[11px] font-medium uppercase tracking-wider text-[var(--text-dim)]">{row.label}</span>
        {cell("b")}
      </div>
      <div aria-hidden="true" className="flex h-1 gap-0.5">
        <div className="flex flex-1 justify-end overflow-hidden rounded-l-full bg-[var(--line-soft)]"><div className={cn("h-full", TONE.a.bar, lead === "b" && "opacity-40")} style={{ width: total ? `${((row.a ?? 0) / total) * 100}%` : 0 }} /></div>
        <div className="flex flex-1 overflow-hidden rounded-r-full bg-[var(--line-soft)]"><div className={cn("h-full", TONE.b.bar, lead === "a" && "opacity-40")} style={{ width: total ? `${((row.b ?? 0) / total) * 100}%` : 0 }} /></div>
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
        <span className="text-xs text-[var(--text-dim)]">Win rate · at least {MIN_MAP_MATCHES} matches each</span>
      </div>
      {shared.map(({ map, a: left, b: right }) => {
        const lead: Side | null = left.winRate === right.winRate ? null : left.winRate > right.winRate ? "a" : "b"
        return (
          <div key={map} className="grid grid-cols-[1fr_120px_1fr] items-center gap-3 border-b border-[var(--line-soft)] px-4 py-3 last:border-b-0">
            <span className={cn("text-right text-base font-bold", lead === "b" ? "text-[var(--text-dim)]" : "text-[var(--text)]")}>{left.winRate}%<span className="ml-1.5 text-[11px] font-normal text-[var(--text-dim)]">{left.matches}</span></span>
            <span className="truncate text-center text-xs text-[var(--text-2)]">{cs2MapLabel(map)}</span>
            <span className={cn("text-left text-base font-bold", lead === "a" ? "text-[var(--text-dim)]" : "text-[var(--text)]")}><span className="mr-1.5 text-[11px] font-normal text-[var(--text-dim)]">{right.matches}</span>{right.winRate}%</span>
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
          <div className="relative z-10 flex flex-col gap-2.5 p-7">
            <h1 className="flex items-center gap-2.5 text-[34px] font-bold leading-[1.1] tracking-[-0.6px] text-[var(--text)]">
              <span aria-hidden="true" className="h-7 w-1 rounded-full bg-[var(--text-faint)]" />
              {PAGE_TITLES.compare}
            </h1>
            <span className="text-[14px] text-[var(--text-2)]">Put two players side by side.</span>
          </div>
        </section>

        <div className="grid items-start gap-3 md:grid-cols-[1fr_auto_1fr]">
          <PlayerPicker side="a" selectedId={idA} overview={first.data} loading={first.loading} error={Boolean(first.error)} onPick={(id) => set("a", id)} onClear={() => set("a", null)} onRetry={first.refetch} />
          <span aria-hidden="true" className="hidden size-9 items-center justify-center self-center rounded-full border border-[var(--line)] bg-[var(--panel)] text-[var(--text-dim)] md:flex"><ArrowLeftRight className="size-4" /></span>
          <PlayerPicker side="b" selectedId={idB} overview={second.data} loading={second.loading} error={Boolean(second.error)} onPick={(id) => set("b", id)} onClear={() => set("b", null)} onRetry={second.refetch} />
        </div>

        {same ? (
          <p className="py-12 text-center text-[13px] text-[var(--text-dim)]">Pick two different players.</p>
        ) : !idA || !idB ? (
          <p className="py-12 text-center text-[13px] text-[var(--text-dim)]">Choose {idA || idB ? "one more player" : "two players"} to compare.</p>
        ) : ready && a && b ? (
          <>
            {compared > 0 && (
              <p className="text-center text-[13px] text-[var(--text-2)]">
                {leads.a === leads.b
                  ? <>Level: <span className="font-semibold text-[var(--text)]">{leads.a}</span> each of {compared} stats.</>
                  : <><span className="font-semibold text-[var(--text)]">{leads.a > leads.b ? a.user.username : b.user.username}</span> leads in {Math.max(leads.a, leads.b)} of {compared} stats.</>}
              </p>
            )}
            <section aria-label="Stats" className="overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
              {rows.map((row) => <StatRow key={row.key} row={row} names={{ a: a.user.username, b: b.user.username }} />)}
            </section>
            <SharedMaps a={a} b={b} />
          </>
        ) : null}
      </div>
    </div>
  )
}
