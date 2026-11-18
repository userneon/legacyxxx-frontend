import { CountText } from "@/components/animated-number"
/** Home parts: the map slider, the signed-in player's rank and four ring stats, the four mode cards and the rank medals. Real data only. */
import { useEffect, useId, useState } from "react"
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { cn } from "@/lib/utils"
import { competitiveService } from "@/api"
import { profileOverviewService } from "@/api/profile-overview"
import type { CompetitiveProfile } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { CompetitiveRankBadge, rankTierColor } from "@/components/competitive-rank-badge"
import { Skeleton } from "@/components/ui/skeleton"
import agentSlide from "@/assets/home/agent-hero.webp"
import scannerSlide from "@/assets/home/slide-scanner.webp"
import caughtSlide from "@/assets/home/slide-caught.webp"

/* ───────── Rank medals (gold, silver, bronze for the first three places) ───────── */

const MEDALS = {
  1: { a: "#fff1a8", b: "#f2b705", c: "#a86a00", d: "#7a4a00", label: "1st place" }, // palette-exempt: medal metals
  2: { a: "#ffffff", b: "#cfd6de", c: "#8b95a1", d: "#5d6772", label: "2nd place" }, // palette-exempt: medal metals
  3: { a: "#ffd2b8", b: "#d98a63", c: "#a2532f", d: "#6e3519", label: "3rd place" }, // palette-exempt: medal metals
} as const

/** A glossy coin for the first three places: a rim, an inner ring, a person and a highlight, drawn here (no picture). */
export function RankMedal({ place, size = 28 }: { place: 1 | 2 | 3; size?: number }) {
  const id = useId().replace(/:/g, "")
  const m = MEDALS[place]
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} role="img" aria-label={m.label}>
      <defs>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={m.a} /><stop offset=".5" stopColor={m.b} /><stop offset="1" stopColor={m.c} /></linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={m.b} /><stop offset="1" stopColor={m.c} /></linearGradient>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={m.a} /><stop offset="1" stopColor={m.b} /></linearGradient>
      </defs>
      <circle cx="20" cy="21" r="18" fill="#000" opacity=".35" />
      <circle cx="20" cy="20" r="18" fill={`url(#${id}r)`} />
      <circle cx="20" cy="20" r="14.6" fill={`url(#${id}f)`} stroke={m.d} strokeOpacity=".5" strokeWidth=".8" />
      <circle cx="20" cy="20" r="12.6" fill="none" stroke={m.a} strokeOpacity=".55" strokeWidth=".7" />
      <circle cx="20" cy="15.6" r="3.6" fill={`url(#${id}p)`} />
      <path d="M12.4 27.4c.5-4.4 3.6-6.2 7.6-6.2s7.1 1.8 7.6 6.2z" fill={`url(#${id}p)`} />
      <path d="M6.5 13a14.5 14.5 0 0 1 27 0" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

/* ───────── Hero slider ───────── */

/** The slides: a picture and the line written on it. Add a slide here (and its picture in src/assets/home); the arrows and dots appear with the second one. */
const SLIDES: { key: string; src: string; label: string; alt: string; focus?: string; fade?: boolean }[] = [
  { key: "agent", src: agentSlide, label: "Counter-Strike 2 on LXC servers", fade: true, focus: "50% 12%", alt: "A CS2 agent in a burgundy shearling jacket and sunglasses, throwing the horns, against snowy mountains at dusk" },
  { key: "scanner", src: scannerSlide, label: "LXC Scanner x Anti-Cheat", alt: "A detective's board with a map, photos and notes, and a computer showing a scan" },
  { key: "caught", src: caughtSlide, label: "Did you think you wouldn't get caught?", focus: "50% 30%", alt: "Two officers in a metro carriage arrest a masked man while another holds a second man down, seen through a camera viewfinder" },
]

