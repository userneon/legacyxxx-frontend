import { DiscordIcon } from "@/components/discord-strip"
import { BoosterBadge } from "@/components/booster-badge"
import { PerkBadge, PerkTitle } from "@/components/perk-badge"
import { ProfileConfigs } from "@/components/profile-config"
import { ProfileBanner } from "@/components/profile-banner"
import { PlayerNameText } from "@/components/player-name-text"
import { DiscordLinkedMark } from "@/components/discord-linked-mark"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { usePathTab } from "@/hooks/use-url-tab"
import { ArrowLeftRight, Ban, ChevronRight, Copy, Crosshair, Crown, ExternalLink, EyeOff, Info, MessageCircle, MoreHorizontal, Play, RotateCcw, ShieldAlert, ShieldCheck, Shield, Swords, Trophy } from "lucide-react"
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
import { RingStat } from "@/components/home-bento"
import { CompetitiveRankBadge, RankLabel, RankPill, rankTierColor } from "@/components/competitive-rank-badge"
import { FaceitLevelBadge } from "@/components/faceit-level-badge"
import { MatchDetailsDialog } from "@/components/match-details-dialog"
import { setProfileScene } from "@/lib/profile-scene"
import { ProfileStaffMenu } from "@/components/profile-staff"
import { OwnerPanel } from "@/components/owner-panel"
import { OwnerSections } from "@/components/owner-sections"
import { PenaltyDetailSheet, StatusPill, TypeIcon, TYPE_META, formatPenaltyDate } from "@/components/penalty-detail-dialog"
import { OrbAvatar } from "@/components/orb-avatar"
import { PlayerAvatar } from "@/components/player-avatar"
import { ORB_ID } from "@/lib/frame-look"
import { RingFrame } from "@/components/ring-frame"
import { isRingFrame } from "@/lib/ring-frames"
import { CreatorBadge, CreatorLinks } from "@/pages/creators"
import { clanTagProps, nameProps } from "@/lib/cosmetics"
import type { NameStyle } from "@/api/cosmetics"
import { PageTabs } from "@/components/page-tabs"
import { AccountSettings, AppearanceSettings } from "@/pages/settings"
import { copyText, steamProfileUrl } from "@/components/profile-ids"
import { RelativeTime } from "@/components/relative-time"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ReportPlayerDialog } from "@/components/report-player-dialog"
import { Skeleton } from "@/components/ui/skeleton"

const card = "lx-pcard rounded-2xl border border-[var(--glass-line)] bg-[var(--glass-fill)]"
const outline = "inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 text-[13px] font-medium text-[var(--text)] transition-[background-color,border-color,transform] duration-150 hover:border-[var(--line-strong)] hover:bg-[var(--raised)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50"

const SECTION_LABEL: Record<ProfileSection, string> = { stats: "Stats", matches: "Recent matches", faceit: "FACEIT stats", loadout: "Loadout" }

/** Card title with the violet marker used across the site. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-[16px] font-bold text-[var(--text)] after:h-px after:flex-1 after:bg-gradient-to-r after:from-white/15 after:to-transparent">
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

/* ------------------------------------------------------------------ header */

