import { useCallback, useEffect, useRef, useState } from "react"
import { EmptyState } from "@/components/illustrations"

import { profileOverviewService, type HistoryMatch, type ProfileHistoryPage } from "@/api/profile-overview"
import { SelectMenu } from "@/components/select-menu"
import { MatchDetailsDialog } from "@/components/match-details-dialog"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { cn } from "@/lib/utils"

/**
 * The Profile's History tab (owner request 2026-11-16): every ranked match, newest first, 25 at a time, with a result filter and a map
 * filter. A row opens the same full match window as Recent matches. Every figure is the API's.
 */
const card = "lx-pcard rounded-[24px] border border-[var(--glass-line)] bg-[var(--glass-fill)]"

type ResultFilter = "all" | "win" | "loss"

const sign = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0")
const tone = (value: number) => (value > 0 ? "text-[var(--status-green)]" : value < 0 ? "text-[var(--status-red)]" : "text-[var(--text-dim)]")
const resultTone = (result: string) => (result === "Win" ? "text-[var(--status-green)]" : result === "Loss" ? "text-[var(--status-red)]" : "text-[var(--text-muted)]")
const resultPill = (result: string) => (result === "Win" ? "bg-[color-mix(in_srgb,var(--status-green)_14%,transparent)] text-[var(--status-green)]" : result === "Loss" ? "bg-[color-mix(in_srgb,var(--status-red)_14%,transparent)] text-[var(--status-red)]" : "bg-[var(--raised)] text-[var(--text-muted)]")
const dayOf = (value?: string | null) => (value ? new Date(value).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "Earlier")
const clock = (value?: string | null) => (value ? new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "")

function Row({ match, onOpen }: { match: HistoryMatch; onOpen: (match: HistoryMatch) => void }) {
  const art = cs2MapArtwork(match.map)
  const rankMoved = match.rankBefore && match.rankAfter && match.rankBefore.id !== match.rankAfter.id
  return (
    <button type="button" onClick={() => onOpen(match)} disabled={!match.matchId} aria-label={`${cs2MapLabel(match.map)} ${match.score}, ${match.result}. Open the match`}
      className="grid min-h-[68px] w-full grid-cols-[68px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-xl border border-[var(--line-soft)] bg-black/20 px-3.5 py-2.5 text-left transition-[background-color,border-color,transform] duration-150 hover:translate-x-0.5 hover:border-[var(--line-strong)] hover:bg-[var(--raised)] disabled:cursor-default disabled:hover:translate-x-0 @2xl:grid-cols-[68px_96px_minmax(0,1.2fr)_minmax(0,1fr)_72px_84px]">
      <span aria-hidden="true" className="relative h-11 w-[68px] shrink-0 overflow-hidden rounded-md bg-[var(--raised)]">{art ? <img src={art} alt="" loading="lazy" className="size-full object-cover" /> : null}</span>
      <span className="hidden flex-col @2xl:flex"><span className={cn("text-[20px] font-bold leading-tight tabular-nums", resultTone(match.result))}>{match.score}</span><span className="text-[12px] text-[var(--text-dim)]">{clock(match.playedAt)}</span></span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-2"><span className="truncate font-semibold text-[var(--text)]">{cs2MapLabel(match.map)}</span><span className={cn("inline-flex h-[22px] shrink-0 items-center rounded-full px-2 text-[12px] font-semibold", resultPill(match.result))}>{match.result}</span></span>
        <span className="text-[12px] text-[var(--text-dim)] @2xl:hidden"><b className={cn("font-semibold tabular-nums", resultTone(match.result))}>{match.score}</b> · {clock(match.playedAt)}</span>
        {rankMoved ? <span className="truncate text-[12px] text-[var(--text-muted)]">{match.rankBefore?.name} {"→"} {match.rankAfter?.name}</span> : null}
      </span>
      <span className="hidden min-w-0 flex-col gap-0.5 text-[13px] @2xl:flex">
        <span className="text-[var(--text)]"><b className="font-semibold tabular-nums">{match.kills}</b> / <b className="font-semibold tabular-nums">{match.deaths}</b> / <b className="font-semibold tabular-nums">{match.assists}</b></span>
        <span className="text-[12px] text-[var(--text-dim)]">{match.headshotPercent === null ? "No kills" : `${match.headshotPercent}% headshots`}{match.mvps ? ` · ${match.mvps} MVP` : ""}</span>
      </span>
      <span className="hidden flex-col items-end @2xl:flex"><span className="text-[15px] font-bold tabular-nums text-[var(--text)]">{match.kd}</span><span className="text-[11px] text-[var(--text-dim)]">K/D</span></span>
      <span className="flex flex-col items-end"><span className={cn("text-[16px] font-bold tabular-nums", tone(match.expDelta ?? 0))}>{typeof match.expDelta === "number" ? sign(match.expDelta) : "—"}</span><span className="text-[11px] text-[var(--text-dim)]">EXP</span></span>
    </button>
  )
}

