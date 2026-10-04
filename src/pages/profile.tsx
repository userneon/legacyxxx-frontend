import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeftRight, ChevronRight, Copy, Crown, ExternalLink, Eye, EyeOff, Info, MessageCircle, MoreHorizontal, Play, RotateCcw, ShieldAlert, ShieldCheck, Shield } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { profileService } from "@/api"
import { AnimatedNumber } from "@/components/animated-number"
import { profileOverviewService, type ProfileMatchRow, type ProfileOverview, type ProfileSection } from "@/api/profile-overview"
import type { FaceitProfileData, PenaltyEntry } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { isFeatureEnabled } from "@/lib/features"
import { LINKS } from "@/lib/links"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { formatDate, useWebsitePreferences } from "@/lib/preferences"
import { PAGE_ROUTES, PAGE_TITLES, documentTitle } from "@/lib/routes"
import { CompetitiveRankBadge, RankLabel, RankPill } from "@/components/competitive-rank-badge"
import { FaceitLevelBadge } from "@/components/faceit-level-badge"
import { MatchDetailsDialog } from "@/components/match-details-dialog"
import { PenaltyDetailSheet, StatusPill, TypeIcon, TYPE_META, formatPenaltyDate } from "@/components/penalty-detail-dialog"
import { PlayerAvatar } from "@/components/player-avatar"
import { copyText, steamProfileUrl } from "@/components/profile-ids"
import { RelativeTime } from "@/components/relative-time"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"

const card = "rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]"
const outline = "inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 text-[13px] font-medium text-[var(--text)] transition-[background-color,border-color,transform] duration-150 hover:border-[var(--line-strong)] hover:bg-[var(--raised)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50"

const SECTION_LABEL: Record<ProfileSection, string> = { stats: "Stats", matches: "Recent matches", faceit: "FACEIT stats", loadout: "Loadout" }

/** Card title with the crimson marker used across the site. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
      <span aria-hidden="true" className="h-3.5 w-[3px] rounded-full bg-[var(--text-faint)]" />
      {children}
    </h2>
  )
}

/** Staggered entrance for the page's blocks. */
const rise = (index: number) => ({ className: "lx-swap-in", style: { animationDelay: `${80 + index * 70}ms` } })

function yearsSince(value: string) {
  const ms = Date.now() - Date.parse(value)
  if (!Number.isFinite(ms) || ms < 0) return "—"
  const years = Math.floor(ms / (365.25 * 86_400_000))
  if (years >= 1) return `${years} year${years === 1 ? "" : "s"}`
  const months = Math.max(1, Math.floor(ms / (30.44 * 86_400_000)))
  return `${months} month${months === 1 ? "" : "s"}`
}

/** Motion always runs in full on Legacy-X (no reduced-motion mode). */
const prefersReducedMotion = () => false

/* ------------------------------------------------------------------ header */