function Avatar({ user }: { user: ProfileOverview["user"] }) {
  const animated = user.steamMedia?.animatedAvatar
  const [ready, setReady] = useState(false)
  // A round picture; the Steam animated avatar, when there is one, fades in over it. Wearing the Crystal Orb, the picture sits in the live orb (it overflows, so the header makes room).
  if (user.frame === ORB_ID) {
    return (
      <span className="relative flex size-[160px] shrink-0 items-center justify-center">
        <OrbAvatar avatar={user.avatar} name={user.username} size={160} look={user.frameLook} />
      </span>
    )
  }
  return (
    <span className="relative flex size-[116px] shrink-0 items-center justify-center" style={{ "--lx-ring-inset": "-7%", "--lx-ring-size": "116px" } as React.CSSProperties}>
      {isRingFrame(user.frame) && <RingFrame id={user.frame} />}
      <span className="relative size-[108px] overflow-hidden rounded-full border-4 border-[var(--card-surface)] bg-[var(--line)]">
        <PlayerAvatar avatar={user.avatar} name={user.username} className="size-full text-2xl" />
        {animated && <img src={animated} alt="" aria-hidden="true" onLoad={() => setReady(true)} className={cn("absolute inset-0 size-full rounded-full object-cover transition-opacity duration-300", ready ? "opacity-100" : "opacity-0")} />}
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
    { key: "stats", label: "LEGACY-X stats" },
    { key: "matches", label: "Recent matches & maps" },
    { key: "faceit", label: "FACEIT stats" },
    { key: "loadout", label: "Loadout" },
  ]
  return (
    <section aria-label="Profile visibility" className={cn(card, "flex flex-col gap-1 px-5 py-4")}>
      <div className="flex flex-col gap-[3px] border-b border-[var(--line-soft)] pb-3">
        <span className="text-[15px] font-semibold text-[var(--text)]">Profile visibility</span>
        <span className="text-xs text-[var(--text-dim)]">What others can see. Applies to everyone except you and staff.</span>
      </div>
      <div className="pt-1">
        {rows.map((row) => (
          <div key={row.key} className="flex h-11 items-center gap-3">
            <span className="flex-1 text-[13px] text-[var(--text)]">{row.label}</span>
            <Switch label={`Show ${row.label}`} checked={state[row.key]} onChange={(next) => void toggle(row.key, next)} />
          </div>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-[var(--text-2)]">{error}</p>}
      <div className="border-t border-[var(--line-soft)] pt-3 text-xs leading-[1.5] text-[var(--text-dim)]">Rank, leaderboard position and penalty history are always public.</div>
    </section>
  )
}

function Header({ overview, onVisibilityChange }: { overview: ProfileOverview; onVisibilityChange: () => void }) {
  const { user, competitive, viewer, presence } = overview
  const { user: me } = useAuth()
  const navigate = useNavigate()
  const [reporting, setReporting] = useState(false)
  // Signed in and looking at someone else: one click puts the two of you side by side.
  const canCompare = isFeatureEnabled("compare") && Boolean(me?.steamId) && !viewer.isOwner && Boolean(user.steamId)
  const copyLink = async () => {
    const url = `${window.location.origin}/profile/${user.steamId || user.id}`
    if (await copyText(url, "Profile link")) toast.success("Profile link copied")
  }
  return (
    <header data-tier={overview.perk?.tier} className={cn("lx-swap-in flex flex-col items-center gap-4 text-center", overview.perk && "lx-profile-perk")}>
      <Avatar user={user} />
      <div className="flex min-w-0 max-w-full flex-1 flex-col items-center gap-3">
        <div className="flex min-w-0 max-w-full flex-col items-center gap-1">
          <div className="flex min-w-0 max-w-full items-center justify-center gap-2.5">
            <h1 {...nameProps(user.nameStyle, "-mx-5 -my-3 truncate px-5 py-3 text-[30px] font-bold leading-[1.1] tracking-[-0.6px] text-[var(--text)]")} title={user.username}><PlayerNameText name={user.username} /></h1>
            <DiscordLinkedMark linked={overview.discordLinked} focusable className="shrink-0 [&_svg]:size-[18px]" />
          </div>
          {overview.banned
            ? <span title={overview.banned.reason ?? undefined} className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[3px] text-[var(--status-red)]"><Ban className="size-3.5" aria-hidden="true" />Banned</span>
            : user.title ? <span className={cn("text-[11px] font-semibold uppercase tracking-[3px]", user.title === "Genesis" ? "lx-profile-title-founder" : "text-[var(--text-dim)]")}>{user.title}</span> : overview.perk && <PerkTitle perk={overview.perk} />}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <RoleBadge role={user.role} />
          {overview.creator && <CreatorBadge tier={overview.creator.tier} label={overview.creator.label} />}
          {overview.perk && <PerkBadge tier={overview.perk.tier} name={overview.perk.name} />}
          {(overview.discordBoosting || overview.boosterPlace) && <BoosterBadge place={overview.boosterPlace} />}
          {overview.clan && (
            <Link to={`/clans/${overview.clan.number ?? overview.clan.id}`} title={overview.clan.name} className="inline-flex h-6 items-center gap-1 rounded-full border border-[var(--line)] px-2 text-[11px] font-semibold text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]">
              <span {...clanTagProps(overview.clan.look)}>[{overview.clan.tag}]</span> <span className="max-w-[140px] truncate font-medium">{overview.clan.name}</span>
            </Link>
          )}
          {competitive && <RankPill rankId={competitive.rankId} rankName={competitive.rankName} imageKey={competitive.rankImageKey} currentExp={competitive.exp} />}
          {presence && (
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[var(--status-green)]/12 px-2.5 text-xs font-semibold text-[var(--status-green)]">
              <span className="lx-live-dot size-1.5 rounded-full bg-[var(--status-green)]" />
              Playing now
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3.5 text-[13px] text-[var(--text-muted)]">
          {competitive?.position && <><span title="Leaderboard position" className="font-semibold text-[var(--text-2)]">#{competitive.position}</span><span className="text-[var(--line-strong)]">·</span></>}
          {user.memberSince && <><span title="Member since">Since {formatDate(user.memberSince)}</span><span className="text-[var(--line-strong)]">·</span></>}
          <span title="Last played">{overview.banned ? "Banned" : overview.lastPlayedAt ? <>Active <RelativeTime value={overview.lastPlayedAt} /></> : "No matches yet"}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
        {presence?.connectAddress && (
          <a href={`steam://connect/${presence.connectAddress}`} className="lx-primary-button inline-flex h-[34px] items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold">
            <Play className="size-3.5 fill-current" />
            Join
          </a>
        )}
        <ProfileStaffMenu steamId={user.steamId} name={user.username} onChanged={onVisibilityChange} />
        {canCompare && (
          <button type="button" onClick={() => navigate(`/compare?a=${encodeURIComponent(me!.steamId)}&b=${encodeURIComponent(user.steamId)}`)} className={outline}><ArrowLeftRight className="size-3.5" />Compare with me</button>
        )}
        <button type="button" onClick={() => void copyLink()} className={outline}><Copy className="size-3.5" />Copy link</button>
        {user.steamId && (
          <a href={steamProfileUrl(user.steamId) ?? undefined} target="_blank" rel="noreferrer" aria-label="Steam profile" className={outline}><ExternalLink className="size-3.5" /></a>
        )}
        {!viewer.isOwner && Boolean(me?.id) && (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" aria-label="More" className={outline}><MoreHorizontal className="size-4" /></button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="w-44 rounded-xl border-[var(--line)] bg-[var(--panel)] p-1">
                <button type="button" onClick={() => setReporting(true)} className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13px] text-[var(--text)] transition-colors hover:bg-[var(--raised)]">
                  <ShieldAlert className="size-4 text-[var(--text-muted)]" />
                  Report player
                </button>
              </PopoverContent>
            </Popover>
            <ReportPlayerDialog open={reporting} onOpenChange={setReporting} userId={user.id} name={user.username} />
          </>
        )}
        </div>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ cards */

function StaffCard({ staff, username }: { staff: NonNullable<ProfileOverview["staff"]>; username: string }) {
  return (
    <section aria-label="LEGACY-X team" className={cn(card, "flex flex-wrap items-center gap-4 border-[var(--line-strong)] bg-[var(--glass-fill)] px-[18px] py-3.5")}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--raised)] text-[var(--text-2)] ring-1 ring-inset ring-[var(--line-strong)]">{staff.role === "Owner" ? <Crown className="size-4" /> : <Shield className="size-4" />}</span>
      <span className="flex min-w-[220px] flex-1 flex-col gap-[3px]">
        <span className="text-sm font-semibold text-[var(--text)]">LEGACY-X team · {staff.role}</span>
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
    <section aria-label="Rank" style={{ ["--tint" as string]: rankTierColor(competitive.rankId) }} className={cn(card, "lx-feature relative flex items-center gap-[18px] overflow-hidden p-[18px]")}>
      <CompetitiveRankBadge rankId={competitive.rankId} rankName={competitive.rankName} imageKey={competitive.rankImageKey} size={84} className="relative shrink-0" />
      <div className="relative flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex flex-col gap-1.5">
            <span className="text-xs text-[var(--text-muted)]">Rank</span>
            <RankLabel rankId={competitive.rankId} rankName={competitive.rankName} imageKey={competitive.rankImageKey} size={0} nameClassName="text-[22px] font-bold" className="[&>img]:hidden" />
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
        <span title={reset ?? undefined}>{label}</span>
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
      <LimitBar label="Week" used={limits.week.used} cap={limits.week.cap} stoppedLabel="stopped" reset={resetLabel(limits.week.resetsAt, true)} />
      <div
        className={cn(
          "col-span-2 grid text-xs text-[var(--status-red)] transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] max-sm:col-span-1",
          dayReached || weekReached ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <span className="flex items-center gap-1.5 overflow-hidden">
          <Info className="size-3.5 shrink-0" />
          {weekReached ? "Weekly limit reached · wins give no EXP" : "Daily limit reached · wins give ¼ EXP"}
        </span>
      </div>
    </div>
  )
}

function TrustCard({ overview, onOpenPenalty }: { overview: ProfileOverview; onOpenPenalty: (id: string) => void }) {
  const { trust } = overview
  const row = "flex h-[34px] items-center justify-between border-b border-[var(--line-soft)] last:border-b-0"
  return (
    <section aria-label="Trust" className={cn(card, "flex flex-col px-[18px] py-3.5")}>
      <div className="mb-1"><SectionTitle>Trust</SectionTitle></div>
      {trust.steamAccountCreatedAt && (
        <div className={row}><span className="text-[13px] text-[var(--text-muted)]">Steam account</span><span className="text-[13px] font-medium text-[var(--text)]">{yearsSince(trust.steamAccountCreatedAt)}</span></div>
      )}
      {overview.discordLinked !== undefined && (
        <div className={row}>
          <span className="text-[13px] text-[var(--text-muted)]">Discord</span>
          {overview.discordLinked
            ? <span className="flex items-center gap-[5px] text-[13px] font-medium text-[var(--status-green)]"><DiscordIcon className="size-3.5" />Linked</span>
            : <span className="text-[13px] font-medium text-[var(--text-dim)]">Not linked</span>}
        </div>
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

/** A stat card of a banned player (owner request 2026-11-06): the card keeps its shape and heading, every figure is a bar, and "Banned" sits over it. Nothing real is drawn. */
function CensoredCard({ label, rows = 3, className }: { label: string; rows?: number; className?: string }) {
  return (
    <section aria-label={`${label}: banned`} className={cn(card, "relative overflow-hidden p-[18px]", className)}>
      <div aria-hidden="true" className="flex flex-col gap-3 opacity-60">
        <span className="h-2.5 w-24 rounded-full bg-[var(--line-strong)]" />
        {Array.from({ length: rows }, (_, index) => <span key={index} className="h-3 rounded-full bg-[var(--line)]" style={{ width: `${88 - index * 17}%` }} />)}
      </div>
      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[var(--card-surface)]/55 text-[11px] font-semibold uppercase tracking-[3px] text-[var(--status-red)]">
        <Ban className="size-3.5" aria-hidden="true" />{label} · Banned
      </div>
    </section>
  )
}

function CensoredStatsRow() {
  return (
    <section aria-label="Stats: banned" className={cn(card, "relative overflow-hidden")}>
      <div aria-hidden="true" className="lx-stat-grid grid grid-cols-2 opacity-60 md:grid-cols-5">
        {EMPTY_STATS.map((tile) => (
          <div key={tile.key} className="lx-stat-cell flex flex-col gap-2 px-4 py-3.5">
            <span className="text-[11px] font-medium uppercase tracking-[1.5px] text-[var(--text-faint)]">{tile.label}</span>
            <span className="h-6 w-16 rounded-md bg-[var(--line-strong)]" />
            <span className="h-1 rounded-full bg-[var(--line)]" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[var(--card-surface)]/55 text-[11px] font-semibold uppercase tracking-[3px] text-[var(--status-red)]">
        <Ban className="size-3.5" aria-hidden="true" />Stats · Banned
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

const EMPTY_STATS = [{ key: "matches", label: "Matches" }, { key: "winRate", label: "Win rate" }, { key: "kd", label: "K/D" }, { key: "hs", label: "Headshot %" }, { key: "kills", label: "Avg. kills" }]

/** Before a first match there is nothing to count: the same frame with dashes, never made-up zeros. */
function EmptyStatsRow() {
  return (
    <section aria-label="LEGACY-X stats" className="lx-stat-grid grid-cols-2 sm:grid-flow-col sm:grid-cols-none sm:auto-cols-fr">
      {EMPTY_STATS.map((tile) => (
        <div key={tile.key} className="lx-stat-cell px-4 py-3.5">
          <span className="lx-stat-label">{tile.label}</span>
          <span className="text-2xl font-semibold leading-none text-[var(--text-faint)]">—</span>
        </div>
      ))}
    </section>
  )
}

/** Rings for the numbers a player cares about (owner request 2026-11-09, "add donuts and circles"): win rate, K/D, headshots and the EXP limits, drawn from the same API numbers as the tiles below. */
function ProfileRings({ overview }: { overview: ProfileOverview }) {
  const stat = (key: string) => overview.stats?.find((tile) => tile.key === key)?.value
  const win = stat("winRate")
  const kd = stat("kd")
  const hs = stat("hs")
  const tile = (key: string) => overview.stats?.find((entry) => entry.key === key)
  const matches = tile("matches")
  const avgKills = tile("avgKills")
  const limits = overview.competitive?.expLimits ?? null
  const share = (used: number, cap: number) => (cap > 0 ? Math.max(0, Math.min(100, (used / cap) * 100)) : 0)
  const cards: ReactNode[] = []
  // Matches and average kills have no ceiling, so their ring shows how many ranked players the player beats (the API's percentile).
  const beats = (entry: NonNullable<typeof matches>) => (typeof entry.percentile === "number" ? [{ pct: entry.percentile, tone: "green" as const }] : [])
  // Two tiers (owner feedback 2026-11-13, "UI monotony"): the three numbers people look for first are large, the rest a compact strip under them.
  const primary: ReactNode[] = []
  if (matches) primary.push(<RingStat key="matches" size="lg" icon={Swords} value={matches.value.toLocaleString()} label="Matches" title={typeof matches.percentile === "number" ? `More than ${matches.percentile}% of ranked players` : undefined} segments={beats(matches)} />)
  if (typeof win === "number") primary.push(<RingStat key="win" size="lg" icon={Trophy} value={`${Math.round(win)}%`} label="Win rate" segments={[{ pct: win, tone: "green" }]} />)
  if (typeof kd === "number") primary.push(<RingStat key="kd" size="lg" icon={Crosshair} value={kd.toFixed(2)} label="K/D" title="Kills against deaths" segments={[{ pct: (kd / (kd + 1)) * 100, tone: "green" }, { pct: (1 / (kd + 1)) * 100, tone: "red" }]} />)
  if (typeof hs === "number") cards.push(<RingStat key="hs" size="sm" value={`${Math.round(hs)}%`} label="Headshots" segments={[{ pct: hs, tone: "green" }]} />)
  if (avgKills) cards.push(<RingStat key="kills" size="sm" value={avgKills.value.toFixed(1)} label="Avg. kills" title={typeof avgKills.percentile === "number" ? `Better than ${avgKills.percentile}% of ranked players` : undefined} segments={beats(avgKills)} />)
  if (limits) {
    cards.push(<RingStat key="day" size="sm" value={`${Math.round(share(limits.day.used, limits.day.cap))}%`} label="EXP today" title={`${limits.day.used.toLocaleString()} of ${limits.day.cap.toLocaleString()} EXP today`} segments={[{ pct: share(limits.day.used, limits.day.cap), tone: limits.day.used >= limits.day.cap ? "red" : "green" }]} />)
    cards.push(<RingStat key="week" size="sm" value={`${Math.round(share(limits.week.used, limits.week.cap))}%`} label="EXP this week" title={`${limits.week.used.toLocaleString()} of ${limits.week.cap.toLocaleString()} EXP this week`} segments={[{ pct: share(limits.week.used, limits.week.cap), tone: limits.week.used >= limits.week.cap ? "red" : "green" }]} />)
  }
  if (primary.length === 0 && cards.length === 0) return null
  return (
    <section aria-label="Stats" className="flex flex-col gap-3">
      {primary.length > 0 && <div className="grid grid-cols-1 gap-3 @md:grid-cols-3">{primary}</div>}
      {cards.length > 0 && <div className="grid grid-cols-2 gap-3 @xl:grid-cols-4">{cards}</div>}
    </section>
  )
}

function RecentMatches({ matches, kdAverage, onOpen }: { matches: ProfileMatchRow[]; kdAverage: number | null; onOpen: (match: ProfileMatchRow) => void }) {
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
                <span key={index} title={match.result} className={cn("flex size-[22px] items-center justify-center rounded-md border text-[10px] font-bold", match.result === "Win" ? "border-[var(--result-win)]/45 bg-[var(--result-win)]/20 text-[var(--result-win)]" : match.result === "Loss" ? "border-[var(--result-loss)]/40 bg-[var(--result-loss)]/10 text-[var(--result-loss)]" : "border-[var(--line-strong)] text-[var(--text-dim)]")}>
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
                className={cn(grid, "group relative isolate h-[52px] w-full overflow-hidden border-t border-[var(--raised)] text-left text-[13px] transition-[background-color] duration-500 enabled:hover:bg-[var(--raised)] enabled:hover:duration-200 disabled:cursor-default")}
              >
                <span aria-hidden="true" className="absolute bottom-2 left-0 top-2 w-[3px] scale-y-0 rounded-r-full bg-[var(--text-2)] opacity-0 transition-[scale,opacity] duration-500 group-enabled:group-hover:scale-y-100 group-enabled:group-hover:opacity-100 group-hover:duration-300" />
                {art && <img src={art} alt="" aria-hidden="true" className="lx-list-art pointer-events-none absolute inset-0 -z-10 size-full object-cover opacity-45 transition-opacity duration-300 group-enabled:group-hover:opacity-60" />}
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="truncate font-medium text-[var(--text)]">{cs2MapLabel(match.map)}</span>
                </span>
                <span className={cn("font-medium", match.result === "Win" ? "text-[var(--result-win)]" : match.result === "Loss" ? "text-[var(--result-loss)]" : "text-[var(--text-muted)]")}>{match.result}</span>
                <span className="text-[var(--text-2)]">{match.score}</span>
                {(() => {
                  // A match K/D above the community average (see the stats row) is green, below it red; with no average it stays plain.
                  const value = Number(match.kd)
                  const tone = kdAverage !== null && Number.isFinite(value) ? (value > kdAverage ? "text-[var(--result-win)]" : value < kdAverage ? "text-[var(--result-loss)]" : "text-[var(--text-2)]") : "text-[var(--text-2)]"
                  return <span title={kdAverage !== null ? `Community average ${kdAverage.toFixed(2)}` : undefined} className={cn("max-md:hidden", tone)}>{match.kd}</span>
                })()}
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
  if (maps.length === 0) {
    return (
      <section aria-label="Best maps" className={cn(card, "flex flex-col gap-2.5 p-4")}>
        <SectionTitle>Maps</SectionTitle>
        <p className="py-4 text-center text-[13px] text-[var(--text-dim)]">No maps played yet</p>
      </section>
    )
  }
  return (
    <section aria-label="Best maps" className={cn(card, "flex flex-col gap-2.5 p-4")}>
      <div className="flex items-center justify-between">
        <SectionTitle>Maps</SectionTitle>
        <span className="text-xs text-[var(--text-dim)]">Win rate</span>
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
  const bar = "rounded-full bg-[var(--line-soft)]"
  return (
    <div aria-hidden="true">
      {/* Your own profile has the tab row on top; it is held in place so nothing moves when the page arrives. */}
      <div className="px-6 pt-6 max-md:px-4 max-md:pt-4">
        {/* The header: avatar, name, a line of facts and the buttons, all centred. */}
        <section className={cn(card, "flex h-[299px] flex-col items-center px-5 pt-7 max-md:px-4")}>
          <Skeleton className="size-[104px] rounded-2xl bg-[var(--line)]" />
          <Skeleton className="mt-5 h-7 w-56 max-w-full rounded-full bg-[var(--line-strong)]" />
          <Skeleton className={cn("mt-3 h-3 w-64 max-w-full", bar)} />
          <div className="mt-5 flex gap-2">
            {[116, 76, 100, 36].map((width) => <Skeleton key={width} className="h-9 rounded-lg bg-[var(--line-soft)]" style={{ width }} />)}
          </div>
        </section>
      </div>
      <div className="flex flex-col gap-4 px-6 pb-8 pt-4 max-md:px-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className={cn(card, "flex h-[205px] items-center gap-6 p-[18px]")}>
            <Skeleton className="size-[72px] shrink-0 rounded-xl bg-[var(--line)]" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className={cn("h-3 w-16", bar)} />
              <Skeleton className="h-5 w-32 rounded-full bg-[var(--line-strong)]" />
              <Skeleton className="h-1.5 w-full rounded-full bg-[var(--line)]" />
              <Skeleton className={cn("h-3 w-3/4", bar)} />
              <Skeleton className="h-1 w-full rounded-full bg-[var(--line)]" />
            </div>
          </div>
          <div className={cn(card, "flex h-[205px] flex-col gap-4 p-[18px]")}>
            <Skeleton className="h-4 w-16 rounded-full bg-[var(--line-strong)]" />
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center justify-between">
                <Skeleton className={cn("h-3 w-28", bar)} />
                <Skeleton className={cn("h-3 w-14", bar)} />
              </div>
            ))}
          </div>
        </div>
        <div className="lx-stat-grid grid-cols-2 sm:grid-flow-col sm:grid-cols-none sm:auto-cols-fr">
          {[0, 1, 2, 3, 4].map((cell) => (
            <div key={cell} className="lx-stat-cell shadow-none!">
              <Skeleton className="h-2.5 w-16 bg-white/[0.06]" />
              <Skeleton className="h-6 w-14 bg-white/[0.06]" />
            </div>
          ))}
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className={cn(card, "p-[18px]")}>
            <Skeleton className="h-4 w-32 rounded-full bg-[var(--line-strong)]" />
            <div className="mt-5 flex flex-col gap-3">
              {[0, 1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-14 shrink-0 rounded-md bg-[var(--line)]" />
                  <Skeleton className={cn("h-3 flex-1", bar)} />
                  <Skeleton className={cn("h-3 w-16", bar)} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <div className={cn(card, "h-[200px] p-[18px]")}><Skeleton className="h-4 w-20 rounded-full bg-[var(--line-strong)]" /></div>
            <div className={cn(card, "h-[160px] p-[18px]")}><Skeleton className="h-4 w-28 rounded-full bg-[var(--line-strong)]" /></div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ page */

type ProfileTab = "profile" | "appearance" | "settings"

export function ProfilePage({ userId }: { userId?: string }) {
  const params = useParams()
  const navigate = useNavigate()
  const { user: me, refreshUser } = useAuth()
  const identity = userId ?? params.steamId ?? "me"
  const [pathTab, setPathTab] = usePathTab<ProfileTab>("/profile", { profile: "", appearance: "appearance", settings: "settings" }, "profile")
  const { data, loading, error, refetch } = useApiQuery<ProfileOverview>((signal) => profileOverviewService.get(identity, { signal }), { queryKey: `profile:${identity}`, keepPreviousData: true })
  // Wearing something in Appearance (or the Shop) changes how this page looks, so it reloads itself: no manual refresh.
  useEffect(() => {
    const onChange = () => { refetch(); void refreshUser() }
    window.addEventListener("legacyx:appearance-changed", onChange)
    return () => window.removeEventListener("legacyx:appearance-changed", onChange)
  }, [refetch, refreshUser])
  // The name look being tried in Appearance, shown live on the profile card.
  const [previewName, setPreviewName] = useState<{ name: NameStyle; banner?: string | null; frame?: string | null } | null>(null)
  useEffect(() => {
    const onPreview = (event: Event) => setPreviewName((event as CustomEvent<{ name: NameStyle; banner?: string | null; frame?: string | null } | null>).detail ?? null)
    window.addEventListener("legacyx:appearance-preview", onPreview)
    return () => window.removeEventListener("legacyx:appearance-preview", onPreview)
  }, [])
  const faceitHidden = data?.hidden.includes("faceit") ?? true
  const { data: faceit } = useApiQuery<FaceitProfileData>((signal) => profileService.getFaceitProfile(data!.user.id, { signal }), { enabled: Boolean(data) && !faceitHidden, queryKey: `profile-faceit:${data?.user.id ?? ""}` })
  // The player's Steam background is drawn by the app shell behind the whole window; it goes away with the page.
  const sceneStill = data?.user.steamBackground ?? null
  const sceneWebm = data?.user.steamMedia?.backgroundVideo?.webm ?? null
  const sceneMp4 = data?.user.steamMedia?.backgroundVideo?.mp4 ?? null
  const sceneBackground = data?.user.background ?? null
  const sceneBackgroundKey = sceneBackground ? JSON.stringify(sceneBackground) : ""
  useEffect(() => {
    if (!sceneStill && !sceneWebm && !sceneMp4 && !sceneBackground) { setProfileScene(null); return }
    setProfileScene({ still: sceneStill, video: sceneWebm || sceneMp4 ? { webm: sceneWebm, mp4: sceneMp4 } : null, background: sceneBackground })
    return () => setProfileScene(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneStill, sceneWebm, sceneMp4, sceneBackgroundKey])
  const [openMatch, setOpenMatch] = useState<ProfileMatchRow | null>(null)
  const [view, setView] = useState<"stats" | "configs">("stats")
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

  // Your own profile has three tabs; everyone else's is just the profile.
  const own = data.viewer.isOwner
  const tab: ProfileTab = own ? pathTab : "profile"
  const setTab = setPathTab

  // A paid rank's banner (owner request 2026-11-07), unless the player picked another one.
  const previewOn = Boolean(previewName && own)
  const previewData = previewOn && previewName ? { ...data, user: { ...data.user, nameStyle: previewName.name, ...(previewName.frame !== undefined ? { frame: previewName.frame } : {}) } } : data
  const bannerPick = previewOn && previewName && previewName.banner !== undefined ? previewName.banner : data.user.banner
  const banner = bannerPick ?? (data.perk ? `perk-${data.perk.tier}` : null)
  return (
    <div ref={topRef}>
      {true && (
      <div className="@container px-6 pb-8 pt-5 max-md:px-4">
        <div className="lx-bento grid gap-4 @4xl:grid-cols-12">
          {/* Who this is: the banner, the avatar, the name, the badges and the buttons, in one card that stays in view. */}
          <aside className="flex min-w-0 flex-col gap-3 @4xl:col-span-4">
            <section aria-label="Profile" className="lx-glass relative overflow-hidden rounded-2xl">
              <ProfileBanner fx={banner} fade className="h-[190px]" />
              <div className={cn("relative px-5 pb-6 max-md:px-4", banner ? "pt-[64px]" : "pt-7")}>
                <Header overview={previewData} onVisibilityChange={refetch} />
              </div>
            </section>
            {data.user.role === "Owner" && <OwnerPanel overview={data} />}
            <div {...rise(1)} className={rise(1).className}><TrustCard overview={data} onOpenPenalty={(id) => setOpenPenalty(penaltyById(id))} /></div>
            {hidden.has("loadout") ? <HiddenCard section="loadout" /> : data.loadout && <LoadoutCard loadout={data.loadout} />}
            {data.banned ? (showFaceit && faceit ? <CensoredCard label="FACEIT" rows={3} /> : null) : hidden.has("faceit") ? <HiddenCard section="faceit" /> : showFaceit && faceit && <FaceitCard faceit={faceit} />}
            <PenaltyHistory penalties={data.penalties} total={data.penaltyCount} steamId={data.user.steamId} onOpen={setOpenPenalty} />
          </aside>
          <div className="@container flex min-w-0 flex-col gap-3 @4xl:col-span-8">
            <div className="lx-glass rounded-2xl px-5">
              <PageTabs<"stats" | "configs" | "appearance" | "settings"> ariaLabel="Profile sections" value={tab === "profile" ? view : tab} onChange={(next) => { if (next === "stats" || next === "configs") { setView(next); setTab("profile") } else setTab(next) }} options={own ? [{ value: "stats", label: "Stats" }, { value: "configs", label: "Configs" }, { value: "appearance", label: "Appearance" }, { value: "settings", label: "Settings" }] : [{ value: "stats", label: "Stats" }, { value: "configs", label: "Configs" }]} />
            </div>
            {tab === "appearance" ? (
              <div key="appearance" className="lx-flow-stack"><AppearanceSettings /></div>
            ) : tab === "settings" ? (
              <div key="settings" className="lx-flow-stack flex flex-col gap-4">{data.visibility && <PrivacyPopover visibility={data.visibility} onSaved={refetch} />}<AccountSettings /></div>
            ) : view === "configs" ? (
              <div key="configs" className="lx-flow-stack"><ProfileConfigs userId={data.user.steamId || data.user.id} isOwner={data.viewer.isOwner} /></div>
            ) : (
              <>
                {data.staff && <div {...rise(0)}><StaffCard staff={data.staff} username={data.user.username} /></div>}
                {data.creator && (
          <div {...rise(0)}>
            <section aria-label={data.creator.label} className={cn(card, "flex flex-wrap items-center gap-4 border-[var(--line-strong)] bg-[var(--glass-fill)] px-[18px] py-3.5")}>
              <span className="flex min-w-[220px] flex-1 flex-col gap-[3px]">
                <span className="text-sm font-semibold text-[var(--text)]">{data.creator.label}</span>
                <span className="text-[13px] text-[var(--text-muted)]">{data.creator.bio || "Makes LEGACY-X videos and streams."}</span>
              </span>
              <CreatorLinks links={data.creator.links} />
            </section>
          </div>
        )}
                <div {...rise(1)} className={rise(1).className}>{data.banned ? <CensoredCard label="Rank" rows={2} /> : data.competitive ? <RankCard competitive={data.competitive} /> : <section className={cn(card, "flex items-center p-[18px] text-[13px] text-[var(--text-dim)]")}>Unranked — no competitive matches yet</section>}</div>
                {!data.banned && !hidden.has("stats") && data.stats && <div {...rise(2)} className={rise(2).className}><ProfileRings overview={data} /></div>}
                {data.banned ? <CensoredStatsRow /> : hidden.has("stats") ? <HiddenCard section="stats" /> : data.stats ? null : <EmptyStatsRow />}
                {data.banned ? <CensoredCard label="Recent matches" rows={5} /> : hidden.has("matches") ? <HiddenCard section="matches" /> : (
              <>
                <RecentMatches matches={data.recentMatches ?? []} kdAverage={data.stats?.find((tile) => tile.key === "kd")?.average ?? null} onOpen={setOpenMatch} />
              </>
            )}
                {data.banned ? <CensoredCard label="Maps" rows={4} /> : !hidden.has("matches") && data.maps && <MapsCard maps={data.maps} />}
                {data.user.role === "Owner" && <OwnerSections overview={data} />}
              </>
            )}
          </div>
        </div>
      </div>
      )}

      {openMatch?.matchId && (
        <MatchDetailsDialog matchId={openMatch.matchId} mapNumber={openMatch.mapNumber ?? 1} highlightSteamId={data.user.steamId} exp={openMatch} onOpenChange={(open) => { if (!open) setOpenMatch(null) }} />
      )}
      <PenaltyDetailSheet
        penalty={openPenalty}
        onChanged={refetch}
        isOwn={isOwnPenalty}
        onClose={() => setOpenPenalty(null)}
        onProfileNavigate={(steamId) => navigate(`/profile/${encodeURIComponent(steamId)}`)}
      />
    </div>
  )
}