export function ProfileHistoryTab({ userId, steamId, banned }: { userId: string; steamId: string; banned?: boolean }) {
  const [result, setResult] = useState<ResultFilter>("all")
  const [map, setMap] = useState("")
  const [matches, setMatches] = useState<HistoryMatch[]>([])
  const [meta, setMeta] = useState<Pick<ProfileHistoryPage, "banned" | "hidden" | "total" | "cursor" | "maps"> | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState<HistoryMatch | null>(null)
  const request = useRef(0)

  const load = useCallback(async (before: string | null) => {
    const id = ++request.current
    setLoading(true)
    setFailed(false)
    try {
      const page = await profileOverviewService.getHistory(userId, { before, result: result === "all" ? null : result, map: map || null })
      if (id !== request.current) return
      setMatches((current) => (before ? [...current, ...page.matches] : page.matches))
      setMeta({ banned: page.banned, hidden: page.hidden, total: page.total, cursor: page.cursor, maps: page.maps })
    } catch {
      if (id === request.current) setFailed(true)
    } finally {
      if (id === request.current) setLoading(false)
    }
  }, [userId, result, map])

  useEffect(() => { void load(null) }, [load])

  if (banned || meta?.banned) return <p className={cn(card, "px-5 py-10 text-center text-[14px] text-[var(--text-dim)]")}>Banned. No match history is shown while a ban is active.</p>
  if (meta?.hidden) return <p className={cn(card, "px-5 py-10 text-center text-[14px] text-[var(--text-dim)]")}>The player has hidden their matches.</p>

  const days: Array<{ title: string; rows: HistoryMatch[]; exp: number }> = []
  for (const match of matches) {
    const title = dayOf(match.playedAt)
    let group = days.find((entry) => entry.title === title)
    if (!group) { group = { title, rows: [], exp: 0 }; days.push(group) }
    group.rows.push(match)
    group.exp += match.expDelta ?? 0
  }
  const chip = (value: ResultFilter, label: string) => (
    <button key={value} type="button" aria-pressed={result === value} onClick={() => setResult(value)} className={cn("h-10 rounded-full border px-4 text-[14px] font-semibold transition-colors", result === value ? "border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text)]" : "border-[var(--line-soft)] text-[var(--text-muted)] hover:text-[var(--text)]")}>{label}</button>
  )

  return (
    <section aria-label="Match history" className={cn(card, "@container flex flex-col gap-4 p-5")}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-baseline gap-3 text-[16px] font-bold text-[var(--text)]">History{meta ? <span className="text-[13px] font-medium text-[var(--text-dim)]">{meta.total.toLocaleString()} {meta.total === 1 ? "match" : "matches"}</span> : null}</h2>
        <span className="flex-1" />
        {chip("all", "All")}{chip("win", "Wins")}{chip("loss", "Losses")}
        {meta && meta.maps.length > 1 ? (
          <SelectMenu ariaLabel="Map" value={map} onChange={setMap} options={[{ value: "", label: "All maps" }, ...meta.maps.map((name) => ({ value: name, label: cs2MapLabel(name) }))]} />
        ) : null}
      </div>

      {failed ? (
        <p role="alert" className="flex flex-col items-center gap-3 py-8 text-[14px] text-[var(--text-muted)]">Couldn't load the history.<button type="button" onClick={() => void load(null)} className="h-9 rounded-lg border border-[var(--line-strong)] px-4 font-semibold text-[var(--text)] hover:bg-[var(--raised)]">Try again</button></p>
      ) : loading && matches.length === 0 ? (
        <div aria-hidden="true" className="flex flex-col gap-2">{[0, 1, 2, 3, 4].map((index) => <div key={index} className="h-[68px] animate-pulse rounded-xl bg-black/20" />)}</div>
      ) : matches.length === 0 ? (
        <EmptyState kind="trophy">{result === "all" && !map ? "No ranked matches yet." : "No matches fit this filter."}</EmptyState>
      ) : (
        <div className="flex flex-col gap-5">
          {days.map((day) => (
            <div key={day.title} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2.5 px-0.5">
                <span className="text-[14px] font-semibold text-[var(--text)]">{day.title}</span>
                <span className="text-[13px] text-[var(--text-dim)]">{day.rows.length} {day.rows.length === 1 ? "match" : "matches"}</span>
                <span className={cn("ml-auto text-[13px] font-semibold tabular-nums", tone(day.exp))}>{sign(day.exp)} EXP</span>
              </div>
              {day.rows.map((match, index) => <Row key={`${match.matchId ?? "m"}-${index}`} match={match} onOpen={setOpen} />)}
            </div>
          ))}
          {meta?.cursor ? (
            <button type="button" disabled={loading} onClick={() => void load(meta.cursor)} className="mx-auto flex h-11 items-center justify-center rounded-lg border border-[var(--line-strong)] px-6 font-semibold text-[var(--text)] transition-colors hover:bg-[var(--raised)] disabled:opacity-60">
              {loading ? "Loading…" : `Show more (${Math.max(0, (meta.total ?? 0) - matches.length)} left)`}
            </button>
          ) : null}
        </div>
      )}

      {open?.matchId ? <MatchDetailsDialog matchId={open.matchId} mapNumber={open.mapNumber ?? 1} highlightSteamId={steamId} exp={open} onOpenChange={(next) => { if (!next) setOpen(null) }} /> : null}
    </section>
  )
}