function Banner({ user }: { user: ProfileOverview["user"] }) {
  const video = user.steamMedia?.backgroundVideo
  const [videoFailed, setVideoFailed] = useState(false)
  const still = user.steamBackground
  const art = cs2MapArtwork("de_mirage")
  return (
    <div aria-hidden="true" className="relative h-[180px] overflow-hidden bg-[linear-gradient(180deg,#1c1c1c_0%,#121212_100%)]">
      {/* No Steam background: Mirage drifting under the crimson glow, like the page heroes. */}
      {!video && !still && art && (
        <div className="lx-map-drift absolute inset-0">
          <img src={art} alt="" className="lx-map-img size-full object-cover opacity-30" />
        </div>
      )}
      {video && !videoFailed && !prefersReducedMotion() ? (
        <video className="absolute inset-0 size-full object-cover opacity-60" autoPlay muted loop playsInline poster={still ?? undefined} onError={() => setVideoFailed(true)}>
          {video.webm && <source src={video.webm} type="video/webm" />}
          {video.mp4 && <source src={video.mp4} type="video/mp4" />}
        </video>
      ) : still ? (
        <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url("${still}")` }} />
      ) : null}
      <div className="lx-hero-glow absolute -inset-10 opacity-80" />
      <div className="lx-hero-grid absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--panel)]" />
    </div>
  )
}

function Avatar({ user }: { user: ProfileOverview["user"] }) {
  const animated = user.steamMedia?.animatedAvatar
  const [ready, setReady] = useState(false)
  return (
    <span className="relative flex size-[116px] shrink-0 items-center justify-center">
      {/* A crimson ring slowly turns around the avatar. */}
      <span aria-hidden="true" className="lx-gate-ring absolute inset-0 rounded-[30px]" />
      <span className="relative size-[108px] overflow-hidden rounded-[27px] border-4 border-[var(--panel)] bg-[var(--line)]">
        <PlayerAvatar avatar={user.avatar} name={user.username} className="size-full rounded-none text-2xl" />
        {animated && <img src={animated} alt="" aria-hidden="true" onLoad={() => setReady(true)} className={cn("absolute inset-0 size-full object-cover transition-opacity duration-300", ready ? "opacity-100" : "opacity-0")} />}
      </span>
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  if (!role || role === "Player") return null
  if (role === "Owner") {
    return <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[linear-gradient(180deg,var(--brand-bright),var(--brand))] px-2.5 text-xs font-semibold text-[var(--text)]"><Crown className="size-3.5" />Owner</span>
  }
  return <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-[var(--raised)] px-2.5 text-xs font-medium text-[var(--text-2)]"><Shield className="size-3.5 text-[var(--text-2)]" />{role}</span>
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative h-[22px] w-[38px] shrink-0 rounded-full p-0.5 transition-[background-color,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50", checked ? "bg-[var(--brand)]" : "bg-[var(--line-strong)]")}
    >
      <span className={cn("block size-[18px] rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none", checked && "translate-x-4")} />
    </button>
  )
}

function PrivacyPopover({ visibility, onSaved }: { visibility: Record<ProfileSection, boolean>; onSaved: () => void }) {
  const [state, setState] = useState(visibility)
  const [error, setError] = useState("")
  useEffect(() => setState(visibility), [visibility])
  const toggle = async (section: ProfileSection, visible: boolean) => {
    const previous = state
    const next = { ...state, [section]: visible }
    setState(next)
    setError("")
    try {
      await profileOverviewService.setHidden((Object.keys(next) as ProfileSection[]).filter((key) => !next[key]))
      onSaved()
    } catch {
      setState(previous)
      setError("Couldn't save. Try again.")
    }
  }
  const rows: { key: ProfileSection; label: string }[] = [
    { key: "stats", label: "Legacy-X stats" },
    { key: "matches", label: "Recent matches & maps" },
    { key: "faceit", label: "FACEIT stats" },
    { key: "loadout", label: "Loadout" },
  ]
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={outline}><Eye className="size-3.5" />Profile settings</button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[300px] rounded-xl border-[var(--line)] bg-[var(--panel)] px-4 py-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col gap-[3px] border-b border-[var(--line-soft)] pb-2">
          <span className="text-sm font-semibold text-[var(--text)]">What others can see</span>
          <span className="text-xs text-[var(--text-dim)]">Applies to everyone except you and staff.</span>
        </div>
        <div className="pt-1">
          {rows.map((row) => (
            <div key={row.key} className="flex h-10 items-center gap-3">
              <span className="flex-1 text-[13px] text-[var(--text)]">{row.label}</span>
              <Switch label={`Show ${row.label}`} checked={state[row.key]} onChange={(next) => void toggle(row.key, next)} />
            </div>
          ))}
        </div>
        {error && <p role="alert" className="text-xs text-[var(--text-2)]">{error}</p>}
        <div className="mt-2 border-t border-[var(--line-soft)] pt-2.5 text-xs leading-[1.5] text-[var(--text-dim)]">Rank, leaderboard position and penalty history are always public.</div>
      </PopoverContent>
    </Popover>
  )
}

function Header({ overview, onVisibilityChange }: { overview: ProfileOverview; onVisibilityChange: () => void }) {
  const { user, competitive, viewer, presence } = overview
  const { user: me } = useAuth()
  const navigate = useNavigate()
  // Signed in and looking at someone else: one click puts the two of you side by side.
  const canCompare = isFeatureEnabled("compare") && Boolean(me?.steamId) && !viewer.isOwner && Boolean(user.steamId)
  const copyLink = async () => {
    const url = `${window.location.origin}/profile/${user.steamId || user.id}`
    if (await copyText(url, "Profile link")) toast.success("Profile link copied")
  }
  return (
    <header className="lx-swap-in flex flex-wrap items-end gap-5">
      <Avatar user={user} />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 pb-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="truncate text-[30px] font-bold leading-[1.1] tracking-[-0.6px] text-[var(--text)]" title={user.username}>{user.username}</h1>
          <RoleBadge role={user.role} />
          {competitive && <RankPill rankId={competitive.rankId} rankName={competitive.rankName} imageKey={competitive.rankImageKey} currentExp={competitive.exp} />}
          {presence && (
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[var(--status-green)]/12 px-2.5 text-xs font-semibold text-[var(--status-green)]">
              <span className="lx-live-dot size-1.5 rounded-full bg-[var(--status-green)]" />
              Playing now
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3.5 text-[13px] text-[var(--text-muted)]">
          {competitive?.position && <><span><span className="font-semibold text-[var(--text-2)]">#{competitive.position}</span> on leaderboard</span><span className="text-[var(--line-strong)]">·</span></>}
          {user.memberSince && <><span>Member since {formatDate(user.memberSince)}</span><span className="text-[var(--line-strong)]">·</span></>}
          <span>{overview.lastPlayedAt ? <>Last played <RelativeTime value={overview.lastPlayedAt} /></> : "No matches yet"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 pb-1.5">
        {presence?.connectAddress && (
          <a href={`steam://connect/${presence.connectAddress}`} className="lx-primary-button inline-flex h-[34px] items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold">
            <Play className="size-3.5 fill-current" />
            Join
          </a>
        )}
        {viewer.isOwner && overview.visibility && <PrivacyPopover visibility={overview.visibility} onSaved={onVisibilityChange} />}
        {canCompare && (
          <button type="button" onClick={() => navigate(`/compare?a=${encodeURIComponent(me!.steamId)}&b=${encodeURIComponent(user.steamId)}`)} className={outline}><ArrowLeftRight className="size-3.5" />Compare with me</button>
        )}
        <button type="button" onClick={() => void copyLink()} className={outline}><Copy className="size-3.5" />Copy link</button>
        {user.steamId && (
          <a href={steamProfileUrl(user.steamId) ?? undefined} target="_blank" rel="noreferrer" aria-label="Steam profile" className={outline}><ExternalLink className="size-3.5" /></a>
        )}
        {!viewer.isOwner && LINKS.discordReports && (
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" aria-label="More" className={outline}><MoreHorizontal className="size-4" /></button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className="w-44 rounded-xl border-[var(--line)] bg-[var(--panel)] p-1">
              <a href={LINKS.discordReports} target="_blank" rel="noreferrer" className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] text-[var(--text)] transition-colors hover:bg-[var(--raised)]">
                <ShieldAlert className="size-4 text-[var(--text-muted)]" />
                Report player
              </a>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ cards */

function StaffCard({ staff, username }: { staff: NonNullable<ProfileOverview["staff"]>; username: string }) {
  return (
    <section aria-label="Legacy-X team" className={cn(card, "flex flex-wrap items-center gap-4 border-[var(--line-strong)] bg-[linear-gradient(90deg,color-mix(in_oklab,var(--brand)_9%,var(--card-surface)),var(--card-surface)_55%)] px-[18px] py-3.5")}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--raised)] text-[var(--text-2)] ring-1 ring-inset ring-[var(--line-strong)]">{staff.role === "Owner" ? <Crown className="size-4" /> : <Shield className="size-4" />}</span>
      <span className="flex min-w-[220px] flex-1 flex-col gap-[3px]">
        <span className="text-sm font-semibold text-[var(--text)]">Legacy-X team · {staff.role}</span>
        <span className="text-[13px] text-[var(--text-muted)]">{staff.description} Staff never ask for your password or items.</span>
      </span>
      <Link to={`${PAGE_ROUTES.penalties}?admin=${encodeURIComponent(username)}`} className="flex items-center gap-1.5 border-r border-[var(--line)] pr-3.5 text-[13px] text-[var(--text-2)] transition-colors hover:text-[var(--text)]">
        Penalties issued <span className="font-semibold text-[var(--text)]">{staff.penaltiesIssued.toLocaleString()}</span>
        <ChevronRight className="size-3.5" />
      </Link>
      {LINKS.discordStaff && <a href={LINKS.discordStaff} target="_blank" rel="noreferrer" className={outline}><MessageCircle className="size-3.5" />Contact on Discord</a>}
    </section>
  )
}

function RankCard({ competitive }: { competitive: NonNullable<ProfileOverview["competitive"]> }) {
  const span = competitive.nextRankMinExp !== null ? competitive.nextRankMinExp - competitive.currentRankMinExp : 0
  const share = competitive.nextRankMinExp === null ? 100 : Math.max(0, Math.min(100, ((competitive.exp - competitive.currentRankMinExp) / Math.max(1, span)) * 100))
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(share))
    return () => cancelAnimationFrame(frame)
  }, [share])
  return (
    <section aria-label="Rank" className={cn(card, "relative flex items-center gap-[18px] overflow-hidden p-[18px]")}>
      <div aria-hidden="true" className="lx-hero-glow pointer-events-none absolute -inset-10 opacity-50" />
      <CompetitiveRankBadge rankId={competitive.rankId} rankName={competitive.rankName} imageKey={competitive.rankImageKey} size={72} className="relative shrink-0 drop-" />
      <div className="relative flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex flex-col gap-1.5">
            <span className="text-xs text-[var(--text-muted)]">Rank</span>
            <RankLabel rankId={competitive.rankId} rankName={competitive.rankName} imageKey={competitive.rankImageKey} size={0} nameClassName="text-base font-semibold" className="[&>img]:hidden" />
          </span>
          <Link to={`${PAGE_ROUTES.leaders}${competitive.position ? `?focus=${competitive.position}` : ""}`} className="group flex items-center gap-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
            Leaderboard <ChevronRight className="size-3.5" />
          </Link>
        </div>
        <span className="h-2 overflow-hidden rounded-full bg-[var(--line-soft)]">
          <span className="lx-progress-fill block h-full rounded-full transition-[width] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${shown}%` }} />
        </span>
        <div className="flex justify-between text-xs text-[var(--text-dim)]">
          <span>EXP <span className="font-semibold text-[var(--text)]"><AnimatedNumber value={competitive.exp} /></span></span>
          <span>{competitive.nextRankName ? <>Next <span className="text-[var(--text-2)]">{competitive.nextRankName}</span> · <span>{competitive.nextRankMinExp?.toLocaleString()}</span></> : "Top rank"}</span>
        </div>
        {competitive.expLimits && <ExpLimits limits={competitive.expLimits} />}
      </div>
    </section>
  )
}

