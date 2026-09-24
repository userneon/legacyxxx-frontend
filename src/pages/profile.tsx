import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ChevronRight, Copy, Crown, ExternalLink, Eye, EyeOff, MessageCircle, MoreHorizontal, Play, RotateCcw, ShieldAlert, ShieldCheck, Shield } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { profileService } from "@/api"
import { profileOverviewService, type ProfileMatchRow, type ProfileOverview, type ProfileSection } from "@/api/profile-overview"
import type { FaceitProfileData, PenaltyEntry } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { LINKS } from "@/lib/links"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { formatDate, useWebsitePreferences } from "@/lib/preferences"
import { PAGE_ROUTES } from "@/lib/routes"
import { CompetitiveRankBadge, RankLabel, RankPill } from "@/components/competitive-rank-badge"
import { FaceitLevelBadge } from "@/components/faceit-level-badge"
import { MatchDetailsDialog } from "@/components/match-details-dialog"
import { PenaltyDetailSheet, StatusPill, TypeIcon, TYPE_META, formatPenaltyDate } from "@/components/penalty-detail-dialog"
import { PlayerAvatar } from "@/components/player-avatar"
import { copyText, steamProfileUrl } from "@/components/profile-ids"
import { RelativeTime } from "@/components/relative-time"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"

const card = "rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)]"
const outline = "inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 text-[13px] font-medium text-[var(--text)] transition-[background-color,border-color,transform] duration-150 hover:border-[var(--line-strong)] hover:bg-[var(--raised)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"

