import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Trophy,
  Target,
  Percent,
  LogOut,
  ExternalLink,
  Swords,
  Copy,
  Check,
  Link2,
  UserX,
  ChevronDown,
  ChevronRight,
  Map as MapIcon,
  Sparkles,
  Skull,
  HandHelping,
  Medal,
  Gamepad2,
  Gauge,
  Settings,
  EyeOff,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { isFeatureEnabled } from "@/lib/features"
import { PenaltyDetailDialog, TypeIcon, TYPE_META } from "@/components/penalty-detail-dialog"
import { competitiveService, profileService } from "@/api"
import type { ApiError, CompetitiveProfile, FaceitProfileData, PenaltyEntry, ProfileRecentMatch, ProfileStats, UserProfile } from "@/api/types"
import { Button } from "@/components/ui/button"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { PlayerAvatar } from "@/components/player-avatar"
import { CompetitiveRankBadge } from "@/components/competitive-rank-badge"
import { ModerationStatusIcon } from "@/components/moderation-status-icon"
import { ProfileRoleIcon } from "@/components/profile-role-icon"
import { AnimatedNumber } from "@/components/animated-number"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import faceitLogo from "@/assets/brand/faceit.webp"
import { MatchDetailsDialog } from "@/components/match-details-dialog"
import { RelativeTime } from "@/components/relative-time"
import { ProfileIds, copyText, steamProfileUrl as steamLinkFor } from "@/components/profile-ids"
import { ProfilePrivacyDialog } from "@/components/profile-privacy-dialog"

interface ProfilePageProps {
  userId?: string
}

const RECENT_MATCHES_COLLAPSED = 5

/** Starts at 0 and moves to `value` on the next frame, so bars and rings fill in with a CSS transition. */
function useFillIn(value: number) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    // Hidden tabs pause requestAnimationFrame; show the final value instead of leaving the bar empty.
    if (document.visibilityState === "hidden") {
      setShown(value)
      return
    }
    const frame = requestAnimationFrame(() => setShown(value))
    return () => cancelAnimationFrame(frame)
  }, [value])
  return shown
}

function linkHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