/** "resets in 6h" / "resets in 25m", or "resets Monday" when the week is still days away. */
function resetLabel(resetsAt: string | undefined, weekly: boolean) {
  const at = resetsAt ? new Date(resetsAt).getTime() : NaN
  if (!Number.isFinite(at)) return null
  const minutes = Math.max(1, Math.round((at - Date.now()) / 60_000))
  if (minutes >= 24 * 60) return weekly ? "resets Monday" : null
  return minutes >= 60 ? `resets in ${Math.floor(minutes / 60)}h` : `resets in ${minutes}m`
}

function LimitBar({ label, used, cap, stoppedLabel, reset }: { label: string; used: number; cap: number; stoppedLabel: string; reset?: string | null }) {
  const reached = used >= cap
  const target = Math.max(0, Math.min(100, (used / Math.max(1, cap)) * 100))
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(target))
    return () => cancelAnimationFrame(frame)
  }, [target])
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex justify-between gap-2 text-xs text-[var(--text-dim)]">
        <span>{label}{reset && <> · <span className="text-[var(--text-faint)]">{reset}</span></>}</span>
        <span className={cn("transition-colors duration-500", reached && "text-[var(--status-red)]")}>
          <span className={cn("font-semibold transition-colors duration-500", reached ? "text-[var(--status-red)]" : "text-[var(--text)]")}><AnimatedNumber value={Math.min(used, cap)} /></span> / {cap.toLocaleString()}{reached && <> · {stoppedLabel}</>}
        </span>
      </div>
      <span className="h-1 overflow-hidden rounded-full bg-[var(--line-soft)]">
        <span
          className={cn("block h-full rounded-full transition-[width,background-color] duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]", reached ? "bg-[var(--status-red)]" : "bg-[var(--text-2)]")}
          style={{ width: `${shown}%` }}
        />
      </span>
    </div>
  )
}

