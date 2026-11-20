import type React from "react"
import { EmptyState } from "@/components/illustrations"
import { useMemo } from "react"

import { profileOverviewService, type ProfileTrack, type TrackMatch } from "@/api/profile-overview"
import { useApiQuery } from "@/hooks/use-api-query"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { cn } from "@/lib/utils"

/**
 * The Profile's Track tab (owner request 2026-11-16, "much more detailed than the ordinary stats"): the numbers behind a player's last
 * ranked matches. Every figure comes from the API (it works them out from what the game plugin reports per match); a number the plugin
 * does not send, such as damage per round, weapons or utility, is not drawn at all.
 */
const card = "lx-pcard rounded-[24px] border border-[var(--glass-line)] bg-[var(--glass-fill)]"
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const fixed = (value: number | null | undefined, digits = 2) => (value === null || value === undefined ? "—" : value.toFixed(digits))
const signed = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0")
const tone = (value: number) => (value > 0 ? "text-[var(--status-green)]" : value < 0 ? "text-[var(--status-red)]" : "text-[var(--text-dim)]")
const day = (value: string | null) => (value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "")

function Title({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <h2 className="flex flex-1 items-center gap-3 text-[16px] font-bold text-[var(--text)] after:h-px after:flex-1 after:bg-gradient-to-r after:from-white/15 after:to-transparent">{children}</h2>
      {note ? <span className="text-[12px] text-[var(--text-dim)]">{note}</span> : null}
    </div>
  )
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl border border-[var(--line-soft)] bg-black/20 px-4 py-3.5">
      <span className="truncate text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-dim)]">{label}</span>
      <span className={cn("text-[26px] font-bold leading-none tabular-nums text-[var(--text)]", accent)}>{value}</span>
      {hint ? <span className="truncate text-[12px] text-[var(--text-dim)]">{hint}</span> : null}
    </div>
  )
}

/** The last matches as bars around a K/D of 1.00: up is a better match than an even trade, down is worse. Green is a win, red a loss. */
function FormChart({ form }: { form: TrackMatch[] }) {
  const W = 720
  const H = 150
  const top = 14
  const max = Math.max(1.5, ...form.map((match) => match.kd))
  const y = (kd: number) => H - ((H - top) * kd) / max
  const gap = 4
  const bar = (W - gap * (form.length - 1)) / Math.max(form.length, 1)
  const average = form.length ? form.reduce((sum, match) => sum + match.kd, 0) / form.length : 0
  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`K/D of the last ${form.length} matches, average ${average.toFixed(2)}`} className="h-auto w-full">
        {form.map((match, index) => {
          const win = match.result === "win"
          const height = Math.max(3, H - y(match.kd))
          return (
            <g key={match.matchId + index}>
              <title>{`${cs2MapLabel(match.map)} · ${day(match.playedAt)} · ${match.kills}-${match.deaths}-${match.assists} · K/D ${match.kd.toFixed(2)} · ${win ? "Win" : match.result === "loss" ? "Loss" : "Draw"} · ${signed(match.expDelta)} EXP`}</title>
              <rect x={index * (bar + gap)} y={H - height} width={bar} height={height} rx="3" fill={win ? "var(--status-green)" : match.result === "loss" ? "var(--status-red)" : "var(--text-dim)"} opacity={win ? 0.85 : 0.75} />
            </g>
          )
        })}
        <line x1="0" x2={W} y1={y(1)} y2={y(1)} stroke="var(--text)" strokeOpacity="0.5" strokeDasharray="5 5" />
        <text x={W - 2} y={y(1) - 5} fontSize="11" textAnchor="end" fill="var(--text)" stroke="#0b0b0d" strokeWidth="3" paintOrder="stroke">K/D 1.00</text>
      </svg>
      <div className="flex justify-between text-[12px] text-[var(--text-dim)]"><span>{day(form[0]?.playedAt ?? null)}</span><span>Average K/D {average.toFixed(2)}. Green: win, red: loss</span><span>{day(form[form.length - 1]?.playedAt ?? null)}</span></div>
    </div>
  )
}