/** Steam profile background: the animated video when the player equipped one, otherwise the still image. */
function ProfileCover({ profile }: { profile: UserProfile }) {
  const video = profile.steamMedia?.backgroundVideo
  const [videoFailed, setVideoFailed] = useState(false)
  const still = profile.steamBackground

  if (video && !videoFailed && !prefersReducedMotion()) {
    return (
      <video
        className="profile-cover-video absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster={still ?? undefined}
        onError={() => setVideoFailed(true)}
        aria-hidden="true"
      >
        {video.webm && <source src={video.webm} type="video/webm" />}
        {video.mp4 && <source src={video.mp4} type="video/mp4" />}
      </video>
    )
  }
  if (still) {
    return <div className="profile-cover absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${still}")` }} aria-hidden="true" />
  }
  return <div className="profile-cover profile-cover-fallback absolute inset-0" aria-hidden="true" />
}

/** Steam avatar (animated when equipped) with the player's Steam avatar frame drawn around it. */
function ProfileAvatar({ profile }: { profile: UserProfile }) {
  const frame = profile.steamMedia?.avatarFrame
  const animated = profile.steamMedia?.animatedAvatar
  const [frameFailed, setFrameFailed] = useState(false)
  const [animatedReady, setAnimatedReady] = useState(false)
  const showFrame = Boolean(frame) && !frameFailed

  return (
    <div className="profile-avatar-pop relative size-20 shrink-0 @2xl:size-28">
      <div className={cn(
        "size-full",
        // Steam frames are drawn for square avatars, so the animated LEGACY-X ring is used only without one.
        showFrame ? "rounded-sm ring-4 ring-background" : "profile-avatar-frame rounded-2xl p-[3px] ring-4 ring-background"
      )}>
        <div className={cn("relative size-full overflow-hidden", showFrame ? "rounded-sm" : "rounded-[0.9rem]")}>
          {/* The still Steam avatar shows at once; the heavier animated GIF fades in over it once loaded. */}
          <PlayerAvatar
            avatar={profile.avatar}
            name={profile.username}
            className="size-full bg-gradient-to-br from-primary/80 to-primary text-2xl text-primary-foreground @2xl:text-3xl"
          />
          {animated && (
            <img
              src={animated}
              alt=""
              aria-hidden="true"
              onLoad={() => setAnimatedReady(true)}
              className={cn("absolute inset-0 size-full object-cover transition-opacity duration-500", animatedReady ? "opacity-100" : "opacity-0")}
            />
          )}
        </div>
      </div>
      {showFrame && (
        <img
          src={frame!}
          alt=""
          aria-hidden="true"
          onError={() => setFrameFailed(true)}
          className="pointer-events-none absolute left-1/2 top-1/2 size-[122%] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
        />
      )}
    </div>
  )
}

/**
 * FACEIT CS2 skill levels: minimum ELO, icon colour, and how much of the gauge the official icon fills
 * (the icon fill is not linear in the level; values measured from FACEIT's own level icons).
 */
const FACEIT_LEVELS = [
  { level: 1, min: 100, color: "#eeeeee", fill: 0 },
  { level: 2, min: 501, color: "#46e070", fill: 6 },
  { level: 3, min: 751, color: "#46e070", fill: 11 },
  { level: 4, min: 901, color: "#ffcd29", fill: 27 },
  { level: 5, min: 1051, color: "#ffcd29", fill: 45 },
  { level: 6, min: 1201, color: "#ffcd29", fill: 60 },
  { level: 7, min: 1351, color: "#ffcd29", fill: 69 },
  { level: 8, min: 1531, color: "#ff6f20", fill: 81 },
  { level: 9, min: 1751, color: "#ff6f20", fill: 92 },
  { level: 10, min: 2001, color: "#e8002b", fill: 100 },
] as const

function faceitLevelProgress(level: number, elo: number) {
  const current = FACEIT_LEVELS.find((entry) => entry.level === level) ?? FACEIT_LEVELS[0]
  const next = FACEIT_LEVELS.find((entry) => entry.level === current.level + 1)
  if (!next) return { color: current.color, percent: 100, toNext: 0, nextLevel: null as number | null }
  const span = next.min - current.min
  const percent = Math.max(0, Math.min(100, ((elo - current.min) / span) * 100))
  return { color: current.color, percent, toNext: Math.max(0, next.min - elo), nextLevel: next.level }
}

/** 270° gauge with the gap at the bottom, drawn clockwise from bottom-left like FACEIT's level icons. */
const FACEIT_GAUGE_RADIUS = 37
/** Real arc length; used instead of pathLength, which some SVG renderers ignore for dash patterns. */
const FACEIT_GAUGE_LENGTH = FACEIT_GAUGE_RADIUS * 1.5 * Math.PI
const FACEIT_GAUGE_PATH = (() => {
  const radius = FACEIT_GAUGE_RADIUS
  const point = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180
    return `${(50 + radius * Math.cos(radians)).toFixed(3)} ${(50 + radius * Math.sin(radians)).toFixed(3)}`
  }
  return `M ${point(135)} A ${radius} ${radius} 0 1 1 ${point(45)}`
})()
const FACEIT_GAUGE_START = { x: 50 + FACEIT_GAUGE_RADIUS * Math.cos((135 * Math.PI) / 180), y: 50 + FACEIT_GAUGE_RADIUS * Math.sin((135 * Math.PI) / 180) }

/**
 * Vector recreation of the FACEIT skill level icon (crisp at any size). The coloured arc fills to the level on mount:
 * level 1 is a dot at the start, level 10 the full gauge. `level={null}` renders the empty "not connected" badge.
 */
function FaceitLevelBadge({ level, className }: { level: number | null; className?: string }) {
  const entry = level === null ? null : FACEIT_LEVELS.find((item) => item.level === level) ?? null
  const target = entry?.fill ?? 0
  const shown = useFillIn(target)
  const color = entry?.color ?? "#5b5b60"

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={entry ? `FACEIT level ${entry.level}` : "FACEIT not connected"}
      className={cn("faceit-level-badge shrink-0", className)}
    >
      <circle cx="50" cy="50" r="49" fill="#131315" />
      <path d={FACEIT_GAUGE_PATH} fill="none" stroke="#2a2a2f" strokeWidth="10" strokeLinecap="round" />
      {/* Level 1 is a single dot at the start of the gauge, as in the official icon. */}
      {entry?.level === 1 && <circle cx={FACEIT_GAUGE_START.x} cy={FACEIT_GAUGE_START.y} r="5" fill={color} className="faceit-level-dot" />}
      {entry && entry.level > 1 && (
        <path
          d={FACEIT_GAUGE_PATH}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${FACEIT_GAUGE_LENGTH} ${FACEIT_GAUGE_LENGTH}`}
          strokeDashoffset={FACEIT_GAUGE_LENGTH * (1 - shown / 100)}
          className="faceit-level-fill"
          style={{ filter: `drop-shadow(0 0 3px ${color}99)` }}
        />
      )}
      <text
        key={entry?.level ?? "none"}
        x="50"
        y="52"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={entry?.level === 10 ? 33 : 40}
        fontWeight={900}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        className="faceit-level-number"
      >
        {entry ? entry.level : "–"}
      </text>
    </svg>
  )
}