function ExpLimits({ limits }: { limits: NonNullable<NonNullable<ProfileOverview["competitive"]>["expLimits"]> }) {
  const dayReached = limits.day.used >= limits.day.cap
  const weekReached = limits.week.used >= limits.week.cap
  return (
    <div className="mt-1 grid grid-cols-2 gap-x-[18px] gap-y-2 border-t border-[var(--line-soft)] pt-3 max-sm:grid-cols-1">
      <LimitBar label="Today" used={limits.day.used} cap={limits.day.cap} stoppedLabel="×¼" reset={resetLabel(limits.day.resetsAt, false)} />
      <LimitBar label="This week" used={limits.week.used} cap={limits.week.cap} stoppedLabel="stopped" reset={resetLabel(limits.week.resetsAt, true)} />
      <div
        className={cn(
          "col-span-2 grid text-xs text-[var(--status-red)] transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] max-sm:col-span-1",
          dayReached || weekReached ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <span className="flex items-center gap-1.5 overflow-hidden">
          <Info className="size-3.5 shrink-0" />
          {weekReached ? "Weekly EXP limit reached. Wins give no EXP until Monday. Losses still count." : "Daily EXP limit reached. Wins give a quarter of the EXP until midnight. Losses still count."}
        </span>
      </div>
    </div>
  )
}

function TrustCard({ overview, onOpenPenalty }: { overview: ProfileOverview; onOpenPenalty: (id: string) => void }) {
  const { trust, user } = overview
  const row = "flex h-[34px] items-center justify-between border-b border-[var(--line-soft)] last:border-b-0"
  return (
    <section aria-label="Trust" className={cn(card, "flex flex-col px-[18px] py-3.5")}>
      <div className="mb-1"><SectionTitle>Trust</SectionTitle></div>
      <div className={row}><span className="text-[13px] text-[var(--text-muted)]">On Legacy-X since</span><span className="text-[13px] font-medium text-[var(--text)]">{user.memberSince ? formatDate(user.memberSince) : "—"}</span></div>
      {trust.steamAccountCreatedAt && (
        <div className={row}><span className="text-[13px] text-[var(--text-muted)]">Steam account age</span><span className="text-[13px] font-medium text-[var(--text)]">{yearsSince(trust.steamAccountCreatedAt)}</span></div>
      )}
      <div className={row}>
        <span className="text-[13px] text-[var(--text-muted)]">Record</span>
        {trust.activePenalty ? (
          <button type="button" onClick={() => onOpenPenalty(trust.activePenalty!.id)} className="flex items-center gap-[5px] text-[13px] font-medium text-[var(--status-red)] underline-offset-4 hover:underline">
            <ShieldAlert className="size-3.5" />
            Active penalty
          </button>
        ) : (
          <span className="flex items-center gap-[5px] text-[13px] font-medium text-[var(--status-green)]"><ShieldCheck className="size-3.5" />Clean</span>
        )}
      </div>
    </section>
  )
}

function HiddenCard({ section }: { section: ProfileSection }) {
  return (
    <section className={cn(card, "flex items-center gap-2.5 p-4 text-[13px] text-[var(--text-dim)]")}>
      <EyeOff className="size-4" />
      {SECTION_LABEL[section]} hidden by player
    </section>
  )
}

function StatsRow({ stats }: { stats: NonNullable<ProfileOverview["stats"]> }) {
  const format = (key: string, value: number) => (key === "winRate" || key === "hs" ? `${value}%` : key === "kd" ? value.toFixed(2) : value.toLocaleString())
  return (
    <section aria-label="Legacy-X stats" className="lx-stat-grid grid-cols-2 sm:grid-flow-col sm:grid-cols-none sm:auto-cols-fr">
      {stats.map((tile) => (
        <div key={tile.key} title={format(tile.key, tile.value)} className="lx-stat-cell px-4 py-3.5">
          <span className="lx-stat-label">{tile.label}</span>
          <span className="text-2xl font-semibold leading-none text-[var(--text)]">
            <AnimatedNumber value={tile.value} decimals={tile.key === "kd" ? 2 : 0} suffix={tile.key === "winRate" || tile.key === "hs" ? "%" : ""} />
          </span>
        </div>
      ))}
    </section>
  )
}

function RecentMatches({ matches, onOpen }: { matches: ProfileMatchRow[]; onOpen: (match: ProfileMatchRow) => void }) {
  useWebsitePreferences()
  const form = matches.slice(0, 10)
  const grid = "grid grid-cols-[minmax(0,1fr)_70px_70px_60px_70px_80px] items-center gap-3 px-4 max-md:grid-cols-[minmax(0,1fr)_60px_60px_70px]"
  return (
    <section aria-label="Recent matches" className={cn(card, "overflow-hidden")}>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <SectionTitle>Recent matches</SectionTitle>
        </div>
        {form.length > 0 && (
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-[var(--text-dim)]">Form</span>
            <div aria-label="Last 10 results" className="flex gap-1">
              {form.map((match, index) => (
                <span key={index} title={match.result} style={{ animationDelay: `${index * 40}ms` }} className={cn("lx-row-in flex size-[22px] items-center justify-center rounded-md border text-[10px] font-bold", match.result === "Win" ? "border-[var(--result-win)]/45 bg-[var(--result-win)]/20 text-[var(--result-win)]" : match.result === "Loss" ? "border-[var(--result-loss)]/40 bg-[var(--result-loss)]/10 text-[var(--result-loss)]" : "border-[var(--line-strong)] text-[var(--text-dim)]")}>
                  {match.result === "Win" ? "W" : match.result === "Loss" ? "L" : "D"}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {matches.length === 0 ? (
        <p className="border-t border-[var(--line-soft)] px-4 py-8 text-center text-[13px] text-[var(--text-dim)]">No matches yet</p>
      ) : (
        <>
          <div className={cn(grid, "h-8 text-[11px] font-medium text-[var(--text-dim)]")}>
            <span>Map</span><span>Result</span><span>Score</span><span className="max-md:hidden">K/D</span><span>EXP</span><span className="max-md:hidden">Date</span>
          </div>
          {matches.map((match, index) => {
            const art = cs2MapArtwork(match.map)
            const clickable = Boolean(match.matchId)
            return (
              <button
                key={`${match.matchId ?? index}-${index}`}
                type="button"
                disabled={!clickable}
                onClick={() => onOpen(match)}
                style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
                className={cn(grid, "lx-row-in group relative h-[52px] w-full border-t border-[var(--raised)] text-left text-[13px] transition-[background-color] duration-500 enabled:hover:bg-[var(--raised)] enabled:hover:duration-200 disabled:cursor-default")}
              >
                <span aria-hidden="true" className="absolute bottom-2 left-0 top-2 w-[3px] scale-y-0 rounded-r-full bg-[var(--text-2)] opacity-0 transition-[scale,opacity] duration-500 group-enabled:group-hover:scale-y-100 group-enabled:group-hover:opacity-100 group-hover:duration-300" />
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="h-[30px] w-[52px] shrink-0 overflow-hidden rounded-md bg-[var(--line-soft)]">{art && <img src={art} alt="" className="lx-layer size-full object-cover transition-[scale] duration-700 group-hover:scale-110 group-hover:duration-500" />}</span>
                  <span className="truncate text-[var(--text)]">{cs2MapLabel(match.map)}</span>
                </span>
                <span className={cn("font-medium", match.result === "Win" ? "text-[var(--result-win)]" : match.result === "Loss" ? "text-[var(--result-loss)]" : "text-[var(--text-muted)]")}>{match.result}</span>
                <span className="text-[var(--text-2)]">{match.score}</span>
                <span className="text-[var(--text-2)] max-md:hidden">{match.kd}</span>
                <span className={cn("font-medium", (match.expDelta ?? 0) > 0 ? "text-[var(--result-win)]" : (match.expDelta ?? 0) < 0 ? "text-[var(--result-loss)]" : "text-[var(--text-dim)]")}>{typeof match.expDelta === "number" ? `${match.expDelta > 0 ? "+" : ""}${match.expDelta}` : "—"}{match.expBreakdown?.limited && <span title={match.expBreakdown.limited === "weekly" ? "Weekly EXP limit: no EXP until Monday" : "Daily EXP limit: this gain counted for a quarter"} className="ml-1.5 text-[10px] font-semibold uppercase text-[var(--status-red)]">{match.expBreakdown.limited === "weekly" ? "stop" : "×¼"}</span>}</span>
                <span className="truncate text-xs text-[var(--text-dim)] max-md:hidden">{match.playedAt ? <RelativeTime value={match.playedAt} /> : "—"}</span>
              </button>
            )
          })}
        </>
      )}
    </section>
  )
}

function MapsCard({ maps }: { maps: NonNullable<ProfileOverview["maps"]> }) {
  if (maps.length === 0) return null
  return (
    <section aria-label="Best maps" className={cn(card, "flex flex-col gap-2.5 p-4")}>
      <div className="flex items-center justify-between">
        <SectionTitle>Maps</SectionTitle>
        <span className="text-xs text-[var(--text-dim)]">Win rate · min. 3 matches</span>
      </div>
      {maps.slice(0, 6).map((map, index) => (
        <div key={map.map} className="grid h-[38px] grid-cols-[120px_minmax(0,1fr)_44px] items-center gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-[22px] w-9 shrink-0 overflow-hidden rounded bg-[var(--line-soft)]">{cs2MapArtwork(map.map) && <img src={cs2MapArtwork(map.map)!} alt="" className="size-full object-cover" />}</span>
            <span className="truncate text-[13px] text-[var(--text-2)]">{cs2MapLabel(map.map)}</span>
          </span>
          <span className="h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)]">
            <span className={cn("lx-bar-grow block h-full rounded-full", index === 0 ? "lx-progress-fill" : "bg-[linear-gradient(90deg,color-mix(in_oklab,var(--brand)_55%,transparent),var(--brand))]")} style={{ width: `${map.winRate}%`, animationDelay: `${200 + index * 70}ms` }} />
          </span>
          <span className="text-right text-[13px] text-[var(--text)]" title={`${map.wins} of ${map.matches}`}>{map.winRate}%</span>
        </div>
      ))}
    </section>
  )
}

function FaceitCard({ faceit }: { faceit: FaceitProfileData }) {
  if (!faceit.linked) return null
  const tile = (label: string, value: string) => (
    <div className="flex flex-col gap-2 rounded-[10px] border border-[var(--line-soft)] bg-[var(--panel)] px-3 py-2.5">
      <span className="text-[11px] text-[var(--text-dim)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--text)]">{value}</span>
    </div>
  )
  return (
    <section aria-label="FACEIT" className={cn(card, "flex flex-col gap-3 p-4")}>
      <div className="flex items-center justify-between">
        <SectionTitle>FACEIT</SectionTitle>
        <a href={faceit.faceitUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">Open <ExternalLink className="size-3" /></a>
      </div>
      <div className="flex items-center gap-3">
        <FaceitLevelBadge level={faceit.level} className="size-11" />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] text-[var(--text-dim)]">Level {faceit.level} · ELO</span>
          <span className="text-lg font-semibold text-[var(--text)]">{faceit.elo.toLocaleString()}</span>
        </span>
        <span className="ml-auto truncate text-xs text-[var(--text-muted)]">{faceit.nickname}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tile("Win rate", `${faceit.stats.winRate.toFixed(0)}%`)}
        {tile("Avg K/D", faceit.stats.averageKd.toFixed(2))}
        {tile("Matches", faceit.stats.matches.toLocaleString())}
        {tile("HS %", `${faceit.stats.headshots.toFixed(0)}%`)}
      </div>
    </section>
  )
}

function PenaltyHistory({ penalties, total, steamId, onOpen }: { penalties: PenaltyEntry[]; total: number; steamId: string; onOpen: (penalty: PenaltyEntry) => void }) {
  if (penalties.length === 0) return null
  return (
    <section aria-label="Penalty history" className={cn(card, "flex flex-col gap-1.5 p-4")}>
      <div className="flex items-center justify-between">
        <SectionTitle>Penalty history</SectionTitle>
        {total > penalties.length || steamId ? <Link to={`${PAGE_ROUTES.penalties}?q=${encodeURIComponent(steamId)}`} className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">View all</Link> : null}
      </div>
      {penalties.map((penalty) => (
        <button key={penalty.id} type="button" onClick={() => onOpen(penalty)} className="group flex items-center gap-2.5 rounded-md border-t border-[var(--line-soft)] px-1 py-2.5 text-left transition-colors duration-300 hover:bg-[var(--raised)]">
          <TypeIcon type={penalty.type} className="size-8" />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[13px] font-medium" style={{ color: (TYPE_META[penalty.type] ?? TYPE_META.ban).color }}>{(TYPE_META[penalty.type] ?? TYPE_META.ban).label}</span>
              <StatusPill penalty={penalty} />
            </span>
            <span className="truncate text-xs text-[var(--text-dim)]">{penalty.reason || "No reason given"} · {formatPenaltyDate(penalty.date)}</span>
          </span>
          <ChevronRight className="size-4 text-[var(--text-faint)] transition-[translate,color] duration-300 group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
        </button>
      ))}
    </section>
  )
}

function LoadoutCard({ loadout }: { loadout: NonNullable<ProfileOverview["loadout"]> }) {
  return (
    <section aria-label="Loadout" className={cn(card, "flex flex-col gap-3 p-4")}>
      <div className="flex items-center justify-between">
        <SectionTitle>Loadout</SectionTitle>
        <span className="text-xs text-[var(--text-dim)]">{loadout.side === "ct" ? "CT side" : "T side"}</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {loadout.items.map((item) => (
          <div key={item.key} className="flex min-w-0 flex-col gap-1.5">
            <div className="group flex h-14 items-center justify-center overflow-hidden rounded-lg border border-[var(--line-soft)] bg-[var(--panel)] px-2 transition-[border-color,box-shadow] duration-500 hover:border-[var(--line-strong)] hover:duration-300" title={item.name ?? "Default"}>
              {item.image ? <img src={item.image} alt={item.name ?? ""} className="lx-layer max-h-full max-w-full object-contain transition-[scale] duration-500 group-hover:scale-110" loading="lazy" /> : <span className="text-[11px] text-[var(--text-faint)]">Default</span>}
            </div>
            <span className="truncate text-[11px] text-[var(--text-dim)]">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function ProfileSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="px-6 pt-6 max-md:px-4 max-md:pt-4">
        <div className="overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--panel)]">
          <div className="h-[180px] bg-[linear-gradient(180deg,#1c1c1c_0%,#121212_100%)]" />
          <div className="-mt-14 flex items-end gap-5 px-5 pb-5 max-md:px-4">
            <Skeleton className="size-[104px] rounded-[26px] border-4 border-[var(--panel)] bg-[var(--line)]" />
            <div className="flex flex-1 flex-col gap-2.5 pb-2">
              <Skeleton className="h-6 w-56 rounded-full bg-[var(--line-strong)]" />
              <Skeleton className="h-3 w-80 rounded-full bg-[var(--line-soft)]" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 px-6 pb-8 pt-4">
        <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
          <Skeleton className="h-[108px] rounded-xl bg-[var(--glass-fill)]" />
          <Skeleton className="h-[108px] rounded-xl bg-[var(--glass-fill)]" />
        </div>
        <Skeleton className="h-20 rounded-xl bg-[var(--glass-fill)]" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ page */

export function ProfilePage({ userId }: { userId?: string }) {
  const params = useParams()
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const identity = userId ?? params.steamId ?? "me"
  const { data, loading, error, refetch } = useApiQuery<ProfileOverview>((signal) => profileOverviewService.get(identity, { signal }), { queryKey: `profile:${identity}`, keepPreviousData: true })
  const faceitHidden = data?.hidden.includes("faceit") ?? true
  const { data: faceit } = useApiQuery<FaceitProfileData>((signal) => profileService.getFaceitProfile(data!.user.id, { signal }), { enabled: Boolean(data) && !faceitHidden, queryKey: `profile-faceit:${data?.user.id ?? ""}` })
  const [openMatch, setOpenMatch] = useState<ProfileMatchRow | null>(null)
  const [openPenalty, setOpenPenalty] = useState<PenaltyEntry | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  // Tab title: the player's name once the profile has loaded ("Temuulen · LEGACY-X").
  const username = data?.user.username ?? null
  useEffect(() => {
    document.title = documentTitle(username ?? PAGE_TITLES.profile)
  }, [username])

  if (!data) {
    if (error && !loading) {
      return (
        <p className="flex items-center justify-center gap-3 py-24 text-[13px] text-[var(--text-dim)]">
          {error.status === 404 ? "This player was not found." : "Could not load this profile."}
          {error.status !== 404 && <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>}
        </p>
      )
    }
    return <ProfileSkeleton />
  }

  const hidden = new Set(data.hidden)
  const showFaceit = !hidden.has("faceit") && faceit?.linked
  const penaltyById = (id: string) => data.penalties.find((penalty) => penalty.id === id) ?? null
  const isOwnPenalty = Boolean(me && me.id === data.user.id)

  return (
    <div ref={topRef}>
      <div className="px-6 pt-6 max-md:px-4 max-md:pt-4">
        {/* The banner lives inside the profile box: the box clips it, it never bleeds past the box edges. */}
        <section aria-label="Profile" className="overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--panel)]">
          <Banner user={data.user} />
          <div className="-mt-14 px-5 pb-5 max-md:px-4">
            <Header overview={data} onVisibilityChange={refetch} />
          </div>
        </section>
      </div>
      {/* The Owner role has no match statistics, so everything under the header stays empty for now; something of its own goes here later. */}
      {data.user.role !== "Owner" && (
      <div className="flex flex-col gap-4 px-6 pb-8 pt-4 max-md:px-4">
        {data.staff && <div {...rise(0)}><StaffCard staff={data.staff} username={data.user.username} /></div>}

        <div {...rise(1)} className={cn(rise(1).className, "grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]")}>
          {data.competitive ? <RankCard competitive={data.competitive} /> : <section className={cn(card, "flex items-center p-[18px] text-[13px] text-[var(--text-dim)]")}>Unranked — no competitive matches yet</section>}
          <TrustCard overview={data} onOpenPenalty={(id) => setOpenPenalty(penaltyById(id))} />
        </div>

        {hidden.has("stats") ? <HiddenCard section="stats" /> : data.stats && <StatsRow stats={data.stats} />}

        <div {...rise(3)} className={cn(rise(3).className, "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]")}>
          <div className="flex min-w-0 flex-col gap-4">
            {hidden.has("matches") ? <HiddenCard section="matches" /> : (
              <>
                <RecentMatches matches={data.recentMatches ?? []} onOpen={setOpenMatch} />
                {data.maps && <MapsCard maps={data.maps} />}
              </>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            {hidden.has("faceit") ? <HiddenCard section="faceit" /> : showFaceit && faceit && <FaceitCard faceit={faceit} />}
            <PenaltyHistory penalties={data.penalties} total={data.penaltyCount} steamId={data.user.steamId} onOpen={setOpenPenalty} />
            {hidden.has("loadout") ? <HiddenCard section="loadout" /> : data.loadout && <LoadoutCard loadout={data.loadout} />}
          </div>
        </div>
      </div>
      )}

      {openMatch?.matchId && (
        <MatchDetailsDialog matchId={openMatch.matchId} mapNumber={openMatch.mapNumber ?? 1} highlightSteamId={data.user.steamId} onOpenChange={(open) => { if (!open) setOpenMatch(null) }} />
      )}
      <PenaltyDetailSheet
        penalty={openPenalty}
        isOwn={isOwnPenalty}
        onClose={() => setOpenPenalty(null)}
        onProfileNavigate={(steamId) => navigate(`/profile/${encodeURIComponent(steamId)}`)}
      />
    </div>
  )
}