export function HeroSlider({ className, bare = false, children }: { className?: string; bare?: boolean; children?: React.ReactNode }) {
  const slides = SLIDES
  const [index, setIndex] = useState(0)
  const go = (next: number) => setIndex((next + slides.length) % slides.length)
  const many = slides.length > 1
  const [paused, setPaused] = useState(false)
  // The ad slider turns by itself every 6 s (not while the pointer or focus is on it, and not for people who asked for less motion).
  useEffect(() => {
    if (!many || paused || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return
    const id = window.setInterval(() => setIndex((now) => (now + 1) % slides.length), 6000)
    return () => window.clearInterval(id)
  }, [many, paused, slides.length])
  return (
    <section aria-roledescription="carousel" aria-label="LXC" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} className={cn("relative isolate min-h-[180px] overflow-hidden", bare ? "rounded-[24px] [mask-image:linear-gradient(180deg,#000_78%,transparent)]" : "lx-glass rounded-xl", className)}>
      {slides.map((slide, position) => (
        <img
          key={slide.key}
          src={slide.src}
          alt={position === index ? slide.alt : ""}
          aria-hidden={position !== index}
          loading={position === 0 ? "eager" : "lazy"}
          decoding="async"
          style={slide.focus ? { objectPosition: slide.focus } : undefined}
          className={cn("absolute inset-0 size-full object-cover transition-opacity duration-500", slide.fade && "[mask-image:linear-gradient(90deg,transparent_5%,rgba(0,0,0,0.4)_32%,#000_62%)]", position === index ? "opacity-100" : "opacity-0")}
        />
      ))}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--card-surface)]/85 via-transparent to-transparent" />
      {children && <div className="absolute inset-x-6 top-1/2 z-[2] -translate-y-1/2 max-sm:inset-x-4">{children}</div>}
      <div className={cn("absolute inset-x-5 z-[2] flex items-end justify-between gap-3", bare ? "bottom-12" : "bottom-4")}>
        <div className="flex flex-col gap-2">
          {many && (
            <div className="flex gap-1.5" aria-hidden="true">
              {slides.map((slide, position) => (
                <span key={slide.key} className={cn("h-1.5 rounded-full bg-white/80 transition-[width,opacity] duration-300", position === index ? "w-[18px] opacity-100" : "w-1.5 opacity-35")} />
              ))}
            </div>
          )}
          <span className="text-lg font-semibold leading-none text-[var(--text)]" aria-live="polite">{slides[index].label}</span>
        </div>
        {many && (
          <div className="flex items-center gap-0.5 rounded-full border border-white/15 bg-[var(--card-surface)]/70 p-1">
            <button type="button" aria-label="Previous slide" onClick={() => go(index - 1)} className="grid size-9 place-items-center rounded-full text-[var(--text)] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
              <ChevronLeft className="size-[18px]" />
            </button>
            <button type="button" aria-label="Next slide" onClick={() => go(index + 1)} className="grid size-9 place-items-center rounded-full text-[var(--text)] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
              <ChevronRight className="size-[18px]" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

/* ───────── Ring stats ───────── */

export type Segment = { pct: number; tone: "green" | "red" | "grey" }
const TONE: Record<Segment["tone"], string> = { green: "var(--status-green)", red: "var(--status-red)", grey: "var(--text-faint)" }
const RADIUS = 19
const CIRC = 2 * Math.PI * RADIUS

/** One stat card: a thin ring (green, red and grey parts), the number and its name. */
export function RingStat({ segments, value, label, title }: { segments: Segment[]; value: string; label: string; title?: string }) {
  let offset = 0
  return (
    <div title={title} style={{ ["--t" as string]: TONE[segments.find((x) => x.pct > 0)?.tone ?? "grey"] }} className="lx-glass lx-ring-card flex items-center gap-3 rounded-2xl px-3.5 py-3">
      <svg viewBox="0 0 48 48" width="46" height="46" className="shrink-0" aria-hidden="true">
        <circle cx="24" cy="24" r={RADIUS} fill="none" strokeWidth="4" style={{ stroke: "var(--line)" }} />
        {segments.filter((segment) => segment.pct > 0).map((segment, position) => {
          const start = offset
          offset += segment.pct
          return (
            <circle
              key={position}
              className="lx-ring-seg"
              cx="24"
              cy="24"
              r={RADIUS}
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              style={{ stroke: TONE[segment.tone], animationDelay: `${120 + position * 60}ms` }}
              strokeDasharray={`${Math.max((CIRC * segment.pct) / 100 - 4, 0.1).toFixed(1)} ${CIRC.toFixed(1)}`}
              strokeDashoffset={(-(CIRC * start) / 100).toFixed(1)}
              transform="rotate(-90 24 24)"
            />
          )
        })}
      </svg>
      <div className="min-w-0">
        <div className="text-[19px] font-bold leading-tight text-[var(--text)]">{value}</div>
        <div className="text-[11px] leading-tight text-[var(--text-muted)]">{label}</div>
      </div>
    </div>
  )
}

/** One emblem for each of the six rank tiers (RANK-SYSTEM.md section 4), lowest to highest. */
const RANK_TIERS = [
  { name: "Recruit", rankId: 3 },
  { name: "Operator", rankId: 8 },
  { name: "Vanguard", rankId: 12 },
  { name: "Ace", rankId: 15 },
  { name: "Apex", rankId: 17 },
  { name: "Legacy", rankId: 18 },
]

const pct = (part: number, whole: number) => (whole > 0 ? Math.max(0, Math.min(100, (part / whole) * 100)) : 0)

/* ───────── Your stats (a row of flat tiles) and your last matches ───────── */

/** One flat stat tile: the number, its name, and a thin bar under it. */
function StatTile({ value, label, title, share, tone = "green" }: { value: string; label: string; title?: string; share?: number | null; tone?: "green" | "red" | "grey" }) {
  return (
    <div title={title} className="lx-glass flex min-w-0 flex-col gap-1 rounded-xl px-4 py-3.5">
      <span className="truncate text-[11px] font-medium text-[var(--text-dim)]">{label}</span>
      <span className="text-[24px] font-bold leading-none tabular-nums text-[var(--text)]"><CountText value={value} /></span>
      {share != null && (
        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-[var(--line)]" role="progressbar" aria-valuenow={Math.round(share)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
          <span className="block h-full rounded-full" style={{ width: `${share}%`, background: TONE[tone] }} />
        </span>
      )}
    </div>
  )
}

/** The signed-in player's numbers, all real: rank with its progress, win rate, K/D and the EXP limits. Signed out: the six ranks and the way in. */
export function StatsRow() {
  const { user, loading: authLoading } = useAuth()
  const { data: profile, loading, error, refetch } = useApiQuery<CompetitiveProfile>(
    (signal) => competitiveService.getPlayer(user!.id, { signal }),
    { enabled: Boolean(user?.id), queryKey: `home-rank:${user?.id ?? "guest"}` },
  )
  const { data: overview } = useApiQuery(
    (signal) => profileOverviewService.get(user!.id, { signal }),
    { enabled: Boolean(user?.id), queryKey: `home-rank-limits:${user?.id ?? "guest"}` },
  )

  if (!user) {
    return (
      <div className="lx-glass flex flex-wrap items-center justify-between gap-4 rounded-xl px-5 py-4">
        <div>
          <div className="text-[15px] font-semibold text-[var(--text)]">Climb the ranks</div>
          <p className="mt-0.5 text-[13px] text-[var(--text-dim)]">{authLoading ? "Checking your sign-in…" : "Sign in to see where you stand."}</p>
        </div>
        <ul className="flex flex-wrap items-center gap-4">
          {RANK_TIERS.map((tier) => (
            <li key={tier.name} className="flex items-center gap-1.5">
              <CompetitiveRankBadge rankId={tier.rankId} rankName={tier.name} size={28} />
              <span className="text-[12px] font-medium" style={{ color: rankTierColor(tier.rankId) }}>{tier.name}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (loading && !profile) return <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-[88px] rounded-xl" />)}</div>
  if (error || !profile) {
    return (
      <div className="lx-glass flex items-center gap-3 rounded-xl px-5 py-4 text-[13px] text-[var(--text-dim)]">
        Could not load your rank.
        <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" aria-hidden="true" />Retry</button>
      </div>
    )
  }

  const exp = profile.current_exp
  const floor = profile.current_rank_min_exp
  const next = profile.next_rank_min_exp
  const progress = next ? pct(exp - floor, next - floor) : 100
  const matches = profile.matches_completed
  const deaths = profile.deaths
  const limits = overview?.competitive?.expLimits ?? null
  return (
    <div className="lx-stats grid grid-cols-2 gap-3 @3xl:grid-cols-5">
      <div className="lx-glass col-span-2 flex items-center gap-3 rounded-xl px-4 py-3.5 @3xl:col-span-1">
        <CompetitiveRankBadge rankId={profile.rank_id} rankName={profile.rank_name} imageKey={profile.rank_image_key} size={48} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[17px] font-bold leading-tight" style={{ color: rankTierColor(profile.rank_id) }}>{profile.rank_name}</div>
          <div className="my-1.5 h-1 overflow-hidden rounded-full bg-[var(--line)]" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the next rank"><div className="h-full rounded-full bg-[var(--accent-solid)]" style={{ width: `${progress}%` }} /></div>
          <div className="truncate text-[11px] text-[var(--text-dim)]">{exp.toLocaleString()} EXP{next ? ` · ${(next - exp).toLocaleString()} to go` : ""}</div>
        </div>
      </div>
      <StatTile label="Win rate" value={matches > 0 ? `${Math.round(pct(profile.wins, matches))}%` : "—"} title={matches > 0 ? `${profile.wins} wins · ${profile.losses} losses` : "No ranked matches yet"} share={matches > 0 ? pct(profile.wins, matches) : null} />
      {typeof deaths === "number" && <StatTile label="K/D" value={deaths > 0 ? (profile.kills / deaths).toFixed(2) : profile.kills > 0 ? profile.kills.toFixed(2) : "—"} title={`${profile.kills} kills · ${deaths} deaths`} share={pct(profile.kills, profile.kills + deaths)} />}
      {limits && <StatTile label="EXP today" value={`${limits.day.used.toLocaleString()} / ${limits.day.cap.toLocaleString()}`} share={pct(limits.day.used, limits.day.cap)} tone={limits.day.used >= limits.day.cap ? "red" : "green"} />}
      {limits && <StatTile label="EXP this week" value={`${limits.week.used.toLocaleString()} / ${limits.week.cap.toLocaleString()}`} share={pct(limits.week.used, limits.week.cap)} tone={limits.week.used >= limits.week.cap ? "red" : "green"} />}
    </div>
  )
}

/** The last ranked matches as small win / loss tiles with the map and the EXP change (the API's real rows; nothing when there are none). */
export function LastMatches() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: overview } = useApiQuery(
    (signal) => profileOverviewService.get(user!.id, { signal }),
    { enabled: Boolean(user?.id), queryKey: `home-rank-limits:${user?.id ?? "guest"}` },
  )
  const rows = (overview?.recentMatches ?? []).slice(0, 10)
  if (!user || rows.length === 0) return null
  return (
    <section aria-label="Last matches" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text)]">Last matches</h2>
        <button type="button" onClick={() => navigate("/profile")} className="text-[12px] text-[var(--text-dim)] hover:text-[var(--text)]">All matches →</button>
      </div>
      <ul className="grid grid-cols-2 gap-2 @md:grid-cols-5 @4xl:grid-cols-10">
        {rows.map((row, index) => {
          const win = row.result === "Win"
          const loss = row.result === "Loss"
          return (
            <li key={row.matchId ?? index} className="lx-glass flex min-w-0 flex-col gap-0.5 rounded-lg px-3 py-2.5">
              <span className={cn("text-[13px] font-bold", win ? "text-[var(--status-green)]" : loss ? "text-[var(--status-red)]" : "text-[var(--text-dim)]")}>{win ? "Win" : loss ? "Loss" : row.result}</span>
              <span className="truncate text-[11px] text-[var(--text-muted)]">{row.map}</span>
              <span className="text-[11px] text-[var(--text-dim)]">{row.score}{typeof row.expDelta === "number" ? ` · ${row.expDelta > 0 ? "+" : ""}${row.expDelta}` : ""}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