function FaceitStat({ label, children, tone }: { label: string; children: React.ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className={cn("text-base font-bold tabular-nums", tone)}>{children}</div>
      <div className="truncate text-[11px] text-muted-foreground">{label}</div>
    </div>
  )
}

/**
 * FACEIT at a glance: level, ELO with progress to the next level, and four stats.
 * Not linked: a single line on your own profile, nothing on someone else's.
 */
function FaceitProfileCard({ faceit, loading, error, isOwner }: { faceit: FaceitProfileData | null; loading: boolean; error: ApiError | null; isOwner: boolean }) {
  if (loading || error || !faceit) return null
  if (!faceit.linked) {
    if (!isOwner || faceit.hidden) return null
    return (
      <section className="profile-rise glass flex items-center gap-3 rounded-2xl px-4 py-3">
        <img src={faceitLogo} alt="" className="size-6 object-contain opacity-60" />
        <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">No FACEIT account is linked to your Steam profile.</p>
      </section>
    )
  }

  const progress = faceitLevelProgress(faceit.level, faceit.elo)
  return (
    <section className="profile-rise glass @container rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <FaceitLevelBadge level={faceit.level} className="size-12" />
        <div className="min-w-0 flex-1">
          <a href={faceit.faceitUrl} target="_blank" rel="noreferrer" className="group inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-orange-300 hover:text-orange-200">
            <img src={faceitLogo} alt="FACEIT" className="size-4 shrink-0 object-contain" />
            <span className="truncate">{faceit.nickname}</span>
            <ExternalLink className="size-3 shrink-0 opacity-60 group-hover:opacity-100" />
          </a>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg font-black tabular-nums"><AnimatedNumber value={faceit.elo} /></span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">ELO</span>
            <div className="h-1 min-w-12 flex-1 overflow-hidden rounded-full bg-white/[0.08]" title={progress.nextLevel === null ? "Max level" : `${progress.toNext.toLocaleString()} ELO to level ${progress.nextLevel}`}>
              <div className="profile-progress-bar h-full rounded-full" style={{ width: `${progress.percent}%`, backgroundColor: progress.color }} />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-white/[0.06] pt-3">
        <FaceitStat label="Matches"><AnimatedNumber value={faceit.stats.matches} /></FaceitStat>
        <FaceitStat label="Win rate"><AnimatedNumber value={faceit.stats.winRate} decimals={1} suffix="%" /></FaceitStat>
        <FaceitStat label="K/D" tone={faceit.stats.averageKd >= 1 ? "text-chart-2" : "text-destructive"}><AnimatedNumber value={faceit.stats.averageKd} decimals={2} /></FaceitStat>
        <FaceitStat label="Headshots"><AnimatedNumber value={faceit.stats.headshots} decimals={1} suffix="%" /></FaceitStat>
      </div>
    </section>
  )
}

function ProfileHeroSkeleton() {
  return (
    <section className="glass overflow-hidden rounded-2xl">
      <div className="h-36 animate-pulse bg-secondary/40 sm:h-44" />
      <div className="-mt-12 flex items-end gap-5 px-5 pb-5 sm:px-6">
        <div className="size-24 shrink-0 animate-pulse rounded-2xl bg-secondary/70 ring-4 ring-background sm:size-28" />
        <div className="flex-1 space-y-2 pb-1">
          <div className="h-7 w-44 animate-pulse rounded bg-secondary/50" />
          <div className="h-5 w-28 animate-pulse rounded bg-secondary/50" />
        </div>
      </div>
    </section>
  )
}