/** EXP built up over the same matches, as one line; the end value is what these matches added or took away. */
function ExpLine({ form }: { form: TrackMatch[] }) {
  const W = 720
  const H = 90
  const points = useMemo(() => {
    let sum = 0
    return form.map((match) => (sum += match.expDelta))
  }, [form])
  if (points.length < 2) return null
  const lo = Math.min(0, ...points)
  const hi = Math.max(0, ...points)
  const span = Math.max(1, hi - lo)
  const y = (value: number) => 8 + (1 - (value - lo) / span) * (H - 16)
  const path = points.map((value, index) => `${index === 0 ? "M" : "L"}${((index / (points.length - 1)) * W).toFixed(1)},${y(value).toFixed(1)}`).join(" ")
  const end = points[points.length - 1]
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between"><span className="text-[13px] font-semibold text-[var(--text)]">EXP over these matches</span><span className={cn("text-[14px] font-bold tabular-nums", tone(end))}>{signed(end)}</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`EXP change over the last ${points.length} matches: ${signed(end)}`} className="h-auto w-full">
        <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="var(--line-strong)" strokeDasharray="4 4" />
        <path d={path} fill="none" stroke={end >= 0 ? "var(--status-green)" : "var(--status-red)"} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function Bars({ values, labels, caption }: { values: number[]; labels: string[]; caption: string }) {
  const top = Math.max(1, ...values)
  return (
    <div className="flex flex-col gap-2" role="img" aria-label={caption}>
      <div className="flex h-24 items-end gap-1.5">
        {values.map((value, index) => (
          <div key={labels[index] + index} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${labels[index]}: ${value} ${value === 1 ? "match" : "matches"}`}>
            <div className="w-full rounded-t-md bg-[var(--brand-bright)]" style={{ height: `${Math.max(value ? 6 : 2, (value / top) * 100)}%`, opacity: value ? 0.35 + 0.65 * (value / top) : 0.15 }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 text-[11px] text-[var(--text-dim)]">{labels.map((label, index) => <span key={label + index} className="min-w-0 flex-1 truncate text-center">{label}</span>)}</div>
    </div>
  )
}

function MatchCard({ title, match }: { title: string; match: TrackMatch }) {
  const art = cs2MapArtwork(match.map)
  return (
    <div className="relative flex min-w-0 items-center gap-4 overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-black/20 p-3.5">
      <span aria-hidden="true" className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--raised)]">{art ? <img src={art} alt="" loading="lazy" className="size-full object-cover" /> : null}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-dim)]">{title}</span>
        <span className="truncate text-[16px] font-bold text-[var(--text)]">{cs2MapLabel(match.map)}</span>
        <span className="text-[13px] text-[var(--text-muted)]">{match.kills} / {match.deaths} / {match.assists} · {day(match.playedAt)}</span>
      </span>
      <span className="flex flex-col items-end"><span className="text-[22px] font-bold leading-none tabular-nums text-[var(--text)]">{match.kd.toFixed(2)}</span><span className="text-[12px] text-[var(--text-dim)]">K/D</span></span>
    </div>
  )
}

function TrackBody({ track }: { track: ProfileTrack }) {
  const { rates, totals, record, streaks, multiKills, clutches } = track
  const streak = streaks.current.type ? `${streaks.current.count} ${streaks.current.type === "win" ? "win" : "loss"}${streaks.current.count === 1 ? "" : streaks.current.type === "win" ? "s" : "es"} in a row` : "No streak"
  const multiTotal = multiKills.rounds3k + multiKills.rounds4k + multiKills.rounds5k
  const topMaps = track.maps.slice(0, 8)
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Summary" className={cn(card, "flex flex-col gap-4 p-5")}>
        <Title note={track.since ? `since ${day(track.since)}` : undefined}>Last {track.matches} ranked {track.matches === 1 ? "match" : "matches"}</Title>
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <Stat label="Record" value={`${record.wins}–${record.losses}${record.draws ? `–${record.draws}` : ""}`} hint={record.winRate === null ? undefined : `${record.winRate}% win rate`} />
          <Stat label="K/D" value={fixed(rates.kd)} hint={`${totals.kills.toLocaleString()} kills, ${totals.deaths.toLocaleString()} deaths`} accent={rates.kd !== null ? (rates.kd >= 1 ? "text-[var(--status-green)]" : "text-[var(--status-red)]") : undefined} />
          <Stat label="Headshots" value={rates.headshotPercent === null ? "—" : `${rates.headshotPercent}%`} hint={`${totals.headshotKills.toLocaleString()} headshot kills`} />
          <Stat label="Streak" value={streaks.current.type ? String(streaks.current.count) : "0"} hint={`${streak}. Best: ${streaks.bestWin} W, ${streaks.bestLoss} L`} accent={streaks.current.type === "win" ? "text-[var(--status-green)]" : streaks.current.type === "loss" ? "text-[var(--status-red)]" : undefined} />
        </div>
      </section>

      <section aria-label="Form" className={cn(card, "flex flex-col gap-4 p-5")}>
        <Title note="One bar per match, newest on the right">Form</Title>
        <FormChart form={track.form} />
        <ExpLine form={track.form} />
      </section>

      <section aria-label="Per round and per match" className={cn(card, "flex flex-col gap-4 p-5")}>
        <Title>Per round and per match</Title>
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <Stat label="KDA" value={fixed(rates.kda)} hint="(kills + assists) / deaths" />
          <Stat label="Kills / round" value={fixed(rates.killsPerRound)} hint={`${totals.rounds.toLocaleString()} rounds`} />
          <Stat label="Deaths / round" value={fixed(rates.deathsPerRound)} />
          <Stat label="Assists / round" value={fixed(rates.assistsPerRound)} />
          <Stat label="Kills / match" value={fixed(rates.killsPerMatch, 1)} />
          <Stat label="Deaths / match" value={fixed(rates.deathsPerMatch, 1)} />
          <Stat label="MVPs / match" value={fixed(rates.mvpPerMatch)} hint={`${totals.mvps.toLocaleString()} MVPs`} />
          <Stat label="EXP / match" value={rates.expPerMatch === null ? "—" : signed(rates.expPerMatch)} accent={rates.expPerMatch === null ? undefined : tone(rates.expPerMatch)} />
        </div>
      </section>

      <section aria-label="Impact" className={cn(card, "flex flex-col gap-4 p-5")}>
        <Title>Impact</Title>
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
          <Stat label="Entry kills" value={totals.entryKills.toLocaleString()} hint={`${fixed(rates.entryKillsPerMatch)} per match`} />
          <Stat label="Clutches won" value={clutches.won.toLocaleString()} hint={clutches.won1v3Plus ? `${clutches.won1v3Plus} of them 1v3 or more` : "none against 3 or more yet"} />
          <Stat label="Bomb planted" value={totals.bombPlants.toLocaleString()} />
          <Stat label="Bomb defused" value={totals.bombDefuses.toLocaleString()} />
        </div>
        <div className="flex flex-col gap-2.5 rounded-2xl border border-[var(--line-soft)] bg-black/20 px-4 py-3.5">
          <div className="flex items-baseline justify-between"><span className="text-[13px] font-semibold text-[var(--text)]">Multi-kill rounds</span><span className="text-[12px] text-[var(--text-dim)]">{multiKills.per100Rounds === null ? "" : `${multiKills.per100Rounds} per 100 rounds`}</span></div>
          {([["3 kills", multiKills.rounds3k], ["4 kills", multiKills.rounds4k], ["5 kills (ace)", multiKills.rounds5k]] as const).map(([label, value]) => (
            <div key={label} className="grid grid-cols-[96px_minmax(0,1fr)_36px] items-center gap-3 text-[13px]">
              <span className="text-[var(--text-muted)]">{label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-[var(--line-soft)]"><span className="block h-full rounded-full bg-[var(--brand-bright)]" style={{ width: `${multiTotal ? Math.max(value ? 4 : 0, (value / multiTotal) * 100) : 0}%` }} /></span>
              <span className="text-right font-semibold tabular-nums text-[var(--text)]">{value}</span>
            </div>
          ))}
        </div>
      </section>

      {topMaps.length > 0 ? (
        <section aria-label="Maps" className={cn(card, "flex flex-col gap-3 p-5")}>
          <Title>Maps</Title>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-y-1.5 text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.06em] text-[var(--text-dim)]">
                  <th className="px-3 font-medium">Map</th><th className="px-3 font-medium">Played</th><th className="w-[26%] px-3 font-medium">Win rate</th><th className="px-3 text-right font-medium">K/D</th><th className="px-3 text-right font-medium">HS%</th><th className="px-3 text-right font-medium">Kills</th><th className="px-3 text-right font-medium">EXP</th>
                </tr>
              </thead>
              <tbody>
                {topMaps.map((entry) => {
                  const art = cs2MapArtwork(entry.map)
                  return (
                    <tr key={entry.map} className="bg-black/20 [&>td]:py-2.5">
                      <td className="rounded-l-xl px-3"><span className="flex items-center gap-2.5"><span aria-hidden="true" className="h-7 w-11 shrink-0 overflow-hidden rounded-md bg-[var(--raised)]">{art ? <img src={art} alt="" loading="lazy" className="size-full object-cover" /> : null}</span><span className="truncate font-semibold text-[var(--text)]">{cs2MapLabel(entry.map)}</span></span></td>
                      <td className="px-3 tabular-nums text-[var(--text-muted)]">{entry.matches}</td>
                      <td className="px-3"><span className="flex items-center gap-2"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line-soft)]"><span className={cn("block h-full rounded-full", entry.winRate >= 50 ? "bg-[var(--status-green)]" : "bg-[var(--status-red)]")} style={{ width: `${entry.winRate}%` }} /></span><span className="w-9 text-right tabular-nums text-[var(--text)]">{entry.winRate}%</span></span></td>
                      <td className="px-3 text-right tabular-nums text-[var(--text)]">{fixed(entry.kd)}</td>
                      <td className="px-3 text-right tabular-nums text-[var(--text-muted)]">{entry.headshotPercent === null ? "—" : `${entry.headshotPercent}%`}</td>
                      <td className="px-3 text-right tabular-nums text-[var(--text-muted)]">{fixed(entry.killsPerMatch, 1)}</td>
                      <td className={cn("rounded-r-xl px-3 text-right font-semibold tabular-nums", tone(entry.exp))}>{signed(entry.exp)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {track.best || track.worst ? (
        <section aria-label="Best and worst match" className={cn(card, "flex flex-col gap-3 p-5")}>
          <Title>Best and worst match</Title>
          <div className="grid gap-3 @3xl:grid-cols-2">
            {track.best ? <MatchCard title="Best K/D" match={track.best} /> : null}
            {track.worst ? <MatchCard title="Worst K/D" match={track.worst} /> : null}
          </div>
        </section>
      ) : null}

      <section aria-label="When you play" className={cn(card, "flex flex-col gap-4 p-5")}>
        <Title note="Ulaanbaatar time">When these matches were played</Title>
        <div className="grid gap-5 @3xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Bars values={track.activity.weekdays} labels={WEEKDAYS} caption="Matches per weekday" />
          <Bars values={track.activity.hours} labels={track.activity.hours.map((_, hour) => (hour % 3 === 0 ? String(hour) : ""))} caption="Matches per hour of the day" />
        </div>
        {track.leftEarly > 0 ? <p className="m-0 text-[12px] text-[var(--text-dim)]">{track.leftEarly} {track.leftEarly === 1 ? "match was" : "matches were"} left before the end.</p> : null}
      </section>

      <p className="m-0 px-1 text-[12px] leading-relaxed text-[var(--text-dim)]">Worked out from what the servers report for each ranked match. Damage per round, weapons and utility are not reported yet, so they are not shown.</p>
    </div>
  )
}

export function ProfileTrackTab({ userId, banned }: { userId: string; banned?: boolean }) {
  const { data, loading, error, refetch } = useApiQuery((signal) => profileOverviewService.getTrack(userId, { signal }), { queryKey: `profile-track:${userId}`, keepPreviousData: true })
  if (banned || data?.banned) return <p className={cn(card, "px-5 py-10 text-center text-[14px] text-[var(--text-dim)]")}>Banned. No numbers are shown while a ban is active.</p>
  if (!data && loading) return <div aria-hidden="true" className="flex flex-col gap-4">{[0, 1, 2].map((index) => <div key={index} className={cn(card, "h-40 animate-pulse")} />)}</div>
  if (!data && error) return <p role="alert" className={cn(card, "flex flex-col items-center gap-3 px-5 py-10 text-[14px] text-[var(--text-muted)]")}>Couldn't load the track.<button type="button" onClick={() => refetch()} className="h-9 rounded-lg border border-[var(--line-strong)] px-4 font-semibold text-[var(--text)] hover:bg-[var(--raised)]">Try again</button></p>
  if (data?.hidden) return <p className={cn(card, "px-5 py-10 text-center text-[14px] text-[var(--text-dim)]")}>The player has hidden their stats.</p>
  if (!data?.track || data.track.matches === 0) return <EmptyState kind="trophy" className={cn(card, "rounded-xl")}>No ranked matches yet. Play a few and the track fills in.</EmptyState>
  return <TrackBody track={data.track} />
}