const SECTION_LABEL: Record<ProfileSection, string> = { stats: "Stats", matches: "Recent matches", faceit: "FACEIT stats", loadout: "Loadout" }

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
  return (
    <div aria-hidden="true" className="relative h-[132px] overflow-hidden bg-[linear-gradient(180deg,#1c1c1c_0%,#121212_100%)]">
      {video && !videoFailed && !prefersReducedMotion() ? (
        <video className="absolute inset-0 size-full object-cover opacity-60" autoPlay muted loop playsInline poster={still ?? undefined} onError={() => setVideoFailed(true)}>
          {video.webm && <source src={video.webm} type="video/webm" />}
          {video.mp4 && <source src={video.mp4} type="video/mp4" />}
        </video>
      ) : still ? (
        <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url("${still}")` }} />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--panel)]" />
    </div>
  )
}

function Avatar({ user }: { user: ProfileOverview["user"] }) {
  const animated = user.steamMedia?.animatedAvatar
  const [ready, setReady] = useState(false)
  return (
    <span className="relative size-[104px] shrink-0 overflow-hidden rounded-[26px] border-4 border-[var(--panel)] bg-[var(--line)]">
      <PlayerAvatar avatar={user.avatar} name={user.username} className="size-full rounded-none text-2xl" />
      {animated && <img src={animated} alt="" aria-hidden="true" onLoad={() => setReady(true)} className={cn("absolute inset-0 size-full object-cover transition-opacity duration-300", ready ? "opacity-100" : "opacity-0")} />}
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  if (!role || role === "Player") return null
  if (role === "Owner") {
    return <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[var(--accent-solid)] px-2.5 text-xs font-semibold text-[var(--accent-on)]"><Crown className="size-3.5" />Owner</span>
  }
  return <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--raised)] px-2.5 text-xs font-medium text-[var(--text-2)]"><Shield className="size-3.5" />{role}</span>
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative h-[22px] w-[38px] shrink-0 rounded-full p-0.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60", checked ? "bg-[var(--accent-solid)]" : "bg-[var(--line-strong)]")}
    >
      <span className={cn("block size-[18px] rounded-full transition-transform duration-200 motion-reduce:transition-none", checked ? "translate-x-4 bg-[var(--accent-on)]" : "bg-[var(--accent-solid)]")} />
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
  const copyLink = async () => {
    const url = `${window.location.origin}/profile/${user.steamId || user.id}`
    if (await copyText(url, "Profile link")) toast.success("Profile link copied")
  }
  return (
    <header className="flex flex-wrap items-end gap-5">
      <Avatar user={user} />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 pb-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="truncate text-2xl font-semibold tracking-[-0.3px] text-[var(--text)]" title={user.username}>{user.username}</h1>
          <RoleBadge role={user.role} />
          {competitive && <RankPill rankId={competitive.rankId} rankName={competitive.rankName} imageKey={competitive.rankImageKey} currentExp={competitive.exp} />}
          {presence && (
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[var(--status-green)]/12 px-2.5 text-xs font-semibold text-[var(--status-green)]">
              <span className="size-1.5 rounded-full bg-[var(--status-green)]" />
              Playing now
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3.5 text-[13px] text-[var(--text-muted)]">
          {competitive?.position && <><span>#{competitive.position} on leaderboard</span><span className="text-[var(--line-strong)]">·</span></>}
          {user.memberSince && <><span>Member since {formatDate(user.memberSince)}</span><span className="text-[var(--line-strong)]">·</span></>}
          <span>{overview.lastPlayedAt ? <>Last played <RelativeTime value={overview.lastPlayedAt} /></> : "No matches yet"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 pb-1.5">
        {presence?.connectAddress && (
          <a href={`steam://connect/${presence.connectAddress}`} className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-[var(--accent-solid)] px-3.5 text-[13px] font-semibold text-[var(--accent-on)] transition-opacity hover:opacity-90">
            <Play className="size-3.5 fill-current" />
            Join
          </a>
        )}
        {viewer.isOwner && overview.visibility && <PrivacyPopover visibility={overview.visibility} onSaved={onVisibilityChange} />}
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
    <section aria-label="Legacy-X team" className={cn(card, "flex flex-wrap items-center gap-4 px-[18px] py-3.5")}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--raised)] text-[var(--text)]">{staff.role === "Owner" ? <Crown className="size-4" /> : <Shield className="size-4" />}</span>
      <span className="flex min-w-[220px] flex-1 flex-col gap-[3px]">
        <span className="text-sm font-semibold text-[var(--text)]">Legacy-X team · {staff.role}</span>
        <span className="text-[13px] text-[var(--text-muted)]">{staff.description} Staff never ask for your password or items.</span>
      </span>
      <Link to={`${PAGE_ROUTES.penalties}?admin=${encodeURIComponent(username)}`} className="flex items-center gap-1.5 border-r border-[var(--line)] pr-3.5 text-[13px] text-[var(--text-2)] transition-colors hover:text-[var(--text)]">
        Penalties issued <span className="font-semibold tabular-nums text-[var(--text)]">{staff.penaltiesIssued.toLocaleString()}</span>
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
    <section aria-label="Rank" className={cn(card, "flex items-center gap-[18px] p-[18px]")}>
      <CompetitiveRankBadge rankId={competitive.rankId} rankName={competitive.rankName} imageKey={competitive.rankImageKey} size={72} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex flex-col gap-1.5">
            <span className="text-xs text-[var(--text-muted)]">Rank</span>
            <RankLabel rankId={competitive.rankId} rankName={competitive.rankName} imageKey={competitive.rankImageKey} size={0} nameClassName="text-base font-semibold" className="[&>img]:hidden" />
          </span>
          <Link to={`${PAGE_ROUTES.leaders}${competitive.position ? `?focus=${competitive.position}` : ""}`} className="flex items-center gap-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
            Leaderboard <ChevronRight className="size-3.5" />
          </Link>
        </div>
        <span className="h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)]">
          <span className="block h-full rounded-full bg-[var(--accent-solid)] transition-[width] duration-500 ease-[var(--ease-out)]" style={{ width: `${shown}%` }} />
        </span>
        <div className="flex justify-between text-xs text-[var(--text-dim)]">
          <span>EXP <span className="tabular-nums text-[var(--text-2)]">{competitive.exp.toLocaleString()}</span></span>
          <span>{competitive.nextRankName ? <>Next <span className="text-[var(--text-2)]">{competitive.nextRankName}</span> · <span className="tabular-nums">{competitive.nextRankMinExp?.toLocaleString()}</span></> : "Top rank"}</span>
        </div>
      </div>
    </section>
  )
}