function StatTile({ icon: Icon, label, children, hint, accent, corner }: { icon: typeof Trophy; label: string; children: React.ReactNode; hint?: React.ReactNode; accent?: string; corner?: React.ReactNode }) {
  return (
    <div className="glass group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl p-3.5 hover-lift @4xl:p-4">
      <div className={cn("pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100", accent ?? "bg-white/10")} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="size-3.5 shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        {corner}
      </div>
      <div className="mt-auto pt-3 text-xl font-bold tabular-nums tracking-tight @4xl:text-2xl">{children}</div>
      {hint && <div className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

function WinRateRing({ percent }: { percent: number }) {
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const shown = useFillIn(Math.max(0, Math.min(100, percent)))
  return (
    <svg viewBox="0 0 40 40" className="size-7 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="4" className="stroke-secondary" />
      <circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        className="profile-ring stroke-chart-2"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - shown / 100)}
      />
    </svg>
  )
}

type VisibleRank = {
  rankId: number
  rankName: string
  imageKey: string
  currentExp: number
  currentMinExp: number
  nextRankName: string | null
  nextRankExp: number | null
}

function RankProgressCard({ rank, proLeagueUnlocked }: { rank: VisibleRank; proLeagueUnlocked: boolean }) {
  const nextRankExp = rank.nextRankExp
  const maxed = nextRankExp === null
  const span = maxed ? 1 : Math.max(1, nextRankExp - rank.currentMinExp)
  const percent = maxed ? 100 : Math.max(0, Math.min(100, ((rank.currentExp - rank.currentMinExp) / span) * 100))
  const shown = useFillIn(percent)
  const remaining = maxed ? 0 : Math.max(0, nextRankExp - rank.currentExp)

  return (
    <section className="profile-rise glass shiny-slow relative flex h-full items-center overflow-hidden rounded-2xl p-4 @4xl:p-5">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-amber-300/[0.07] to-transparent" />
      <div className="relative flex w-full flex-row items-center gap-4 @2xl:gap-5">
        <div className="profile-rank-badge flex shrink-0 items-center justify-center">
          <CompetitiveRankBadge rankId={rank.rankId} rankName={rank.rankName} imageKey={rank.imageKey} currentExp={rank.currentExp} className="h-12 w-20 @2xl:h-16 @2xl:w-28" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Competitive Rank</span>
            {proLeagueUnlocked && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                <Sparkles className="size-3" /> Pro League
              </span>
            )}
          </div>
          <div className="mt-1 truncate font-display text-xl tracking-wide @2xl:text-2xl">{rank.rankName}</div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary/70">
            <div
              className="profile-progress-bar h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-100"
              style={{ width: `${shown}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="tabular-nums">
              <span className="font-semibold text-foreground"><AnimatedNumber value={rank.currentExp} /></span>
              {maxed ? " EXP" : <> / {nextRankExp.toLocaleString()} EXP</>}
            </span>
            <span className="truncate">{maxed ? "Global Elite reached" : <>{remaining.toLocaleString()} EXP to <span className="text-foreground">{rank.nextRankName}</span></>}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function MapThumb({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="relative ml-1 h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
      ) : (
        <div className="flex h-full w-full items-center justify-center"><MapIcon className="size-4 text-muted-foreground" /></div>
      )}
    </div>
  )
}

/** In place of a value the player hid in profile settings. */
function HiddenValue() {
  return (
    <span className="inline-flex items-center gap-1.5 text-base font-semibold text-muted-foreground">
      <EyeOff className="size-4" />
      Hidden
    </span>
  )
}

/** A whole box the player hid: the frame stays so the profile keeps its shape. */
function HiddenSection({ title, className }: { title: string; className?: string }) {
  return (
    <section className={cn("profile-rise glass rounded-2xl p-4", className)}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-secondary/40 px-3 py-4 text-sm text-muted-foreground">
        <EyeOff className="size-4" />
        Hidden
      </div>
    </section>
  )
}

function RecentMatches({ matches, loading, steamId }: { matches: ProfileRecentMatch[]; loading: boolean; steamId?: string }) {
  const [expanded, setExpanded] = useState(false)
  const [openMatch, setOpenMatch] = useState<{ matchId: string; mapNumber: number } | null>(null)
  const visible = expanded ? matches : matches.slice(0, RECENT_MATCHES_COLLAPSED)
  const form = matches.slice(0, 10)
  const wins = form.filter((match) => match.result === "Win").length

  return (
    <section className="profile-rise glass rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Recent Matches</h2>
          {form.length > 0 && <p className="mt-0.5 text-xs text-muted-foreground">{wins}W · {form.length - wins}L in the last {form.length}</p>}
        </div>
        {form.length > 0 && (
          <div className="stagger-in flex items-center gap-1" aria-label="Recent form">
            {form.map((match, idx) => (
              <span
                key={idx}
                title={`${cs2MapLabel(match.map)} · ${match.result}`}
                className={cn("h-5 w-1.5 rounded-full", match.result === "Win" ? "bg-chart-2" : "bg-destructive/80")}
              />
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary/40" />)}
        </div>
      ) : matches.length === 0 ? (
        <div className="query-state-in flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 px-4 py-10 text-center">
          <Gamepad2 className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium">No matches played yet</p>
          <p className="text-xs text-muted-foreground">Finished matches on LEGACY-X servers will show up here.</p>
        </div>
      ) : (
        <>
          <div className="stagger-in flex flex-col gap-2">
            {visible.map((match, idx) => {
              const win = match.result === "Win"
              const art = cs2MapArtwork(match.map)
              // MatchZy matches open the scoreboard; legacy history rows have no match reference.
              const openable = Boolean(match.matchId)
              return (
                <div
                  key={match.matchId ? `${match.matchId}:${match.mapNumber}` : idx}
                  role={openable ? "button" : undefined}
                  tabIndex={openable ? 0 : undefined}
                  onClick={openable ? () => setOpenMatch({ matchId: match.matchId!, mapNumber: match.mapNumber ?? 1 }) : undefined}
                  onKeyDown={openable ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpenMatch({ matchId: match.matchId!, mapNumber: match.mapNumber ?? 1 }) } } : undefined}
                  aria-label={openable ? `Open ${cs2MapLabel(match.map)} match details` : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/[0.06] bg-secondary/40 py-2.5 pl-3 pr-4 transition-colors hover:bg-secondary/60",
                    openable && "cursor-pointer hover:border-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "before:absolute before:inset-y-0 before:left-0 before:w-1",
                    win ? "before:bg-chart-2" : "before:bg-destructive/80"
                  )}
                >
                  <MapThumb src={art} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{cs2MapLabel(match.map)}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>K/D <span className="tabular-nums text-foreground/80">{match.kd}</span></span>
                      {match.playedAt && <><span aria-hidden="true">·</span><RelativeTime value={match.playedAt} /></>}
                    </div>
                  </div>
                  <span className="text-base font-bold tabular-nums">{match.score}</span>
                  <span className={cn(
                    "w-12 rounded-md py-0.5 text-center text-xs font-bold",
                    win ? "bg-chart-2/15 text-chart-2" : "bg-destructive/15 text-destructive"
                  )}>
                    {match.result}
                  </span>
                  {openable && <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />}
                </div>
              )
            })}
          </div>
          <MatchDetailsDialog
            matchId={openMatch?.matchId ?? null}
            mapNumber={openMatch?.mapNumber ?? 1}
            highlightSteamId={steamId}
            onOpenChange={(open) => { if (!open) setOpenMatch(null) }}
          />
          {matches.length > RECENT_MATCHES_COLLAPSED && (
            <Button variant="ghost" size="sm" className="mt-3 w-full text-muted-foreground" onClick={() => setExpanded((open) => !open)}>
              {expanded ? "Show less" : `Show all ${matches.length} matches`}
              <ChevronDown className={cn("size-4 transition-transform duration-300", expanded && "rotate-180")} />
            </Button>
          )}
        </>
      )}
    </section>
  )
}

export function ProfilePage({ userId }: ProfilePageProps) {
  const { steamId } = useParams<{ steamId: string }>()
  const effectiveUserId = userId ?? steamId
  const navigate = useNavigate()
  const { logout, user: authenticatedUser } = useAuth()
  const [linkCopied, setLinkCopied] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { data: profile, loading: profileLoading, error: profileError, refetch: refetchProfile } = useApiQuery<UserProfile>((signal) =>
    profileService.getProfile(effectiveUserId, { signal }),
  )

  const { data: stats, loading: statsLoading } = useApiQuery<ProfileStats>((signal) =>
    profileService.getStats(effectiveUserId, { signal }),
  )

  const { data: penalties, loading: penaltiesLoading, error: penaltiesError } = useApiQuery<PenaltyEntry[]>((signal) =>
    profileService.getPenalties(effectiveUserId, { signal }),
  )
  const [openPenalty, setOpenPenalty] = useState<PenaltyEntry | null>(null)

  const { data: recentMatches, loading: matchesLoading } = useApiQuery<ProfileRecentMatch[]>((signal) =>
    profileService.getRecentMatches(effectiveUserId, { signal }),
  )
  const { data: competitive } = useApiQuery<CompetitiveProfile>((signal) =>
    competitiveService.getPlayer(profile!.id, { signal }),
    { enabled: Boolean(profile?.id && profile.role !== "Owner"), queryKey: profile?.id ?? "competitive-profile-pending" },
  )
  // Fetched at page level so the hero can show the FACEIT level chip next to the name.
  const { data: faceit, loading: faceitLoading, error: faceitError } = useApiQuery<FaceitProfileData>((signal) =>
    profileService.getFaceitProfile(effectiveUserId, { signal }),
  )

  // Arriving by user id, or at your own SteamID64, rewrites the address to the canonical one.
  useEffect(() => {
    if (!profile || !steamId) return
    if (authenticatedUser && profile.id === authenticatedUser.id) {
      navigate("/profile", { replace: true })
      return
    }
    if (profile.steamId && steamId !== profile.steamId) {
      navigate(`/profile/${encodeURIComponent(profile.steamId)}`, { replace: true })
    }
  }, [authenticatedUser, navigate, profile, steamId])

  const handleLogout = () => {
    void logout()
  }

  const handleCopyLink = async (value: string) => {
    if (!(await copyText(value, "Steam link"))) return
    setLinkCopied(true)
    window.setTimeout(() => setLinkCopied(false), 1600)
  }

  const isOwner = profile?.id === authenticatedUser?.id
  const steamProfileUrl = profile ? steamLinkFor(profile.steamId) : null
  // Boxes the player hid in profile settings disappear for everyone, the owner included.
  const hidden = new Set(profile?.hiddenSections ?? [])
  const showFaceit = !hidden.has("faceit")
  const showRecentMatches = !hidden.has("recent_matches")
  const showCombat = !hidden.has("kills")
  const visibleCompetitiveRank: VisibleRank | null = profile?.role === "Owner" ? null : {
    rankId: competitive?.rank_id ?? 1,
    rankName: competitive?.rank_name ?? "Silver I",
    imageKey: competitive?.rank_image_key ?? "rank-01",
    currentExp: competitive?.current_exp ?? 0,
    currentMinExp: competitive?.current_rank_min_exp ?? 0,
    nextRankName: competitive ? competitive.next_rank_name : "Silver II",
    nextRankExp: competitive ? competitive.next_rank_min_exp : 1_000,
  }
  const winRate = stats && stats.matches > 0 ? (stats.wins / stats.matches) * 100 : null
  const headshotRate = competitive && competitive.kills > 0 ? (competitive.headshot_kills / competitive.kills) * 100 : null
  const links = profile?.links ?? []

  if (profileError && !profile) {
    const notFound = profileError.code === "not_found"
    return (
      <div className="flex min-h-[420px] items-center justify-center p-6">
        <div className="query-state-in glass flex max-w-sm flex-col items-center gap-3 rounded-2xl p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-secondary/60"><UserX className="size-5 text-muted-foreground" /></div>
          <h1 className="font-semibold">{notFound ? "Player not found" : "Profile unavailable"}</h1>
          <p className="text-sm text-muted-foreground">{notFound ? "This player does not have a LEGACY-X profile yet." : profileError.message}</p>
          {!notFound && <Button variant="outline" size="sm" onClick={refetchProfile}>Try again</Button>}
        </div>
      </div>
    )
  }

  return (
    <div className="@container flex w-full flex-col gap-4 p-4 @2xl:gap-5 @2xl:p-6">
      {profileLoading || !profile ? (
        <ProfileHeroSkeleton />
      ) : (
        <section className="glass relative overflow-hidden rounded-2xl">
          <div className="relative h-28 overflow-hidden [mask-image:linear-gradient(to_bottom,black_45%,transparent)] @2xl:h-44 @6xl:h-56">
            <ProfileCover profile={profile} />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background/95" aria-hidden="true" />
          </div>

          {/* Identity row stays horizontal at every width: avatar · name/chips · actions. */}
          <div className="relative -mt-10 flex flex-row flex-wrap items-end gap-3 px-4 pb-4 @sm:flex-nowrap @2xl:-mt-14 @2xl:gap-5 @2xl:px-6 @2xl:pb-5">
            <ProfileAvatar profile={profile} />

            <div className="min-w-0 flex-1 pb-0.5 @2xl:pb-1">
              <h1 className="profile-name truncate font-display text-xl tracking-wide @2xl:text-3xl">{profile.username}</h1>
              <div className="stagger-in mt-1.5 flex flex-wrap items-center gap-1.5 @2xl:mt-2 @2xl:gap-2">
                <ProfileRoleIcon role={profile.role} />
                <ModerationStatusIcon status={profile.moderationStatus} />
                {isFeatureEnabled("clan") && profile.clan && (
                  <button
                    type="button"
                    onClick={() => navigate(`/clans/${profile.clan!.id}`)}
                    className="inline-flex h-6 items-center gap-1.5 rounded-md border border-white/[0.1] bg-black/20 px-2 text-xs text-white/80 transition-colors hover:border-white/25 hover:text-white"
                  >
                    <Swords className="size-3" />
                    <span className="font-semibold">[{profile.clan.tag}]</span>
                    <span className="hidden max-w-[10rem] truncate text-white/60 @lg:inline">{profile.clan.name}</span>
                  </button>
                )}
                {visibleCompetitiveRank && competitive && (
                  <span className="inline-flex h-6 items-center rounded-md border border-amber-300/20 bg-amber-300/[0.08] px-2 text-xs font-medium text-amber-100">
                    {visibleCompetitiveRank.rankName}
                  </span>
                )}
                {showFaceit && faceit?.linked && (
                  <span
                    title={`FACEIT level ${faceit.level} · ${faceit.elo.toLocaleString()} ELO`}
                    className="inline-flex h-6 items-center gap-1 rounded-md border border-white/[0.1] bg-black/20 pl-0.5 pr-2 text-xs font-medium text-white/80"
                  >
                    <FaceitLevelBadge level={faceit.level} className="size-5" />
                    <span className="tabular-nums">{faceit.elo.toLocaleString()}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex w-full shrink-0 items-center gap-1.5 pb-0.5 @sm:w-auto @2xl:gap-2 @2xl:pb-1">
              {steamProfileUrl && (
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Copy Steam profile link"
                  title="Copy Steam profile link"
                  onClick={() => void handleCopyLink(steamProfileUrl)}
                >
                  {linkCopied ? <Check className="size-3.5 text-chart-2" /> : <Copy className="size-3.5" />}
                </Button>
              )}
              {isOwner && (
                <Button variant="outline" size="icon-sm" aria-label="Profile settings" title="Profile settings" onClick={() => setSettingsOpen(true)}>
                  <Settings className="size-3.5" />
                </Button>
              )}
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:border-destructive/40 hover:bg-destructive/15 hover:text-white"
                  aria-label="Log out"
                  title="Log out"
                  onClick={handleLogout}
                >
                  <LogOut className="size-3.5" />
                  <span className="hidden @3xl:inline">Log out</span>
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Wide: rank + stats share a row, matches sit beside the sidebar. Narrow: each block keeps a horizontal layout. */}
      <div className="grid grid-cols-1 gap-4 @2xl:gap-5 @5xl:grid-cols-12">
        {profile && visibleCompetitiveRank && (
          <div className="@5xl:col-span-5">
            <RankProgressCard rank={visibleCompetitiveRank} proLeagueUnlocked={Boolean(competitive?.pro_league_unlocked)} />
          </div>
        )}

        <div className={cn(profile && visibleCompetitiveRank ? "@5xl:col-span-7" : "@5xl:col-span-12")}>
          {statsLoading ? (
            <div className="grid h-full grid-cols-2 gap-3 @md:grid-cols-4 @2xl:gap-4">
              {[0, 1, 2, 3].map((i) => <div key={i} className="glass h-[96px] animate-pulse rounded-2xl" />)}
            </div>
          ) : stats ? (
            <div className="stagger-in grid h-full grid-cols-2 gap-3 @md:grid-cols-4 @2xl:gap-4">
              <StatTile icon={Gamepad2} label="Matches" accent="bg-sky-400/20">
                {hidden.has("matches") ? <HiddenValue /> : <AnimatedNumber value={stats.matches} />}
              </StatTile>
              <StatTile icon={Medal} label="Wins" accent="bg-amber-300/20">
                <AnimatedNumber value={stats.wins} />
              </StatTile>
              <StatTile
                icon={Percent}
                label="Win Rate"
                accent="bg-emerald-400/20"
                corner={winRate !== null ? <span className="hidden @2xl:block"><WinRateRing percent={winRate} /></span> : undefined}
              >
                <AnimatedNumber value={winRate} decimals={1} suffix="%" />
              </StatTile>
              <StatTile icon={Gauge} label="K/D Ratio" accent={hidden.has("kd") ? undefined : stats.kdRatio >= 1 ? "bg-emerald-400/20" : "bg-red-400/20"}>
                {hidden.has("kd") ? <HiddenValue /> : (
                  <span className={cn(stats.matches > 0 && (stats.kdRatio >= 1 ? "text-chart-2" : "text-destructive"))}>
                    <AnimatedNumber value={stats.kdRatio} decimals={2} />
                  </span>
                )}
              </StatTile>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-4 @2xl:gap-5 @5xl:col-span-8">
          {profile && (showFaceit ? <FaceitProfileCard faceit={faceit} loading={faceitLoading} error={faceitError} isOwner={isOwner} /> : <HiddenSection title="FACEIT" />)}
          {showRecentMatches ? <RecentMatches matches={recentMatches ?? []} loading={matchesLoading} steamId={profile?.steamId} /> : <HiddenSection title="Recent Matches" />}
        </div>

        {/* Sidebar: two columns when there is room below the matches, a single stack beside them on wide screens. */}
        <aside className="grid content-start gap-4 @md:grid-cols-2 @2xl:gap-5 @5xl:col-span-4 @5xl:grid-cols-1">
          {profile && !showCombat && <HiddenSection title="Combat" className="@md:col-span-2 @5xl:col-span-1" />}
          {showCombat && competitive && competitive.matches_completed > 0 && (
            <section className="profile-rise glass rounded-2xl p-4 @md:col-span-2 @5xl:col-span-1">
              <h2 className="mb-3 text-sm font-semibold">Combat</h2>
              <div className="grid grid-cols-3 gap-2 @5xl:grid-cols-3">
                {[
                  { label: "Kills", icon: Skull, value: competitive.kills, decimals: 0, suffix: "" },
                  { label: "Assists", icon: HandHelping, value: competitive.assists, decimals: 0, suffix: "" },
                  { label: "Headshot %", icon: Target, value: headshotRate, decimals: 1, suffix: "%" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 rounded-xl bg-secondary/40 px-3 py-2.5">
                    <item.icon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="text-base font-bold tabular-nums"><AnimatedNumber value={item.value} decimals={item.decimals} suffix={item.suffix} /></div>
                      <div className="truncate text-[11px] text-muted-foreground">{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {profile && <ProfileIds steamId64={profile.steamId} />}

          {/* Always present, so a clean record reads as one rather than as a missing section.
              Hidden only when the list could not be read at all, which is never a "no penalties" answer. */}
          {profile && !penaltiesError && (
            <section className="profile-rise glass rounded-2xl p-4">
              <h2 className="mb-3 text-sm font-semibold">Penalty History</h2>
              {penaltiesLoading && !penalties ? (
                <div className="flex flex-col gap-1.5" aria-busy="true">
                  {[0, 1].map((index) => <div key={index} className="h-[3.25rem] animate-pulse rounded-xl bg-white/[0.05]" />)}
                </div>
              ) : (penalties?.length ?? 0) === 0 ? (
                <p className="rounded-xl bg-secondary/40 px-3 py-4 text-center text-xs text-muted-foreground">No penalty history</p>
              ) : (
              <ul className="stagger-in flex flex-col gap-1.5">
                {(penalties ?? []).map((penalty) => (
                  <li key={penalty.id}>
                    <button
                      type="button"
                      onClick={() => setOpenPenalty(penalty)}
                      className="group flex w-full items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2.5 text-left transition-colors hover:bg-secondary/70"
                      aria-label={`Open ${(TYPE_META[penalty.type] ?? TYPE_META.ban).label} details`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <TypeIcon type={penalty.type} className="size-8 rounded-lg" />
                        <span className="truncate text-sm font-medium">{(TYPE_META[penalty.type] ?? TYPE_META.ban).label}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                ))}
              </ul>
              )}
            </section>
          )}

          {isFeatureEnabled("clan") && profile?.clan && (
            <button
              type="button"
              onClick={() => navigate(`/clans/${profile.clan!.id}`)}
              className="profile-rise glass group flex items-center gap-3 rounded-2xl p-4 text-left hover-lift"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-white/75 transition-colors group-hover:text-white"><Swords className="size-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Current Clan</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-white/90">{profile.clan.name} <span className="text-white/45">[{profile.clan.tag}]</span></p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          )}

          {links.length > 0 && (
            <section className="profile-rise glass rounded-2xl p-4">
              <h2 className="mb-3 text-sm font-semibold">Links</h2>
              <div className="stagger-in flex flex-col gap-2">
                {links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-2.5 rounded-lg bg-secondary/40 px-3 py-2 text-sm transition-colors hover:bg-secondary/70"
                  >
                    <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{linkHost(link.url)}</span>
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {profile && isOwner && <ProfilePrivacyDialog profile={profile} open={settingsOpen} onOpenChange={setSettingsOpen} onSaved={refetchProfile} />}

      <PenaltyDetailDialog
        penalty={openPenalty}
        onClose={() => setOpenPenalty(null)}
        onProfileNavigate={(steamId) => navigate(`/profile/${encodeURIComponent(steamId)}`)}
      />
    </div>
  )
}
