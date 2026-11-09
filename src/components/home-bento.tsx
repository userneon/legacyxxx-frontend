/** Home bento parts (owner request 2026-11-09): the map slider, the signed-in player's rank and four ring stats, the four mode cards and the rank medals. Real data only. */
import { useId, useState } from "react"
import { ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { cn } from "@/lib/utils"
import { competitiveService } from "@/api"
import { profileOverviewService } from "@/api/profile-overview"
import type { CompetitiveProfile } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { CompetitiveRankBadge, rankTierColor } from "@/components/competitive-rank-badge"
import { Skeleton } from "@/components/ui/skeleton"
import scannerSlide from "@/assets/home/slide-scanner.webp"

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
const SLIDES: { key: string; src: string; label: string; alt: string }[] = [
  { key: "scanner", src: scannerSlide, label: "LEGACY-X Scanner x Anti-Cheat", alt: "A detective's board with a map, photos and notes, and a computer showing a scan" },
]

export function HeroSlider({ className }: { className?: string }) {
  const slides = SLIDES
  const [index, setIndex] = useState(0)
  const go = (next: number) => setIndex((next + slides.length) % slides.length)
  const many = slides.length > 1
  return (
    <section aria-roledescription="carousel" aria-label="LEGACY-X" className={cn("lx-glass relative isolate min-h-[240px] overflow-hidden rounded-2xl", className)}>
      {slides.map((slide, position) => (
        <img
          key={slide.key}
          src={slide.src}
          alt={position === index ? slide.alt : ""}
          aria-hidden={position !== index}
          loading={position === 0 ? "eager" : "lazy"}
          decoding="async"
          className={cn("absolute inset-0 size-full object-cover transition-opacity duration-500", position === index ? "opacity-100" : "opacity-0")}
        />
      ))}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--card-surface)]/85 via-transparent to-transparent" />
      <div className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-3">
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

/* ───────── Find a player ───────── */

export function FindPlayerPill() {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate("/search")}
      className="lx-glass flex h-11 w-full items-center gap-2.5 rounded-full px-4 text-left text-[13px] text-[var(--text-dim)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50"
    >
      <Search className="size-4 shrink-0" />
      Find a player…
    </button>
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
    <div title={title} className="lx-glass flex items-center gap-3 rounded-2xl px-3.5 py-3">
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
        <div className="truncate text-[11px] text-[var(--text-muted)]">{label}</div>
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

/** The signed-in player's rank with its progress, and four rings: win rate, K/D and EXP against the daily and weekly limits. Signed out: the Steam sign-in. */
export function RankPanel() {
  const { user, loading: authLoading } = useAuth()
  const { data: profile, loading, error, refetch } = useApiQuery<CompetitiveProfile>(
    (signal) => competitiveService.getPlayer(user!.id, { signal }),
    { enabled: Boolean(user?.id), queryKey: `home-rank:${user?.id ?? "guest"}` },
  )
  const { data: overview, loading: overviewLoading } = useApiQuery(
    (signal) => profileOverviewService.get(user!.id, { signal }),
    { enabled: Boolean(user?.id), queryKey: `home-rank-limits:${user?.id ?? "guest"}` },
  )

  if (!user) {
    // Signed out: the six rank tiers with their emblems (nothing made up). The sign-in itself stays in the top bar.
    return (
      <div className="lx-glass flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl p-5 text-center">
        <div>
          <div className="text-[15px] font-semibold text-[var(--text)]">Climb the ranks</div>
          <p className="mt-0.5 text-xs text-[var(--text-dim)]">{authLoading ? "Checking your sign-in…" : "Sign in to see where you stand."}</p>
        </div>
        <ul className="grid w-full grid-cols-3 gap-x-2 gap-y-3">
          {RANK_TIERS.map((tier) => (
            <li key={tier.name} className="flex flex-col items-center gap-1">
              <CompetitiveRankBadge rankId={tier.rankId} rankName={tier.name} size={40} />
              <span className="text-[11px] font-medium" style={{ color: rankTierColor(tier.rankId) }}>{tier.name}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (loading && !profile) return <div className="flex flex-1 flex-col gap-3"><Skeleton className="h-[120px] rounded-2xl" /><div className="grid flex-1 grid-cols-2 gap-3"><Skeleton className="rounded-2xl" /><Skeleton className="rounded-2xl" /><Skeleton className="rounded-2xl" /><Skeleton className="rounded-2xl" /></div></div>
  if (error || !profile) {
    return (
      <div className="lx-glass flex flex-1 flex-col items-start justify-center gap-3 rounded-2xl p-5">
        <p className="text-[13px] text-[var(--text-dim)]">Could not load your rank.</p>
        <button type="button" onClick={refetch} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-xs font-medium hover:border-[var(--line-strong)]"><RotateCcw className="size-3.5" />Retry</button>
      </div>
    )
  }

  const exp = profile.current_exp
  const floor = profile.current_rank_min_exp
  const next = profile.next_rank_min_exp
  const progress = next ? pct(exp - floor, next - floor) : 100
  const matches = profile.matches_completed
  const draws = Math.max(0, matches - profile.wins - profile.losses)
  const deaths = profile.deaths
  const limits = overview?.competitive?.expLimits ?? null

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="lx-glass flex items-center gap-4 rounded-2xl px-4 py-3.5">
        <CompetitiveRankBadge rankId={profile.rank_id} rankName={profile.rank_name} imageKey={profile.rank_image_key} size={60} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[22px] font-bold leading-tight" style={{ color: rankTierColor(profile.rank_id) }}>{profile.rank_name}</div>
          <div className="my-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)]" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the next rank">
            <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-[11px] text-[var(--text-dim)]">{exp.toLocaleString()} EXP{next ? ` · ${(next - exp).toLocaleString()} to ${profile.next_rank_name ?? "the next rank"}` : ""}</div>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3">
        <RingStat
          value={matches > 0 ? `${Math.round(pct(profile.wins, matches))}%` : "—"}
          label="Win rate"
          title={matches > 0 ? `${profile.wins} wins · ${profile.losses} losses · ${draws} draws` : "No ranked matches yet"}
          segments={[{ pct: pct(profile.wins, matches), tone: "green" }, { pct: pct(profile.losses, matches), tone: "red" }, { pct: pct(draws, matches), tone: "grey" }]}
        />
        {typeof deaths === "number" && (
          <RingStat
            value={deaths > 0 ? (profile.kills / deaths).toFixed(2) : profile.kills > 0 ? profile.kills.toFixed(2) : "—"}
            label="K/D"
            title={`${profile.kills} kills · ${deaths} deaths`}
            segments={[{ pct: pct(profile.kills, profile.kills + deaths), tone: "green" }, { pct: pct(deaths, profile.kills + deaths), tone: "red" }]}
          />
        )}
        {!limits && overviewLoading && (
          <>
            <Skeleton className="h-[70px] rounded-2xl" />
            <Skeleton className="h-[70px] rounded-2xl" />
          </>
        )}
        {limits && (
          <>
            <RingStat
              value={`${Math.round(pct(limits.day.used, limits.day.cap))}%`}
              label="EXP today"
              title={`${limits.day.used.toLocaleString()} of ${limits.day.cap.toLocaleString()} EXP today`}
              segments={[{ pct: pct(limits.day.used, limits.day.cap), tone: limits.day.used >= limits.day.cap ? "red" : "green" }]}
            />
            <RingStat
              value={`${Math.round(pct(limits.week.used, limits.week.cap))}%`}
              label="EXP this week"
              title={`${limits.week.used.toLocaleString()} of ${limits.week.cap.toLocaleString()} EXP this week`}
              segments={[{ pct: pct(limits.week.used, limits.week.cap), tone: limits.week.used >= limits.week.cap ? "red" : "green" }]}
            />
          </>
        )}
      </div>
    </div>
  )
}