function TrustCard({ overview, onOpenPenalty }: { overview: ProfileOverview; onOpenPenalty: (id: string) => void }) {
  const { trust, user } = overview
  const row = "flex h-[34px] items-center justify-between border-b border-[var(--line-soft)] last:border-b-0"
  return (
    <section aria-label="Trust" className={cn(card, "flex flex-col px-[18px] py-3.5")}>
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
    <section aria-label="Legacy-X stats" className="grid grid-cols-2 gap-3 sm:flex">
      {stats.map((tile) => (
        <div key={tile.key} className={cn(card, "flex min-w-0 flex-1 flex-col gap-2 px-4 py-3.5")}>
          <span className="text-xs text-[var(--text-muted)]">{tile.label}</span>
          <span className="text-xl font-semibold tabular-nums text-[var(--text)]">{format(tile.key, tile.value)}</span>
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
          <h2 className="text-sm font-semibold text-[var(--text)]">Recent matches</h2>
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
                className={cn(grid, "h-[52px] w-full border-t border-[var(--raised)] text-left text-[13px] transition-colors duration-150 enabled:hover:bg-[var(--raised)] disabled:cursor-default")}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="h-[30px] w-[52px] shrink-0 overflow-hidden rounded-md bg-[var(--line-soft)]">{art && <img src={art} alt="" className="size-full object-cover" />}</span>
                  <span className="truncate text-[var(--text)]">{cs2MapLabel(match.map)}</span>
                </span>
                <span className={cn("font-medium", match.result === "Win" ? "text-[var(--result-win)]" : match.result === "Loss" ? "text-[var(--result-loss)]" : "text-[var(--text-muted)]")}>{match.result}</span>
                <span className="tabular-nums text-[var(--text-2)]">{match.score}</span>
                <span className="tabular-nums text-[var(--text-2)] max-md:hidden">{match.kd}</span>
                <span className={cn("font-medium tabular-nums", (match.expDelta ?? 0) > 0 ? "text-[var(--result-win)]" : (match.expDelta ?? 0) < 0 ? "text-[var(--result-loss)]" : "text-[var(--text-dim)]")}>{typeof match.expDelta === "number" ? `${match.expDelta > 0 ? "+" : ""}${match.expDelta}` : "—"}</span>
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
        <h2 className="text-sm font-semibold text-[var(--text)]">Maps</h2>
        <span className="text-xs text-[var(--text-dim)]">Win rate · min. 3 matches</span>
      </div>
      {maps.slice(0, 6).map((map) => (
        <div key={map.map} className="grid h-[34px] grid-cols-[90px_minmax(0,1fr)_44px] items-center gap-3">
          <span className="truncate text-[13px] text-[var(--text-2)]">{cs2MapLabel(map.map)}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)]"><span className="block h-full rounded-full bg-[var(--accent-solid)]" style={{ width: `${map.winRate}%` }} /></span>
          <span className="text-right text-[13px] tabular-nums text-[var(--text)]" title={`${map.wins} of ${map.matches}`}>{map.winRate}%</span>
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
      <span className="text-sm font-semibold tabular-nums text-[var(--text)]">{value}</span>
    </div>
  )
  return (
    <section aria-label="FACEIT" className={cn(card, "flex flex-col gap-3 p-4")}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text)]">FACEIT</h2>
        <a href={faceit.faceitUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">Open <ExternalLink className="size-3" /></a>
      </div>
      <div className="flex items-center gap-3">
        <FaceitLevelBadge level={faceit.level} className="size-11" />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] text-[var(--text-dim)]">Level {faceit.level} · ELO</span>
          <span className="text-lg font-semibold tabular-nums text-[var(--text)]">{faceit.elo.toLocaleString()}</span>
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
        <h2 className="text-sm font-semibold text-[var(--text)]">Penalty history</h2>
        {total > penalties.length || steamId ? <Link to={`${PAGE_ROUTES.penalties}?q=${encodeURIComponent(steamId)}`} className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">View all</Link> : null}
      </div>
      {penalties.map((penalty) => (
        <button key={penalty.id} type="button" onClick={() => onOpen(penalty)} className="flex items-center gap-2.5 border-t border-[var(--line-soft)] py-2.5 text-left transition-colors hover:bg-[var(--raised)]/40">
          <TypeIcon type={penalty.type} className="size-8" />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[13px] font-medium" style={{ color: (TYPE_META[penalty.type] ?? TYPE_META.ban).color }}>{(TYPE_META[penalty.type] ?? TYPE_META.ban).label}</span>
              <StatusPill penalty={penalty} />
            </span>
            <span className="truncate text-xs text-[var(--text-dim)]">{penalty.reason || "No reason given"} · {formatPenaltyDate(penalty.date)}</span>
          </span>
          <ChevronRight className="size-4 text-[var(--text-faint)]" />
        </button>
      ))}
    </section>
  )
}

function LoadoutCard({ loadout }: { loadout: NonNullable<ProfileOverview["loadout"]> }) {
  return (
    <section aria-label="Loadout" className={cn(card, "flex flex-col gap-3 p-4")}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text)]">Loadout</h2>
        <span className="text-xs text-[var(--text-dim)]">{loadout.side === "ct" ? "CT side" : "T side"}</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {loadout.items.map((item) => (
          <div key={item.key} className="flex min-w-0 flex-col gap-1.5">
            <div className="flex h-14 items-center justify-center overflow-hidden rounded-lg border border-[var(--line-soft)] bg-[var(--panel)] px-2" title={item.name ?? "Default"}>
              {item.image ? <img src={item.image} alt={item.name ?? ""} className="max-h-full max-w-full object-contain" loading="lazy" /> : <span className="text-[11px] text-[var(--text-faint)]">Default</span>}
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
      <div className="h-[132px] bg-[linear-gradient(180deg,#1c1c1c_0%,#121212_100%)]" />
      <div className="-mt-14 flex flex-col gap-4 px-6 pb-8">
        <div className="flex items-end gap-5">
          <Skeleton className="size-[104px] rounded-[26px] border-4 border-[var(--panel)] bg-[var(--line)]" />
          <div className="flex flex-1 flex-col gap-2.5 pb-2">
            <Skeleton className="h-6 w-56 rounded-full bg-[var(--line-strong)]" />
            <Skeleton className="h-3 w-80 rounded-full bg-[var(--line-soft)]" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
          <Skeleton className="h-[108px] rounded-xl bg-[var(--card-surface)]" />
          <Skeleton className="h-[108px] rounded-xl bg-[var(--card-surface)]" />
        </div>
        <Skeleton className="h-20 rounded-xl bg-[var(--card-surface)]" />
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
    <div ref={topRef} className="animate-in fade-in-0 duration-200 motion-reduce:animate-none">
      <Banner user={data.user} />
      <div className="-mt-14 flex flex-col gap-4 px-6 pb-8 max-md:px-4">
        <Header overview={data} onVisibilityChange={refetch} />
        {data.staff && <StaffCard staff={data.staff} username={data.user.username} />}

        <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {data.competitive ? <RankCard competitive={data.competitive} /> : <section className={cn(card, "flex items-center p-[18px] text-[13px] text-[var(--text-dim)]")}>Unranked — no competitive matches yet</section>}
          <TrustCard overview={data} onOpenPenalty={(id) => setOpenPenalty(penaltyById(id))} />
        </div>

        {hidden.has("stats") ? <HiddenCard section="stats" /> : data.stats && <StatsRow stats={data.stats} />}

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
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
